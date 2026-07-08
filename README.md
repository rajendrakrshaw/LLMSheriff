# LLMSheriff

## Intent-Aware AI Agent Monitoring Platform

---

## Research Hypothesis

> Existing AI observability tools record *what* happened during agent execution — tool calls, latency, retries, errors — but they do not infer *whether the agent is still intentionally pursuing its assigned goal*. LLMSheriff explores one approach to inferring behavioral states from execution traces, classifying agent behavior into states such as **Planning**, **Executing**, **Stalled**, **Recovering**, or **Abandoned**, while providing explainable reasoning for each prediction.

The core question this prototype investigates:

> Can a lightweight behavioral analysis layer distinguish a *healthy-but-slow* agent from one that has *quietly given up*?

Two independent analyzers run on every trace — a deterministic rule engine and an LLM-based judge (NVIDIA Nemotron) — and their predictions are compared side-by-side. Agreement signals high-confidence classification; disagreement reveals traces that are behaviorally ambiguous and warrant further study.

---

## What LLMSheriff is Not

LLMSheriff is not a replacement for LangSmith, Langfuse, AgentOps, or OpenTelemetry. Those tools answer *what happened*. LLMSheriff asks *whether it mattered*.

---

## Why LLMSheriff

Traditional observability focuses on traces, logs, latency, tokens, and tool calls.
LLMSheriff adds a higher-level question:

> Is the agent still pursuing the assigned goal, or has execution become unproductive?

The platform translates low-level events into explainable intent states:

- Planning
- Executing
- Waiting
- Recovering
- Stalled
- Abandoned
- Completed
- Failed

---

## Core Architecture

```text
User Task
   |
   v
NVIDIA Nimotron Agent (or compatible orchestrator)
   |
   v
Execution Event Stream
   |
   v
Trace Logger + Feature Extraction
   |
   v
Intent Analysis Engine
  |------------------------------|
  |                              |
  v                              v
Rule-Based Analyzer         LLM-Based Analyzer (Nimotron)
  |                              |
  |------------+-----------------|
               v
        Behavioral Prediction
               |
               v
        Next.js Dashboard
```

---

## Tech Stack

### Frontend

- Next.js (App Router)
- TypeScript
- TailwindCSS
- Recharts

### Backend

- FastAPI
- Python 3.11
- SQLAlchemy
- Pydantic

### Storage

- SQLite (prototype mode)

### AI Layer

- NVIDIA Nimotron API (LLM-based behavioral judge)

### Local Orchestration

- Dedicated `.env` files for local (non-Docker) runs
- Optional Docker / Docker Compose

### Deployment Targets

- Frontend: Vercel
- Backend: Render

---

## Revised Folder Structure

```text
LLMSheriff/
├── docker-compose.yml
├── .env.example
├── README.md
├── scripts/
│   ├── run_local_backend.ps1
│   └── run_local_frontend.ps1
│
├── backend/
│   ├── Dockerfile
│   ├── .env.example
│   ├── run_local.ps1
│   ├── requirements.txt
│   └── app/
│       ├── main.py
│       ├── api/
│       │   └── routes.py
│       ├── core/
│       │   └── config.py
│       ├── models/
│       │   └── schemas.py
│       ├── database/
│       │   ├── models.py
│       │   └── session.py
│       └── services/
│           ├── trace_logger.py
│           ├── metrics.py
│           ├── analyzer_rule.py
│           ├── llm_judge.py
│           └── storage.py
│
├── frontend/
│   ├── Dockerfile
│   ├── .env.example
│   ├── run_local.ps1
│   ├── package.json
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── types/
│
├── paper/
│   ├── llmsheriff_ieee.tex
│   └── figures/
└── LICENSE
```

---

## End-to-End Workflow

1. User submits a task.
2. Agent executes and emits structured events.
3. Trace logger normalizes and stores events.
4. Feature extractor computes behavior indicators.
5. Rule engine predicts current intent state.
6. Nimotron independently predicts intent state.
7. Dashboard compares outputs for research analysis.

Example event:

