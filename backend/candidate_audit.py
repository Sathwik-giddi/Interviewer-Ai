"""
Candidate draft persistence, signed-link lookup, action logging, and report generation.

This module uses Firestore when available and keeps an in-memory fallback for local/dev use.
It intentionally keeps report generation deterministic: every statement is derived from
stored submissions or action logs.
"""

from __future__ import annotations

import base64
import copy
import datetime as dt
import hashlib
import hmac
import json
import os
import re
import secrets
from typing import Any


_PROFILE_CACHE: dict[str, dict[str, Any]] = {}
_SUBMISSION_CACHE: dict[str, dict[str, Any]] = {}
_ACTION_CACHE: list[dict[str, Any]] = []
_LINK_CACHE: dict[str, dict[str, Any]] = {}

SENSITIVE_FIELDS = {
    'candidate_name',
    'candidate_email',
    'candidate_phone',
    'candidate_custom_id',
    'name',
    'email',
    'phone',
}


def _get_db():
    try:
        from firebase_service import get_db
        return get_db()
    except Exception:
        return None


def utcnow() -> dt.datetime:
    return dt.datetime.utcnow().replace(tzinfo=dt.timezone.utc)


def utcnow_iso() -> str:
    return utcnow().isoformat().replace('+00:00', 'Z')


def _coerce_datetime(value: Any) -> dt.datetime | None:
    if value is None:
        return None
    if isinstance(value, dt.datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=dt.timezone.utc)
        return value.astimezone(dt.timezone.utc)
    if hasattr(value, 'to_datetime'):
        try:
            converted = value.to_datetime()
            if converted.tzinfo is None:
                return converted.replace(tzinfo=dt.timezone.utc)
            return converted.astimezone(dt.timezone.utc)
        except Exception:
            return None
    if isinstance(value, str):
        try:
            return dt.datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(dt.timezone.utc)
        except Exception:
            return None
    return None


