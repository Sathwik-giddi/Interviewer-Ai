# Product Requirements Document: AI Video Interviewer

Document date: 2026-05-13
Repository branch: `production-hardening-smoke-20260513-155018`
Repository base inspected: `f36d0e7`
Document source: Generated from the post-hardening local repository state.

## 1. Product Summary

AI Video Interviewer is a web-based interview platform for HR teams and candidates. It supports AI-generated interview questions, resume-based question difficulty, live HR observation, WebRTC video streaming, proctoring alerts, coding questions, voice answers, AI evaluation, ATS scoring, candidate reports, and interview link/email workflows.

Current product stage: post-hardening release candidate. The main user journeys are implemented and production hardening has been applied, but deployed end-to-end validation still requires real Firebase, Redis, TURN, Gemini, and email credentials.

## 2. Product Objective

The product is intended to reduce manual screening effort by letting HR teams create structured interview campaigns, send candidates a browser link, observe live sessions, intervene when needed, and receive AI-assisted reports after completion.

Primary outcomes:

- HR can create interview campaigns and question pools quickly.
- Candidates can join by link without heavy setup.
- Interviews can be conducted with AI voice, camera, microphone, and code editor support.
- HR can monitor candidate video, answer progress, proctoring events, and live state.
- Completed sessions produce structured reports with scores, strengths, improvement areas, and recommendations.
- Resume and ATS scoring help adapt question difficulty and eligibility decisions.

## 3. Problem Statement

Technical hiring is slow because teams manually screen resumes, schedule interviews, ask repetitive questions, observe behavior manually, and write feedback reports. This project solves that by combining AI question generation, automated resume parsing, real-time interview execution, HR live monitoring, and post-interview reporting in one application.

## 4. Target Users

### HR / Recruiter

Needs:

- Create campaigns for roles.
- Generate or send interview links.
- Track candidates and interview sessions.
- Observe live candidate interviews.
- Pause the AI and speak directly with a candidate.
- Review reports and analytics.

### Candidate

Needs:

- Join an interview from a shared link.
- Upload a resume.
- Answer spoken AI questions by voice, text, or code.
- Practice in a mock interview.
- View ATS score and past interview history.

### Admin / Operator

Needs:

- Configure Firebase, Gemini, TURN, email, and deployment variables.
- Keep signaling, backend, and frontend services running.
- Monitor health and deployment readiness.

## 5. Goals

- Provide browser-based AI interview sessions with video, audio, transcription, and scoring.
- Generate role-specific question pools from curated datasets and Gemini fallback.
- Select interview questions based on resume/job match score.
- Support live HR observation over WebRTC.
- Detect proctoring events such as tab switching, missing face, multiple faces, gaze deviation, mood alerts, and suspicious objects.
- Store session progress and reports in Firestore with in-memory fallback for local development.
- Support direct interview email delivery via Resend.
- Deploy as split services: React frontend, Flask AI backend, Node signaling server, Redis room state.

## 6. Non-Goals For Current MVP

- Fully replacing human hiring decisions.
- Advanced applicant tracking system integrations.
- Calendar scheduling integrations.
- Enterprise SSO.
- Payment or billing.
- Native mobile applications.
- Guaranteed anti-cheating prevention. Current proctoring is warning-based and browser-camera based.

## 7. Current Implementation Status

| Area | Status | Notes |
| --- | --- | --- |
| Landing page | Implemented | Product-proof landing page with actual screenshots/assets. |
| Firebase auth | Implemented | Email/password auth, anonymous candidate auth, Firestore role verification. |
| HR dashboard | Implemented | Campaigns, quick links, emailed links, recent activity. |
| Candidate dashboard | Implemented | Join interview, mock links, ATS score, history. |
| Interview room | Implemented | AI questions, voice/text/code answers, proctoring, draft persistence, reports. |
| HR observer room | Implemented | Candidate video stream, live state, proctoring panel, HR speak, custom questions. |
| Question generation | Implemented | Dataset-first selection with Gemini fallback and stub fallback. |
| Resume parsing | Implemented | PDF/DOCX parsing, skills, experience, match score. |
| ATS report | Implemented | Candidate-facing report and HR candidate scoring. |
| Code questions | Implemented | Monaco editor with six languages and syntax marker display. |
| AI evaluation | Implemented | Per-answer evaluation and final session report with fallback. |
| Email invitations | Implemented | Resend-based email sending with link storage. |
| Deployment docs | Implemented | Render + Vercel guide exists. Needs config cleanup. |
| Automated tests | Not evident | No dedicated test suite was found in package scripts. |

