# SAARTHI — ENS Clinical Intelligence Platform

> **S**ymptom **A**nalysis **A**nd **R**eal-**T**ime **H**ealth **I**ntelligence  
> AI-powered daily monitoring and clinical decision support for Empty Nose Syndrome (ENS)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-saarthi--hackrare.vercel.app-blue?style=for-the-badge)](https://saarthi-hackrare.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Flask](https://img.shields.io/badge/Flask-3.0-green?style=for-the-badge&logo=flask)](https://flask.palletsprojects.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-teal?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)

---

## What is Empty Nose Syndrome?

Empty Nose Syndrome (ENS) is a rare, debilitating condition affecting patients after nasal turbinate surgery. Sufferers experience paradoxical suffocation — an open airway with a complete inability to sense airflow — alongside severe nasal dryness, burning, anxiety, and disrupted sleep. SAARTHI was built to give these patients a voice and give their doctors the data they need.

---

## Architecture

```
┌─────────────────────────────────────┐
│   Next.js Web App  (Vercel)         │  ← Patient check-in, Doctor dashboard
│   web/                              │    https://saarthi-hackrare.vercel.app
└──────────┬──────────────────────────┘
           │ /api/call  (proxy)
           ▼
┌─────────────────────────────────────┐
│   Flask — Aria Voice Agent          │  ← Retell AI + Claude AI
│   Saarthi/app.py   :5001            │    Daily automated patient calls
└──────────┬──────────────────────────┘
           │ POST /agent-intake
           ▼
┌─────────────────────────────────────┐
│   FastAPI — ENS Prediction Engine   │  ← ML model + PostgreSQL
│   Saarthi/main.py  :8000            │    Scores, trends, predictions
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│   MCP Server                        │  ← Claude tool integration
│   mcp-server/server.py              │
└─────────────────────────────────────┘
```

---

## Features

### Patient Side
- **Daily Check-in** — 7-question ENS symptom assessment (air sensation, nasal dryness, burning, suffocation, anxiety, humidity sensitivity, sleep quality)
- **AI Follow-up Chat** — Conversational follow-up powered by Claude/GPT-4, asking contextual questions based on today's scores
- **Aria Voice Calls** — Automated daily check-in calls via Retell AI + Claude, so patients never miss a day
- **Trend Tracking** — 30-day visual calendar with green/yellow/red status indicators

### Doctor Dashboard
- **Interactive Body Map** — Anatomically accurate SVG figure with 7 clickable ENS hotspot zones; hover to see zone details and scores
- **Clinical Analytics** — Score gauges, 30-day trend charts, radar chart across all 7 dimensions
- **Clinical AI Chat** — Ask the AI anything about the patient: *"Is this patient at risk of deterioration?"*, *"What treatment adjustments do you recommend?"*
- **PDF Clinical Reports** — One-click export of a full 3-page clinical report (header, gauges, trend analysis, AI recommendations)
- **Patient History** — Full transcript and score history per patient

### Intelligence Layer
- **ENS Severity Scoring** — ML model trained on ENS clinical data, producing 0–10 scores per dimension
- **Emotion & Intensity Analysis** — Claude AI parses call transcripts into structured clinical JSON
- **Predictive Alerts** — Flags patients showing upward drift in composite score before they reach crisis

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Framer Motion |
| AI / LLM | Anthropic Claude (claude-sonnet-4-6), OpenAI GPT-4, Groq |
| Voice | Retell AI, real-time call transcription |
| Backend API | Flask 3, FastAPI 0.111 |
| ML | scikit-learn, pandas, numpy |
| Database | PostgreSQL (SQLAlchemy ORM) |
| PDF Export | jsPDF 4, html2canvas |
| Charts | Recharts |
| Deployment | Vercel (web), Railway (Flask + FastAPI) |
| MCP | Model Context Protocol server for Claude tool integration |

---

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL database

### 1. Clone the repo
```bash
git clone https://github.com/Sur27codes/SAARTHI.git
cd SAARTHI
```

### 2. Start the Python backend
```bash
cd Saarthi
pip install -r requirements.txt

# Copy and fill in your env vars
cp .env.example .env

bash startup.sh   # starts FastAPI on :8000 + Flask on :5001
```

### 3. Start the web app
```bash
cd web
npm install

# Copy and fill in your env vars
cp .env.example .env.local

npm run dev       # http://localhost:3000
```

### 4. Open the app
| URL | Service |
|-----|---------|
| http://localhost:3000 | Patient & Doctor UI |
| http://localhost:8000/docs | FastAPI Swagger docs |
| http://localhost:5001 | Flask / Aria calling agent |

---

## Environment Variables

### `web/.env.local`
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
FLASK_CALL_URL=http://localhost:5001
```

### `Saarthi/.env`
```env
RETELL_API_KEY=...
RETELL_AGENT_ID=...
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://user:password@host:5432/saarthi
```

---

## Project Structure

```
SAARTHI/
├── web/                        # Next.js frontend
│   ├── src/app/
│   │   ├── page.tsx            # Main patient check-in + chat UI
│   │   ├── DoctorDashboard.tsx # Doctor analytics + body map + clinical AI
│   │   ├── AriaCallPanel.tsx   # Voice call UI
│   │   ├── generateReport.ts   # PDF report generator
│   │   └── api/
│   │       ├── chat/           # AI chat endpoint
│   │       ├── call/           # Flask proxy (voice calls)
│   │       ├── doctor-chat/    # Clinical AI endpoint
│   │       └── status/         # Health check
│   └── vercel.json
│
├── Saarthi/                    # Flask + FastAPI backend
│   ├── app.py                  # Flask: Aria voice agent, Retell webhooks
│   ├── main.py                 # FastAPI: ENS scoring, patient data
│   ├── ml_service.py           # ML inference service
│   ├── models.py               # SQLAlchemy models
│   └── requirements.txt
│
├── mcp-server/                 # MCP server for Claude tool integration
│   └── server.py
│
└── README.md
```

---

## API Reference

### Flask (Aria Voice Agent)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/call` | Initiate a Retell AI patient call |
| GET | `/api/call/:id` | Get call status |
| POST | `/webhook/retell` | Retell call completion webhook |

### FastAPI (ENS Engine)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/agent-intake` | Ingest scored call transcript |
| GET | `/patients` | List all patients |
| GET | `/patients/:id/history` | Patient score history |
| GET | `/predict/:id` | ML prediction for patient |

### Next.js API Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | AI chat (OpenAI/Groq) |
| POST | `/api/doctor-chat` | Clinical AI (Claude) |
| POST | `/api/claude-agent` | Claude agent with tools |
| GET | `/api/status` | System health check |

---

## Deployment

### Web (Vercel) — Live at [saarthi-hackrare.vercel.app](https://saarthi-hackrare.vercel.app)
```bash
cd web
vercel --prod
```

### Backend (Railway)
1. Create a new Railway project
2. Deploy `Saarthi/` as a Python service
3. Set `PORT=5001` for Flask, `PORT=8000` for FastAPI
4. Add PostgreSQL plugin
5. Set env vars (RETELL keys, ANTHROPIC_API_KEY, DATABASE_URL)
6. Copy the Railway URL → update `FLASK_CALL_URL` in Vercel env vars

---

## Hackathon Context

SAARTHI was built for **HackRare** — a hackathon focused on rare diseases. ENS affects an estimated 20,000+ patients in the US alone, with virtually no dedicated digital health tools. SAARTHI addresses:

- **Under-diagnosis** — structured daily symptom scoring helps doctors quantify a subjective condition
- **Isolation** — patients with ENS often feel unheard; Aria's voice calls provide daily human-like check-ins
- **Clinical gaps** — the doctor dashboard gives physicians longitudinal data they've never had before

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

---

## License

MIT

---

*Built with care for the ENS community.*
