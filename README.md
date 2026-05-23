# ABC Home Services — Voice AI Receptionist

Production-style backend for an AI phone receptionist. Inbound calls are handled by **Vapi** (connected to **Twilio**). When a call ends, Vapi sends a webhook to this project, which extracts structured data and stores it in **PostgreSQL**. A **React** dashboard displays call records.

## Tech stack

| Layer | Technology |
|-------|------------|
| Voice AI | [Vapi](https://vapi.ai) + [Twilio](https://twilio.com) (configured separately) |
| Backend | Node.js, TypeScript, Express |
| Database | PostgreSQL (`pg`) |
| Frontend | React, Vite, TypeScript |
| Infrastructure | Docker, Docker Compose, ngrok |

## Architecture

```
Caller → Twilio → Vapi Assistant
                      ↓ (end-of-call webhook)
                 ngrok → Express API → PostgreSQL
                      ↑
              React dashboard (reads /api/calls)
```

## Prerequisites

| Requirement | Notes |
|---------------|--------|
| [Docker](https://docs.docker.com/get-docker/) + Docker Compose | Runs backend, frontend, Postgres, and ngrok |
| [Twilio](https://twilio.com) account | US (or supported) number with **Voice** enabled |
| [Vapi](https://vapi.ai) account | Assistant + Twilio number import |
| [ngrok](https://ngrok.com) account | Free tier is enough; [authtoken](https://dashboard.ngrok.com/get-started/your-authtoken) required |

## Setup guide

End-to-end flow: **Twilio number → Vapi assistant → ngrok → this backend → Postgres dashboard**.

### Summary (Twilio + Vapi)

I purchased and configured a Twilio US phone number with voice support, then connected it to the Vapi assistant for inbound call handling. Incoming customer calls are routed from Twilio to Vapi, where the AI receptionist manages the conversation using the configured business rules and prompt. I verified the integration using real phone calls and confirmed successful call routing, voice interaction, and webhook event delivery to the backend.

### Step 1 — Twilio phone number

1. Sign in to the [Twilio Console](https://console.twilio.com).
2. Go to **Phone Numbers** → **Manage** → **Buy a number** (or use an existing number).
3. Choose a number with **Voice** capability (US numbers work well with Vapi).
4. Complete purchase. No custom Twilio webhook or SIP setup is required for this project — **Vapi owns the voice routing** once the number is linked in Vapi (Step 2).

**Inbound call path:** `Caller dials Twilio number` → `Twilio forwards audio to Vapi` → `Vapi runs the assistant`.

### Step 2 — Vapi assistant

1. Sign in to the [Vapi Dashboard](https://dashboard.vapi.ai).
2. **Create an assistant** (or open your existing one).
3. **System prompt** — include ABC Home Services rules, for example:
   - Services, service areas (Denver, Aurora, Lakewood), and known pricing only
   - Booking: collect name, phone, service, city/address, preferred time; do not confirm a real appointment
   - Emergency: detect keywords (`burst pipe`, `gas leak`, `flooding`, `no heat`) and escalate
   - Never invent pricing; keep replies short for phone calls
4. **Import the Twilio number**
   - In Vapi: **Phone Numbers** → **Import** / **Connect Twilio**
   - Authorize your Twilio account and assign the number from Step 1 to this assistant
5. **Publish** the assistant so inbound calls use the latest config.

You do **not** point Twilio’s “A call comes in” webhook at your local server — Vapi handles the call. Your backend only receives **after-call** events (Step 4).

### Step 3 — Clone and run this project

```bash
git clone <repository-url>
cd voice-ai-agent
cp .env.example .env
```

Edit root `.env` and set your ngrok authtoken:

```env
NGROK_AUTHTOKEN=your_ngrok_authtoken_here
```

| File | Purpose |
|------|---------|
| `.env` (project root) | `NGROK_AUTHTOKEN` for the ngrok container |
| `backend/.env.example` | Copy to `backend/.env` only if you run the API with `npm run dev` locally |

Start all services:

```bash
docker compose up --build
```

Wait until logs show:

- **Frontend** — `http://localhost:8080`
- **Backend** — `http://localhost:3000`
- **ngrok inspector** — `http://localhost:4040`

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:8080 |
| Backend API | http://localhost:3000 |
| Health check | http://localhost:3000/health |
| ngrok inspector | http://localhost:4040 |

### Step 4 — Connect Vapi to the webhook (ngrok)

Vapi must reach your machine while developing. ngrok exposes the backend to the internet.

1. Open **http://localhost:4040** (ngrok inspector).
2. Copy the **HTTPS** public URL (e.g. `https://abc123.ngrok-free.app`).
3. In Vapi Dashboard → your **Assistant** → **Advanced** (or **Server URL**).
4. Set the server URL to:

   ```
   https://<your-ngrok-host>/vapi/call-ended
   ```

   Example: `https://abc123.ngrok-free.app/vapi/call-ended`

5. **Save** and **publish** the assistant.

**Important:** If you restart Docker, ngrok may get a **new URL** — update the Vapi Server URL again.

**What the backend stores:** Only Vapi `end-of-call-report` events (one row per completed call). Other events (`status-update`, `conversation-update`, etc.) return `200` with `skipped: true` and are not saved.

### Step 5 — Verify the full flow

#### Option A — Test webhook (no phone call)

```bash
curl -X POST http://localhost:3000/vapi/call-ended \
  -H "Content-Type: application/json" \
  -d '{
    "callId": "test_001",
    "callerPhone": "+15551234567",
    "summary": "Customer needs HVAC repair tomorrow in Denver.",
    "transcript": "Caller: My name is John. AC stopped working tomorrow morning in Denver."
  }'
```

Refresh http://localhost:8080 — the call should appear in the dashboard.

#### Option B — Real phone call

1. Call your **Twilio number** (linked in Vapi).
2. Talk to the assistant (e.g. booking, pricing, or emergency scenario).
3. Hang up.
4. Check:
   - **Dashboard** — http://localhost:8080 (new row with transcript and fields)
   - **ngrok** — http://localhost:4040 → `POST /vapi/call-ended` with status `200`
   - **Backend logs** — `Call stored` with `callId` and `intent`

### Submission: test calls & transcripts

The assessment asks for **5 test call results** and **transcript/summary examples**.

1. Run five real calls using the scripts in [docs/TEST_CALL_RESULTS.md](docs/TEST_CALL_RESULTS.md), **or** run `./scripts/send-test-webhooks.sh` to seed the database locally.
2. Copy summary + transcript from the dashboard (or SQL export) into that doc.
3. Submit `docs/TEST_CALL_RESULTS.md` with your repo (plus screenshots optional).

### Quick reference — who does what

| Component | Role |
|-----------|------|
| **Twilio** | Phone number; receives inbound calls |
| **Vapi** | Voice AI, system prompt, conversation, sends webhooks when call ends |
| **ngrok** | Public HTTPS tunnel to your local backend |
| **Backend** (`POST /vapi/call-ended`) | Receives call data, extracts fields, saves to Postgres |
| **Frontend** | Dashboard to view stored calls |

## Database access

Use any PostgreSQL client (e.g. TablePlus, `psql`):

| Setting | Value |
|---------|--------|
| Host | `localhost` |
| Port | `5432` |
| Database | `voice_ai` |
| User / Password | `postgres` / `postgres` |
| Table | `calls` |

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Service and database health |
| `POST` | `/vapi/call-ended` | Vapi end-of-call webhook |
| `GET` | `/api/calls?page=1&limit=20` | List stored calls |

## Project structure

```
voice-ai-agent/
├── backend/              # Express API, webhook handler, extraction logic
│   ├── src/
│   └── Dockerfile
├── frontend/             # React dashboard
│   ├── src/
│   └── Dockerfile
├── docker-compose.yml    # postgres, backend, frontend, ngrok
├── ngrok.yml
└── .env.example
```

## Local development (optional)

Run Postgres in Docker, then start backend and frontend separately:

```bash
docker compose up postgres -d

cd backend && cp .env.example .env && npm install && npm run dev   # uses backend/.env
cd frontend && npm install && npm run dev
```

- API: http://localhost:3000  
- Dashboard: http://localhost:5173 (proxies `/api` to the backend)

## Notes

- The ngrok URL changes when containers restart; update the Vapi Server URL if needed.
- Webhook payloads are normalized for Vapi `end-of-call-report` events and flat test JSON.
- Structured fields (`intent`, `service_needed`, `is_emergency`, etc.) are extracted with keyword/regex rules defined in `backend/src/data/business.ts` — not a second LLM call.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| ngrok container fails | Set `NGROK_AUTHTOKEN` in root `.env` |
| Dashboard shows “Offline” | Ensure `backend` is running: `docker compose ps` |
| No rows after a call | Confirm Vapi Server URL uses current ngrok HTTPS host + `/vapi/call-ended` |
| Empty `calls` table | Run the test `curl` above or complete a call and hang up |
| Duplicate or junk rows | Rebuild backend (`docker compose up --build`). Only `end-of-call-report` is stored; system-prompt-only payloads are ignored. Remove bad rows with `DELETE FROM calls WHERE transcript LIKE '%You are a voice receptionist%';` |
| Too many webhooks in ngrok | Normal — Vapi sends `conversation-update`, `status-update`, etc. They return `200` with `skipped: true` and are not saved |