## 8. Key Product Workflows

### HR Campaign Workflow

1. HR signs up or logs in.
2. HR opens `/hr`.
3. HR can create a structured campaign by entering job title, job description, skills, experience, and optional sample resume.
4. Backend generates a 20-question pool using the dataset and Gemini fallback.
5. Campaign is saved in Firestore under `campaigns`.
6. HR copies a campaign/interview link or sends a link by email.
7. HR observes the interview from `/observe/:campaignId`.
8. HR reviews completed reports under `/hr/reports` or campaign sessions.

### Quick Link Workflow

1. HR creates a quick interview link without a campaign.
2. Link is stored in browser localStorage for instant use.
3. Candidate joins `/interview/:roomId`.
4. HR can observe `/observe/:roomId`.

### Emailed Interview Link Workflow

1. HR opens the link modal.
2. HR enters candidate email, name, phone, custom ID, optional campaign, and note.
3. Backend generates:
   - unique link ID,
   - room ID,
   - signed candidate token,
   - frontend URL.
4. Link is stored in Firestore `links` with in-memory fallback.
5. Email is sent through Resend.
6. Candidate opens link and is redirected into the interview room.

### Candidate Interview Workflow

1. Candidate opens an interview link.
2. Candidate grants camera and microphone permission.
3. Candidate fills name, email, phone, candidate ID, job title, job description, and optional resume.
4. Resume is parsed for match score when uploaded.
5. Backend creates/updates the interview session.
6. Backend selects 5 questions based on match score:
   - score >= 70: advanced,
   - score >= 30: intermediate,
   - otherwise: basic.
7. AI asks questions using TTS.
8. Candidate answers by recording, typing, or using the code editor.
9. Answers are transcribed and evaluated.
10. Final report is generated and persisted.

### HR Live Observation Workflow

1. HR opens observer room.
2. Socket.IO joins the HR to the room.
3. Candidate sends WebRTC stream to HR.
4. HR sees candidate video, question state, typed answer/code, proctoring alerts, and event log.
5. HR can request to speak.
6. Candidate accepts.
7. AI is paused while HR speaks.
8. HR can send a custom question and optional TTS audio.
9. HR ends speaking and AI resumes.

### Candidate Mock Interview Workflow

1. Candidate opens `/mock`.
2. Candidate enters target role and difficulty.
3. Backend selects 5 questions.
4. Candidate answers by voice, live transcription, text, or code.
5. Each answer is evaluated.
6. Mock results are shown locally and are not saved to HR reports.

### ATS Scoring Workflow

1. Candidate or HR uploads a PDF/DOCX resume.
2. Backend extracts text using `pdfplumber` or `python-docx`.
3. Backend detects skills and years of experience.
4. Backend compares detected skills to required skills/job description.
5. Output includes match score, eligibility threshold, matched skills, all detected skills, recommendation, and optional Gemini feedback.

## 9. Implemented Features

### Authentication and Roles

- Firebase email/password authentication.
- Signup stores role in Firestore `users`.
- Role-based routing for HR and candidate pages.
- Cached role fallback in localStorage for resilience.
- Anonymous Firebase sign-in is used by socket auth when an unauthenticated candidate joins by shared link.

### HR Features