def _serialize_firestore(value: Any):
    if isinstance(value, dict):
        return {k: _serialize_firestore(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_serialize_firestore(v) for v in value]
    if isinstance(value, dt.datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=dt.timezone.utc)
        return value.astimezone(dt.timezone.utc).isoformat().replace('+00:00', 'Z')
    if hasattr(value, 'to_datetime'):
        converted = _coerce_datetime(value)
        return converted.isoformat().replace('+00:00', 'Z') if converted else value
    return value


def normalize_email(value: str = '') -> str:
    return (value or '').strip().lower()


def normalize_phone(value: str = '') -> str:
    digits = re.sub(r'\D+', '', value or '')
    return digits[-15:]


def normalize_custom_id(value: str = '') -> str:
    return re.sub(r'\s+', '-', (value or '').strip().lower())


def hash_value(value: str = '') -> str:
    return hashlib.sha256((value or '').encode('utf-8')).hexdigest()


def build_candidate_key(email: str = '', phone: str = '', custom_id: str = '') -> str:
    parts = []
    if normalize_email(email):
        parts.append(f"email:{normalize_email(email)}")
    if normalize_phone(phone):
        parts.append(f"phone:{normalize_phone(phone)}")
    if normalize_custom_id(custom_id):
        parts.append(f"custom:{normalize_custom_id(custom_id)}")
    if not parts:
        return ''
    return hash_value('|'.join(parts))


def build_assessment_key(room_id: str = '', campaign_id: str = '', link_id: str = '') -> str:
    return (campaign_id or room_id or link_id or '').strip()


def _token_secret() -> bytes:
    secret = (
        os.getenv('CANDIDATE_LINK_SECRET')
        or os.getenv('SECRET_KEY')
        or os.getenv('GEMINI_API_KEY')
        or 'dev-candidate-link-secret'
    )
    return secret.encode('utf-8')


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode('utf-8').rstrip('=')


def _b64url_decode(raw: str) -> bytes:
    pad = '=' * (-len(raw) % 4)
    return base64.urlsafe_b64decode(raw + pad)


def create_candidate_token(link_id: str, room_id: str, email: str = '', phone: str = '', custom_id: str = '') -> str:
    payload = {
        'link_id': link_id,
        'room_id': room_id,
        'email_hash': hash_value(normalize_email(email)) if normalize_email(email) else '',
        'phone_hash': hash_value(normalize_phone(phone)) if normalize_phone(phone) else '',
        'custom_id_hash': hash_value(normalize_custom_id(custom_id)) if normalize_custom_id(custom_id) else '',
        'issued_at': utcnow_iso(),
        'nonce': secrets.token_hex(8),
    }
    encoded = _b64url_encode(json.dumps(payload, separators=(',', ':')).encode('utf-8'))
    signature = hmac.new(_token_secret(), encoded.encode('utf-8'), hashlib.sha256).digest()
    return f'{encoded}.{_b64url_encode(signature)}'


def verify_candidate_token(token: str) -> dict[str, Any]:
    if not token or '.' not in token:
        raise ValueError('Invalid token')
    encoded, provided_sig = token.split('.', 1)
    expected_sig = _b64url_encode(hmac.new(_token_secret(), encoded.encode('utf-8'), hashlib.sha256).digest())
    if not hmac.compare_digest(provided_sig, expected_sig):
        raise ValueError('Token signature mismatch')
    payload = json.loads(_b64url_decode(encoded).decode('utf-8'))
    return payload


def cache_link_data(link_data: dict[str, Any]):
    link_id = (link_data or {}).get('linkId')
    if link_id:
        _LINK_CACHE[link_id] = copy.deepcopy(_serialize_firestore(link_data))


def _load_link(link_id: str) -> dict[str, Any] | None:
    db = _get_db()
    if db is not None:
        try:
            snap = db.collection('links').document(link_id).get()
            if snap.exists:
                return _serialize_firestore(snap.to_dict() or {})
        except Exception:
            pass
    cached = _LINK_CACHE.get(link_id)
    return copy.deepcopy(cached) if cached else None


def _profile_doc(candidate_id: str):
    db = _get_db()
    return db.collection('candidate_profiles').document(candidate_id) if db is not None else None


def _submission_doc(session_id: str):
    db = _get_db()
    return db.collection('candidate_submissions').document(session_id) if db is not None else None


def _action_collection():
    db = _get_db()
    return db.collection('candidate_actions') if db is not None else None


def _clean_field_snapshot(fields: dict[str, Any] | None) -> dict[str, Any]:
    raw = fields or {}
    return {
        'candidateName': (raw.get('candidateName') or '').strip(),
        'candidateEmail': normalize_email(raw.get('candidateEmail', '')),
        'candidatePhone': raw.get('candidatePhone', '').strip(),
        'candidateCustomId': (raw.get('candidateCustomId') or '').strip(),
        'jobTitle': (raw.get('jobTitle') or '').strip(),
        'jobDescription': (raw.get('jobDescription') or '').strip(),
    }


def upsert_candidate_progress(payload: dict[str, Any]) -> dict[str, Any]:
    session_id = (payload.get('session_id') or '').strip()
    room_id = (payload.get('room_id') or '').strip()
    link_id = (payload.get('link_id') or '').strip()
    if not session_id:
        raise ValueError('session_id is required')

    fields = _clean_field_snapshot(payload.get('fields'))
    candidate_id = (payload.get('candidate_id') or '').strip() or build_candidate_key(
        email=fields.get('candidateEmail', ''),
        phone=fields.get('candidatePhone', ''),
        custom_id=fields.get('candidateCustomId', ''),
    )
    assessment_key = build_assessment_key(room_id=room_id, campaign_id=payload.get('campaign_id', ''), link_id=link_id)

    submission = {
        'sessionId': session_id,
        'candidateId': candidate_id,
        'assessmentKey': assessment_key,
        'roomId': room_id,
        'campaignId': (payload.get('campaign_id') or '').strip(),
        'linkId': link_id,
        'observerRoomId': (payload.get('observer_room_id') or '').strip(),
        'status': payload.get('status', 'draft'),
        'fields': fields,
        'questions': payload.get('questions') or [],
        'answers': payload.get('answers') or [],
        'currentIndex': int(payload.get('current_index') or 0),
        'matchScore': payload.get('match_score'),
        'parsedResume': payload.get('parsed_resume') or None,
        'questionDurations': payload.get('question_durations') or {},
        'pagesVisited': payload.get('pages_visited') or [],
        'duration': payload.get('duration') or 0,
        'violations': payload.get('violations') or [],
        'startedAt': payload.get('started_at') or utcnow_iso(),
        'lastUpdatedAt': utcnow_iso(),
        'completedAt': payload.get('completed_at') or None,
        'overallScore': payload.get('overall_score'),
        'recommendation': payload.get('recommendation'),
        'questionEvals': payload.get('question_evals') or {},
        'evaluation': payload.get('evaluation') or None,
    }

    profile = {
        'candidateId': candidate_id,
        'displayName': fields.get('candidateName'),
        'email': fields.get('candidateEmail'),
        'phone': fields.get('candidatePhone'),
        'customId': fields.get('candidateCustomId'),
        'jobTitle': fields.get('jobTitle'),
        'jobDescription': fields.get('jobDescription'),
        'assessmentKey': assessment_key,
        'lastSessionId': session_id,
        'lastSubmittedAt': submission['completedAt'] or submission['lastUpdatedAt'],
        'lastSeenAt': submission['lastUpdatedAt'],
    }

    if candidate_id:
        _PROFILE_CACHE[candidate_id] = {**_PROFILE_CACHE.get(candidate_id, {}), **profile}
    _SUBMISSION_CACHE[session_id] = {**_SUBMISSION_CACHE.get(session_id, {}), **submission}

    profile_doc = _profile_doc(candidate_id) if candidate_id else None
    if profile_doc is not None:
        try:
            profile_doc.set(profile, merge=True)
        except Exception:
            pass

    submission_doc = _submission_doc(session_id)
    if submission_doc is not None:
        try:
            submission_doc.set(submission, merge=True)
        except Exception:
            pass

    return submission


def _sanitize_action_value(field_name: str, value: Any) -> tuple[Any, str | None]:
    if value is None:
        return None, None
    text = str(value).strip()
    if not text:
        return '', None
    if field_name in SENSITIVE_FIELDS:
        return None, hash_value(text)
    preview = text[:240]
    return preview, hash_value(text) if len(text) > 240 else None


def log_candidate_actions(actions: list[dict[str, Any]]) -> int:
    collection = _action_collection()
    persisted = 0
    for raw in actions or []:
        candidate_id = (raw.get('candidate_id') or '').strip()
        session_id = (raw.get('session_id') or '').strip()
        if not session_id:
            continue
        field_name = (raw.get('field_name') or '').strip()
        old_value, old_hash = _sanitize_action_value(field_name, raw.get('old_value'))
        new_value, new_hash = _sanitize_action_value(field_name, raw.get('new_value'))
        action = {
            'id': raw.get('id') or f'act-{secrets.token_hex(8)}',
            'candidateId': candidate_id,
            'sessionId': session_id,
            'actionType': (raw.get('action_type') or 'view').strip(),
            'fieldName': field_name,
            'oldValue': old_value,
            'newValue': new_value,
            'oldValueHash': old_hash,
            'newValueHash': new_hash,
            'timestamp': raw.get('timestamp') or utcnow_iso(),
            'pageUrl': raw.get('page_url') or '',
            'message': (raw.get('message') or '').strip(),
            'metadata': raw.get('metadata') or {},
        }
        _ACTION_CACHE.append(action)
        persisted += 1
        if collection is not None:
            try:
                collection.document(action['id']).set(action, merge=True)
            except Exception:
                pass
    return persisted


def _load_actions(candidate_id: str = '', session_id: str = '') -> list[dict[str, Any]]:
    results = []
    collection = _action_collection()
    if collection is not None:
        try:
            query = collection
            if candidate_id:
                query = query.where('candidateId', '==', candidate_id)
            if session_id:
                query = query.where('sessionId', '==', session_id)
            results.extend(_serialize_firestore(doc.to_dict() or {}) for doc in query.stream())
        except Exception:
            results = []

    if not results:
        for action in _ACTION_CACHE:
            if candidate_id and action.get('candidateId') != candidate_id:
                continue
            if session_id and action.get('sessionId') != session_id:
                continue
            results.append(copy.deepcopy(action))

    results.sort(key=lambda item: item.get('timestamp', ''))
    return results


def _load_submission(session_id: str) -> dict[str, Any] | None:
    doc = _submission_doc(session_id)
    if doc is not None:
        try:
            snap = doc.get()
            if snap.exists:
                return _serialize_firestore(snap.to_dict() or {})
        except Exception:
            pass
    cached = _SUBMISSION_CACHE.get(session_id)
    return copy.deepcopy(cached) if cached else None


def _load_submissions(candidate_id: str = '', assessment_key: str = '') -> list[dict[str, Any]]:
    results = []
    db = _get_db()
    if db is not None:
        try:
            query = db.collection('candidate_submissions')
            if candidate_id:
                query = query.where('candidateId', '==', candidate_id)
            for doc in query.stream():
                data = _serialize_firestore(doc.to_dict() or {})
                if assessment_key and data.get('assessmentKey') != assessment_key:
                    continue
                results.append(data)
        except Exception:
            results = []

    if not results:
        for submission in _SUBMISSION_CACHE.values():
            if candidate_id and submission.get('candidateId') != candidate_id:
                continue
            if assessment_key and submission.get('assessmentKey') != assessment_key:
                continue
            results.append(copy.deepcopy(submission))

    results.sort(key=lambda item: item.get('lastUpdatedAt', ''), reverse=True)
    return results


def lookup_candidate_by_token(token: str) -> dict[str, Any]:
    payload = verify_candidate_token(token)
    link_id = payload.get('link_id', '')
    link_data = _load_link(link_id)
    if not link_data:
        raise LookupError('Link token could not be resolved')

    candidate_id = build_candidate_key(
        email=link_data.get('forEmail', ''),
        phone=link_data.get('candidatePhone', ''),
        custom_id=link_data.get('candidateCustomId', ''),
    )
    if not candidate_id:
        raise LookupError('No candidate identifiers are attached to this link')

    assessment_key = build_assessment_key(
        room_id=link_data.get('roomId', ''),
        campaign_id=link_data.get('campaignId', ''),
        link_id=link_id,
    )
    submissions = _load_submissions(candidate_id=candidate_id, assessment_key=assessment_key)
    latest_submission = submissions[0] if submissions else None

    profile_doc = _profile_doc(candidate_id)
    profile = {}
    if profile_doc is not None:
        try:
            snap = profile_doc.get()
            if snap.exists:
                profile = _serialize_firestore(snap.to_dict() or {})
        except Exception:
            profile = {}
    if not profile:
        profile = copy.deepcopy(_PROFILE_CACHE.get(candidate_id, {}))

    fields = _clean_field_snapshot((latest_submission or {}).get('fields') or profile)
    return {
        'candidate_id': candidate_id,
        'assessment_key': assessment_key,
        'link': {
            'linkId': link_data.get('linkId') or link_id,
            'roomId': link_data.get('roomId'),
            'campaignId': link_data.get('campaignId'),
            'jobTitle': link_data.get('jobTitle'),
            'createdAt': link_data.get('createdAt'),
        },
        'fields': fields,
        'profile': profile,
        'draft': latest_submission,
        'last_updated_at': (latest_submission or {}).get('lastUpdatedAt') or profile.get('lastSeenAt') or link_data.get('createdAt'),
    }


def _describe_action(action: dict[str, Any]) -> str:
    if action.get('message'):
        return action['message']

    action_type = action.get('actionType')
    field_name = action.get('fieldName') or 'field'
    if action_type == 'view':
        return f"Viewed {action.get('pageUrl') or 'the assessment page'}"
    if action_type == 'input_change':
        return f"Changed {field_name}"
    if action_type == 'blur':
        return f"Reviewed {field_name}"
    if action_type == 'submit':
        return f"Submitted {field_name or 'the current step'}"
    if action_type == 'navigation':
        return f"Navigated within the assessment ({field_name})"
    return action_type or 'Recorded activity'


def _normalize_boolean_like(value: str) -> str:
    cleaned = (value or '').strip().lower()
    if cleaned in {'yes', 'y', 'true', '1'}:
        return 'yes'
    if cleaned in {'no', 'n', 'false', '0'}:
        return 'no'
    return cleaned


def _detect_mistakes(submission: dict[str, Any], actions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    mistakes: list[dict[str, Any]] = []
    fields = _clean_field_snapshot(submission.get('fields'))
    answers = submission.get('answers') or []
    evaluation = submission.get('evaluation') or {}
    question_evals = submission.get('questionEvals') or evaluation.get('questionEvals') or {}

    for field_name, label in (
        ('candidateName', 'Candidate name'),
        ('candidateEmail', 'Candidate email'),
        ('candidatePhone', 'Candidate phone'),
    ):
        if not (fields.get(field_name) or '').strip():
            mistakes.append({
                'category': 'missing_required_field',
                'title': f'{label} was left empty',
                'evidence': field_name,
                'correction': f'Collect and validate {label.lower()} before final submission.',
            })

    email = fields.get('candidateEmail', '')
    if email and not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
        mistakes.append({
            'category': 'validation_error',
            'title': 'Candidate email failed validation',
            'evidence': email,
            'correction': 'Provide a valid email format.',
        })

    phone = normalize_phone(fields.get('candidatePhone', ''))
    if fields.get('candidatePhone') and len(phone) < 10:
        mistakes.append({
            'category': 'validation_error',
            'title': 'Candidate phone failed validation',
            'evidence': fields.get('candidatePhone'),
            'correction': 'Provide a complete phone number with at least 10 digits.',
        })

    for index, answer in enumerate(answers):
        answer_text = (answer.get('answer') or '').strip()
        question_text = answer.get('question') or f'Question #{index + 1}'
        q_eval = question_evals.get(str(index)) or question_evals.get(index) or answer.get('eval') or {}
        score = q_eval.get('score')
        correct_answer = answer.get('correctAnswer') or answer.get('answerKey')
        if not answer_text:
            mistakes.append({
                'category': 'skipped_answer',
                'title': f'Skipped {question_text}',
                'evidence': 'No answer submitted',
                'correction': 'Submit an answer before moving on.',
            })
            continue
        if correct_answer:
            if str(answer_text).strip().lower() != str(correct_answer).strip().lower():
                mistakes.append({
                    'category': 'wrong_answer',
                    'title': f'Incorrect answer for {question_text}',
                    'evidence': {'submitted': answer_text, 'expected': correct_answer},
                    'correction': 'Review the answer key and revisit this topic.',
                })
        elif isinstance(score, (int, float)) and score < 6:
            mistakes.append({
                'category': 'low_score_answer',
                'title': f'Weak answer for {question_text}',
                'evidence': {'score': score, 'feedback': q_eval.get('feedback', '')},
                'correction': q_eval.get('feedback') or 'Improve the accuracy and completeness of this answer.',
            })

    for violation in submission.get('violations') or []:
        mistakes.append({
            'category': 'rule_violation',
            'title': f"Rule violation: {violation.get('type', 'unknown')}",
            'evidence': violation.get('details') or violation.get('msg') or violation,
            'correction': 'Review the assessment rules and avoid repeating this behavior.',
        })

    action_history: dict[str, list[dict[str, Any]]] = {}
    for action in actions:
        field_name = action.get('fieldName') or ''
        if not field_name:
            continue
        action_history.setdefault(field_name, []).append(action)

    for field_name, history in action_history.items():
        previous_values = []
        for action in history:
            previous = action.get('oldValue')
            current = action.get('newValue')
            if previous not in (None, ''):
                previous_values.append(str(previous))
            if current not in (None, ''):
                previous_values.append(str(current))
        normalized = [_normalize_boolean_like(value) for value in previous_values if value.strip()]
        if 'yes' in normalized and 'no' in normalized:
            mistakes.append({
                'category': 'contradiction',
                'title': f'Contradictory responses for {field_name}',
                'evidence': previous_values[:6],
                'correction': 'Review the conflicting answers and confirm the final intended response.',
            })

    return mistakes


def _derive_recommendation(score: int, mistake_count: int, violation_count: int) -> str:
    if violation_count >= 3 or score < 40:
        return 'pass'
    if score >= 75 and mistake_count <= 2:
        return 'hire'
    return 'consider'


def build_candidate_report(candidate_id: str, session_id: str = '') -> dict[str, Any]:
    submissions = _load_submissions(candidate_id=candidate_id)
    if session_id:
        submissions = [submission for submission in submissions if submission.get('sessionId') == session_id]
    if not submissions:
        raise LookupError('Candidate report not found')

    submission = submissions[0]
    actions = _load_actions(candidate_id=candidate_id, session_id=submission.get('sessionId', ''))
    profile = copy.deepcopy(_PROFILE_CACHE.get(candidate_id, {}))
    profile_doc = _profile_doc(candidate_id)
    if profile_doc is not None:
        try:
            snap = profile_doc.get()
            if snap.exists:
                profile = _serialize_firestore(snap.to_dict() or {})
        except Exception:
            pass

    header_fields = _clean_field_snapshot(submission.get('fields') or profile)
    header = {
        'candidateId': candidate_id,
        'candidateName': header_fields.get('candidateName') or profile.get('displayName') or 'Candidate',
        'candidateEmail': header_fields.get('candidateEmail') or profile.get('email') or '',
        'assessmentName': submission.get('campaignId') or submission.get('roomId') or submission.get('assessmentKey') or 'Assessment',
        'jobTitle': header_fields.get('jobTitle') or profile.get('jobTitle') or '',
        'dateRange': {
            'startedAt': submission.get('startedAt'),
            'endedAt': submission.get('completedAt') or submission.get('lastUpdatedAt'),
        },
        'sessionDurationSeconds': submission.get('duration') or 0,
        'pagesVisited': sorted({action.get('pageUrl') for action in actions if action.get('pageUrl')}),
    }

    mistakes = _detect_mistakes(submission, actions)
    overall_score = submission.get('overallScore')
    if overall_score is None:
        q_scores = []
        evaluation = submission.get('evaluation') or {}
        question_evals = submission.get('questionEvals') or evaluation.get('questionEvals') or {}
        for item in question_evals.values():
            score = item.get('score')
            if isinstance(score, (int, float)):
                q_scores.append(score * 10 if score <= 10 else score)
        overall_score = round(sum(q_scores) / len(q_scores)) if q_scores else 0

    recommendation = submission.get('recommendation') or _derive_recommendation(
        score=int(overall_score or 0),
        mistake_count=len(mistakes),
        violation_count=len(submission.get('violations') or []),
    )

    chronological_log = [
        {
            'timestamp': action.get('timestamp'),
            'actionType': action.get('actionType'),
            'fieldName': action.get('fieldName'),
            'pageUrl': action.get('pageUrl'),
            'message': _describe_action(action),
            'oldValue': action.get('oldValue'),
            'newValue': action.get('newValue'),
            'metadata': action.get('metadata') or {},
        }
        for action in actions
    ]

    executive_summary = {
        'overallScore': overall_score,
        'recommendation': recommendation,
        'completed': submission.get('status') == 'completed',
        'totalActions': len(actions),
        'mistakeCount': len(mistakes),
        'violationCount': len(submission.get('violations') or []),
        'summaryText': (
            f"{header['candidateName']} completed {header['assessmentName']} with an overall score of "
            f"{overall_score}/100. {len(actions)} tracked actions were recorded, along with "
            f"{len(mistakes)} identified issues and {len(submission.get('violations') or [])} rule violations."
        ),
    }

    report = {
        'header': header,
        'executiveSummary': executive_summary,
        'whatTheyDid': chronological_log,
        'whereTheyMessedUp': mistakes,
        'overallScore': overall_score,
        'recommendation': recommendation,
        'answers': submission.get('answers') or [],
        'questionDurations': submission.get('questionDurations') or {},
        'sourceSessionId': submission.get('sessionId'),
        'traceability': {
            'submissionDoc': submission.get('sessionId'),
            'actionCount': len(actions),
            'profileDoc': candidate_id,
        },
    }
    return report


def render_report_as_text(report: dict[str, Any]) -> str:
    header = report.get('header') or {}
    lines = [
        f"Candidate: {header.get('candidateName', 'Candidate')}",
        f"Email: {header.get('candidateEmail', 'N/A')}",
        f"Assessment: {header.get('assessmentName', 'Assessment')}",
        f"Job Title: {header.get('jobTitle', 'N/A')}",
        f"Started: {header.get('dateRange', {}).get('startedAt', 'N/A')}",
        f"Ended: {header.get('dateRange', {}).get('endedAt', 'N/A')}",
        f"Duration (seconds): {header.get('sessionDurationSeconds', 0)}",
        f"Overall Score: {report.get('overallScore', 0)}",
        f"Recommendation: {report.get('recommendation', 'consider')}",
        '',
        'Executive Summary',
        report.get('executiveSummary', {}).get('summaryText', ''),
        '',
        'What They Did',
    ]

    for item in report.get('whatTheyDid', []):
        lines.append(f"- {item.get('timestamp', '')}: {item.get('message', '')}")

    lines.extend(['', 'Where They Messed Up'])
    mistakes = report.get('whereTheyMessedUp', [])
    if not mistakes:
        lines.append('- No deterministic issues were found in the stored data.')
    else:
        for item in mistakes:
            lines.append(f"- {item.get('title')}: {item.get('correction')}")

    return '\n'.join(lines)
