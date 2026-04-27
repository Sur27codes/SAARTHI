# SAARTHI — Complete Deployment Guide

This guide walks through deploying the full SAARTHI stack worldwide so anyone can access it.

## Architecture

```
┌─────────────────────────────────┐
│  Next.js Web App (Vercel)       │  ← Patient & Doctor UI
│  web/                           │    Port 3000 (dev) / vercel.app (prod)
└──────────┬──────────────────────┘
           │ /api/call (proxy)
           ▼
┌─────────────────────────────────┐
│  Flask — Aria Calling Agent     │  ← Retell AI, Anthropic Claude
│  Saarthi/app.py                 │    Port 5000 (dev) / Railway (prod)
└──────────┬──────────────────────┘
           │ POST /agent-intake
           ▼
┌─────────────────────────────────┐
│  FastAPI — ENS Prediction       │  ← ML model, PostgreSQL
│  Saarthi/main.py                │    Port 8000 (dev) / Railway (prod)
└─────────────────────────────────┘
```

---

## 🖥️ Local Development

### Step 1 — Start Saarthi backend
```bash
cd "SAARTHI HackRare/Saarthi"
pip install -r requirements.txt
bash startup.sh   # starts both FastAPI (8000) + Flask (5000)
```

### Step 2 — Start Next.js web app
```bash
cd "SAARTHI HackRare/web"
npm install
npm run dev          # http://localhost:3000
```

### Step 3 — Open in browser
- http://localhost:3000 → Patient/Doctor UI
- http://localhost:8000/docs → FastAPI API docs

---

## 🌐 Worldwide Deployment

### Part A — Deploy Saarthi Backend on Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select the `Saarthi` folder (set **Root Directory** = `Saarthi`)
3. Add PostgreSQL plugin in Railway (it auto-sets `DATABASE_URL`)
4. Set these environment variables in Railway:
   ```
   RETELL_API_KEY=your_retell_api_key_here
   RETELL_AGENT_ID=your_retell_agent_id_here
   FROM_NUMBER=+1xxxxxxxxxx
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   FLASK_ENV=production
   PORT=5000
   ```
5. Railway will start Flask via the `Procfile`
6. Note your Railway URL, e.g. `https://saarthi-production.up.railway.app`

> **For FastAPI (ENS):** Deploy as a second Railway service pointing to the same repo with Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

---

### Part B — Deploy Next.js Web App on Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import GitHub repo
2. Set **Root Directory** = `web`
3. Set these Environment Variables in Vercel dashboard:
   ```
   FLASK_CALL_URL=https://saarthi-production.up.railway.app
   OPENAI_API_KEY=sk-proj-...
   ANTHROPIC_API_KEY=sk-ant-api03-...
   GROQ_API_KEY=gsk_...
   ```
4. Deploy → Your app is live at `https://your-app.vercel.app`

---

### Part C — Configure Retell Webhook

In the [Retell Dashboard](https://app.retellai.com):
1. Go to your Agent → Webhook URL
2. Set: `https://saarthi-production.up.railway.app/webhook/retell`
3. This ensures call transcripts are pushed instantly after completion

---

## 🔑 Environment Variables Reference

### Saarthi Backend (.env)
| Variable | Description |
|----------|-------------|
| `RETELL_API_KEY` | From Retell dashboard |
| `RETELL_AGENT_ID` | Your Aria agent ID |
| `FROM_NUMBER` | Retell phone number (E.164) |
| `ANTHROPIC_API_KEY` | For Claude AI transcript analysis |
| `DATABASE_URL` | PostgreSQL connection string |
| `SAARTHI_API_URL` | URL of FastAPI service (if separate) |
| `PORT` | Port for Flask (default: 5000) |

### Web App (.env.local)
| Variable | Description |
|----------|-------------|
| `FLASK_CALL_URL` | URL of Saarthi Flask backend |
| `OPENAI_API_KEY` | For Groq chat and deep research |
| `ANTHROPIC_API_KEY` | For Claude deep research mode |
| `GROQ_API_KEY` | Fast LLM for chat responses |

---

## 🚀 Upgrade Aria Agent (Retell Dashboard)

To make Aria smarter in conversations:
1. Go to https://app.retellai.com → Agents → Edit your agent
2. Update the **System Prompt** to focus on ENS-specific questions:
   - Ask about air sensation quality (not just breathlessness)
   - Ask about nasal dryness/burning pattern (time of day)
   - Ask about sleep quality with specific hours
   - Ask about anxiety/psychological impact
   - Use empathetic, patient ENS-aware language

---

## ✅ Verification Checklist

- [ ] `npm run build` in `web/` succeeds with no errors  
- [ ] `http://localhost:3000` loads login page
- [ ] Patient can sign in and see Chat + Aria Call tabs
- [ ] Doctor can sign in and see Doctor View + Clinical AI + Aria Call tabs
- [ ] Aria Call tab shows "Aria server online" badge
- [ ] Entering a phone number + clicking "Call Patient" initiates a Retell call
- [ ] After call ends, transcript appears in the right panel
- [ ] ENS signal (Green/Yellow/Red) shows with probability bars and score tiles
- [ ] Score tiles are colored (green/yellow/red) based on severity
- [ ] AI reasoning text shows below Z-summary