- HR dashboard command center.
- Campaign creation.
- Auto-generate campaign templates for frontend, backend, fullstack, data, DevOps, mobile, QA, and ML roles.
- Quick interview link creation.
- Email interview link creation.
- Link history with copy/watch actions.
- Campaign list with question count and watch/sessions actions.
- HR analytics page with score distribution, recommendations, pass rate, activity charts.
- HR reports page with filtering and PDF export.
- HR candidates page with resume parsing, ATS eligibility, candidate status, and schedule link action.
- Campaign sessions page for per-campaign completed/in-progress sessions.

### Candidate Features

- Candidate dashboard.
- Join interview by room ID or full link.
- Mock interview.
- Mock interview email links.
- ATS score report.
- Profile resume parsing.
- Interview history.

### Interview Execution

- Browser camera and microphone capture.
- Socket.IO connection to signaling server.
- WebRTC candidate-to-HR video stream.
- Separate HR-to-candidate two-way media path during HR speak.
- AI TTS using Sarvam AI first, gTTS fallback, browser speech fallback.
- Audio recording with multiple MIME type fallbacks.
- Speech-to-text through Google Speech Recognition.
- Text answers and code answers.
- Monaco code editor for JavaScript, Python, Java, C++, TypeScript, and Go.
- Timer and per-question duration tracking.
- Conversation history panel.
- Candidate draft persistence and resume previous session flow.
- Final AI evaluation report.

### Proctoring

- face-api.js face detection.
- Face landmark based gaze deviation warning.
- Multiple face detection.
- Missing face detection.
- Facial expression/mood detection.
- TensorFlow.js COCO-SSD suspicious object detection.
- Tab switch and window blur detection.
- Violation counter with disqualification after 5 warnings.
- Proctoring alerts relayed to HR observer.
- Violations persisted through backend endpoint.

### AI and Evaluation

- Gemini `gemini-2.0-flash` used for question generation and answer evaluation when configured.
- Dataset-first question selection from CSV and JSON question data.
- Fallback stubs when dataset/Gemini are unavailable.
- Per-answer score, feedback, strengths, and improvements.
- Final overall score, summary, strengths, areas to improve, and recommendation.

### Reporting

- Candidate/session report endpoint.
- HR report list and detailed report view.
- PDF export using `jspdf` and `jspdf-autotable`.
- Deterministic candidate audit reports based on stored submissions/actions.
- Detailed report includes action logs, mistakes, violations, page visits, answer history, timing, and recommendation.

### Link and Email System

- `/api/generate-link` creates interview/mock links.
- Candidate tokens are signed with HMAC.
- Link lookup and redirect page implemented.
- Resend sends real interview invitation emails.
- Email template includes start link, candidate note, and interview preparation tips.

### Reliability Features

- Flask `MAX_CONTENT_LENGTH` payload limit.
- Flask 413 JSON error response.
- Express JSON/urlencoded payload limit.
- Frontend payload truncation utility for logs, answers, questions, and violations.
- Firestore fallback to in-memory stores for local/dev resilience.
- Redis-backed room store with memory fallback.
- TURN credential cache.
- WebRTC retry and TURN relay fallback.

## 10. Technical Architecture

The project is split into three active services:

1. Frontend: React 18 + Vite application in `frontend/`.
2. AI Backend: Flask application in `backend/`.
3. Realtime Signaling Server: Node.js + Express + Socket.IO service in `server/`.

High-level runtime flow:

```text
React frontend
  -> REST calls to Flask backend for AI, resume, TTS, STT, reporting, links
  -> Socket.IO calls to Node signaling server for rooms and WebRTC signaling
  -> Firebase Auth and Firestore for users, campaigns, sessions, links

Node signaling server
  -> Firebase Admin for token verification and role lookup
  -> Redis for room state and aliases
  -> Metered.ca for TURN credentials

Flask backend
  -> Gemini for question generation and evaluation
  -> Firebase Admin/Firestore for persistence
  -> Resend for email
  -> Sarvam AI/gTTS for text-to-speech
  -> Google Speech Recognition for transcription
```

## 11. Tech Stack

### Frontend

