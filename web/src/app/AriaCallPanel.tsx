"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";

/* ────────────────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────────────────── */
interface TranscriptMsg {
    role: "agent" | "user" | string;
    content: string;
}
interface EnsResult {
    signal: string;
    ml_signal: string | null;
    z_override: string | null;
    confidence: number;
    model_used: string;
    borderline: boolean;
    prob_green: number;
    prob_yellow: number;
    prob_red: number;
    max_abs_z: number;
    z_scores: Record<string, number>;
    top_deviations: { feature: string; z: number }[];
    z_summary: string;
    scores_used: Record<string, number>;
    reasoning: string;
}
interface CallStore {
    call_id: string;
    status: "initiated" | "in_progress" | "completed" | "error" | string;
    to_number?: string;
    patient_name?: string;
    transcript: TranscriptMsg[];
    transcript_text: string;
    started_at: string | null;
    ended_at: string | null;
    ens_result: EnsResult | null;
    ens_error: string | null;
    extracted_scores: Record<string, number> | null;
}

interface HistEntry {
    label: string;
    time: string;
    signal: string | null;
}

/* ────────────────────────────────────────────────────────────
   CONSTANTS
──────────────────────────────────────────────────────────── */
const SCORE_META: Record<string, { label: string; max: number; warn: number; danger: number }> = {
    Air_Sensation: { label: "Air Sensation", max: 10, warn: 5, danger: 7 },
    Nasal_Dryness: { label: "Nasal Dryness", max: 10, warn: 5, danger: 7 },
    Nasal_Burning: { label: "Nasal Burning", max: 10, warn: 4, danger: 7 },
    Suffocation: { label: "Suffocation", max: 10, warn: 4, danger: 7 },
    Anxiety_Score: { label: "Anxiety", max: 10, warn: 5, danger: 7 },
    Sleep_Quality_Hrs: { label: "Sleep Hrs", max: 12, warn: 5, danger: 3 },
    Humidity_Level_Pct: { label: "Humidity %", max: 100, warn: 30, danger: 15 },
};
const SIGNAL_ICONS: Record<string, string> = { Green: "🟢", Yellow: "🟡", Red: "🔴" };

