"""
Question Service — loads CSV + JSON datasets, selects relevant questions
by matching role/description keywords against question metadata.

Falls back gracefully if data files are missing.
"""

import os
import csv
import json
import re
from collections import defaultdict

# ── Paths ────────────────────────────────────────────────────────────────────
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
CSV_PATH = os.path.join(DATA_DIR, 'questions.csv')
JSON_PATH = os.path.join(DATA_DIR, 'questions.json')

# ── Cached question pool (loaded once at import / first call) ────────────────
_all_questions: list = []
_loaded = False

# ── Difficulty normalization map ─────────────────────────────────────────────
_DIFF_MAP = {
    'easy': 'basic',
    'medium': 'intermediate',
    'hard': 'advanced',
    'beginner': 'basic',
    'intermediate': 'intermediate',
    'advanced': 'advanced',
    'basic': 'basic',
}

# ── Category → role keyword mapping ──────────────────────────────────────────
# Maps CSV categories and JSON subfields to searchable role keywords
_CATEGORY_KEYWORDS = {
    # CSV categories
    'general programming': ['software', 'engineer', 'developer', 'programming', 'oop', 'general'],
    'data structures': ['software', 'engineer', 'developer', 'data structures', 'algorithms', 'dsa'],
    'algorithms': ['software', 'engineer', 'developer', 'algorithms', 'dsa', 'competitive'],
    'languages and frameworks': ['developer', 'engineer', 'javascript', 'python', 'java', 'react', 'node'],
    'front-end': ['frontend', 'front-end', 'react', 'angular', 'vue', 'ui', 'ux', 'web'],
    'back-end': ['backend', 'back-end', 'server', 'api', 'node', 'django', 'flask', 'spring'],
    'full-stack': ['fullstack', 'full-stack', 'full stack', 'developer', 'engineer'],
    'database and sql': ['database', 'sql', 'data', 'backend', 'dba', 'postgresql', 'mysql', 'mongodb'],
    'devops': ['devops', 'sre', 'infrastructure', 'cloud', 'aws', 'docker', 'kubernetes', 'ci/cd'],
    'security': ['security', 'cybersecurity', 'infosec', 'penetration', 'secure'],
    'software testing': ['qa', 'testing', 'quality', 'test', 'automation', 'selenium', 'cypress'],
    'system design': ['system design', 'architecture', 'senior', 'lead', 'principal', 'staff'],
    'data engineering': ['data engineer', 'etl', 'pipeline', 'spark', 'airflow', 'kafka'],
    # JSON subfields
    'programming': ['software', 'engineer', 'developer', 'programming', 'code'],
    'web development': ['web', 'frontend', 'backend', 'fullstack', 'developer', 'react', 'node'],
    'mobile development': ['mobile', 'ios', 'android', 'react native', 'flutter', 'swift', 'kotlin'],
    'machine learning': ['ml', 'machine learning', 'ai', 'data science', 'deep learning', 'nlp', 'tensorflow'],
    'databases': ['database', 'sql', 'nosql', 'data', 'backend', 'postgresql', 'mongodb'],
    'cybersecurity': ['security', 'cybersecurity', 'infosec', 'secure'],
    'game development': ['game', 'unity', 'unreal', 'game developer'],
}


def _normalize_difficulty(raw: str) -> str:
    """Normalize difficulty string to basic/intermediate/advanced."""
    return _DIFF_MAP.get(raw.strip().lower(), 'intermediate')


def _load_csv() -> list:
    """Load questions from CSV file."""
    questions = []
    if not os.path.exists(CSV_PATH):
        print(f"[QuestionService] CSV not found at {CSV_PATH}")
        return questions

    try:
        with open(CSV_PATH, 'r', encoding='utf-8', errors='replace') as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                q_text = row.get('Question', '').strip()
                if not q_text:
                    continue
                questions.append({
                    'id': f'csv_{i+1}',
                    'text': q_text,
                    'modelAnswer': row.get('Answer', '').strip(),
                    'rubric': f"Evaluate depth of understanding in {row.get('Category', 'general').strip()}.",
                    'difficulty': _normalize_difficulty(row.get('Difficulty', 'Medium')),
                    'type': 'code' if _is_code_question(q_text) else 'text',
                    'category': row.get('Category', '').strip().lower(),
                    'source': 'csv',
                    'usedCount': 0,
                })
        print(f"[QuestionService] Loaded {len(questions)} questions from CSV")
    except Exception as e:
        print(f"[QuestionService] Error loading CSV: {e}")

    return questions


