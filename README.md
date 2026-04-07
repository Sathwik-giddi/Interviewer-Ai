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
├── .env.example
└── ai-video-interviewer/   Original base repo (preserved)
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

## Original Base Repo

The original Flask + Gradio/HuggingFace prototype is preserved in `ai-video-interviewer/` for reference.

![Demo GIF of the AI Interviewer in action](link-to-your-demo.gif)  
*(Replace this with a demo GIF showing your app in action)*

---

## ✨ Features

- 🧠 Dynamic AI-powered interview questions using Hugging Face ([ahmedatk/ai_interviewer](https://huggingface.co/spaces/ahmedatk/ai_interviewer))
- 🎙️ Speech Recognition with `SpeechRecognition`
- 🔊 Text-to-Speech via `gTTS` and `pydub` (requires FFmpeg)
- 💬 Interactive chat UI with separate bubbles for user and interviewer
- 📁 Upload resume and job description for personalized sessions
- ⚙️ Built with Python/Flask backend and HTML/CSS/JavaScript frontend

---

## 🛠️ Tech Stack

| Layer            | Technology Used                             |
|------------------|---------------------------------------------|
| Backend          | Python, Flask, Flask-Cors                   |
| Frontend         | HTML5, CSS3, JavaScript                     |
| AI Integration   | Hugging Face Spaces, `gradio_client`        |
| Speech-to-Text   | `SpeechRecognition`                         |
| Text-to-Speech   | `gTTS`, `pydub`, FFmpeg                     |

---

## 🔧 Setup Instructions

### Prerequisites

- Python 3.8+
- FFmpeg (audio processing)

### FFmpeg Installation

- **Windows**: [Download here](https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip) → extract → add `bin/` to system PATH  
- **macOS**: `brew install ffmpeg`  
- **Linux**: `sudo apt-get install ffmpeg`  

To verify:  
```bash
ffmpeg -version
```

### Installation Steps

```bash
# Clone the repository
git clone https://github.com/your-username/ai-video-interviewer.git
cd ai-video-interviewer

# Create a virtual environment
python -m venv venv

# Activate it
source venv/bin/activate        # macOS/Linux
.\venv\Scripts\activate         # Windows

# Install Python dependencies
pip install Flask Flask-Cors gradio_client gTTS SpeechRecognition pydub

# Run the Flask app
python app.py
```

---

## 📋 How to Use

1. Visit `http://127.0.0.1:5001` in your browser.
2. Grant permission for webcam and microphone.
3. Upload your resume (PDF) and paste job description.
4. Click **Start Interview**.
5. The AI will speak a question aloud.
6. Click **Record Answer**, speak your response, then **Stop Recording**.
7. Your answer will be transcribed and sent back to the AI.
8. The AI replies and continues the dialogue.

---

## 📁 Project Structure

```
ai-video-interviewer/
├── app.py                   # Flask backend server
├── templates/
│   └── index.html           # Web interface
├── static/
│   ├── style.css            # CSS styling
│   ├── script.js            # Client-side JavaScript
│   ├── assets/
│   │   └── ai_visual.png    # Visual avatar for AI
│   └── audio/               # Folder for generated speech
├── README.md                # Project documentation
└── requirements.txt         # Python dependencies
```

---

## ❗ Troubleshooting

- **FFmpeg Audio Error:**  
  If you see `Error processing audio. Is FFmpeg correctly installed?`, ensure FFmpeg is in your system’s PATH. Verify by running `ffmpeg -version`.

- **API Model Unreachable:**  
  If Hugging Face returns a connection error, check your internet connection or firewall settings. Retry later if the model is temporarily offline.

---

## 🚀 Future Plans

- [ ] Voice tone and clarity analysis for user responses  
- [ ] Multiple AI personalities and accents  
- [ ] Save and replay previous interviews  
- [ ] Generate interview performance reports  
- [ ] Resume parsing and automatic job-specific questions

---

## 📄 License

This project is licensed under the MIT License.  
See `LICENSE.md` for full terms and conditions.

---

## 🙌 Acknowledgments

- Hugging Face model: [`ahmedatk/ai_interviewer`](https://huggingface.co/spaces/ahmedatk/ai_interviewer)  
- Libraries: Flask, gTTS, SpeechRecognition, pydub, gradio_client  
- Audio: FFmpeg for TTS conversion  
- Contributors and the open-source community for making this possible.

---

## 🎨 Bonus Branding Tip

Consider adding a branded logo and tagline, such as:

> **Qedence** – “Interview smarter. Speak bolder.”

You can include this at the top of the interface or as the favicon to solidify your project's identity.

---