- React 18
- Vite
- React Router
- Firebase Auth
- Firebase Firestore
- Socket.IO client
- Monaco Editor
- Recharts
- jsPDF and jsPDF AutoTable
- face-api.js via CDN
- TensorFlow.js and COCO-SSD via CDN
- Tailwind CSS packages are installed, but most UI uses custom CSS/inline styles.

### Backend

- Python 3.10+ / Render config pins Python 3.11.0
- Flask
- Flask-CORS
- Gunicorn
- Google Generative AI SDK
- pdfplumber
- python-docx
- SpeechRecognition
- pydub
- gTTS
- Firebase Admin SDK
- requests
- python-dotenv

### Signaling Server

- Node.js 18+
- Express
- Socket.IO
- Firebase Admin SDK
- ioredis
- express-rate-limit
- cors
- dotenv

### External Services

- Firebase Authentication
- Firestore
- Google Gemini
- Google Speech Recognition
- Sarvam AI TTS
- Resend email API
- Metered.ca TURN
- Redis on Render
- Frontend deployment: Vercel recommended
- Backend/signaling deployment: Render

## 12. Main Data Stores and Collections

### Firestore Collections Used

| Collection | Purpose |
| --- | --- |
| `users` | Auth profile and role records. |
| `campaigns` | HR-created campaigns and question pools. |
| `sessions` | Interview session state, answers, evaluations, violations, reports. |
| `links` | Generated interview/mock links and email metadata. |
| `candidates` | HR-managed candidate records and ATS status. |
| `candidate_profiles` | Normalized candidate profile identity. |
| `candidate_submissions` | Draft/completed candidate assessment progress. |
| `candidate_actions` | Candidate audit trail and field/action logs. |
| `bugReports` | Signaling server bug report storage. |

### Local/In-Memory Fallback Stores

- `_sessions_store`
- `_question_pools`
- `_violation_logs`
- `_links_store`
- candidate audit module caches
- signaling `roomStore` memory cache when Redis is not configured

## 13. Backend API Surface

### Flask Backend

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/generate-question-pool` | Generate 20 campaign questions. |
| POST | `/api/select-questions` | Select 5 questions based on match score. |
| POST | `/api/evaluate-answer-ai` | Score one answer with AI feedback. |
| POST | `/api/generate-evaluation` | Generate full interview report. |
| POST | `/api/interview/start` | Create/update interview session start record. |
| POST | `/api/parse-resume` | Parse PDF/DOCX resume and calculate match score. |
| POST | `/api/transcribe` | Convert uploaded audio to text. |
| POST | `/api/text-to-speech` | Generate MP3 TTS audio. |
| POST | `/api/ats/score` | ATS score report for resume/JD. |
| POST | `/api/auto-generate-campaign` | Generate role-template campaign. |
| GET | `/api/candidate/history` | Candidate session history. |
| GET | `/api/candidate/analytics` | Candidate analytics summary. |
| GET | `/api/hr/candidates` | Candidate list for HR view. |
| GET | `/api/hr/analytics` | HR analytics summary. |
| GET | `/api/test-question-selection` | Diagnostic question selection. |
| GET | `/api/dataset-stats` | Dataset stats. |
| POST | `/api/interview/violation` | Log proctoring violation. |
| GET | `/api/interview/report/<session_id>` | Get interview report. |
| GET | `/api/candidate/lookup` | Lookup candidate draft by signed token. |
| POST | `/api/candidate/progress` | Save candidate draft/progress. |
| POST | `/api/candidate/actions` | Persist candidate action audit events. |
| GET | `/api/report/<candidate_id>` | Deterministic candidate report. |
| GET | `/api/health` | Backend health. |
| POST | `/api/generate-link` | Create interview/mock link and optionally email it. |
| GET | `/api/links` | List generated links by creator. |
| GET | `/api/link/<link_id>` | Validate link and mark used. |

### Node Signaling Server

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/health` | Signaling health check. |
| POST | `/api/auth/custom-token` | Demo HR custom token helper. |
| GET | `/api/turn-credentials` | Authenticated TURN credential fetch. |
| GET | `/api/turn-credentials/validate` | Validate cached TURN status. |
| POST | `/api/turn-credentials/refresh` | Refresh TURN credential cache. |
| POST | `/api/bug-report` | Authenticated bug report submission. |