def _load_json() -> list:
    """Load CS questions from JSON file (filters to Computer Science field only)."""
    questions = []
    if not os.path.exists(JSON_PATH):
        print(f"[QuestionService] JSON not found at {JSON_PATH}")
        return questions

    try:
        with open(JSON_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)

        raw_qs = data.get('questions', data) if isinstance(data, dict) else data

        for i, item in enumerate(raw_qs):
            # Only include Computer Science questions
            if item.get('field', '') != 'Computer Science':
                continue

            q_text = item.get('question', '').strip()
            if not q_text:
                continue

            answer = item.get('answer', '').strip()
            # Truncate very long answers for model answer
            model_answer = answer[:500] + '...' if len(answer) > 500 else answer

            subfield = item.get('subfield', '').strip()
            subject = item.get('subject', '').strip()

            questions.append({
                'id': f'json_{item.get("question_no", i+1)}',
                'text': q_text,
                'modelAnswer': model_answer,
                'rubric': f"Evaluate understanding of {subject} in {subfield}.",
                'difficulty': _normalize_difficulty(item.get('tier', 'intermediate')),
                'type': 'code' if _is_code_question(q_text) else 'text',
                'category': subfield.lower(),
                'subject': subject.lower(),
                'source': 'json',
                'usedCount': 0,
            })
        print(f"[QuestionService] Loaded {len(questions)} CS questions from JSON")
    except Exception as e:
        print(f"[QuestionService] Error loading JSON: {e}")

    return questions


def _is_code_question(text: str) -> bool:
    """Heuristic to detect if a question is likely a coding question."""
    code_markers = [
        'implement', 'write a function', 'write a program', 'code',
        'algorithm to', 'write code', 'design a class', 'create a function',
        'build a', 'develop a', 'implement a',
    ]
    text_lower = text.lower()
    return any(m in text_lower for m in code_markers)


def _tokenize(text: str) -> set:
    """Split text into lowercase word tokens, removing short/stop words."""
    stop_words = {
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
        'and', 'or', 'but', 'if', 'then', 'else', 'when', 'at', 'by', 'for',
        'with', 'about', 'against', 'between', 'through', 'during', 'before',
        'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out',
        'on', 'off', 'over', 'under', 'again', 'further', 'once', 'here',
        'there', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
        'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
        'so', 'than', 'too', 'very', 'just', 'because', 'as', 'of', 'it',
        'its', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'we', 'you',
        'your', 'he', 'she', 'they', 'what', 'which', 'who', 'whom', 'how',
    }
    words = set(re.findall(r'[a-z0-9#+.]+', text.lower()))
    return words - stop_words


def load_all_questions():
    """Load and cache all questions from CSV + JSON. Call once at startup."""
    global _all_questions, _loaded
    if _loaded:
        return _all_questions

    csv_qs = _load_csv()
    json_qs = _load_json()
    _all_questions = csv_qs + json_qs
    _loaded = True

    print(f"[QuestionService] Total cached questions: {len(_all_questions)}")
    return _all_questions


def select_questions_by_role(
    role: str,
    description: str = '',
    num_questions: int = 5,
    difficulty: str = '',
) -> list:
    """
    Select the most relevant questions for a given role and description.

    Scoring:
      - Exact category match via _CATEGORY_KEYWORDS → +10 per keyword hit
      - Role keyword appears in question text → +3
      - Description keyword appears in question text → +2
      - Subject/category keyword overlap → +5
      - Difficulty preference bonus → +4

    Returns top num_questions sorted by relevance score.
    """
    pool = load_all_questions()
    if not pool:
        return []

    role_lower = role.strip().lower()
    desc_lower = description.strip().lower()
    role_tokens = _tokenize(role_lower)
    desc_tokens = _tokenize(desc_lower)
    all_input_tokens = role_tokens | desc_tokens

    # Determine preferred difficulty from input
    if difficulty:
        pref_diff = _normalize_difficulty(difficulty)
    else:
        # Infer from role keywords
        if any(w in role_lower for w in ['senior', 'lead', 'principal', 'staff', 'architect']):
            pref_diff = 'advanced'
        elif any(w in role_lower for w in ['junior', 'intern', 'entry', 'fresher', 'trainee']):
            pref_diff = 'basic'
        else:
            pref_diff = 'intermediate'

    # Find which categories match the role
    matching_categories = set()
    for cat, keywords in _CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in role_lower or kw in desc_lower:
                matching_categories.add(cat)
                break

    # If no categories matched, add some defaults for software roles
    if not matching_categories:
        matching_categories = {'general programming', 'programming', 'data structures'}

    scored = []
    for q in pool:
        score = 0.0
        q_cat = q.get('category', '')
        q_subject = q.get('subject', '')
        q_text_lower = q['text'].lower()
        q_tokens = _tokenize(q_text_lower)

        # Category match (strongest signal)
        if q_cat in matching_categories:
            score += 15

        # Category keywords in question text
        for cat in matching_categories:
            cat_kws = _CATEGORY_KEYWORDS.get(cat, [])
            for kw in cat_kws:
                if kw in q_text_lower:
                    score += 3
                    break

        # Role token matches in question text
        role_overlap = role_tokens & q_tokens
        score += len(role_overlap) * 4

        # Description token matches in question text
        desc_overlap = desc_tokens & q_tokens
        score += len(desc_overlap) * 2

        # Subject relevance
        if q_subject:
            subj_tokens = _tokenize(q_subject)
            subj_overlap = all_input_tokens & subj_tokens
            score += len(subj_overlap) * 5

        # Difficulty preference bonus
        if q.get('difficulty') == pref_diff:
            score += 4

        # Small penalty for already-used questions
        score -= q.get('usedCount', 0) * 0.5

        if score > 0:
            scored.append((score, q))

    # Sort by score descending
    scored.sort(key=lambda x: -x[0])

    # Select top N, ensuring difficulty mix if possible
    selected = []
    seen_texts = set()

    for _, q in scored:
        # Dedup by similar text (first 80 chars)
        text_key = q['text'][:80].lower()
        if text_key in seen_texts:
            continue
        seen_texts.add(text_key)
        selected.append(q)
        if len(selected) >= num_questions:
            break

    # Return copies to avoid mutating the cached pool
    result = []
    for q in selected:
        copy = dict(q)
        copy['usedCount'] = q.get('usedCount', 0) + 1
        q['usedCount'] = copy['usedCount']  # update cache count
        result.append(copy)

    return result


