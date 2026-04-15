# TURN Server Setup Guide - Metered.ca Static Credentials

## Overview

This guide covers the complete setup of TURN servers for global WebRTC connectivity in the AI Video Interviewer application. TURN (Traversal Using Relays around NAT) is essential for establishing peer-to-peer connections when clients are behind restrictive firewalls or NATs, enabling video calls between users in different countries (e.g., India ↔ USA).

This app uses **static TURN credentials** from your Metered.ca dashboard. These are long-lived credentials that don't expire, making them simple to configure and maintain.

## What Was Implemented

### Backend Changes (`server/server.js`)

API endpoint for TURN credential distribution:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/turn-credentials` | GET | Returns static TURN credentials (cached) |
| `/api/turn-credentials/validate` | GET | Checks if cached credentials are still valid |
| `/api/turn-credentials/refresh` | POST | Forces cache refresh |

**Features:**
- **Static credentials**: Uses long-lived TURN credentials from Metered dashboard
- **No API key required**: Simple configuration with just 3 environment variables
- **Intelligent caching**: Credentials cached to avoid rebuilding URLs on every request
- **Error handling**: Clear error messages if credentials are not configured

### Frontend Changes (`frontend/src/lib/webrtcConfig.js`)

- **Dynamic credential fetching**: Automatically fetches TURN credentials from backend
- **Intelligent caching**: 23-hour cache with automatic refresh
- **Fallback support**: Falls back to OpenRelay if backend is unavailable
- **Async configuration**: `buildRtcConfigAsync()` for proper credential loading
- **Connection monitoring**: Detects failed connections and triggers TURN relay fallback

### Updated Components

- [`InterviewRoom.jsx`](frontend/src/pages/InterviewRoom.jsx:566) - Uses async TURN config with relay fallback
- [`HRObserverRoom.jsx`](frontend/src/pages/HRObserverRoom.jsx:157) - Uses async TURN config

---

## Metered.ca Setup

### Step 1: Create Account

1. Go to [https://www.metered.ca/](https://www.metered.ca/)
2. Click **Sign Up** and create an account
3. Verify your email address

### Step 2: Get Your Static TURN Credentials

1. Log in to your Metered dashboard
2. Navigate to **TURN Servers** or **Credentials** section
3. Copy these three values:
   - **TURN Username** (e.g., `6695d7efa747633e5deeace9`)
   - **TURN Credential/Password** (e.g., `BSEyIggm5WJlQi4O`)
   - **TURN Domain** (e.g., `sathwik-interviewer.metered.ca`)

### Step 3: Upgrade to Free 20GB Plan

The default plan may be the 500MB trial. To upgrade:

1. Go to **Billing** → **Plans** in your dashboard
2. Select **Free Plan** (20GB/month)
3. Confirm the upgrade

**Plan Comparison:**

| Feature | Trial (500MB) | Free Plan (20GB) |
|---------|---------------|------------------|
| Monthly Data | 500MB | 20GB |
| Concurrent Users | Limited | Unlimited |
| TURN Servers | Global | Global |
| Cost | Free | Free |

### Step 4: Configure Environment Variables

Add your credentials to `server/.env`:

```env
TURN_USERNAME=your_turn_username
TURN_CREDENTIAL=your_turn_credential
TURN_DOMAIN=your-domain.metered.ca
```

**Important**: Never commit `.env` files to version control.

---

## How It Works

### Architecture

```
┌─────────────────┐     GET /api/turn-credentials     ┌──────────────────┐
│   React Frontend│◄───────────────────────────────────│   Node.js Server │
│                 │   { iceServers: [...] }             │   (server.js)    │
└────────┬────────┘                                    └────────┬─────────┘
         │                                                      │
         │                                          Static TURN credentials
         │                                          from environment variables
         │                                                      │
         │                                                      ▼
         │                                             ┌──────────────────┐
         │                                             │  Metered.ca TURN │
         │                                             │  (Global Servers)│
         │                                             └──────────────────┘
         │
         │  WebRTC connection using TURN relay
         ▼
┌─────────────────┐
│   Remote Peer   │
│  (Different     │
│   Network)      │
└─────────────────┘
```

### Credential Flow

1. **Frontend requests credentials**: When a WebRTC connection is initiated, the frontend calls `GET /api/turn-credentials`
2. **Backend returns static credentials**: The server returns the TURN credentials from environment variables
3. **Credentials cached**: The server caches credentials to avoid rebuilding URLs
4. **Frontend uses credentials**: The frontend uses the returned `iceServers` array for `RTCPeerConnection`
5. **Fallback to OpenRelay**: If backend is unavailable, frontend uses OpenRelay public TURN servers

---

## Testing Global Connectivity

### Test 1: Verify TURN Credentials Endpoint

```bash
# Start your server
cd server && npm start

