<div align="center">
  <img src="assets/banner.svg" alt="SAARTHI Banner" width="100%"/>
</div>

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live%20Demo-saarthi--hackrare.vercel.app-blue?style=for-the-badge)](https://saarthi-hackrare.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Flask](https://img.shields.io/badge/Flask-3.0-green?style=for-the-badge&logo=flask)](https://flask.palletsprojects.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-teal?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

</div>

# SAARTHI — ENS Clinical Intelligence Platform

> **S**ymptom **A**nalysis **A**nd **R**eal-**T**ime **H**ealth **I**ntelligence  
> AI-powered daily monitoring and clinical decision support for Empty Nose Syndrome (ENS)

---

## What is Empty Nose Syndrome?

Empty Nose Syndrome (ENS) is a rare, debilitating condition affecting patients after nasal turbinate surgery. Sufferers experience paradoxical suffocation — an open airway with a complete inability to sense airflow — alongside severe nasal dryness, burning, anxiety, and disrupted sleep. SAARTHI was built to give these patients a voice and give their doctors the data they need.

---

## Live Demo

**https://saarthi-hackrare.vercel.app**

| Login | Role |
|-------|------|
| Any email | Select **Patient** to use the check-in & chat UI |
| Any email | Select **Doctor** to access the full clinical dashboard |

---

## Demo

### Patient Check-in & AI Chat
![Patient check-in flow — daily 7-question ENS assessment with AI follow-up chat](assets/demo-patient.gif)

### Doctor Dashboard — Body Map & Clinical AI
![Doctor dashboard — interactive ENS body map, score gauges, trend charts, clinical AI chat](assets/demo-doctor.gif)

> **To record your own demo GIFs:**
> 1. Start the app locally: `cd web && npm run dev`
> 2. Use [Screen Studio](https://screen.studio), [Kap](https://getkap.co) (macOS), or [LICEcap](https://www.cockos.com/licecap/) to record
> 3. Export as GIF and save to `assets/demo-patient.gif` and `assets/demo-doctor.gif`
> 4. `git add assets/ && git commit -m "add demo GIFs" && git push`

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
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│   MCP Server                        │  ← Claude tool integration
│   mcp-server/server.py              │
└─────────────────────────────────────┘
```

---

## Workflow Diagrams

### End-to-End System Flow

```mermaid
flowchart TD
    Patient(["👤 Patient"])
    Doctor(["🩺 Doctor"])

    subgraph Web ["Next.js Web App — Vercel"]
        CheckIn["Daily Check-in\n7 ENS Questions"]
        Chat["AI Follow-up Chat\nClaude / GPT-4 / Groq"]
        AriaUI["Aria Call Panel\nInitiate / Monitor Call"]
        DocDash["Doctor Dashboard\nBody Map · Gauges · Charts"]
        ClinicalAI["Clinical AI Chat\nClaude Analysis"]
        PDFExport["PDF Report Export\njsPDF 3-page Report"]
    end

    subgraph Flask ["Flask — Aria Voice Agent :5001"]
        CallInit["POST /api/call\nCreate Retell Call"]
        Webhook["POST /webhook/retell\nReceive Transcript"]
        Analyze["Claude AI\nScore Transcript → JSON"]
    end

    subgraph Retell ["Retell AI"]
        LiveCall["Live Phone Call\nAria speaks with Patient"]
        Transcript["Call Transcript\nReal-time STT"]
    end

    subgraph FastAPI ["FastAPI — ENS Engine :8000"]
        Intake["POST /agent-intake\nIngest Scores"]
        MLModel["ML Model\nscikit-learn Prediction"]
        DB[("PostgreSQL\nPatient Records")]
        History["GET /patients/:id/history\nScore History"]
    end

    subgraph MCP ["MCP Server"]
        MCPTools["Claude Tool Integration\nStructured Data Access"]
    end

    Patient -->|"Opens app"| CheckIn
    CheckIn -->|"Answers submitted"| Chat
    Chat -->|"Scores extracted"| Intake

    Patient -->|"Receives call"| LiveCall
    Doctor -->|"Triggers call"| AriaUI
    AriaUI -->|"POST /api/call"| CallInit
    CallInit -->|"Create call"| LiveCall
    LiveCall -->|"Call ends"| Transcript
    Transcript -->|"Webhook payload"| Webhook
    Webhook -->|"Parse transcript"| Analyze
    Analyze -->|"7 clinical scores"| Intake

    Intake --> MLModel
    MLModel -->|"ENS severity"| DB
    Intake --> DB

    Doctor -->|"Opens dashboard"| DocDash
    DB -->|"Patient history"| History
    History -->|"30-day trends"| DocDash
    DocDash --> ClinicalAI
    DocDash --> PDFExport
    ClinicalAI <-->|"Tool calls"| MCPTools
```

---

### Patient Journey

```mermaid
sequenceDiagram
    actor P as Patient
    participant UI as Next.js UI
    participant Chat as AI Chat (Claude/Groq)
    participant API as FastAPI :8000
    participant DB as PostgreSQL

    P->>UI: Opens app, selects Patient role
    UI->>P: Shows 7 ENS symptom questions

    loop Daily Check-in
        P->>UI: Answers each question (3 options)
        UI->>UI: Calculates scores (0/3/5 per question)
    end

    UI->>Chat: Sends scores + context
    Chat->>P: Asks contextual follow-up questions
    P->>Chat: Responds in natural language
    Chat->>P: AI analysis + emotional support

    UI->>API: POST /agent-intake (scores JSON)
    API->>DB: Store patient record
    DB-->>UI: Confirm saved

    UI->>P: Shows 30-day calendar
    Note over UI,P: Green = stable · Yellow = drift · Red = escalation
```

---

### Aria Voice Call Pipeline

```mermaid
sequenceDiagram
    actor D as Doctor / System
    participant Web as Next.js :3000
    participant Flask as Flask :5001
    participant Retell as Retell AI
    actor Pt as Patient Phone
    participant Claude as Claude AI
    participant FastAPI as FastAPI :8000
    participant DB as PostgreSQL

    D->>Web: Clicks "Call Patient" + phone number
    Web->>Flask: POST /api/call {phone_number}
    Flask->>Retell: Create call (agent_id, from, to)
    Retell->>Pt: Dials patient phone
    Pt->>Retell: Answers — Aria asks ENS questions
    Retell->>Pt: Real-time voice conversation
    Pt->>Retell: Responds about symptoms

    Note over Retell,Pt: Call ends (patient hangs up or completes)

    Retell->>Flask: POST /webhook/retell {transcript}
    Flask->>Claude: Analyse transcript → extract 7 scores
    Claude-->>Flask: JSON {air_sensation, nasal_dryness, burning,\nsuffocation, anxiety, humidity, sleep}
    Flask->>FastAPI: POST /agent-intake {patient_id, scores}
    FastAPI->>DB: Store scored record
    FastAPI-->>Flask: 200 OK
    Flask-->>Web: Call complete
    Web-->>D: Score tiles + transcript visible
```

---

### Doctor Dashboard Flow

```mermaid
flowchart LR
    Login["Doctor Signs In"] --> Dash["Doctor Dashboard"]

    Dash --> BodyMap["Interactive Body Map\n7 ENS Hotspot Zones"]
    Dash --> Gauges["Score Gauges\n0–10 per dimension"]
    Dash --> Charts["Trend Charts\n30-day line + radar"]
    Dash --> AiChat["Clinical AI Chat"]
    Dash --> PDF["PDF Export"]

    BodyMap -->|"Click zone"| ZoneDetail["Zone Detail\nScore · Description · History"]
    Gauges -->|"Red threshold"| Alert["⚠️ Escalation Alert"]

    AiChat -->|"Doctor asks question"| Claude["Claude claude-sonnet-4-6"]
    Claude -->|"Tool call"| MCP["MCP Server\nFetch patient data"]
    MCP -->|"Structured data"| Claude
    Claude -->|"Clinical response"| AiChat

    PDF -->|"Generate"| Report["3-Page Clinical Report\n① Score Overview\n② Trend Analysis\n③ AI Recommendations"]
    Report -->|"Download"| File["saarthi_report.pdf"]
```

---

## Features

### Patient Side
- **Daily Check-in** — 7-question ENS symptom assessment (air sensation, nasal dryness, burning, suffocation, anxiety, humidity sensitivity, sleep quality)
- **AI Follow-up Chat** — Conversational follow-up powered by Claude/GPT-4, asking contextual questions based on today's scores
- **Aria Voice Calls** — Automated daily check-in calls via Retell AI + Claude so patients never miss a logging day
- **30-Day Trend Calendar** — Visual green/yellow/red status tracking across the month

### Doctor Dashboard
- **Interactive Body Map** — Anatomically accurate SVG figure with 7 clickable ENS hotspot zones; hover to see zone severity and clinical description
- **Score Gauges** — Real-time 0–10 severity gauge for each of the 7 ENS dimensions
- **Trend Charts** — 30-day line + radar charts across all dimensions
- **Clinical AI Chat** — Ask the AI anything about the patient: *"Is this patient deteriorating?"*, *"What treatment adjustments do you recommend?"*
- **PDF Clinical Report** — One-click export of a 3-page clinical report with score overview, trend analysis, and AI recommendations
- **Full Patient History** — Call transcripts, scored responses, and historical analysis

### Intelligence Layer
- **ENS Severity Scoring** — ML model trained on ENS clinical data producing 0–10 scores per dimension
- **Emotion & Intensity Analysis** — Claude AI parses call transcripts into structured clinical JSON
- **Predictive Alerts** — Flags patients showing upward drift in composite score before crisis

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Framer Motion |
| AI / LLM | Anthropic Claude (claude-sonnet-4-6), OpenAI GPT-4, Groq |
| Voice | Retell AI, real-time call transcription |
| Backend API | Flask 3, FastAPI 0.111 |
| ML | scikit-learn, pandas, numpy (models in `Saarthi/models/`) |
| Database | PostgreSQL via SQLAlchemy ORM |
| PDF Export | jsPDF 4, html2canvas |
| Charts | Recharts |
| Deployment | Vercel (web), Railway (Flask + FastAPI) |
| MCP | Model Context Protocol server for Claude tool integration |

---

## Project Structure

```
SAARTHI/
│
├── web/                              # Next.js 16 frontend (Vercel)
│   ├── src/app/
│   │   ├── page.tsx                  # Patient check-in + AI chat + 30-day calendar
│   │   ├── DoctorDashboard.tsx       # Doctor analytics, body map, Clinical AI, PDF export
│   │   ├── AriaCallPanel.tsx         # Voice call UI (Retell AI)
│   │   ├── AnalysisDashboard.tsx     # Score analysis + charts
│   │   ├── CopilotKitWrapper.tsx     # CopilotKit integration
│   │   ├── generateReport.ts         # jsPDF clinical report generator
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── signin/page.tsx           # Sign-in page
│   │   └── api/
│   │       ├── chat/route.ts         # AI chat (OpenAI / Groq)
│   │       ├── call/route.ts         # Retell call initiation proxy
│   │       ├── call/[callId]/route.ts # Call status proxy
│   │       ├── doctor-chat/route.ts  # Clinical AI (Claude)
│   │       ├── claude-agent/route.ts # Claude agent with tools
│   │       ├── copilotkit/route.ts   # CopilotKit backend
│   │       └── status/route.ts       # Health check endpoint
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   └── vercel.json
│
├── Saarthi/                          # Python backend
│   ├── app.py                        # Flask: Aria voice agent, Retell webhooks
│   ├── main.py                       # FastAPI: ENS scoring API, patient data
│   ├── ml_service.py                 # ML inference (scikit-learn)
│   ├── models.py                     # SQLAlchemy ORM models
│   ├── schemas.py                    # Pydantic request/response schemas
│   ├── crud.py                       # Database CRUD operations
│   ├── database.py                   # DB session & connection
│   ├── config.py                     # App configuration
│   ├── train_global_model.py         # ML model training script
│   ├── models/
│   │   ├── global_model.pkl          # Trained ENS prediction model
│   │   ├── label_encoder.pkl         # Label encoder
│   │   └── scaler.pkl                # Feature scaler
│   ├── templates/index.html          # Flask HTML template
│   ├── requirements.txt              # Python dependencies
│   ├── startup.sh                    # Starts Flask + FastAPI together
│   └── Procfile                      # Railway/Heroku process definition
│
├── mcp-server/
│   └── server.py                     # MCP server for Claude tool integration
│
├── start.sh                          # One-command local dev startup
├── DEPLOYMENT.md                     # Step-by-step deployment guide
├── .gitignore
└── README.md
```

---

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL (or skip — app runs without DB for UI-only testing)

### 1. Clone
```bash
git clone https://github.com/Sur27codes/SAARTHI.git
cd SAARTHI
```

### 2. Start the Python backend
```bash
cd Saarthi
pip install -r requirements.txt

# Create your .env (never commit this file)
cp .env.example .env   # edit with your real keys

bash startup.sh        # starts FastAPI :8000 + Flask :5001
```

### 3. Start the web app
```bash
cd ../web
npm install

# Create your .env.local (never commit this file)
cp .env.example .env.local   # edit with your real keys

npm run dev            # http://localhost:3000
```

### 4. Open
| URL | What it is |
|-----|-----------|
| http://localhost:3000 | Patient & Doctor UI |
| http://localhost:8000/docs | FastAPI Swagger UI |
| http://localhost:5001 | Flask / Aria calling agent |

---

## Environment Variables

> **Never commit `.env` or `.env.local` files.** Both are in `.gitignore`.

### `web/.env.local`
```env
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
FLASK_CALL_URL=http://localhost:5001   # production: your Railway URL
```

### `Saarthi/.env`
```env
RETELL_API_KEY=your_retell_api_key
RETELL_AGENT_ID=your_retell_agent_id
FROM_NUMBER=+1xxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://user:password@host:5432/saarthi
FLASK_ENV=production
PORT=5001
```

---

## API Reference

### Flask — Aria Voice Agent (`:5001`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/call` | Initiate a Retell AI patient call |
| GET | `/api/call/:id` | Get call status |
| POST | `/webhook/retell` | Retell call-completion webhook → triggers scoring |

### FastAPI — ENS Engine (`:8000`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/agent-intake` | Ingest scored call transcript from Flask |
| GET | `/patients` | List all patients |
| GET | `/patients/:id/history` | Patient score history |
| GET | `/predict/:id` | ML severity prediction for a patient |
| GET | `/docs` | Interactive Swagger UI |

### Next.js API Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | AI chat (OpenAI / Groq) |
| POST | `/api/doctor-chat` | Clinical AI (Claude) |
| POST | `/api/claude-agent` | Claude agent with tools |
| GET | `/api/status` | System health check (Flask online?) |

---

## Deployment

### Web — Vercel (live)
```bash
cd web
npm i -g vercel
vercel --prod
```
Already deployed at **https://saarthi-hackrare.vercel.app**

### Backend — Railway
1. Create a new Railway project → New Service → GitHub Repo → set Root Directory = `Saarthi`
2. Add a PostgreSQL plugin (Railway auto-injects `DATABASE_URL`)
3. Add env vars: `RETELL_API_KEY`, `RETELL_AGENT_ID`, `FROM_NUMBER`, `ANTHROPIC_API_KEY`
4. Railway uses `Procfile` to start Flask on `$PORT`
5. Deploy a second service for FastAPI with start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Copy the Railway URL → update `FLASK_CALL_URL` in your Vercel env vars

Full step-by-step guide: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## ML Model

The ENS prediction model lives in `Saarthi/models/`:

| File | Purpose |
|------|---------|
| `global_model.pkl` | Trained scikit-learn classifier (2.8 MB) |
| `label_encoder.pkl` | Maps severity labels to numeric classes |
| `scaler.pkl` | Feature normalisation scaler |

To retrain on new data:
```bash
cd Saarthi
python train_global_model.py
```

---

## Hackathon Context

SAARTHI was built for **HackRare** — a hackathon focused on rare diseases. ENS affects an estimated 20,000+ patients in the US alone with virtually no dedicated digital health tools. SAARTHI addresses:

- **Under-diagnosis** — structured daily scoring helps doctors quantify a subjective condition
- **Isolation** — patients feel unheard; Aria's voice calls provide daily human-like check-ins
- **Clinical gaps** — the doctor dashboard gives physicians longitudinal data they've never had before

---

## Security

- All API keys are stored as environment variables — never hardcoded
- `.env` and `.env.local` are git-ignored
- Vercel env vars are encrypted at rest
- CORS is configured to allow only expected origins in production

---

## Contributing

Pull requests welcome. For major changes please open an issue first to discuss what you'd like to change.

---

## License

MIT © Sur27codes