## 14. Socket.IO Event Surface

Core room and WebRTC events:

- `join-room`
- `register-observer-alias`
- `request-stream`
- `offer`
- `answer`
- `ice-candidate`
- `peer-joined`
- `peer-left`
- `room-state`
- `room-locked`

HR intervention events:

- `hr-speak-request`
- `hr-speak-accept`
- `hr-speak-accepted`
- `hr-speak-end`
- `ai-pause`
- `ai-resume`
- `hr-offer`
- `candidate-answer`
- `hr-ice-candidate`
- `hr-custom-question`
- `hr-question-audio`

Live monitoring events:

- `interview-state`
- `candidate-typing`
- `ai-speaking`
- `answer-submitted`
- `proctoring-alert`
- `proctoring-state`
- `interview-ended`

## 15. Question and AI Design

Question selection order:

1. Load curated CSV/JSON datasets from `backend/data`.
2. Match role, description, skills, category, subject, and difficulty.
3. Prefer balanced pools for campaigns: about 7 basic, 7 intermediate, 6 advanced.
4. Supplement with Gemini if fewer than required.
5. Use fallback stub questions if dataset and Gemini fail.

Resume match score affects interview difficulty:

- `>= 70`: advanced questions.
- `30-69`: intermediate questions.
- `< 30`: basic questions.

Evaluation:

- Each answer can be evaluated with score 1-10.
- Final report converts question evaluations into overall 0-100 score.
- Output includes summary, strengths, areas to improve, and recommendation.

## 16. Security, Privacy, and Compliance Notes

Implemented:

- Firebase ID token verification on signaling server.
- Socket auth middleware.
- Socket role validation.
- User ID mismatch rejection.
- Room membership validation before relay.
- Rate limiting for TURN and bug-report endpoints.
- HMAC-signed candidate links.
- In-memory fallback avoids hard failure in local dev.
- Candidate action logs sanitize sensitive fields in audit module.

Needs attention before production:

- Remove any static secrets from deployment files and use secret environment variables.
- Confirm Firebase anonymous auth is intentionally enabled for guest interview links.
- Tighten Flask CORS from `"*"` to known frontend origins.
- Revisit `ProtectedRoute` behavior when `userRole` is null.
- Add retention policy for recordings, reports, action logs, and generated TTS audio files.
- Add consent language for video recording/proctoring and AI evaluation.

## 17. Deployment Model

Recommended deployment from repository docs:

- Frontend: Vercel, root `frontend`, Vite build.
- Flask backend: Render web service, root `backend`, Gunicorn start command.
- Signaling server: Render web service, root `server`, Node start command.
- Redis: Render Redis service for room state.
- TURN: Metered.ca.

Important environment variables:

- `GEMINI_API_KEY`
- `SARVAM_API_KEY`
- `FIREBASE_SERVICE_ACCOUNT_PATH`
- `RESEND_API_KEY`
- `FROM_EMAIL`
- `REPLY_TO_EMAIL`
- `PUBLIC_URL`
- `CLIENT_ORIGIN`
- `METERED_API_KEY`
- `TURN_USERNAME`
- `TURN_CREDENTIAL`
- `REDIS_URL`
- `MAX_PAYLOAD_SIZE_MB`
- `VITE_FIREBASE_*`
- `VITE_BACKEND_URL`
- `VITE_SIGNALING_URL`
- `VITE_PUBLIC_APP_URL`

## 18. Bug Fixes and Stability Work

This section combines git history and code-level fixes visible in the repository.

### Git-Derived Fix History

