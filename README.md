# ABC Home Services — Voice AI Receptionist

Voice assistant backend (Vapi + Twilio) with PostgreSQL and a React dashboard.

## Architecture

```
Phone → Twilio → Vapi → ngrok → Backend (webhook)
                              ↓
                         PostgreSQL
                              ↑
                    React dashboard (nginx)
```

## Run everything (Docker)

```bash
cp .env.example .env    # add NGROK_AUTHTOKEN
docker compose up --build
```

| Service | URL |
|---------|-----|
| **Dashboard (React)** | http://localhost:8080 |
| **Backend API** | http://localhost:3000 |
| **Health** | http://localhost:3000/health |
| **Webhook** | `POST http://localhost:3000/vapi/call-ended` |
| **ngrok inspector** | http://localhost:4040 |
| **PostgreSQL** | `localhost:5432` (db: `voice_ai`) |

Vapi **Server URL** (use ngrok HTTPS URL from http://localhost:4040/status):

```
https://<ngrok-host>/vapi/call-ended
```

## Test without a phone call

```bash
curl -s -X POST http://localhost:3000/vapi/call-ended \
  -H "Content-Type: application/json" \
  -d '{
    "callId": "test_001",
    "callerPhone": "+15551234567",
    "summary": "HVAC repair tomorrow in Denver.",
    "transcript": "My name is John. AC broken tomorrow morning in Denver."
  }' | jq
```

Refresh http://localhost:8080 — the call appears in the dashboard.

## Local development (without Docker)

**Terminal 1 — database + API:**
```bash
docker compose up postgres -d
cd backend && cp .env.example .env && npm install && npm run dev
```

**Terminal 2 — React:**
```bash
cd frontend && npm install && npm run dev
```

Open http://localhost:5173 (Vite proxies `/api` to backend).

## Database (TablePlus)

| Field | Value |
|-------|--------|
| Host | `localhost` |
| Port | `5432` |
| User / Password | `postgres` / `postgres` |
| Database | `voice_ai` |
| Table | `calls` |

## Project structure

```
voice-ai-agent/
├── frontend/          # React + Vite dashboard (port 8080 in Docker)
├── backend/           # Express API + webhook (port 3000)
├── docker-compose.yml
├── ngrok.yml
└── .env.example
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/calls` | List calls (paginated) |
| POST | `/vapi/call-ended` | Vapi end-of-call webhook |
| GET | `/health` | Health check |
