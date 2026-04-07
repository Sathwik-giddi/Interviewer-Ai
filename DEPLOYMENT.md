# Production Deployment Guide

This project is deployed as a split stack:

- **Frontend** (`frontend/`) on Vercel
- **Flask Backend** (`backend/`) on Render
- **Signaling Server** (`server/`) on Render

## Quick Deploy with Render

This repository includes a [`render.yaml`](render.yaml) file for one-click deployment.

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Prepare production deployment with TURN server support"
git push origin main
```

### Step 2: Deploy to Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New +** → **Blueprint**
3. Connect your GitHub repository
4. Render will auto-detect the `render.yaml` configuration
5. Fill in the required environment variables (marked as "sync: false")
6. Click **Apply** to deploy both services

### Step 3: Configure Environment Variables

After deploying, set these variables in the Render dashboard:

#### Signaling Server (`ai-interviewer-signaling`)

| Variable | Description | Example |
|----------|-------------|---------|
| `CLIENT_ORIGIN` | Your frontend URL | `https://your-app.vercel.app` |
| `TURN_USERNAME` | TURN username from Metered | `6695d7efa747633e5deeace9` |
| `TURN_CREDENTIAL` | TURN credential from Metered | `BSEyIggm5WJlQi4O` |
| `TURN_DOMAIN` | Your Metered domain | `sathwik-interviewer.metered.ca` |

#### Flask Backend (`ai-interviewer-backend`)

| Variable | Description | Example |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | `AIzaSy...` |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to Firebase service account | `./serviceAccount.json` |
| `PUBLIC_URL` | Your frontend URL | `https://your-app.vercel.app` |
| `RESEND_API_KEY` | Resend email API key | `re_...` |
| `FROM_EMAIL` | Verified sender email | `AI Interviewer <noreply@yourdomain.com>` |
| `REPLY_TO_EMAIL` | Reply-to email | `support@yourdomain.com` |

### Step 4: Deploy Frontend to Vercel

1. Go to [Vercel](https://vercel.com/)
2. Import your GitHub repository
3. Set Root Directory to `frontend`
4. Framework preset: **Vite**
5. Set these environment variables:

```env
VITE_BACKEND_URL=https://ai-interviewer-backend.onrender.com
VITE_SIGNALING_URL=https://ai-interviewer-signaling.onrender.com
VITE_PUBLIC_APP_URL=https://your-app.vercel.app
# Plus all VITE_FIREBASE_* variables
```

6. Deploy!

---

## Manual Deployment (Alternative)

If you prefer not to use Render's Blueprint:

### Deploy Signaling Server to Render

1. Create a new **Web Service** on Render
2. Set Root Directory to `server/`
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Add environment variables (see table above)

### Deploy Flask Backend to Render

1. Create a new **Web Service** on Render
2. Set Root Directory to `backend/`
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `gunicorn --bind 0.0.0.0:$PORT app:app`
5. Add environment variables (see table above)

---

## TURN Server Setup

The app uses Metered.ca for TURN servers to enable global WebRTC connectivity.

### Configuration (Static Credentials)

1. Sign up at [Metered.ca](https://www.metered.ca/)
2. Get your static credentials from [Dashboard → TURN Servers](https://dashboard.metered.ca/turn-servers)
3. Set these environment variables in Render:
   - `TURN_USERNAME` - Your TURN username
   - `TURN_CREDENTIAL` - Your TURN password
   - `TURN_DOMAIN` - Your Metered domain (e.g., `sathwik-interviewer.metered.ca`)

See [TURN_SETUP.md](TURN_SETUP.md) for detailed instructions.

---

## Post-Deployment Checklist

1. ✅ Both Render services show "Live" status
2. ✅ Vercel frontend builds successfully
3. ✅ Health check passes: `https://your-signaling.onrender.com/health`
4. ✅ TURN credentials endpoint works: `https://your-signaling.onrender.com/api/turn-credentials`
5. ✅ Frontend can connect to signaling server
6. ✅ WebRTC video works across different networks

---

## Troubleshooting

### WebRTC only works on same network

- Verify TURN credentials are configured correctly
- Check browser console for `[TURN]` log messages
- Visit `chrome://webrtc-internals/` to verify relay candidates

### "TURN credentials not configured" error

- Ensure `TURN_USERNAME`, `TURN_CREDENTIAL`, and `TURN_DOMAIN` are set in Render dashboard
- Check for typos or extra spaces in the values

### Frontend can't connect to signaling server

- Verify `VITE_SIGNALING_URL` points to your deployed signaling server
- Check CORS settings (should allow your frontend origin)

### Build fails on Render

- Check Node.js version compatibility (server uses Node 18+)
- Ensure all dependencies are in `package.json`

---

## Architecture

```
┌─────────────────┐     WebSocket (Socket.IO)     ┌──────────────────┐
│   React Frontend│◄─────────────────────────────►│  Signaling Server│
│   (Vercel)      │     WebRTC Signaling          │  (Render/Node)   │
└────────┬────────┘                               └────────┬─────────┘
         │                                                │
         │  GET /api/turn-credentials                     │
         │◄───────────────────────────────────────────────│
         │                                                │
         │                                    ┌───────────▼─────────┐
         │                                    │   Metered.ca TURN   │
         │                                    │   (Global Servers)  │
         │                                    └─────────────────────┘
         │
         │  REST API calls
         ▼
┌──────────────────┐
│  Flask Backend   │
│  (Render/Python) │
└──────────────────┘
```