| Commit | Change |
| --- | --- |
| `3bed666` | Removed tracked Firebase API key from repo. |
| `08c3a6b` | Sanitized environment files. |
| `7f179f6` | Prepared production deployment and fixed interview flows. |
| `ece392c` | Pinned backend Python version for Render. |
| `53ea497` | Made shared interview links Render-safe. |
| `c046fd2` | Made frontend layouts responsive across breakpoints. |
| `8bc25f5` | Added candidate prefill audit trail and deterministic reports. |
| `3edd3b0` | Fixed observer proctoring state and stream retry handling. |
| `686205e` | Hardened observer stream playback and room alias joins. |
| `110fcc1` | Stopped observer retry thrash and resumed WebRTC audio. |
| `a67218b` | Fixed two-way WebRTC HR-candidate flow and 13 signaling-server issues. |
| `6948f40` | Implemented robust TURN config with Metered.ca dynamic API and static fallback. |
| `d6ae244` | Added socket auth, role checks, rate limiting, and dynamic TURN credentials. |
| `7f3586d` | Added 413 payload handler, WebRTC config fixes, socket auth, role security, and ICE candidate fixes. |
| `a604608` | Removed `node_modules` from git and fixed `.gitignore` patterns. |
| `66a9ba9` | Added missing dependencies to `server/package.json`. |

### Code-Level Stability Fixes

- Payload size handling added in Flask and Express to reduce 413 failures.
- Frontend payload truncation utility added for oversized logs, stack traces, answers, questions, and violations.
- Socket authentication added through Firebase ID tokens.
- Socket role mismatch and user ID mismatch are rejected.
- Signaling relay validates room membership before relaying.
- ICE candidates are sent to specific peers instead of broadcast.
- Buffered ICE candidates are flushed after remote description is set.
- WebRTC config is awaited before creating `RTCPeerConnection`.
- TURN relay fallback triggers after failed/disconnected peer connection state.
- Candidate stream retries are tracked and cleaned up.
- Observer only marks stream active after real video tracks arrive.
- Room aliases support campaign observer rooms that differ from candidate room IDs.
- Disconnect cleanup now removes sockets from every joined room.
- Duplicate candidate room access is locked.
- Redis Lua scripts make add/remove participant operations atomic.
- Frontend runtime config avoids using localhost API URLs from a public browser.
- Auth role verification avoids client-side URL or cache-based privilege assumptions.
- Candidate progress is persisted periodically and on unload.
- Candidate action logging records field edits, navigation, answers, and proctoring events.
- Deterministic candidate reports are generated from stored actions/submissions.
- Resend email path now sends interview links directly to candidate email.
- TTS has Sarvam, gTTS, and browser fallback paths.
- Speech recording tries multiple MIME types for browser compatibility.

## 19. Known Issues and Risks

These are current risks that remain after the production hardening pass.

1. Full production smoke testing still requires real deployed services and secrets: Firebase, Redis, Metered TURN, Gemini/Sarvam or fallback TTS, Firestore, and Resend.
2. Automated unit/integration/e2e test suites are still not visible in package scripts. Current validation is build/syntax/compile smoke coverage plus manual release checklist.
3. Firebase Anonymous auth must be enabled for guest candidate links.
4. Required deployment secrets must be configured in Render/Vercel before launch, especially `METERED_API_KEY`, `TURN_DOMAIN`, `TURN_USERNAME`, `TURN_CREDENTIAL`, `REDIS_URL`, `CORS_ORIGINS`, and `CANDIDATE_TOKEN_SECRET`.
5. Firestore indexes for sessions, links, and analytics queries must be verified in Firebase before production load.
6. Redis-backed room state now fails closed in production. This prevents silent split-brain state, but Redis outages will temporarily block new room mutations until Redis recovers.
7. face-api.js, TensorFlow.js, and COCO-SSD depend on runtime model loading. CDN or model load failure can degrade proctoring.
8. Frontend production build still emits large chunk warnings. This is acceptable for launch but should be tracked as performance debt.

## 20. Success Metrics

Suggested product metrics:

- Campaign creation completion rate.
- Interview link open rate.
- Candidate setup completion rate.
- Interview completion rate.
- Average time to complete interview.
- Report generation success rate.
- WebRTC connection success rate.
- TURN relay fallback rate.
- Proctoring warning frequency.
- HR report review rate.
- Email delivery success rate.

