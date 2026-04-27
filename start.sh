#!/bin/bash
# ═══════════════════════════════════════════════════════════
#   SAARTHI — Single Command Startup
#   Starts the entire SAARTHI stack with one command:
#   bash start.sh
# ═══════════════════════════════════════════════════════════

set -e

# ── Colors ─────────────────────────────────────────────────
G='\033[0;32m'; Y='\033[0;33m'; R='\033[0;31m'; B='\033[0;34m'; C='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'

echo ""
echo -e "${C}${BOLD}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${C}${BOLD}║       SAARTHI — ENS Health Intelligence Platform       ║${NC}"
echo -e "${C}${BOLD}║              Starting entire application stack          ║${NC}"
echo -e "${C}${BOLD}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SAARTHI_DIR="$SCRIPT_DIR/Saarthi"
WEB_DIR="$SCRIPT_DIR/web"
MCP_DIR="$SCRIPT_DIR/mcp-server"

PIDS=()
cleanup() {
    echo ""
    echo -e "${Y}Stopping all SAARTHI services...${NC}"
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    echo -e "${G}✓ All services stopped.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

# ── 1. FastAPI ENS Backend (port 8001 to avoid conflict with MCP) ──────────
echo -e "${B}[1/4]${NC} Starting FastAPI ENS backend..."
if [ -f "$SAARTHI_DIR/main.py" ]; then
    export ENS_API_URL="http://localhost:8001"
    cd "$SAARTHI_DIR"
    if [ -f "$SAARTHI_DIR/venv/bin/python" ]; then
        SAARTHI_PYTHON="$SAARTHI_DIR/venv/bin/python"
    else
        SAARTHI_PYTHON="python3"
    fi
    "$SAARTHI_PYTHON" -m uvicorn main:app --host 0.0.0.0 --port 8001 --log-level warning > /tmp/saarthi_fastapi.log 2>&1 &
    PIDS+=($!)
    echo -e "       ${G}✓${NC} FastAPI ENS     → http://localhost:8001"
    echo -e "          API Docs          → http://localhost:8001/docs"
else
    echo -e "       ${Y}⚠ Skipped (main.py not found)${NC}"
fi
sleep 1

# ── 2. Flask Aria Calling Agent (port 5001) ────────────────────────────────
echo -e "${B}[2/4]${NC} Starting Flask Aria calling agent..."
if [ -f "$SAARTHI_DIR/app.py" ]; then
    cd "$SAARTHI_DIR"
    if [ -f "$SAARTHI_DIR/venv/bin/python" ]; then
        SAARTHI_PYTHON="$SAARTHI_DIR/venv/bin/python"
    else
        SAARTHI_PYTHON="python3"
    fi
    PORT=5001 "$SAARTHI_PYTHON" app.py > /tmp/saarthi_flask.log 2>&1 &
    PIDS+=($!)
    echo -e "       ${G}✓${NC} Flask (Aria)    → http://localhost:5001"
else
    echo -e "       ${Y}⚠ Skipped (app.py not found)${NC}"
fi
sleep 1

# ── 3. MCP Server (port 8000) ──────────────────────────────────────────────
echo -e "${B}[3/4]${NC} Starting MCP tool server..."
if [ -f "$MCP_DIR/server.py" ]; then
    cd "$MCP_DIR"
    # Use venv if available
    if [ -d "venv/bin" ]; then
        venv/bin/python server.py > /tmp/saarthi_mcp.log 2>&1 &
    else
        python server.py > /tmp/saarthi_mcp.log 2>&1 &
    fi
    PIDS+=($!)
    echo -e "       ${G}✓${NC} MCP Server     → http://localhost:8000/sse"
else
    echo -e "       ${Y}⚠ Skipped (server.py not found)${NC}"
fi
sleep 2

# ── 4. Next.js Web App (port 3000) ────────────────────────────────────────
echo -e "${B}[4/4]${NC} Starting Next.js web application..."
if [ -d "$WEB_DIR" ] && [ -f "$WEB_DIR/package.json" ]; then
    cd "$WEB_DIR"
    # Install deps if node_modules missing
    if [ ! -d "node_modules" ]; then
        echo -e "       Installing npm packages..."
        npm install --legacy-peer-deps > /tmp/saarthi_npm_install.log 2>&1
    fi
    npm run dev > /tmp/saarthi_web.log 2>&1 &
    PIDS+=($!)
    echo -e "       ${G}✓${NC} Next.js Web    → http://localhost:3000"
else
    echo -e "       ${R}✗ web/ directory not found${NC}"
fi
sleep 3

# ── Summary ────────────────────────────────────────────────────────────────
echo ""
echo -e "${C}${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  SAARTHI is running! Open your browser:${NC}"
echo ""
echo -e "  🌐  ${G}${BOLD}http://localhost:3000${NC}       ← Main web application"
echo -e "  📞  ${B}http://localhost:5001${NC}       ← Aria calling agent"
echo -e "  🧠  ${B}http://localhost:8000/sse${NC}   ← MCP tool server"
echo -e "  🔬  ${B}http://localhost:8001/docs${NC}  ← ENS API documentation"
echo ""
echo -e "  ${G}Sign in as Patient or Doctor to get started.${NC}"
echo ""
echo -e "${C}  Logs: /tmp/saarthi_*.log${NC}"
echo -e "${C}  Press Ctrl+C to stop all services.${NC}"
echo -e "${C}${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo ""

# ── Wait for all processes ─────────────────────────────────────────────────
wait
