# Production Deployment

This project should be deployed as a split stack:

- `frontend/` on Vercel
- `backend/` on Render, Railway, Fly.io, or another Python host
- `server/` on Render, Railway, Fly.io, or another Node host

## Why not full Vercel?

The frontend is a great fit for Vercel.

The Flask backend can run on Vercel as a single Python function, but this app also depends on:

- generated audio files
- heavier Python dependencies
- longer-running interview/report flows
- a dedicated Socket.IO signaling server for live HR observation and WebRTC coordination

For the signaling server in particular, this repo is built around a standalone Express + Socket.IO process. Keep that on a normal Node host.

## 1. Push the repo to GitHub

```bash
git add .
git commit -m "Prepare production deployment"
git push origin main
```

## 2. Deploy the frontend to Vercel

In Vercel:

1. Import the GitHub repository.
2. Set the Root Directory to `frontend`.
3. Framework preset: `Vite`.
4. Build command: `npm run build`
5. Output directory: `dist`

The file [frontend/vercel.json](/Users/sathwik/Desktop/Ai-Video-Interviewer%2012.35.08%E2%80%AFPM/frontend/vercel.json) already rewrites SPA routes to `index.html`.

Set these Vercel environment variables from [frontend/.env.production.example](/Users/sathwik/Desktop/Ai-Video-Interviewer%2012.35.08%E2%80%AFPM/frontend/.env.production.example):

- `VITE_BACKEND_URL`
- `VITE_SIGNALING_URL`
- `VITE_PUBLIC_APP_URL`
- all `VITE_FIREBASE_*` values

## 3. Deploy the Flask backend

Recommended hosts:

- Render
- Railway
- Fly.io

Use `backend/` as the service root.

Install command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
gunicorn --bind 0.0.0.0:$PORT app:app
```

Environment variables:

- `GEMINI_API_KEY`
- `FIREBASE_SERVICE_ACCOUNT_PATH`
- `PUBLIC_URL`
- `RESEND_API_KEY`
- `FROM_EMAIL`
- `REPLY_TO_EMAIL`
- any other production secrets you need

Important:

- `PUBLIC_URL` should be your deployed frontend URL, for example `https://your-app.vercel.app`
- the Firebase service account JSON must be provided securely on the host

## 4. Deploy the signaling server

Use `server/` as the service root.

Install command:

```bash
npm install
```

Start command:

```bash
node server.js
```

Environment variables:

- `PORT`
- `CLIENT_ORIGIN`

Set `CLIENT_ORIGIN` to your Vercel frontend URL, for example:

```bash
CLIENT_ORIGIN=https://your-app.vercel.app
```

## 5. Update production frontend variables

Once backend and signaling are deployed, set these in Vercel:

```bash
VITE_BACKEND_URL=https://your-backend-service.example.com
VITE_SIGNALING_URL=https://your-signaling-service.example.com
VITE_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
```

Then redeploy the frontend.

## 6. Firebase and email checklist

- Enable Firebase Email/Password auth
- Ensure Firestore rules/indexes allow the app flows you need
- Keep `backend/serviceAccount.json` out of git
- Use a valid Resend API key
- Verify the sender domain/address in Resend if you want direct external delivery

## 7. Final production checks

Test these flows after deploy:

1. Sign up / login
2. Create interview link
3. Candidate joins interview
4. HR observer can see live candidate video
5. Interview completes
6. Report appears in HR dashboard, HR reports, and campaign sessions
