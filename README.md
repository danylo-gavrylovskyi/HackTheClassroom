# Zvirchik — AI Oral Exam Platform

A platform for conducting oral exams using AI. Teachers create tests with questions and share a link with students. Students open the link, talk to an AI examiner by voice, and receive a grade.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
│   Frontend   │────▶│   Backend    │────▶│      Supabase        │
│   Next.js    │     │   NestJS     │     │   PostgreSQL + Auth  │
└──────┬───────┘     └──────┬───────┘     └──────────────────────┘
       │                    │
       │    WebRTC/Audio    │  creates room
       ▼                    ▼
┌──────────────────────────────┐
│         LiveKit Cloud        │
│    (real-time audio stream)  │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       Python Agent           │
│  Examiner + Guard + Grader   │
│    (GPT-4o / GPT-4o-mini)    │
└──────────────────────────────┘
```

## Technologies & AI Services

| Component | Technology | Role |
|-----------|-----------|------|
| Frontend | **Next.js 15**, React 19, Tailwind CSS 4 | Teacher dashboard, student exam screen |
| Backend | **NestJS 11**, Express 5 | API, auth, session management |
| Database | **Supabase** (PostgreSQL + Auth + RLS) | Storage for tests, results, teachers |
| Real-time audio | **LiveKit Cloud** | WebRTC stream between student and agent |
| AI Examiner | **OpenAI GPT-4o** | Conducts the exam, converses with the student |
| AI Guard | **OpenAI GPT-4o-mini** | Detects prompt injection & manipulation |
| AI Grader | **OpenAI GPT-4o-mini** | Independent answer scoring |
| Speech-to-Text | **Deepgram** | Speech recognition (Ukrainian) |
| Text-to-Speech | **OpenAI TTS** (voice: nova) | Voicing examiner questions |

## Ready-Made vs Custom-Built

### Ready-made modules & services (used as-is)

- **LiveKit Cloud** — real-time audio infrastructure, WebRTC server
- **LiveKit Agents SDK** — framework for building voice agents (pipeline: STT → LLM → TTS)
- **Supabase** — database, authentication, Row-Level Security
- **Next.js / NestJS** — frontend and backend frameworks
- **Deepgram SDK** — STT plugin for LiveKit Agents
- **OpenAI SDK** — LLM and TTS plugins for LiveKit Agents
- **livekit-client** — WebRTC client for the browser

### Built by us

**Agent (Python):**
- `agent/agent.py` — ExamAgent: exam flow logic, tool calls for scoring, graceful shutdown with post-speech callback
- `agent/sub_agents.py` — Guard (detects student manipulation attempts) and Grader (independent answer evaluation)
- Multi-agent architecture: Examiner leads the conversation, Guard filters input, Grader scores independently
- System prompts in Ukrainian for all three agents

**Backend (NestJS):**
- `backend/src/auth/` — teacher authentication via Supabase JWT, endpoint guard
- `backend/src/exams/` — CRUD for tests with questions (JSONB)
- `backend/src/sessions/` — exam session management, agent callback endpoint, secret verification
- `backend/src/livekit/` — LiveKit room creation and token generation
- `backend/src/supabase/` — Supabase client wrapper (service role + user role)

**Frontend (Next.js):**
- `frontend/app/exam/[id]/ExamSession.tsx` — student screen: LiveKit connection, Zvirchik avatar, states (entry → connecting → active → completed)
- `frontend/app/teacher/` — teacher dashboard: test list, test creation, results view
- `frontend/app/login/` — authentication page
- `frontend/app/components/` — CreateTestModal, TestCard

**Database:**
- `supabase/migrations/001_initial_schema.sql` — `teachers`, `exams`, `exam_sessions` tables with RLS policies

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Accounts: [Supabase](https://supabase.com), [LiveKit Cloud](https://cloud.livekit.io), [OpenAI](https://platform.openai.com), [Deepgram](https://deepgram.com)

### 1. Clone the repository

```bash
git clone https://github.com/your-repo/HackTheClassroom.git
cd HackTheClassroom
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration — copy the contents of `supabase/migrations/001_initial_schema.sql` into the SQL Editor and execute
3. Save from Dashboard → Settings → API: `URL`, `anon key`, `service_role key`, `JWT secret`

### 3. Set up LiveKit

1. Create a project at [cloud.livekit.io](https://cloud.livekit.io)
2. Save `WebSocket URL`, `API Key`, `API Secret` from Settings → Keys

### 4. Backend

```bash
cd backend
cp .env.example .env
# Fill in .env:
#   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET
#   LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
npm install
npm run start:dev
```

Backend will start at `http://localhost:3001`.

### 5. Frontend

```bash
cd frontend
cp .env.example .env.local
# Fill in .env.local:
#   NEXT_PUBLIC_API_URL=http://localhost:3001/api
#   NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
npm install
npm run dev
```

Frontend will start at `http://localhost:3000`.

### 6. Agent

```bash
cd agent
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in .env:
#   LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
#   OPENAI_API_KEY
python agent.py dev
```

### 7. Verify

1. Open `http://localhost:3000/login` — register a teacher account
2. Create a test with questions
3. Copy the test link and open it in another window
4. Enter the student name → start the test → talk to the AI examiner

## Project Structure

```
HackTheClassroom/
├── agent/
│   ├── agent.py              # Main exam agent
│   ├── sub_agents.py         # Guard + Grader sub-agents
│   ├── requirements.txt
│   └── .env.example
├── backend/
│   └── src/
│       ├── auth/             # JWT authentication
│       ├── exams/            # Test CRUD
│       ├── sessions/         # Exam sessions + callback
│       ├── livekit/          # LiveKit integration
│       └── supabase/         # DB client
├── frontend/
│   └── app/
│       ├── exam/[id]/        # Student exam screen
│       ├── teacher/          # Teacher dashboard
│       ├── login/            # Authentication
│       └── components/       # UI components
└── supabase/
    └── migrations/           # SQL schema
```