## 21. Acceptance Criteria

### MVP Functional Acceptance

- HR can sign up, log in, and access HR dashboard.
- Candidate can sign up, log in, and access candidate dashboard.
- HR can create a campaign and generate a question pool.
- HR can generate and copy a quick interview link.
- HR can send an interview email through Resend when configured.
- Candidate can open a shared interview link.
- Candidate can grant camera/microphone permissions and begin.
- Resume upload can parse PDF/DOCX and calculate match score.
- Interview starts with 5 selected questions.
- AI speaks each question.
- Candidate can answer text questions by recording or typing.
- Candidate can answer code questions in Monaco editor.
- HR can observe live candidate video.
- HR can see answer/proctoring/question state.
- HR can request to speak and pause AI.
- Proctoring violations are logged.
- Final evaluation report is generated.
- HR can review and export report.

### Production Readiness Acceptance

- All required environment variables are documented and configured.
- No secrets are committed in repo files.
- Render signaling server starts successfully with production env vars.
- Vercel frontend points to deployed backend and signaling URLs.
- Firebase Auth providers are enabled.
- Firestore security rules are reviewed.
- CORS is restricted to known frontend origins.
- TURN credentials endpoint works with authenticated requests.
- WebRTC works across different networks.
- Report generation handles large payloads without 413 failures.
- Basic e2e smoke tests pass for HR, candidate, interview, observer, and report flows.

## 22. Recommended Next Milestones

### Milestone 1: Deployment Fix Pass

- Add `METERED_API_KEY` to Render env configuration.
- Remove static TURN credential values from `render.yaml`.
- Align backend local port across README, `.env.example`, and `backend/app.py`.
- Confirm `CLIENT_ORIGIN` is the real frontend origin.
- Route bug reports to the correct signaling server URL or move the endpoint to Flask.

### Milestone 2: Security Hardening

- Restrict Flask CORS.
- Rework role loading so protected HR pages do not render when role is unknown.
- Add Firestore security rules review.
- Add retention policy and cleanup for generated audio.
- Add candidate consent and privacy disclosures.

### Milestone 3: QA and Test Coverage

- Add backend endpoint tests for question generation, resume parsing, links, session start, evaluation, and reports.
- Add signaling server tests for auth, room lock, aliasing, and relay validation.
- Add frontend smoke tests for HR create campaign, candidate interview, observer view, and report export.
- Add deployment smoke checklist.

### Milestone 4: Product Polish

- Improve candidate setup guidance for browser permissions.
- Add better failure states for TTS/STT/WebRTC.
- Add report search/filtering by campaign, candidate, status, and recommendation.
- Add HR notes and final decision workflow.
- Add calendar scheduling integration if needed.

## 23. Repository Map

```text
backend/
  app.py                  Flask API, AI, resume parsing, TTS/STT, links, reports
  question_service.py     Dataset loading and question selection
  candidate_audit.py      Candidate identity, progress, action logs, reports
  email_service.py        Resend email delivery
  firebase_service.py     Firebase Admin / Firestore helper
  data/                   CSV/JSON question datasets

server/
  server.js               Express + Socket.IO signaling, TURN, bug reports
  roomStore.js            Redis/memory room and alias state
  scripts/                HR user helper script

frontend/
  src/App.jsx             Routes and protected route structure
  src/context/            Auth context
  src/pages/              HR, candidate, interview, observer, report pages
  src/components/         Navbar, code editor, modal, link, proctoring, voice UI
  src/lib/                Runtime config, socket auth, WebRTC config
  src/utils/              API payload safety utility
  public/models/          face-api model files
```

## 24. Final Product Assessment

The project is already implemented as a substantial multi-service interview platform. It is no longer just a prototype: HR, candidate, live observation, AI question/evaluation, resume parsing, proctoring, email links, and reports all exist in code.

The main thing left is hardening. The product needs deployment configuration fixes, secret cleanup, role/security tightening, automated tests, and production smoke testing. After those are addressed, it can be treated as a production candidate rather than a demo MVP.