function esc(s: string) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function fmtSecs(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function getScoreColor(key: string, val: number): string {
    const meta = SCORE_META[key];
    if (!meta) return "var(--a-accent2)";
    // For sleep, lower = worse; for others higher = worse
    if (key === "Sleep_Quality_Hrs") {
        if (val <= meta.danger) return "var(--a-red)";
        if (val <= meta.warn) return "var(--a-yellow)";
        return "var(--a-green)";
    }
    if (key === "Humidity_Level_Pct") {
        if (val <= meta.danger) return "var(--a-red)";
        if (val <= meta.warn) return "var(--a-yellow)";
        return "var(--a-accent2)";
    }
    if (val >= meta.danger) return "var(--a-red)";
    if (val >= meta.warn) return "var(--a-yellow)";
    return "var(--a-accent2)";
}

/* ────────────────────────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────────────────────────── */
export default function AriaCallPanel() {
    const [phone, setPhone] = useState("");
    const [name, setName] = useState("");
    const [activeCallId, setActiveCallId] = useState<string | null>(null);
    const [callStore, setCallStore] = useState<CallStore | null>(null);
    const [calling, setCalling] = useState(false);
    const [callSecs, setCallSecs] = useState(0);
    const [status, setStatus] = useState<"ready" | "ringing" | "active" | "done" | "error">("ready");
    const [statusText, setStatusText] = useState("Ready");
    const [history, setHistory] = useState<HistEntry[]>([]);
    const [renderedCount, setRenderedCount] = useState(0);
    const [fullTranscript, setFullTranscript] = useState("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [serverReachable, setServerReachable] = useState<boolean | null>(null);

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    // ── Check server connectivity on mount ───────────────────
    useEffect(() => {
        const checkServer = async () => {
            try {
                const res = await fetch("/api/call", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ _ping: true }),
                    signal: AbortSignal.timeout(4000),
                });
                // Any non-network-error response means the proxy works
                // (even a 400 from the Flask side means it's reachable)
                setServerReachable(res.status !== 502 && res.status !== 503);
            } catch {
                setServerReachable(false);
            }
        };
        checkServer();
    }, []);

    // ── Initiate call ───────────────────────────────────────
    const initiateCall = useCallback(async () => {
        if (!phone.trim()) return;
        setErrorMsg(null);
        setCalling(true);
        setRenderedCount(0);
        setFullTranscript("");
        setCallStore(null);
        setStatus("ringing");
        setStatusText("Calling…");

        try {
            const res = await fetch("/api/call", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone_number: phone.trim(), patient_name: name.trim() || "there" }),
            });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || "Failed to initiate call");
            setActiveCallId(data.call_id);
            setServerReachable(true);
            // start timer
            setCallSecs(0);
            clearInterval(timerRef.current!);
            timerRef.current = setInterval(() => setCallSecs((s) => s + 1), 1000);
            // start polling
            startPolling(data.call_id);
        } catch (e: any) {
            setStatus("error");
            setStatusText("Error");
            setCalling(false);
            setServerReachable(false);
            setErrorMsg(e.message || "Could not reach the Aria calling server.");
        }
    }, [phone, name]);

    // ── Polling ─────────────────────────────────────────────
    function startPolling(callId: string) {
        clearInterval(pollRef.current!);
        pollRef.current = setInterval(() => pollCall(callId), 3000);
    }
    function stopPolling() {
        clearInterval(pollRef.current!);
        clearInterval(timerRef.current!);
        pollRef.current = null;
    }
    async function pollCall(callId: string) {
        try {
            const res = await fetch(`/api/call/${callId}`, { cache: "no-store" });
            if (!res.ok) return;
            const data: CallStore = await res.json();
            setCallStore(data);

            if (data.status === "in_progress") { setStatus("active"); setStatusText("In progress"); }
            if (data.status === "completed") {
                stopPolling();
                setStatus("done"); setStatusText("Completed ✓"); setCalling(false);
                setFullTranscript(
                    data.transcript_text ||
                    data.transcript.map((m) => `${m.role === "agent" ? "Aria" : "Patient"}: ${m.content}`).join("\n\n")
                );
                const sig = data.ens_result?.signal || null;
                setHistory((h) => [{ label: (name || phone), time: new Date().toLocaleTimeString(), signal: sig }, ...h.slice(0, 9)]);
            }
        } catch { /* silent */ }
    }

    function handleNewCall() {
        stopPolling();
        setCallStore(null);
        setActiveCallId(null);
        setFullTranscript("");
        setStatus("ready");
        setStatusText("Ready");
        setCallSecs(0);
        setRenderedCount(0);
        setErrorMsg(null);
        setPhone("");
        setName("");
    }

    useEffect(() => () => stopPolling(), []);
    useEffect(() => { transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [callStore?.transcript]);

    const transcript = callStore?.transcript || [];
    const ensResult = callStore?.ens_result;
    const ensError = callStore?.ens_error;
    const isAnalysing = callStore?.status === "completed" && !ensResult && !ensError;
    const scores = ensResult?.scores_used || {};

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,300&display=swap');

        .aria-wrap {
          --a-bg: #080c0f;
          --a-bg2: #0d1218;
          --a-surface: #111820;
          --a-surface2: #16202c;
          --a-border: rgba(120,180,255,0.08);
          --a-border2: rgba(120,180,255,0.14);
          --a-accent: #4aeaaa;
          --a-accent2: #7aa3ff;
          --a-accent3: #e87aff;
          --a-text: #d8e8f8;
          --a-muted: #4a6080;
          --a-green: #4aeaaa;
          --a-yellow: #f5c543;
          --a-red: #ff6b6b;
          font-family: 'IBM Plex Mono', monospace;
          background: var(--a-bg);
          color: var(--a-text);
          display: flex;
          height: 100%;
          overflow: hidden;
          border-radius: 16px;
          position: relative;
        }

        /* grid noise texture */
        .aria-wrap::before {
          content: '';
          position: absolute; inset: 0; border-radius: 16px;
          background-image:
            linear-gradient(rgba(74,234,170,0.013) 1px, transparent 1px),
            linear-gradient(90deg, rgba(74,234,170,0.013) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none; z-index: 0;
        }

        /* ── SERVER STATUS BANNER ── */
        .aria-server-banner {
          position: absolute; top: 10px; right: 14px;
          z-index: 10; display: flex; align-items: center; gap: 6px;
          padding: 4px 10px; border-radius: 4px; font-size: 10px;
          letter-spacing: 0.05em; transition: all 0.3s;
        }
        .aria-server-banner.online {
          background: rgba(74,234,170,0.07);
          border: 1px solid rgba(74,234,170,0.2);
          color: var(--a-green);
        }
        .aria-server-banner.offline {
          background: rgba(255,107,107,0.07);
          border: 1px solid rgba(255,107,107,0.2);
          color: var(--a-red);
        }
        .aria-server-banner.checking {
          background: var(--a-surface);
          border: 1px solid var(--a-border);
          color: var(--a-muted);
        }

        /* ── LEFT PANEL ── */
        .aria-left {
          width: 340px; flex-shrink: 0;
          border-right: 1px solid var(--a-border);
          background: var(--a-bg2);
          padding: 20px 16px;
          display: flex; flex-direction: column; gap: 18px;
          overflow-y: auto; position: relative; z-index: 1;
        }

        .aria-section-head {
          font-size: 10px; color: var(--a-muted);
          text-transform: uppercase; letter-spacing: 0.1em;
          padding-bottom: 8px; border-bottom: 1px solid var(--a-border);
        }

        .aria-field { display: flex; flex-direction: column; gap: 5px; }
        .aria-field label {
          font-size: 10px; color: var(--a-muted);
          text-transform: uppercase; letter-spacing: 0.08em;
        }
        .aria-input {
          width: 100%; padding: 9px 12px;
          background: var(--a-surface);
          border: 1px solid var(--a-border);
          border-radius: 6px;
          color: var(--a-text); font-family: 'IBM Plex Mono', monospace;
          font-size: 13px; outline: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .aria-input:focus { border-color: var(--a-accent2); background: var(--a-surface2); }
        .aria-input::placeholder { color: var(--a-muted); }
        .aria-input:disabled { opacity: 0.5; cursor: not-allowed; }

        .aria-btn-call {
          width: 100%; padding: 12px;
          background: linear-gradient(135deg, rgba(74,234,170,0.12), rgba(122,163,255,0.12));
          border: 1px solid rgba(74,234,170,0.3);
          border-radius: 6px;
          color: var(--a-accent); font-family: 'IBM Plex Mono', monospace;
          font-size: 13px; font-weight: 500; letter-spacing: 0.06em;
          cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .aria-btn-call:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(74,234,170,0.15); }
        .aria-btn-call:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

        .aria-btn-new {
          width: 100%; padding: 10px;
          background: rgba(122,163,255,0.08);
          border: 1px solid rgba(122,163,255,0.2);
          border-radius: 6px;
          color: var(--a-accent2); font-family: 'IBM Plex Mono', monospace;
          font-size: 12px; font-weight: 500; letter-spacing: 0.05em;
          cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .aria-btn-new:hover { background: rgba(122,163,255,0.13); box-shadow: 0 2px 12px rgba(122,163,255,0.12); }

        /* ERROR INLINE */
        .aria-error-box {
          padding: 10px 12px; border-radius: 6px;
          background: rgba(255,107,107,0.06);
          border: 1px solid rgba(255,107,107,0.22);
          font-size: 11px; color: var(--a-red);
          line-height: 1.65;
          display: flex; flex-direction: column; gap: 6px;
        }
        .aria-error-box .aria-error-title {
          font-weight: 600; font-size: 10px; text-transform: uppercase;
          letter-spacing: 0.08em; display: flex; align-items: center; gap: 5px;
        }
        .aria-error-box .aria-error-hint {
          font-size: 10px; color: rgba(255,107,107,0.65); line-height: 1.6;
        }

        /* status pill */
        .aria-pill {
          display: flex; align-items: center; gap: 7px;
          padding: 5px 12px; border-radius: 4px;
          background: var(--a-surface); border: 1px solid var(--a-border);
          font-size: 11px; letter-spacing: 0.05em;
          transition: all 0.3s;
        }
        .aria-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--a-muted); flex-shrink: 0;
          transition: background 0.3s;
        }
        .aria-dot.ringing { background: var(--a-yellow); animation: ariadot 0.8s infinite; }
        .aria-dot.active  { background: var(--a-accent); animation: ariadot 2s infinite; }
        .aria-dot.done    { background: var(--a-accent); }
        .aria-dot.error   { background: var(--a-red); }
        @keyframes ariadot {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.3; transform: scale(0.7); }
        }

        /* Waveform bars */
        .aria-wave { display: flex; align-items: center; gap: 3px; height: 28px; padding: 2px 0; }
        .aria-wave-bar { width: 3px; border-radius: 3px; background: var(--a-accent); flex-shrink: 0; }
        @keyframes wb0 { 0%,100%{height:5px;opacity:.5} 50%{height:22px;opacity:1} }
        @keyframes wb1 { 0%,100%{height:12px;opacity:.7} 50%{height:7px;opacity:.9} }
        @keyframes wb2 { 0%,100%{height:8px;opacity:.4} 50%{height:20px;opacity:.8} }
        @keyframes wb3 { 0%,100%{height:18px;opacity:.8} 50%{height:6px;opacity:.6} }

        /* call card */
        .aria-call-card {
          background: var(--a-surface); border: 1px solid var(--a-border);
          border-radius: 8px; padding: 13px;
          display: flex; flex-direction: column; gap: 9px;
        }
        .aria-call-row { display: flex; justify-content: space-between; align-items: flex-start; }
        .aria-call-num { font-size: 13px; font-weight: 500; }
        .aria-call-dur { font-size: 11px; color: var(--a-muted); font-variant-numeric: tabular-nums; }
        .aria-btn-stop {
          width: 100%; padding: 6px;
          background: transparent;
          border: 1px solid rgba(255,107,107,0.2);
          border-radius: 5px;
          color: rgba(255,107,107,0.7); font-family: 'IBM Plex Mono', monospace;
          font-size: 11px; cursor: pointer; transition: all 0.2s; letter-spacing: 0.04em;
        }
        .aria-btn-stop:hover { background: rgba(255,107,107,0.06); border-color: rgba(255,107,107,0.4); }

        /* ENS panel */
        .aria-ens-panel {
          background: var(--a-surface); border: 1px solid var(--a-border);
          border-radius: 8px; padding: 13px;
          display: flex; flex-direction: column; gap: 11px;
        }
        .aria-ens-top { display: flex; align-items: center; justify-content: space-between; }
        .aria-ens-label { font-size: 10px; color: var(--a-muted); text-transform: uppercase; letter-spacing: 0.1em; }
        .aria-analysing { font-size: 10px; color: var(--a-muted); animation: aria-blink 1.2s infinite; }
        @keyframes aria-blink { 0%,100% { opacity: 0.8; } 50% { opacity: 0.2; } }

        .aria-signal-block {
          border-radius: 6px; padding: 10px 13px;
          display: flex; align-items: center; gap: 11px;
        }
        .aria-signal-block.Green  { background: rgba(74,234,170,0.08);  border: 1px solid rgba(74,234,170,0.25); }
        .aria-signal-block.Yellow { background: rgba(245,197,67,0.08);  border: 1px solid rgba(245,197,67,0.25); }
        .aria-signal-block.Red    { background: rgba(255,107,107,0.08); border: 1px solid rgba(255,107,107,0.25); }
        .aria-signal-icon { font-size: 20px; }
        .aria-signal-name { font-size: 13px; font-weight: 600; font-family: 'Fraunces', serif; }
        .aria-signal-name.Green  { color: var(--a-green); }
        .aria-signal-name.Yellow { color: var(--a-yellow); }
        .aria-signal-name.Red    { color: var(--a-red); }
        .aria-signal-meta { font-size: 10px; color: var(--a-muted); }

        .aria-prob-bars { display: flex; flex-direction: column; gap: 6px; }
        .aria-prob-row { display: flex; align-items: center; gap: 8px; font-size: 10px; }
        .aria-prob-lbl { width: 46px; color: var(--a-muted); flex-shrink: 0; }
        .aria-prob-track { flex: 1; height: 3px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; }
        .aria-prob-fill { height: 100%; border-radius: 2px; transition: width 0.8s cubic-bezier(.4,0,.2,1); }
        .aria-prob-fill.green  { background: var(--a-green); }
        .aria-prob-fill.yellow { background: var(--a-yellow); }
        .aria-prob-fill.red    { background: var(--a-red); }
        .aria-prob-pct { width: 32px; text-align: right; color: var(--a-muted); }

        .aria-scores-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
        .aria-score-tile {
          background: var(--a-bg2); border: 1px solid var(--a-border);
          border-radius: 5px; padding: 7px 9px;
          transition: border-color 0.3s;
        }
        .aria-score-tile-name { font-size: 9px; color: var(--a-muted); text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 4px; }
        .aria-score-tile-row { display: flex; align-items: center; gap: 6px; }
        .aria-score-tile-val { font-size: 13px; font-weight: 600; min-width: 22px; }
        .aria-score-tile-track { flex: 1; height: 3px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
        .aria-score-tile-fill { height: 100%; border-radius: 2px; transition: width 0.7s, background 0.5s; }

        .aria-z-text {
          font-size: 11px; color: var(--a-muted); line-height: 1.65;
          padding: 8px 10px;
          background: var(--a-bg2); border: 1px solid var(--a-border); border-radius: 5px;
        }
        .aria-reasoning-text {
          font-size: 11px; color: var(--a-text); line-height: 1.65;
          padding: 9px 11px;
          background: rgba(74,234,170,0.04); border: 1px solid rgba(74,234,170,0.10); border-radius: 5px;
          font-style: italic;
        }
        .aria-ens-err {
          font-size: 11px; color: var(--a-red); line-height: 1.6;
          padding: 8px 10px;
          background: rgba(255,107,107,0.04); border: 1px solid rgba(255,107,107,0.18); border-radius: 5px;
        }

        .aria-hist-empty { font-size: 11px; color: var(--a-muted); }
        .aria-hist-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 7px 0; border-bottom: 1px solid var(--a-border); font-size: 11px;
        }
        .aria-hist-row:last-child { border-bottom: none; }
        .aria-hist-name { color: var(--a-text); }
        .aria-hist-meta { color: var(--a-muted); display: flex; align-items: center; gap: 7px; }
        .aria-hist-sig {
          font-size: 9px; padding: 2px 6px; border-radius: 3px; font-weight: 500;
        }
        .aria-hist-sig.Green  { background: rgba(74,234,170,0.1);  color: var(--a-green); }
        .aria-hist-sig.Yellow { background: rgba(245,197,67,0.1);  color: var(--a-yellow); }
        .aria-hist-sig.Red    { background: rgba(255,107,107,0.1); color: var(--a-red); }

        /* ── RIGHT PANEL ── */
        .aria-right {
          flex: 1; display: flex; flex-direction: column;
          background: var(--a-bg); position: relative; z-index: 1; overflow: hidden;
        }
        .aria-toolbar {
          padding: 16px 24px 13px;
          border-bottom: 1px solid var(--a-border);
          display: flex; align-items: flex-end; justify-content: space-between; flex-shrink: 0;
        }
        .aria-transcript-title {
          font-family: 'Fraunces', serif; font-size: 18px; font-weight: 300;
          color: var(--a-text); letter-spacing: 0.01em;
        }
        .aria-transcript-count { font-size: 10px; color: var(--a-muted); margin-top: 2px; }
        .aria-toolbar-actions { display: flex; gap: 6px; }
        .aria-btn-sm {
          padding: 5px 11px;
          background: var(--a-surface); border: 1px solid var(--a-border);
          border-radius: 4px; color: var(--a-muted); font-family: 'IBM Plex Mono', monospace;
          font-size: 10px; cursor: pointer; transition: all 0.2s; letter-spacing: 0.05em;
        }
        .aria-btn-sm:hover { border-color: var(--a-border2); color: var(--a-text); }
        .aria-btn-sm.accent { border-color: rgba(74,234,170,0.25); color: var(--a-accent); }
        .aria-btn-sm.accent:hover { background: rgba(74,234,170,0.06); }

        .aria-done-bar {
          margin: 0 24px 10px;
          padding: 9px 13px;
          background: rgba(74,234,170,0.04);
          border: 1px solid rgba(74,234,170,0.18); border-radius: 6px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .aria-done-bar-text { font-size: 11px; color: var(--a-accent); }
        .aria-done-bar-time { font-size: 10px; color: var(--a-muted); }

        .aria-transcript-area {
          flex: 1; overflow-y: auto; padding: 18px 24px;
          display: flex; flex-direction: column; gap: 14px;
        }

        .aria-empty {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 10px; color: var(--a-muted); text-align: center;
          padding: 2rem;
        }
        .aria-empty-icon { font-size: 44px; opacity: 0.12; filter: grayscale(1); }
        .aria-empty-line1 { font-family: 'Fraunces', serif; font-size: 14px; font-weight: 300; color: rgba(216,232,248,0.28); }
        .aria-empty-line2 { font-size: 11px; line-height: 1.7; max-width: 240px; }

        /* ── OFFLINE STATE ── */
        .aria-offline-state {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 14px; text-align: center; padding: 2rem;
        }
        .aria-offline-icon { font-size: 40px; opacity: 0.25; }
        .aria-offline-title { font-family: 'Fraunces', serif; font-size: 15px; color: rgba(255,107,107,0.6); font-weight: 300; }
        .aria-offline-steps {
          font-size: 11px; color: var(--a-muted); line-height: 1.9;
          max-width: 280px;
          background: var(--a-surface); border: 1px solid var(--a-border);
          border-radius: 8px; padding: 12px 16px; text-align: left;
        }
        .aria-offline-steps code {
          color: var(--a-accent); font-family: 'IBM Plex Mono', monospace; font-size: 10px;
          background: rgba(74,234,170,0.07); padding: 1px 5px; border-radius: 3px;
        }

        .aria-msg { display: flex; flex-direction: column; gap: 3px; max-width: 640px; }
        .aria-msg-role { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; }
        .aria-msg.agent .aria-msg-role { color: var(--a-accent); }
        .aria-msg.user  .aria-msg-role { color: var(--a-accent2); }
        .aria-msg-bubble {
          padding: 9px 13px; border-radius: 8px;
          font-size: 13px; line-height: 1.7;
        }
        .aria-msg.agent .aria-msg-bubble {
          background: rgba(74,234,170,0.04); border: 1px solid rgba(74,234,170,0.07);
        }
        .aria-msg.user .aria-msg-bubble {
          background: rgba(122,163,255,0.04); border: 1px solid rgba(122,163,255,0.07);
        }
        .aria-msg-fade { animation: ariaFadeIn 0.3s ease both; }
        @keyframes ariaFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

        /* typing dots */
        .aria-typing-wrap { display: flex; flex-direction: column; gap: 3px; }
        .aria-typing-role { font-size: 9px; color: var(--a-accent); text-transform: uppercase; letter-spacing: 0.1em; }
        .aria-typing-bubble {
          display: flex; gap: 4px; align-items: center;
          padding: 11px 15px;
          background: rgba(74,234,170,0.04); border: 1px solid rgba(74,234,170,0.07);
          border-radius: 8px; width: fit-content;
        }
        .aria-tdot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--a-accent); opacity: 0.4;
          animation: ariatdot 1.4s infinite;
        }
        .aria-tdot:nth-child(2) { animation-delay: 0.2s; }
        .aria-tdot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes ariatdot {
          0%,100% { opacity: 0.2; transform: scale(0.8); }
          50%      { opacity: 0.9; transform: scale(1.1); }
        }

        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 3px; }
      `}</style>

            <div className="aria-wrap">
                {/* Server Status Badge */}
                <div className={`aria-server-banner ${serverReachable === null ? "checking" : serverReachable ? "online" : "offline"}`}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block", opacity: 0.8 }} />
                    {serverReachable === null ? "Checking server…" : serverReachable ? "Aria server online" : "Server offline"}
                </div>

                {/* ── LEFT ── */}
                <div className="aria-left">

                    {/* Status pill */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="aria-pill">
                            <div className={`aria-dot ${status}`} />
                            <span>{statusText}</span>
                        </div>
                    </div>

                    {/* Inline error */}
                    {errorMsg && (
                        <div className="aria-error-box">
                            <div className="aria-error-title">
                                <span>⚠</span> Call Failed
                            </div>
                            <div>{errorMsg}</div>
                            <div className="aria-error-hint">
                                Make sure the Aria backend is running:<br />
                                1. <code>bash start.sh</code> from the project root<br />
                                2. Or start Flask manually on port 5001
                            </div>
                        </div>
                    )}

                    {/* Initiate Call form — only show when not mid-call or completed */}
                    {status !== "done" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                            <div className="aria-section-head">Initiate Call</div>
                            <div className="aria-field">
                                <label>Patient Name</label>
                                <input
                                    className="aria-input"
                                    type="text"
                                    placeholder="e.g. Priya"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={calling}
                                />
                            </div>
                            <div className="aria-field">
                                <label>Phone Number</label>
                                <input
                                    className="aria-input"
                                    type="tel"
                                    placeholder="+91 98765 43210"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    disabled={calling}
                                    onKeyDown={(e) => e.key === "Enter" && !calling && initiateCall()}
                                />
                            </div>
                            <button
                                className="aria-btn-call"
                                onClick={initiateCall}
                                disabled={calling || !phone.trim()}
                            >
                                <span>{calling ? "⏳" : "📞"}</span>
                                <span>{calling ? "Calling…" : "Call Patient"}</span>
                            </button>
                        </div>
                    )}

                    {/* New Call button after done */}
                    {status === "done" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div className="aria-section-head">Session Complete</div>
                            <button className="aria-btn-new" onClick={handleNewCall}>
                                <span>📞</span> Start New Call
                            </button>
                        </div>
                    )}

                    {/* Active call card */}
                    {activeCallId && (
                        <div className="aria-call-card">
                            <div className="aria-call-row">
                                <div className="aria-call-num">{name ? `${name} — ${phone}` : phone}</div>
                                <div className="aria-call-dur">{fmtSecs(callSecs)}</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "var(--a-muted)" }}>
                                <div className={`aria-dot ${status}`} />
                                <span>{statusText}</span>
                            </div>
                            {status === "active" && (
                                <div className="aria-wave">
                                    {[0,1,2,3,0,1,2,3,0,1,2,3,0,1,2].map((wt, i) => (
                                        <div key={i} className="aria-wave-bar"
                                            style={{ animation: `wb${wt} ${0.55 + (i % 4) * 0.12}s ease-in-out ${(i * 0.07).toFixed(2)}s infinite alternate` }} />
                                    ))}
                                </div>
                            )}
                            {calling && (
                                <button className="aria-btn-stop" onClick={() => { stopPolling(); setCalling(false); setStatus("ready"); setStatusText("Ready"); }}>
                                    ✕ Stop polling
                                </button>
                            )}
                        </div>
                    )}

                    {/* ENS Signal Panel */}
                    {(ensResult || ensError || isAnalysing) && (
                        <div className="aria-ens-panel">
                            <div className="aria-ens-top">
                                <div className="aria-ens-label">ENS Signal</div>
                                {isAnalysing && <div className="aria-analysing">analysing…</div>}
                            </div>

                            {ensResult && (
                                <>
                                    {/* Signal badge */}
                                    <div className={`aria-signal-block ${ensResult.signal || ""}`}>
                                        <div className="aria-signal-icon">{SIGNAL_ICONS[ensResult.signal] || "⚪"}</div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                            <div className={`aria-signal-name ${ensResult.signal || ""}`}>{ensResult.signal}</div>
                                            <div className="aria-signal-meta">
                                                conf {Math.round((ensResult.confidence || 0) * 100)}% · {ensResult.model_used}
                                                {ensResult.borderline && " · borderline"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Probability bars */}
                                    <div className="aria-prob-bars">
                                        {(["green", "yellow", "red"] as const).map((cls) => {
                                            const key = cls === "green" ? "prob_green" : cls === "yellow" ? "prob_yellow" : "prob_red";
                                            const pct = Math.round((ensResult[key as keyof EnsResult] as number) * 100);
                                            return (
                                                <div className="aria-prob-row" key={cls}>
                                                    <div className="aria-prob-lbl" style={{ textTransform: "capitalize" }}>{cls}</div>
                                                    <div className="aria-prob-track">
                                                        <div className={`aria-prob-fill ${cls}`} style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <div className="aria-prob-pct">{pct}%</div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Score tiles with severity coloring */}
                                    <div className="aria-scores-grid">
                                        {Object.entries(SCORE_META).map(([key, meta]) => {
                                            const val = scores[key] ?? 0;
                                            const pct = Math.round((val / meta.max) * 100);
                                            const color = getScoreColor(key, val);
                                            return (
                                                <div className="aria-score-tile" key={key} style={{ borderColor: `${color}22` }}>
                                                    <div className="aria-score-tile-name">{meta.label}</div>
                                                    <div className="aria-score-tile-row">
                                                        <div className="aria-score-tile-val" style={{ color }}>{val}</div>
                                                        <div className="aria-score-tile-track">
                                                            <div className="aria-score-tile-fill" style={{ width: `${pct}%`, background: color }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Z-summary */}
                                    {ensResult.z_summary && (
                                        <div className="aria-z-text">{ensResult.z_summary}</div>
                                    )}

                                    {/* AI Reasoning */}
                                    {ensResult.reasoning && (
                                        <div className="aria-reasoning-text">
                                            💡 {ensResult.reasoning}
                                        </div>
                                    )}
                                </>
                            )}

                            {ensError && <div className="aria-ens-err">⚠️ {ensError}</div>}
                        </div>
                    )}

                    {/* Call history */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: "auto" }}>
                        <div className="aria-section-head">Recent Calls</div>
                        {history.length === 0
                            ? <div className="aria-hist-empty">No calls yet</div>
                            : history.map((h, i) => (
                                <div className="aria-hist-row" key={i}>
                                    <div className="aria-hist-name">{h.label}</div>
                                    <div className="aria-hist-meta">
                                        <span>{h.time}</span>
                                        {h.signal && <span className={`aria-hist-sig ${h.signal}`}>{h.signal}</span>}
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>

                {/* ── RIGHT — Transcript ── */}
                <div className="aria-right">
                    <div className="aria-toolbar">
                        <div>
                            <div className="aria-transcript-title">Conversation</div>
                            <div className="aria-transcript-count">
                                {transcript.length > 0
                                    ? `${transcript.length} message${transcript.length !== 1 ? "s" : ""}`
                                    : "Transcript appears after the call"}
                            </div>
                        </div>
                        <div className="aria-toolbar-actions">
                            {fullTranscript && (
                                <>
                                    <button
                                        className="aria-btn-sm accent"
                                        onClick={() => navigator.clipboard.writeText(fullTranscript)}
                                    >
                                        Copy transcript
                                    </button>
                                    <button
                                        className="aria-btn-sm"
                                        onClick={handleNewCall}
                                    >
                                        New Call
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Completed banner */}
                    {callStore?.status === "completed" && (
                        <div className="aria-done-bar">
                            <div className="aria-done-bar-text">✓ Call completed — full transcript below</div>
                            <div className="aria-done-bar-time">{callStore.ended_at ? new Date(callStore.ended_at).toLocaleTimeString() : ""}</div>
                        </div>
                    )}

                    <div className="aria-transcript-area">
                        {/* Server offline — show setup instructions */}
                        {serverReachable === false && !calling && transcript.length === 0 ? (
                            <div className="aria-offline-state">
                                <div className="aria-offline-icon">🔌</div>
                                <div className="aria-offline-title">Aria backend not reachable</div>
                                <div className="aria-offline-steps">
                                    <strong style={{ color: "var(--a-text)", display: "block", marginBottom: 6 }}>To start the backend:</strong>
                                    1. Open a terminal in the <code>Saarthi</code> folder<br />
                                    2. Run: <code>bash startup.sh</code><br />
                                    <br />
                                    Or manually:<br />
                                    • <code>uvicorn main:app --port 8000</code><br />
                                    • <code>python app.py</code>
                                </div>
                            </div>
                        ) : transcript.length === 0 && !calling ? (
                            <div className="aria-empty">
                                <div className="aria-empty-icon">🎙️</div>
                                <div className="aria-empty-line1">No active call</div>
                                <div className="aria-empty-line2">
                                    Enter a phone number and press Call Patient. The conversation will appear here after the call.
                                </div>
                            </div>
                        ) : transcript.length === 0 && calling ? (
                            /* typing indicator while connecting */
                            <div className="aria-typing-wrap">
                                <div className="aria-typing-role">Aria 🫁</div>
                                <div className="aria-typing-bubble">
                                    <div className="aria-tdot" />
                                    <div className="aria-tdot" />
                                    <div className="aria-tdot" />
                                </div>
                            </div>
                        ) : (
                            transcript.map((msg, i) => {
                                const isAgent = msg.role === "agent";
                                const cls = isAgent ? "agent" : "user";
                                const label = isAgent ? "Aria 🫁" : "Patient";
                                return (
                                    <div className={`aria-msg ${cls} aria-msg-fade`} key={i}>
                                        <div className="aria-msg-role">{label}</div>
                                        <div
                                            className="aria-msg-bubble"
                                            dangerouslySetInnerHTML={{ __html: esc(msg.content) }}
                                        />
                                    </div>
                                );
                            })
                        )}
                        <div ref={transcriptEndRef} />
                    </div>
                </div>
            </div>
        </>
    );
}
