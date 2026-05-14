# AI Video Interviewer

A production-ready AI-powered interview platform featuring Gemini AI question generation, ATS resume parsing, live HR monitoring, face proctoring, Monaco code editor, and Firebase auth — all styled with the Agentica 2.0 design system.

Production deployment notes are in [DEPLOYMENT.md](/Users/sathwik/Desktop/Ai-Video-Interviewer%2012.35.08%E2%80%AFPM/DEPLOYMENT.md).

---

## Quick Start

### Prerequisites
- Python 3.10+, Node.js 18+, ffmpeg (`brew install ffmpeg`)

### 1. Environment Variables

```bash
cp .env.example backend/.env
cp .env.example server/.env
cp .env.example frontend/.env
```

Edit each `.env`:
- **`GEMINI_API_KEY`** — from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **`FIREBASE_SERVICE_ACCOUNT_PATH`** — Firebase Console → Project Settings → Service Accounts → Generate key → save as `backend/serviceAccount.json`

### 2. Firebase Setup

1. In [Firebase Console](https://console.firebase.google.com), select project `interviwer-9ef9c`
2. Enable **Authentication → Email/Password**
3. Enable **Firestore Database** (test mode)

### 3. Backend (Flask, port 5000)

```bash
cd backend
pip install -r requirements.txt
python3 app.py
```

### 4. Signaling Server (Node.js, port 3000)

```bash
cd server
npm install
node server.js
```

### 5. Frontend (React/Vite, port 5173)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

---

## Features

| Feature | Details |
|---------|---------|
| Gemini AI Questions | 20 questions/campaign (basic / intermediate / advanced) |
| ATS Resume Parser | PDF + DOCX → skills, years experience, match score |
| Dynamic Selection | 5 questions chosen by difficulty from match score |
| Code Editor | Monaco with syntax checking, 6 languages |
| Face Proctoring | face-api.js: gaze, multiple faces, off-screen |
| HR Live Monitor | Observe silently; request-to-speak pauses AI |
| Firebase Auth | Email/password, role-based routing (HR / Candidate) |
| Evaluation Report | Per-question scores + overall score + AI feedback |

---

## Project Structure

```
Ai-Video-Interviewer/
├── backend/           Flask AI service (Gemini, resume, TTS, evaluation)
│   ├── app.py
│   ├── firebase_service.py
│   └── requirements.txt
├── server/            Node.js WebRTC signaling + HR observer
│   ├── server.js
│   └── package.json
├── frontend/          React 18 + Vite
│   ├── src/
│   │   ├── App.jsx
│   │   ├── firebase.js
│   │   ├── context/AuthContext.jsx
│   │   ├── components/  (Navbar, ProtectedRoute, CodeEditor)
│   │   ├── pages/       (Landing, Login, Signup, HRDashboard, CandidateDashboard, InterviewRoom, ReportView)
│   │   └── styles/      (design-system.css, animations.css)
│   └── package.json
└── .env.example
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/generate-question-pool` | 20 Gemini questions for a campaign |
| POST | `/api/select-questions` | 5 questions by match score |
| POST | `/api/evaluate-answer-ai` | Score one answer (1–10) |
| POST | `/api/generate-evaluation` | Full session report |
| POST | `/api/parse-resume` | Skills/experience from PDF or DOCX |
| POST | `/api/transcribe` | Audio → text |
| POST | `/api/text-to-speech` | Text → MP3 URL |
| GET  | `/api/health` | Health check |

---

## Design System (Agentica 2.0)

| Token | Value |
|-------|-------|
| Primary | `#7353F6` |
| Background | `#ffffff` |
| Text | `#2C2C2C` |
| Border | `#EBEBEB` |
| Border radius | `0px` |
| Heading font | Bebas Neue |
| Body font | Montserrat |

---

## 📄 License

This project is licensed under the MIT License.  
See `LICENSE.md` for full terms and conditions.

---

## 🙌 Acknowledgments

- Google Gemini and supporting AI APIs used by the backend.
- Firebase, Flask, React, Socket.IO, Redis, and WebRTC ecosystem libraries.
- Audio and media tooling used for transcription, TTS, and browser recording.
- Contributors and the open-source community for making this possible.

---

## 🎨 Bonus Branding Tip

Consider adding a branded logo and tagline, such as:

> **Qedence** – “Interview smarter. Speak bolder.”

You can include this at the top of the interface or as the favicon to solidify your project's identity.

---