# Test the endpoint
curl http://localhost:3000/api/turn-credentials
```

Expected response:
```json
{
  "iceServers": [
    { "urls": "stun:stun.l.google.com:19302" },
    { "urls": "stun:stun1.l.google.com:19302" },
    { "urls": "stun:stun2.l.google.com:19302" },
    {
      "urls": ["turn:sathwik-interviewer.metered.ca:80", "turn:sathwik-interviewer.metered.ca:443", ...],
      "username": "6695d7efa747633e5deeace9",
      "credential": "BSEyIggm5WJlQi4O"
    }
  ],
  "expiresAt": 1712345678901
}
```

### Test 2: Verify TURN Relay Usage in Browser

1. Open your app in Chrome/Firefox
2. Open Developer Tools (F12)
3. Go to the **Console** tab
4. Start an interview session
5. Look for log messages:

```
[TURN] Fetching credentials from backend...
[TURN] Successfully fetched and cached credentials from backend
[WebRTC] candidate connected via TURN relay (udp) {pairState: "succeeded", localCandidateType: "relay", ...}
```

**Key indicators:**
- `usesRelay: true` - Connection is using TURN relay
- `localCandidateType: "relay"` - Local candidate is relay type
- `protocol: "udp"` or `protocol: "tcp"` - Transport protocol

### Test 3: Chrome Internal WebRTC Diagnostics

1. Open `chrome://webrtc-internals/` in a new tab
2. Start your interview
3. Look for the active peer connection
4. Check the **Candidate Pair** section:
   - `localCandidate.candidateType` should be `relay`
   - `remoteCandidate.candidateType` should be `relay` or `srflx`

### Test 4: Cross-Network Testing

| Test Scenario | Expected Result |
|---------------|-----------------|
| Same WiFi network | Direct connection (P2P) or TURN relay |
| Different networks (same country) | TURN relay |
| Different countries (e.g., India → USA) | TURN relay |
| Corporate firewall | TURN relay (TCP) |

**How to test:**
1. Deploy your app to public URLs (Vercel for frontend, Render for backend)
2. Access from different networks (e.g., mobile data vs WiFi)
3. Have two users in different locations join the same interview
4. Check browser console for relay confirmation

---

## Troubleshooting

### Issue: "TURN credentials not configured"

**Solution:** Ensure `server/.env` contains all three variables:
```env
TURN_USERNAME=your_turn_username
TURN_CREDENTIAL=your_turn_credential
TURN_DOMAIN=your-domain.metered.ca
```

### Issue: Connection still fails with TURN

**Possible causes:**
- Firewall blocking TURN ports (80, 443, 3478)
- TURN server outage
- Incorrect credentials

**Solution:**
1. Check firewall rules allow outbound connections to ports 80, 443, 3478
2. Verify Metered server status at [https://status.metered.ca/](https://status.metered.ca/)
3. Verify credentials match exactly (no extra spaces)
4. Try forcing TCP: `turn:your-domain.metered.ca:443?transport=tcp`

### Issue: TURN URLs not working

**Solution:** Ensure `TURN_DOMAIN` is set correctly:
```env
TURN_DOMAIN=sathwik-interviewer.metered.ca
```
Do not include `turn:` prefix or port numbers in the domain.

---

## Security Best Practices

### ✅ What We Did Right

1. **No API Key in Frontend**: TURN credentials are served from the backend, never exposed in client code
2. **Server-Side Configuration**: Credentials stored in environment variables, not hardcoded
3. **Caching**: Reduces server load and response time
4. **Fallback Support**: OpenRelay public TURN servers as backup if backend is unavailable

### 🔒 Additional Security (Optional)

For production deployments, consider:

1. **Rate Limiting**: Add rate limiting to `/api/turn-credentials` endpoint
2. **Authentication**: Require user authentication before serving credentials
3. **IP Whitelisting**: Restrict access to your signaling server

---

## API Reference

### GET /api/turn-credentials

Returns ICE server configuration for WebRTC.

**Response:**
```json
{
  "iceServers": [
    { "urls": "stun:stun.l.google.com:19302" },
    { "urls": "stun:stun1.l.google.com:19302" },
    { "urls": "stun:stun2.l.google.com:19302" },
    {
      "urls": ["turn:sathwik-interviewer.metered.ca:80", "turn:sathwik-interviewer.metered.ca:443", "turn:sathwik-interviewer.metered.ca:443?transport=tcp", "turn:sathwik-interviewer.metered.ca:3478"],
      "username": "6695d7efa747633e5deeace9",
      "credential": "BSEyIggm5WJlQi4O"
    }
  ],
  "expiresAt": 1712345678901
}
```

### GET /api/turn-credentials/validate

Checks credential validity.

**Response:**
```json
{
  "valid": true,
  "expiresAt": 1712345678901,
  "expiresIn": 82800
}
```

### POST /api/turn-credentials/refresh

Forces cache refresh (useful if you update credentials in .env).

**Response:**
```json
{
  "success": true,
  "expiresAt": 1712432078901
}
```

---

## Files Modified

| File | Changes |
|------|---------|
| `server/server.js` | Static TURN credential endpoint |
| `server/.env` | Added `TURN_USERNAME`, `TURN_CREDENTIAL`, `TURN_DOMAIN` |
| `.env.example` | Added TURN configuration examples |
| `frontend/src/lib/webrtcConfig.js` | Dynamic credential fetching with caching |
| `frontend/src/pages/InterviewRoom.jsx` | Async TURN config usage with relay fallback |
| `frontend/src/pages/HRObserverRoom.jsx` | Async TURN config usage |
| `render.yaml` | Render.com deployment configuration |
| `DEPLOYMENT.md` | Updated deployment instructions |
| `TURN_SETUP.md` | Complete TURN setup guide |

---

## Support

- Metered.ca Documentation: [https://www.metered.ca/docs](https://www.metered.ca/docs)
- WebRTC Troubleshooting: [https://webrtc.org/getting-started/troubleshooting](https://webrtc.org/getting-started/troubleshooting)
- Render.com Docs: [https://render.com/docs](https://render.com/docs)