def select_questions_for_pool(
    role: str,
    description: str = '',
    skills: str = '',
    num_questions: int = 20,
) -> list:
    """
    Select a larger pool of questions (e.g., 20) for a campaign.
    Ensures a mix of difficulties: ~7 basic, ~7 intermediate, ~6 advanced.
    """
    pool = load_all_questions()
    if not pool:
        return []

    # Combine role + description + skills for broader matching
    combined = f"{role} {description} {skills}"
    combined_tokens = _tokenize(combined.lower())

    matching_categories = set()
    for cat, keywords in _CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in combined.lower():
                matching_categories.add(cat)
                break

    if not matching_categories:
        matching_categories = {'general programming', 'programming'}

    # Score all questions
    scored_by_diff = {'basic': [], 'intermediate': [], 'advanced': []}

    for q in pool:
        score = 0.0
        q_cat = q.get('category', '')
        q_text_lower = q['text'].lower()
        q_tokens = _tokenize(q_text_lower)

        if q_cat in matching_categories:
            score += 15

        token_overlap = combined_tokens & q_tokens
        score += len(token_overlap) * 3

        if q.get('subject'):
            subj_overlap = combined_tokens & _tokenize(q['subject'])
            score += len(subj_overlap) * 5

        score -= q.get('usedCount', 0) * 0.5

        if score > 0:
            diff = q.get('difficulty', 'intermediate')
            scored_by_diff.setdefault(diff, []).append((score, q))

    # Sort each difficulty bucket
    for diff in scored_by_diff:
        scored_by_diff[diff].sort(key=lambda x: -x[0])

    # Pick balanced mix: 7 basic, 7 intermediate, 6 advanced
    targets = {'basic': 7, 'intermediate': 7, 'advanced': 6}
    selected = []
    seen_texts = set()

    for diff, count in targets.items():
        bucket = scored_by_diff.get(diff, [])
        picked = 0
        for _, q in bucket:
            text_key = q['text'][:80].lower()
            if text_key in seen_texts:
                continue
            seen_texts.add(text_key)
            selected.append(q)
            picked += 1
            if picked >= count:
                break

    # If we don't have enough, fill from any difficulty
    if len(selected) < num_questions:
        all_scored = []
        for diff_list in scored_by_diff.values():
            all_scored.extend(diff_list)
        all_scored.sort(key=lambda x: -x[0])
        for _, q in all_scored:
            if len(selected) >= num_questions:
                break
            text_key = q['text'][:80].lower()
            if text_key not in seen_texts:
                seen_texts.add(text_key)
                selected.append(q)

    # Return copies with assigned IDs to avoid mutating cached pool
    result = []
    for i, q in enumerate(selected[:num_questions]):
        copy = dict(q)
        copy['id'] = f'ds_q{i+1}'
        copy['usedCount'] = q.get('usedCount', 0) + 1
        q['usedCount'] = copy['usedCount']  # update cache count
        result.append(copy)

    return result


def get_dataset_stats() -> dict:
    """Return stats about the loaded dataset for diagnostics."""
    pool = load_all_questions()
    cats = defaultdict(int)
    diffs = defaultdict(int)
    sources = defaultdict(int)
    for q in pool:
        cats[q.get('category', 'unknown')] += 1
        diffs[q.get('difficulty', 'unknown')] += 1
        sources[q.get('source', 'unknown')] += 1

    return {
        'total': len(pool),
        'categories': dict(cats),
        'difficulties': dict(diffs),
        'sources': dict(sources),
    }
