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

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [ngrok](https://ngrok.com) account and [authtoken](https://dashboard.ngrok.com/get-started/your-authtoken)
- Vapi assistant with Twilio number (already set up for this project)

## Setup and run

**1. Clone and configure environment**

```bash
git clone <repository-url>
cd voice-ai-agent
cp .env.example .env
```

Edit root `.env` and set your ngrok authtoken:

```
NGROK_AUTHTOKEN=your_token_here
```

**Environment files**

| File | Purpose |
|------|---------|
| `.env.example` (root) | Template for **Docker Compose / ngrok** — copy to `.env` at project root |
| `backend/.env.example` | Template for **local backend dev** (`npm run dev`) — copy to `backend/.env` |

**2. Start all services**

```bash
docker compose up --build
```

**3. Open the application**

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:8080 |
| Backend API | http://localhost:3000 |
| Health check | http://localhost:3000/health |
| ngrok inspector | http://localhost:4040 |

**4. Connect Vapi to the webhook**

1. Open http://localhost:4040/status and copy the **HTTPS** forwarding URL.
2. In the [Vapi Dashboard](https://dashboard.vapi.ai), open your assistant → **Advanced** → **Server URL**.
3. Set:

   ```
   https://<your-ngrok-host>/vapi/call-ended
   ```

4. Save and publish the assistant.

## Verify it works

**Without a phone call** — send a test webhook:

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

**With a phone call** — call your Twilio number, complete a conversation, hang up, then check the dashboard and ngrok inspector (`POST /vapi/call-ended` → `200`).

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
