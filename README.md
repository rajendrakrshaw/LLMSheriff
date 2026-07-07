# LLMSheriff

## Intent-Aware AI Agent Monitoring Platform

LLMSheriff is a research-oriented observability prototype for autonomous AI agents.
It does not aim to replace tools like LangSmith, Langfuse, AgentOps, or OpenTelemetry.

Its core novelty is the **Intent Analysis Engine**: a behavioral interpretation layer that asks whether an agent is actually making meaningful progress toward its goal.

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

## Tech Stack (Docker-First)

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

- Docker
- Docker Compose

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
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py
│       ├── api/
│       │   └── routes.py
│       ├── core/
│       │   └── config.py
│       ├── models/
│       │   └── schemas.py
│       └── services/
│           ├── trace_logger.py
│           ├── metrics.py
│           ├── analyzer_rule.py
│           └── llm_judge.py
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── next-env.d.ts
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx
│       └── globals.css
│
├── paper/
│   └── prototype.pdf
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

`POST /api/analyze` accepts task metadata + trace events and returns:

- computed metrics
- rule engine prediction
- llm engine prediction
- persisted run id

`GET /api/runs` returns recent intent analysis runs for dashboard history.

---

## Run Locally

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Start services:

```bash
docker compose up --build
```

3. Open apps:

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Analyze endpoint: [http://localhost:8000/api/analyze](http://localhost:8000/api/analyze)

If `NIMOTRON_API_KEY` is not set, LLMSheriff automatically falls back to a local heuristic LLM-judge simulation so the prototype still works end-to-end.

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