```json
{
  "timestamp": "2026-07-07T15:20:10",
  "step": "LLM_CALL",
  "action": "Generate response",
  "duration": 3.4,
  "status": "success",
  "metadata": {}
}
```

Example prediction:

```json
{
  "state": "Stalled",
  "confidence": 0.91,
  "reason": [
    "Repeated identical tool invocation",
    "No observable progress",
    "Execution exceeded expected duration"
  ]
}
```

---

## API Surface (Prototype)

- `GET /health`
- `GET /api/health`
- `POST /api/analyze`
- `GET /api/runs`
- `GET /api/runs/{run_id}`

`POST /api/analyze` accepts task metadata + trace events and returns:

- computed metrics
- rule engine prediction
- llm engine prediction
- persisted run id

`GET /api/runs` returns recent intent analysis runs for dashboard history.
`GET /api/runs/{run_id}` returns full run metadata and chronological event logs.

---

## Environment Files

Dedicated env templates exist so you can run with Docker **or** locally without Docker:

| File | Purpose |
|------|---------|
| `.env.example` | Shared / Docker Compose secrets |
| `backend/.env.example` | Backend local settings |
| `frontend/.env.example` | Frontend local settings (`NEXT_PUBLIC_API_BASE_URL`) |

Copy them once:

```powershell
copy .env.example .env
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
copy frontend\.env.example frontend\.env.local
```

Optional: set `NIMOTRON_API_KEY` in `backend/.env` (or root `.env` for Docker).  
If the key is empty, the LLM judge falls back to a local heuristic so the prototype still runs.

---

## Run Without Docker (Local)

Requirements: Python 3.11+, Node.js 20+, two terminals.

### Terminal 1 — Backend

```powershell
cd backend
.\run_local.ps1
```

Or manually:

```powershell
cd backend
copy .env.example .env
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
mkdir data -Force
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2 — Frontend

```powershell
cd frontend
.\run_local.ps1
```

Or manually:

```powershell
cd frontend
copy .env.example .env
copy .env.example .env.local
npm install
npm run dev
```

Open:

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend docs: [http://localhost:8000/docs](http://localhost:8000/docs)

Root helper scripts also exist:

```powershell
.\scripts\run_local_backend.ps1
.\scripts\run_local_frontend.ps1
```

---

## Run With Docker

```powershell
copy .env.example .env
docker compose up --build
```

Same URLs:

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Analyze: [http://localhost:8000/api/analyze](http://localhost:8000/api/analyze)

---

## IEEE Paper Draft

A short IEEE-format research draft is included at:

- `paper/llmsheriff_ieee.tex`

Compile with:

```bash
cd paper
pdflatex llmsheriff_ieee.tex
```

---

---

## Research Contribution

LLMSheriff explores whether execution traces can be transformed into higher-level behavioral states using hybrid symbolic and LLM-based inference. Rather than replacing observability tools, it investigates how explainable behavioral monitoring can support debugging and human intervention in autonomous AI systems — particularly the distinction between an agent that is *still working toward a goal* and one that has *effectively given up*.

The prototype workflow:

```text
Execution Trace
        ↓
Rule-Based Analysis
        ↓
LLM-Based Analysis
        ↓
Disagreement Analysis
        ↓
Human Intervention Recommendation
```

---

## Current Prototype Limitations

- Uses heuristic thresholds rather than learned models.
- Evaluates preset scenarios rather than live autonomous agents.
- Behavioral inference is exploratory and not validated at scale.
- No formal human evaluation or ground-truth labeling has been conducted yet.
- LLM-based analysis depends on external API availability and model behavior.

---

## Research Positioning

LLMSheriff is an intent-aware observability research prototype, not a replacement for existing trace platforms.
Its contribution is explainable behavioral monitoring that helps answer:

- Is the agent still goal-aligned?
- Is it making meaningful progress?
- Is it looping or stalled?
- Should a human intervene?

Future extensions can add:

- multi-agent monitoring
- intervention recommendation
- anomaly detection
- RL/ML-based state prediction
- OpenTelemetry + LangGraph + LangSmith integrations
