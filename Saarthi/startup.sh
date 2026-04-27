#!/bin/bash
# SAARTHI — Local Development Startup Script
# Starts both FastAPI (port 8000) and Flask (port 5000) backends

set -e

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║          SAARTHI — Aria Calling Agent Backend          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check .env exists
if [ ! -f ".env" ]; then
  echo "⚠️  WARNING: .env file not found. Copy .env.example and fill in your keys."
  echo ""
fi

# Check if ML models exist
if [ ! -f "models/global_model.pkl" ]; then
  echo "⚠️  ML models not found. Training global model..."
  python train_global_model.py
  echo "✅ Model trained."
fi

echo "🚀 Starting FastAPI ENS backend on http://localhost:8000 ..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
FASTAPI_PID=$!
echo "   FastAPI PID: $FASTAPI_PID"
sleep 2

echo ""
echo "🚀 Starting Flask Aria calling agent on http://localhost:5000 ..."
python app.py &
FLASK_PID=$!
echo "   Flask PID: $FLASK_PID"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ Both backends running!"
echo "  📡 FastAPI (ENS):  http://localhost:8000"
echo "  📞 Flask (Aria):   http://localhost:5000"
echo "  📱 Next.js Web:    http://localhost:3000  (npm run dev)"
echo "  📚 API Docs:       http://localhost:8000/docs"
echo "═══════════════════════════════════════════════════════════"
echo "  Press Ctrl+C to stop all servers"
echo ""

# Wait and forward signals
trap "echo ''; echo 'Stopping servers...'; kill $FASTAPI_PID $FLASK_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
