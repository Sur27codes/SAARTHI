"use client";
import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar, ReferenceLine,
} from "recharts";
import {
    Calendar, AlertTriangle, CheckCircle2,
    TrendingUp, TrendingDown, Minus, Wind, Droplets, Flame,
    Activity, Brain, CloudRain, Moon, Filter, Printer, Loader2,
    MessageSquare, Send, X, ChevronDown, ChevronUp, Microscope, BarChart2,
} from "lucide-react";


// ── Types & constants ─────────────────────────────────────────────────────────
type DayStatus = "green" | "yellow" | "red" | "grey";
type DayRecord = { status: DayStatus; total: number; answered: boolean; date: string };

const SCORE_MAP = [0, 3, 5];

const STATUS_COLOR: Record<DayStatus, string> = {
    green: "#10b981", yellow: "#f59e0b", red: "#ef4444", grey: "#64748b",
};
const STATUS_BG: Record<DayStatus, string> = {
    green: "#052e1c", yellow: "#2d1f00", red: "#2d0808", grey: "#1a1a2e",
};
const STATUS_LABEL: Record<DayStatus, string> = {
    green: "🟢 Stable", yellow: "🟡 Monitoring", red: "🔴 Escalation", grey: "⚪ No Data",
};

// ── Theme tokens ──────────────────────────────────────────────────────────────
const T = {
    bg: "#080808",
    card: "#111111",
    cardAlt: "#161616",
    gold: "#c9a84c",
    goldLight: "#e8c96a",
    goldDim: "#c9a84c55",
    border: "2px solid #c9a84c",
    borderThin: "1px solid #c9a84c66",
    text: "#f5f0e8",
    textMuted: "#a09070",
    textSub: "#6b5e40",
};

const SYMPTOMS = [
    { key: "air_sensation", label: "Air Sensation", Icon: Wind, color: "#3b82f6" },
    { key: "nasal_dryness", label: "Nasal Dryness", Icon: Droplets, color: "#f97316" },
    { key: "nasal_burning", label: "Nasal Burning", Icon: Flame, color: "#ef4444" },
    { key: "suffocation", label: "Suffocation", Icon: Activity, color: "#8b5cf6" },
    { key: "anxiety_score", label: "Anxiety", Icon: Brain, color: "#6366f1" },
    { key: "humidity_level", label: "Humidity Level", Icon: CloudRain, color: "#0ea5e9" },
    { key: "sleep_quality", label: "Sleep Quality", Icon: Moon, color: "#64748b" },
];

const DATE_RANGES = ["7 Days", "14 Days", "30 Days"];

function getDate(offset = 0) {
    const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().split("T")[0];
}

// Stable seeded random — same date always gives same sequence
function seededRand(seed: number) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}
function dateSeed(dateStr: string) {
    return dateStr.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

// Predefined realistic score pattern for the last 7 days (index 0 = 6 days ago)
const PAST_SCORES = [8, 14, 22, 10, 26, 7, 18]; // gives green, yellow, red, green, red, green, yellow

function generateMockHistory(days: number): DayRecord[] {
    const h: DayRecord[] = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = getDate(-i);
        const stored = typeof window !== "undefined" ? localStorage.getItem(`ens_day_${date}`) : null;
        if (stored) { h.push(JSON.parse(stored)); continue; }
        // Use seeded values for a realistic, stable history
        const rand = seededRand(dateSeed(date));
        // For the most recent 7 days always show answered data; older days have 15% miss chance
        const isRecent = i < 7;
        const answered = isRecent ? true : rand() > 0.15;
        // Blend seeded random with a day-pattern for variety
        const patternIdx = (days - 1 - i) % PAST_SCORES.length;
        const base = PAST_SCORES[patternIdx];
        const jitter = Math.floor((rand() - 0.5) * 6); // ±3
        const total = Math.max(0, Math.min(35, base + jitter));
        const status: DayStatus = !answered ? "grey" : total >= 23 ? "red" : total >= 11 ? "yellow" : "green";
        h.push({ status, total: answered ? total : 0, answered, date });
    }
    return h;
}

function generateSymptomHistory(days: number): Record<string, number>[] {
    const out: Record<string, number>[] = [];
    const baselines: Record<string, number> = {
        air_sensation: 3, nasal_dryness: 2, nasal_burning: 2,
        suffocation: 1, anxiety_score: 2, humidity_level: 1, sleep_quality: 2,
    };
    for (let i = days - 1; i >= 0; i--) {
        const date = getDate(-i);
        // Prefer real localStorage data over seeded mock
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem(`ens_day_${date}`);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed.answers) {
                        const row: Record<string, number> = { day: i };
                        SYMPTOMS.forEach(s => {
                            const idx = parsed.answers[s.key];
                            row[s.key] = idx >= 0 ? SCORE_MAP[idx] : 0;
                        });
                        out.push(row);
                        continue;
                    }
                } catch { /* fall through to seeded */ }
            }
        }
        const rand = seededRand(dateSeed(date) ^ 0xdeadbeef);
        const row: Record<string, number> = { day: i };
        SYMPTOMS.forEach(s => {
            const base = baselines[s.key] ?? 2;
            const v = Math.max(0, Math.min(5, Math.round(base + (rand() - 0.4) * 2.5)));
            row[s.key] = v;
        });
        out.push(row);
    }
    return out;
}

const MOCK_AI_HISTORY = (() => {
    const rand = seededRand(0xabcdef12);
    return Array.from({ length: 12 }, (_, i) => ({
        id: i,
        date: getDate(-Math.floor(rand() * 30)),
        time: `${8 + Math.floor(rand() * 12)}:${String(Math.floor(rand() * 60)).padStart(2, "0")}`,
        parameter: SYMPTOMS[i % 5].label,
        severity: (["Mild", "Moderate", "Severe"] as const)[Math.floor(rand() * 3)],
        suggestion: [
            "Use saline spray 3-4x daily to reduce mucosal dryness.",
            "Elevate head 30° during sleep to reduce suffocation sensation.",
            "Consider ENS-aware CBT for breathing-related anxiety.",
            "Maintain indoor humidity at 45-55% with a bedroom humidifier.",
            "Pursed-lip breathing exercises can improve airflow sensation.",
            "Discuss neuropathic component with ENT if burning persists.",
        ][i % 6],
        symptomKey: SYMPTOMS[i % 5].key,
    }));
})();

// ── Sub-components ─────────────────────────────────────────────────────────────

function SummaryBar({ history, dateRange, setDateRange, aiInsight }: {
    history: DayRecord[];
    dateRange: string;
    setDateRange: (r: string) => void;
    aiInsight: string;
}) {
    const responded = history.filter(d => d.answered).length;
    const total = history.length;
    const latest = history.filter(d => d.answered).at(-1);
    const state = latest ? latest.status : "grey";

    return (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "stretch", marginBottom: 16 }}>
            {/* State card */}
            <div style={{ background: STATUS_BG[state], borderRadius: 12, padding: "12px 18px", border: `2px solid ${STATUS_COLOR[state]}`, minWidth: 150, flex: "0 0 auto" }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Current State</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: STATUS_COLOR[state] }}>{STATUS_LABEL[state]}</div>
                <div style={{ fontSize: "0.7rem", color: T.textMuted, marginTop: 2 }}>Latest check-in</div>
            </div>

            {/* Response consistency */}
            <div style={{ background: T.card, borderRadius: 12, padding: "12px 18px", border: T.border, minWidth: 140, flex: "0 0 auto" }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Response Rate</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: T.text }}>{responded}<span style={{ fontSize: "0.85rem", color: T.textMuted }}>/{total}</span></div>
                <div style={{ height: 5, borderRadius: 3, background: "#2a2a2a", marginTop: 6 }}>
                    <div style={{ height: "100%", width: `${(responded / Math.max(total, 1)) * 100}%`, background: responded / total > 0.7 ? "#10b981" : "#f59e0b", borderRadius: 3 }} />
                </div>
            </div>

            {/* AI Insight */}
            <div style={{ flex: 1, background: "linear-gradient(135deg,#111111,#1a1500)", borderRadius: 12, padding: "12px 18px", border: T.border, minWidth: 220 }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Latest AI Insight</div>
                <div style={{ fontSize: "0.82rem", color: T.text, lineHeight: 1.5 }}>{aiInsight}</div>
            </div>

            {/* Date Range Selector */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: "0 0 auto" }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em" }}>Date Range</div>
                <div style={{ display: "flex", gap: 4 }}>
                    {DATE_RANGES.map(r => (
                        <button key={r} onClick={() => setDateRange(r)}
                            style={{ padding: "6px 12px", borderRadius: 8, border: dateRange === r ? `2px solid ${T.gold}` : `1px solid #333`, background: dateRange === r ? "#1a1500" : T.card, color: dateRange === r ? T.goldLight : T.textMuted, fontSize: "0.75rem", fontWeight: dateRange === r ? 700 : 500, cursor: "pointer", transition: "all 0.15s" }}>
                            {r}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function StateTimeline({ history, onSelectDay }: { history: DayRecord[]; onSelectDay?: (d: DayRecord) => void }) {
    const [hovered, setHovered] = useState<number | null>(null);
    return (
        <div style={{ background: T.card, borderRadius: 14, border: T.border, padding: "16px 20px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Calendar size={15} color={T.gold} />
                <span style={{ fontWeight: 700, fontSize: "0.88rem", color: T.text }}>Patient State Timeline</span>
                <span style={{ fontSize: "0.65rem", color: T.textMuted, marginLeft: 4 }}>— click any day to view patient report</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                    {(["green", "yellow", "red", "grey"] as DayStatus[]).map(s => (
                        <div key={s} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.65rem", color: T.textMuted }}>
                            <div style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLOR[s] }} />
                            {STATUS_LABEL[s].split(" ")[1]}
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ display: "flex", gap: 3, alignItems: "flex-end" }}>
                {history.map((d, i) => {
                    const dow = new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2);
                    const dm = new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    const isToday = i === history.length - 1;
                    const isHov = hovered === i;
                    return (
                        <div key={i}
                            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: d.answered ? "pointer" : "default" }}
                            title={d.answered ? `${dm}: ${STATUS_LABEL[d.status]} | Score: ${d.total}/35 — click to view report` : `${dm}: No data`}
                            onClick={() => d.answered && onSelectDay?.(d)}
                            onMouseEnter={() => d.answered && setHovered(i)}
                            onMouseLeave={() => setHovered(null)}
                        >
                            <div style={{ fontSize: "0.6rem", color: T.gold, fontWeight: isToday ? 700 : 400 }}>{d.answered ? d.total : ""}</div>
                            <div style={{
                                width: "100%", height: 28, borderRadius: 6,
                                background: STATUS_COLOR[d.status],
                                opacity: isHov ? 1 : isToday ? 1 : 0.8,
                                border: isHov ? `2px solid rgba(255,255,255,0.6)` : isToday ? `2px solid ${T.gold}` : "1px solid #333",
                                boxShadow: isHov ? `0 0 12px rgba(255,255,255,0.2)` : isToday ? `0 0 0 3px ${T.gold}40` : "none",
                                transform: isHov ? "scaleY(1.15)" : "scaleY(1)",
                                transition: "all 0.15s",
                            }} />
                            <div style={{ fontSize: "0.6rem", color: isToday ? T.goldLight : T.textMuted, fontWeight: isToday ? 700 : 400, whiteSpace: "nowrap" }}>
                                {history.length <= 10 ? dm : dow}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}


// ── Day Detail Modal — shows patient report for a specific day ─────────────────
type FullDayRecord = DayRecord & { answers?: Record<string, number>; followup?: number };

const OPTION_LABELS: Record<string, string[]> = {
    air_sensation: ["Felt normal", "Slightly unnatural", "Very unnatural"],
    nasal_dryness: ["Not at all", "Mild dryness", "Severe dryness"],
    nasal_burning: ["None", "Mild burning", "Strong burning"],
    suffocation: ["No", "Occasionally", "Frequently"],
    anxiety_score: ["Not at all", "A little anxious", "Quite anxious"],
    humidity_level: ["No difference", "Slight effect", "Strong effect"],
    sleep_quality: ["Slept well", "Some disruption", "Significantly disrupted"],
};

function DayDetailModal({ day, onClose }: { day: FullDayRecord; onClose: () => void }) {
    const SM = [0, 3, 5];
    const dm = new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const sev = day.total >= 23 ? { label: "Severe", color: "#ef4444" } : day.total >= 11 ? { label: "Moderate", color: "#f59e0b" } : { label: "Mild / Stable", color: "#10b981" };

    // Compute 7-day average scores for comparison
    const hist7 = generateSymptomHistory(7);
    const avgSymScores = Object.fromEntries(SYMPTOMS.map(s => {
        const avg = hist7.reduce((acc, row) => acc + (row[s.key] ?? 0), 0) / Math.max(hist7.length, 1);
        return [s.key, avg];
    }));

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
            <div style={{ background: T.card, borderRadius: 20, border: `2px solid ${T.gold}`, width: "100%", maxWidth: 600, maxHeight: "85vh", overflowY: "auto", boxShadow: `0 0 60px rgba(201,168,76,0.2)` }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.gold}44`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Patient Daily Report</div>
                        <div style={{ fontSize: "1rem", fontWeight: 800, color: T.text }}>{dm}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${sev.color}`, background: sev.color + "22", fontSize: "0.78rem", fontWeight: 700, color: sev.color }}>
                            {sev.label} · {day.total}/35
                        </div>
                        <button onClick={onClose} style={{ border: "none", background: T.cardAlt, borderRadius: "50%", width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.textMuted }}>
                            <X size={16} />
                        </button>
                    </div>
                </div>
                {/* Symptom breakdown */}
                <div style={{ padding: "20px 24px" }}>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Symptom-by-Symptom Patient Report</div>
                    {day.answers ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {SYMPTOMS.map(s => {
                                const answerIdx = day.answers![s.key] ?? 0;
                                const score = SM[answerIdx] ?? 0;
                                const avg = avgSymScores[s.key] ?? 0;
                                const delta = score - avg;
                                const optionText = OPTION_LABELS[s.key]?.[answerIdx] ?? "—";
                                const scoreColor = score >= 5 ? "#ef4444" : score >= 3 ? "#f59e0b" : "#10b981";
                                const deltaColor = delta > 0.5 ? "#ef4444" : delta < -0.5 ? "#10b981" : "#f59e0b";
                                const deltaLabel = delta > 0.5 ? `↑ ${delta.toFixed(1)} vs avg` : delta < -0.5 ? `↓ ${Math.abs(delta).toFixed(1)} vs avg` : "≈ avg";
                                return (
                                    <div key={s.key} style={{ background: T.cardAlt, borderRadius: 10, padding: "12px 16px", border: `1px solid ${T.gold}33` }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <s.Icon size={14} color={s.color} />
                                                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: T.text }}>{s.label}</span>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: deltaColor, background: `${deltaColor}18`, border: `1px solid ${deltaColor}44`, borderRadius: 5, padding: "1px 6px" }}>{deltaLabel}</span>
                                                <span style={{ fontSize: "0.72rem", color: T.textMuted, fontStyle: "italic" }}>"{optionText}"</span>
                                                <span style={{ fontSize: "0.82rem", fontWeight: 800, color: scoreColor }}>{score}/5</span>
                                            </div>
                                        </div>
                                        {/* Score bar with avg marker */}
                                        <div style={{ position: "relative", height: 5, borderRadius: 3, background: "#1a1a1a" }}>
                                            <div style={{ height: "100%", width: `${(score / 5) * 100}%`, background: scoreColor, borderRadius: 3 }} />
                                            {/* 7-day average marker */}
                                            <div style={{ position: "absolute", top: -3, left: `${(avg / 5) * 100}%`, width: 2, height: 11, borderRadius: 1, background: T.gold, opacity: 0.75 }} title={`7-day avg: ${avg.toFixed(1)}`} />
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: "0.6rem", color: T.textSub }}>
                                            <span>0</span>
                                            <span style={{ color: T.gold + "99" }}>7d avg: {avg.toFixed(1)}</span>
                                            <span>5</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ color: T.textMuted, fontSize: "0.82rem", padding: "12px 0" }}>Detailed answers not available for this entry (generated data).</div>
                    )}
                    <div style={{ marginTop: 18, padding: "14px 16px", borderRadius: 12, background: "linear-gradient(135deg,#111111,#1a1500)", border: `1px solid ${T.gold}55` }}>
                        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Clinical Note</div>
                        <div style={{ fontSize: "0.8rem", color: T.textMuted, lineHeight: 1.6 }}>
                            Total ENS score: <span style={{ color: sev.color, fontWeight: 700 }}>{day.total}/35 — {sev.label}</span>.
                            {day.total >= 23 && " Urgent specialist review is advised given severe symptom burden."}
                            {day.total >= 11 && day.total < 23 && " Active monitoring and mucosal support protocol is recommended."}
                            {day.total < 11 && " Conservative management and scheduled follow-up is appropriate."}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Chart & content helpers for doctor chatbot ────────────────────────────────
interface DocChartData { type: "bar" | "radar"; title: string; labels: string[]; values: number[]; max: number; }

function docStripMarkdown(t: string) {
    return t
        .replace(/\*\*\*([\s\S]*?)\*\*\*/g, "$1")
        .replace(/\*\*([\s\S]*?)\*\*/g, "$1")
        .replace(/__([\s\S]*?)__/g, "$1")
        .replace(/\*([\s\S]*?)\*/g, "$1")
        .replace(/_([\s\S]*?)_/g, "$1")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\u2014/g, ",")
        .replace(/\u2013/g, ",");
}

function docParseCharts(text: string): { text?: string; chart?: DocChartData }[] {
    const segs: { text?: string; chart?: DocChartData }[] = [];
    const re = /\[CHART:([\s\S]*?\})\]/g; let last = 0, m;
    while ((m = re.exec(text)) !== null) {
        if (m.index > last) segs.push({ text: text.slice(last, m.index) });
        try { segs.push({ chart: JSON.parse(m[1]) }); } catch { segs.push({ text: m[0] }); }
        last = re.lastIndex;
    }
    if (last < text.length) segs.push({ text: text.slice(last) });
    return segs;
}

function DocENSChart({ data }: { data: DocChartData }) {
    const cd = data.labels.map((l, i) => ({ name: l.length > 10 ? l.slice(0, 9) + "…" : l, fullName: l, value: data.values[i] ?? 0 }));
    return (
        <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "1rem", marginTop: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}><BarChart2 size={14} color="#6366f1" /><p style={{ fontWeight: 700, fontSize: "0.82rem", color: "#1e293b", margin: 0 }}>{data.title}</p></div>
            {data.type === "radar" ? (
                <ResponsiveContainer width="100%" height={200}><RadarChart data={cd}><PolarGrid stroke="#f1f5f9" /><PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} /><Radar name="Score" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} /><Tooltip formatter={(v: any) => [`${v}/${data.max}`, "Score"]} /></RadarChart></ResponsiveContainer>
            ) : (
                <ResponsiveContainer width="100%" height={190}><BarChart data={cd} barSize={30}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} /><YAxis domain={[0, data.max]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={18} /><Tooltip cursor={{ fill: "#f8fafc" }} formatter={(v: any, _: any, p: any) => [`${v}/${data.max}`, p.payload?.fullName ?? ""]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.78rem" }} /><Bar dataKey="value" radius={[5, 5, 0, 0]} fill="#6366f1" label={{ position: "top", fontSize: 10, fill: "#6366f1", fontWeight: 700 }} /></BarChart></ResponsiveContainer>
            )}
            <p style={{ fontSize: "0.68rem", color: "#94a3b8", textAlign: "center", marginTop: 4, margin: "4px 0 0" }}>Scores out of {data.max} — SAARTHI Clinical AI</p>
        </div>
    );
}

const DOC_SECTION_META: Record<string, { color: string; icon: string; bg: string; border: string }> = {
    "clinical summary": { color: "#6366f1", icon: "🩺", bg: "#f5f3ff", border: "#ede9fe" },
    "symptom": { color: "#ef4444", icon: "📊", bg: "#fef2f2", border: "#fecaca" },
    "attention": { color: "#f97316", icon: "⚠️", bg: "#fff7ed", border: "#fed7aa" },
    "precaution": { color: "#0ea5e9", icon: "🛡️", bg: "#f0f9ff", border: "#bae6fd" },
    "treatment": { color: "#10b981", icon: "💊", bg: "#f0fdf4", border: "#a7f3d0" },
    "urgent": { color: "#dc2626", icon: "🚨", bg: "#fef2f2", border: "#fca5a5" },
    "referral": { color: "#6366f1", icon: "📋", bg: "#f5f3ff", border: "#ede9fe" },
    "trend": { color: "#0ea5e9", icon: "📈", bg: "#f0f9ff", border: "#bae6fd" },
    "protocol": { color: "#10b981", icon: "📝", bg: "#f0fdf4", border: "#a7f3d0" },
    "default": { color: "#64748b", icon: "📋", bg: "#f8fafc", border: "#e2e8f0" },
};

function docGetSectionMeta(heading: string) {
    const h = heading.toLowerCase();
    for (const [key, val] of Object.entries(DOC_SECTION_META)) {
        if (key !== "default" && h.includes(key)) return val;
    }
    return DOC_SECTION_META["default"];
}

function docParseInlineMarkdown(text: string): React.ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**")
            ? <strong key={i} style={{ color: "#0f172a", fontWeight: 700 }}>{part.slice(2, -2)}</strong>
            : part
    );
}

function DocClinicalSection({ text }: { text: string }) {
    const lines = text.split("\n");
    type Section = { heading: string; items: string[] };
    const sections: Section[] = [];
    let currentSection: Section | null = null;
    let preamble: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const headingMatch = trimmed.match(/^(?:\*{0,2}#{0,3}\s*)?(?:\d+\.\s+)([A-Z][^:*\n]+?)(?::|\*{0,2})?$/) ||
            trimmed.match(/^(?:#+\s+)(.+)$/) ||
            trimmed.match(/^\*\*(.+?)\*\*:?$/);
        if (headingMatch && headingMatch[1].length > 3 && headingMatch[1].length < 60) {
            currentSection = { heading: headingMatch[1].replace(/\*+/g, "").trim(), items: [] };
            sections.push(currentSection);
        } else if (currentSection) {
            const bulletText = trimmed.replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+(?=[a-z])/i, "");
            if (bulletText) currentSection.items.push(bulletText);
        } else {
            preamble.push(trimmed);
        }
    }

    if (sections.length < 2) {
        return (
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.75, fontSize: "0.88rem", color: "#1e293b" }}>
                {docStripMarkdown(text)}
            </div>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
            {preamble.length > 0 && (
                <div style={{ fontSize: "0.88rem", color: "#475569", lineHeight: 1.65 }}>
                    {preamble.map((p, i) => <p key={i} style={{ margin: "0 0 4px" }}>{docParseInlineMarkdown(docStripMarkdown(p))}</p>)}
                </div>
            )}
            {sections.map((sec, si) => {
                const meta = docGetSectionMeta(sec.heading);
                return (
                    <div key={si} style={{ borderRadius: 12, background: meta.bg, border: `1.5px solid ${meta.border}`, overflow: "hidden" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderBottom: `1px solid ${meta.border}`, background: `${meta.color}10` }}>
                            <span style={{ fontSize: "1rem", lineHeight: 1 }}>{meta.icon}</span>
                            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: meta.color, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                {si + 1}. {sec.heading}
                            </span>
                        </div>
                        <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                            {sec.items.map((item, ii) => (
                                <div key={ii} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color, flexShrink: 0, marginTop: 7 }} />
                                    <span style={{ fontSize: "0.83rem", color: "#1e293b", lineHeight: 1.6 }}>
                                        {docParseInlineMarkdown(docStripMarkdown(item))}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function DocMsgContent({ content, isUser, isAnalysis }: { content: string; isUser: boolean; isAnalysis?: boolean }) {
    if (isUser) return <span style={{ whiteSpace: "pre-wrap" }}>{content}</span>;
    const segs = docParseCharts(content);
    return (
        <>
            {segs.map((s, i) =>
                s.chart ? <DocENSChart key={i} data={s.chart} /> :
                    isAnalysis && i === 0 ?
                        <DocClinicalSection key={i} text={s.text ?? ""} /> :
                        <span key={i} style={{ whiteSpace: "pre-wrap", fontSize: "0.88rem", lineHeight: 1.75, color: "#1e293b" }}>
                            {docStripMarkdown(s.text ?? "")}
                        </span>
            )}
        </>
    );
}

// ── Doctor Clinical Chat ───────────────────────────────────────────────────────
type DocMsg = { role: "user" | "assistant"; content: string };

const DOC_WELCOME: DocMsg = {
    role: "assistant",
    content: `⚕️ SAARTHI Clinical AI — Physician Access

I have this patient's 7-day ENS symptom history loaded. Ask me about:

1. Treatment protocol recommendations based on current scores
2. Trend interpretation & clinical significance
3. Referral criteria, urgency classification & letter generation
4. Drug interactions or neuropathic pain considerations
5. Generate a clinical summary or multidisciplinary referral letter

For deep literature search, enable Deep Research mode (the microscope button above).`,
};

export function DoctorChat({ patientContext, fullPage = false }: { patientContext: string; fullPage?: boolean }) {
    const [messages, setMessages] = useState<DocMsg[]>([DOC_WELCOME]);
    const [input, setInput] = useState("");
    const [streaming, setStreaming] = useState(false);
    const [toolCall, setToolCall] = useState("");
    const [deepMode, setDeepMode] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streaming]);

    const send = useCallback(async (text?: string) => {
        const msgText = text ?? input;
        if (!msgText.trim() || streaming) return;
        const userMsg: DocMsg = { role: "user", content: msgText.trim() };
        const hist = messages[0] === DOC_WELCOME && messages.length === 1 ? [userMsg] : [...messages, userMsg];
        setMessages(p => [...p, userMsg, { role: "assistant", content: "" }]);
        setInput("");
        if (textareaRef.current) { textareaRef.current.value = ""; textareaRef.current.style.height = "auto"; }
        setStreaming(true);
        setToolCall("");
        const payload = hist.map(m => ({ role: m.role, content: m.content }));
        const endpoint = deepMode ? "/api/claude-agent" : "/api/doctor-chat";
        let aiText = "";
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: payload, patientContext, mode: "research" }),
            });
            const reader = res.body!.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";
                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const data = line.slice(6).trim();
                    if (data === "[DONE]") continue;
                    try {
                        const chunk = JSON.parse(data);
                        if (chunk.type === "text") {
                            aiText += chunk.content;
                            setMessages(p => { const n = [...p]; n[n.length - 1] = { role: "assistant", content: aiText }; return n; });
                            setToolCall("");
                            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                        } else if (chunk.type === "tool_call") {
                            setToolCall(`Consulting: ${chunk.name}…`);
                        } else if (chunk.type === "status") {
                            setToolCall(chunk.text);
                        }
                    } catch { }
                }
            }
        } catch {
            setMessages(p => [...p.slice(0, -1), { role: "assistant", content: "❌ Connection error. Please ensure servers are running." }]);
        } finally {
            setStreaming(false);
            setToolCall("");
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [input, messages, streaming, patientContext, deepMode]);

    function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    }
    function resize(e: React.ChangeEvent<HTMLTextAreaElement>) {
        setInput(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    }

    // ── Full-page layout (used as a tab in page.tsx) ──────────────────────────
    if (fullPage) {
        return (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "white" }}>
                <style>{`
                    @keyframes dc-spin { to { transform: rotate(360deg); } }
                    @keyframes dc-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-7px)} }
                    .dc-textarea:focus { outline: none; }
                    .dc-textarea::placeholder { color: #94a3b8; }
                `}</style>

                {/* ── Header ── */}
                <div style={{ padding: "0.9rem 1.5rem", borderBottom: "1.5px solid #000", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, background: "white" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <MessageSquare size={15} color="white" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a", lineHeight: 1.2 }}>SAARTHI Clinical AI</div>
                            <div style={{ fontSize: "0.62rem", color: "#64748b", lineHeight: 1.2 }}>Physician-only · ENS Clinical Decision Support</div>
                        </div>
                        <span style={{ marginLeft: 6, padding: "3px 10px", borderRadius: 20, background: "#fef3c7", border: "1px solid #fbbf24", fontSize: "0.62rem", fontWeight: 700, color: "#92400e" }}>⚕️ Doctor Only</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {(toolCall) && (
                            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "#6366f1", background: "#eff6ff", padding: "3px 10px", borderRadius: 20, border: "1px solid #e0e7ff" }}>
                                <Loader2 size={11} style={{ animation: "dc-spin 1s linear infinite" }} />{toolCall}
                            </div>
                        )}
                        <motion.button
                            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                            onClick={() => setDeepMode(d => !d)}
                            style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${deepMode ? "#6366f1" : "#e2e8f0"}`, background: deepMode ? "#eff6ff" : "white", color: deepMode ? "#6366f1" : "#64748b", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                        >
                            <Microscope size={13} />{deepMode ? "Deep Research ON" : "Deep Research"}
                        </motion.button>
                    </div>
                </div>

                {/* ── Messages ── */}
                <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", border: "3px solid #000", borderRadius: 16, margin: "6px 6px 0", background: "#fff" }}>
                    <AnimatePresence initial={false}>
                        {messages.map((msg, i) => {
                            const isUser = msg.role === "user";
                            const isEmpty = !msg.content && streaming && i === messages.length - 1;
                            const prevMsg = messages[i - 1];
                            const isAnalysis = !isUser && !!prevMsg && prevMsg.role === "user" &&
                                (prevMsg.content.includes("treatment") || prevMsg.content.includes("ENS") || prevMsg.content.includes("patient") || prevMsg.content.includes("score") || prevMsg.content.includes("referral") || prevMsg.content.includes("trend"));
                            return (
                                <motion.div key={i} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.25 }}
                                    style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                                    <div style={{
                                        maxWidth: isUser ? "70%" : isAnalysis ? "96%" : "88%",
                                        padding: isAnalysis ? "0.75rem" : "1rem 1.125rem",
                                        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                                        background: isUser ? "linear-gradient(135deg,#6366f1,#4f46e5)" : isAnalysis ? "transparent" : "#f8fafc",
                                        color: isUser ? "white" : "#1e293b",
                                        border: isUser ? "none" : isAnalysis ? "none" : "1.5px solid #000",
                                        boxShadow: isUser ? "0 4px 14px rgba(99,102,241,0.28)" : isAnalysis ? "none" : "0 1px 3px rgba(0,0,0,0.04)",
                                        fontSize: "0.88rem", lineHeight: 1.75, wordBreak: "break-word",
                                    }}>
                                        {!isUser && !isAnalysis && (
                                            <div style={{ fontSize: "0.58rem", fontWeight: 700, color: "#6366f1", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.12em" }}>SAARTHI Clinical AI</div>
                                        )}
                                        {isEmpty
                                            ? <div style={{ display: "flex", gap: 4, padding: "4px 0" }}>{[0, 1, 2].map(k => <div key={k} style={{ width: 7, height: 7, borderRadius: "50%", background: "#94a3b8", animation: `dc-bounce 1.2s ease-in-out ${k * 0.2}s infinite` }} />)}</div>
                                            : <DocMsgContent content={msg.content} isUser={isUser} isAnalysis={isAnalysis} />}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                    <div ref={bottomRef} />
                </div>

                {/* ── Input bar ── */}
                <div style={{ padding: "1rem 1.25rem", borderTop: "1.5px solid #000", background: "white", flexShrink: 0 }}>
                    {deepMode && (
                        <div style={{ marginBottom: 8, padding: "6px 12px", borderRadius: 10, background: "linear-gradient(135deg,#eff6ff,#faf5ff)", border: "1px solid #e0e7ff", fontSize: "0.72rem", color: "#6366f1", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                            <Microscope size={12} />Deep Research mode — using Claude Opus
                        </div>
                    )}
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, background: "#f8fafc", borderRadius: 16, border: "3px solid #000", padding: "0.625rem 0.625rem 0.625rem 1rem" }}>
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={resize}
                            onKeyDown={handleKey}
                            disabled={streaming}
                            className="dc-textarea"
                            placeholder={deepMode ? "Deep research on ENS treatments, literature, protocols…" : "Ask about treatment options, interpret 7-day trends, or request a referral letter…"}
                            rows={1}
                            style={{ flex: 1, border: "none", background: "transparent", resize: "none", fontSize: "0.92rem", color: "#0f172a", lineHeight: 1.55, minHeight: 28, maxHeight: 120, fontFamily: "inherit", padding: "6px 0", cursor: streaming ? "not-allowed" : "text" }}
                        />
                        <button
                            onClick={() => send()}
                            disabled={!input.trim() || streaming}
                            style={{ width: 40, height: 40, borderRadius: 12, border: "none", background: !input.trim() || streaming ? "#f1f5f9" : deepMode ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", cursor: !input.trim() || streaming ? "not-allowed" : "pointer", flexShrink: 0, transition: "all 0.2s", boxShadow: input.trim() && !streaming ? "0 3px 10px rgba(99,102,241,0.35)" : "none" }}
                        >
                            {streaming ? <Loader2 size={17} color="#94a3b8" style={{ animation: "dc-spin 1s linear infinite" }} /> : <Send size={17} color={!input.trim() ? "#94a3b8" : "white"} />}
                        </button>
                    </div>
                    <p style={{ fontSize: "0.68rem", color: "#cbd5e1", textAlign: "center", marginTop: 6 }}>Enter to send · Shift+Enter for new line · {deepMode ? "Claude Opus active" : "Physician-mode · Groq Llama 3.3 active"}</p>
                </div>
            </div>
        );
    }

    // ── Accordion layout (legacy fallback) ────────────────────────────────────
    return (
        <div style={{ background: T.card, borderRadius: 14, border: T.border, overflow: "hidden", marginBottom: 4 }}>
            <button onClick={() => { }} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
                <MessageSquare size={15} color={T.gold} />
                <span style={{ fontWeight: 700, fontSize: "0.88rem", color: T.text, flex: 1, textAlign: "left" }}>Clinical AI — Doctor Consultation</span>
                <span style={{ fontSize: "0.65rem", color: T.textMuted, marginRight: 8 }}>Physician-only</span>
            </button>
        </div>
    );
}


// ── 3D-style SVG Human Model ──────────────────────────────────────────────────
// ── 3D Labelled Human Body Map ────────────────────────────────────────────────
function HumanModel({ scores }: { scores: Record<string, number> }) {
    const [hovered, setHovered] = useState<string | null>(null);

    const scoreColor = (v: number) => v >= 4 ? "#ef4444" : v >= 2 ? "#f59e0b" : "#10b981";
    const severityLabel = (v: number) => v >= 4 ? "Severe" : v >= 2 ? "Moderate" : "Mild";
    const trendIcon = (key: string) => {
        const v = scores[key] ?? 0;
        if (v >= 4) return { icon: <TrendingUp size={9} />, color: "#ef4444" };
        if (v >= 2) return { icon: <Minus size={9} />, color: "#f59e0b" };
        return { icon: <TrendingDown size={9} />, color: "#10b981" };
    };

    // 7 ENS zones — calibrated to realistic figure (head cy=48, rx=30, ry=36)
    // cx/cy = hotspot on body; lx/ly = label pill position (right side)
    // Head: cy=40, ry=25 → face spans y=15–65. All nasal dots placed within face.
    const ZONES = [
        { id: "anxiety",     label: "Anxiety",       key: "anxiety_score",  cx: 110, cy: 22,  lx: 228, ly: 38,  accentColor: "#6366f1", bodyPart: "Brain / Cortex",  desc: "Breathing-related anxiety & psychological distress" },
        { id: "sleep",       label: "Sleep Quality", key: "sleep_quality",  cx: 110, cy: 34,  lx: 228, ly: 68,  accentColor: "#64748b", bodyPart: "Neurological",     desc: "Sleep disruption caused by ENS symptoms" },
        { id: "nasal",       label: "Air Sensation", key: "air_sensation",  cx: 110, cy: 48,  lx: 228, ly: 98,  accentColor: "#3b82f6", bodyPart: "Nasal Cavity",     desc: "Paradoxical absence of airflow sensation" },
        { id: "dryness",     label: "Nasal Dryness", key: "nasal_dryness",  cx: 110, cy: 55,  lx: 228, ly: 128, accentColor: "#f97316", bodyPart: "Nasal Mucosa",     desc: "Mucosal desiccation, crusting & bleeding risk" },
        { id: "burning",     label: "Nasal Burning", key: "nasal_burning",  cx: 110, cy: 62,  lx: 228, ly: 158, accentColor: "#ef4444", bodyPart: "Nasal Lining",     desc: "Neuropathic burning sensation in nasal passages" },
        { id: "suffocation", label: "Suffocation",   key: "suffocation",    cx: 110, cy: 196, lx: 228, ly: 210, accentColor: "#8b5cf6", bodyPart: "Chest / Lungs",    desc: "Paradoxical suffocation despite an open airway" },
        { id: "humidity",    label: "Humidity Sens.", key: "humidity_level", cx: 110, cy: 222, lx: 228, ly: 240, accentColor: "#0ea5e9", bodyPart: "Respiratory",      desc: "Heightened sensitivity to dry or humid air" },
    ];

    return (
        <div style={{ background: T.card, borderRadius: 14, border: T.border, padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Activity size={15} color={T.gold} />
                <span style={{ fontWeight: 700, fontSize: "0.88rem", color: T.text }}>ENS Body Map — Symptom Localisation</span>
                <span style={{ marginLeft: "auto", fontSize: "0.68rem", color: T.textMuted }}>Hover label or dot for detail</span>
            </div>

            <div style={{ display: "flex", gap: 14 }}>
                {/* ── SVG Body ── */}
                <div style={{ flexShrink: 0, background: "linear-gradient(170deg,#0a1628 0%,#111e30 60%,#0a1628 100%)", borderRadius: 14, padding: "8px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg viewBox="0 0 340 490" width={340} height={490}>
                        <defs>
                            {/* Vertical gradients = top-lit illustration style, no 3D-ball effect */}
                            <linearGradient id="skinG" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor="#d8a87c"/>
                                <stop offset="50%"  stopColor="#c07848"/>
                                <stop offset="100%" stopColor="#9a5830"/>
                            </linearGradient>
                            <linearGradient id="scrubG" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor="#7ec4e0"/>
                                <stop offset="45%"  stopColor="#5298bc"/>
                                <stop offset="100%" stopColor="#1e5888"/>
                            </linearGradient>
                            <linearGradient id="pantsG" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor="#4e8098"/>
                                <stop offset="50%"  stopColor="#306070"/>
                                <stop offset="100%" stopColor="#102838"/>
                            </linearGradient>
                            <linearGradient id="hairG" gradientUnits="userSpaceOnUse" x1="86" y1="0" x2="134" y2="0">
                                <stop offset="0%"   stopColor="#1e0a04"/>
                                <stop offset="100%" stopColor="#080200"/>
                            </linearGradient>
                            <filter id="bShadow" x="-15%" y="-5%" width="140%" height="120%">
                                <feDropShadow dx="1" dy="8" stdDeviation="9" floodColor="#000" floodOpacity="0.55"/>
                            </filter>
                            <filter id="bGlow">
                                <feGaussianBlur stdDeviation="3" result="b"/>
                                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                            </filter>
                            <radialGradient id="gBrain" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.85"/><stop offset="100%" stopColor="#6366f1" stopOpacity="0"/></radialGradient>
                            <radialGradient id="gNasal" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.85"/><stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/></radialGradient>
                            <radialGradient id="gChest" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.75"/><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/></radialGradient>
                            <radialGradient id="gLung"  cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.15"/><stop offset="100%" stopColor="#3b82f6" stopOpacity="0.03"/></radialGradient>
                        </defs>

                        {/* stroke="..." on the group applies outline to ALL body shapes → medical illustration look */}
                        <g filter="url(#bShadow)" stroke="#00000028" strokeWidth="1.2" strokeLinejoin="round">
                            {/* ── SHOES ── */}
                            <ellipse cx="83"  cy="476" rx="22" ry="7" fill="#141414"/>
                            <ellipse cx="137" cy="476" rx="22" ry="7" fill="#141414"/>

                            {/* ── CALVES — bare skin below pants ── */}
                            <path d="M 70 402 C 65 418 63 438 65 454 C 67 466 74 474 83 474
                                     C 92 474 99 466 101 454 C 103 438 101 418 96 402 Z"
                                  fill="url(#skinG)"/>
                            <path d="M 124 402 C 119 418 119 438 121 454 C 123 466 128 474 137 474
                                     C 146 474 153 466 155 454 C 157 438 155 418 150 402 Z"
                                  fill="url(#skinG)"/>

                            {/* ── PANTS — waistband + tapered thighs ── */}
                            <path d="M 78 280 Q 74 296 72 312
                                     Q 80 308 88 308 Q 98 308 106 310 Q 110 312 112 316
                                     Q 114 312 118 310 Q 126 308 136 308 Q 144 308 150 312
                                     Q 148 296 142 280 Z"
                                  fill="url(#pantsG)"/>
                            {/* Left thigh */}
                            <path d="M 72 312 C 70 332 68 356 68 376 C 68 390 72 402 78 406
                                     L 102 406 C 108 402 112 390 112 374 C 112 354 110 330 108 312
                                     Q 100 306 88 308 Q 78 308 72 312 Z"
                                  fill="url(#pantsG)"/>
                            {/* Right thigh */}
                            <path d="M 112 312 C 110 330 108 354 108 374 C 108 390 112 402 118 406
                                     L 142 406 C 148 402 152 390 152 376 C 152 356 150 332 148 312
                                     Q 140 308 130 308 Q 120 308 112 312 Z"
                                  fill="url(#pantsG)"/>

                            {/* ── LEFT ARM — 20px at elbow, 14px at wrist, sleeve exposes 115px of forearm ── */}
                            <path d="M 62 88
                                     C 52 94 46 112 44 138 C 42 158 42 174 44 196
                                     C 46 214 48 234 50 254 C 52 268 54 278 56 284
                                     C 58 288 62 288 66 284
                                     C 68 278 68 266 66 252 C 64 234 62 214 62 198
                                     C 62 178 62 160 62 140 C 62 120 62 104 62 90 Z"
                                  fill="url(#skinG)" stroke="#7a4020" strokeWidth="1"/>

                            {/* ── RIGHT ARM — mirror ── */}
                            <path d="M 158 88
                                     C 168 94 174 112 176 138 C 178 158 178 174 176 196
                                     C 174 214 172 234 170 254 C 168 268 166 278 164 284
                                     C 162 288 158 288 154 284
                                     C 152 278 152 266 154 252 C 156 234 158 214 158 198
                                     C 158 178 158 160 158 140 C 158 120 158 104 158 90 Z"
                                  fill="url(#skinG)" stroke="#7a4020" strokeWidth="1"/>

                            {/* ── SCRUB TOP — sleeve ends at y=168 so forearm is clearly visible ── */}
                            {/* Left sleeve — outer identical to left arm outer */}
                            <path d="M 62 88 C 52 94 46 112 44 138 C 42 158 42 168 44 168
                                     L 62 168 C 62 158 62 140 62 122 C 62 108 62 96 62 90 Z"
                                  fill="url(#scrubG)" stroke="#1a4868" strokeWidth="1"/>
                            {/* Right sleeve — outer identical to right arm outer */}
                            <path d="M 158 88 C 168 94 174 112 176 138 C 178 158 178 168 176 168
                                     L 158 168 C 158 158 158 140 158 122 C 158 108 158 96 158 90 Z"
                                  fill="url(#scrubG)" stroke="#1a4868" strokeWidth="1"/>
                            {/* Main torso — waist narrows naturally; shoulder at (62,88) and (158,88) */}
                            <path d="M 102 78 L 118 78
                                     C 130 78 146 82 158 88
                                     C 162 94 164 106 162 126 C 160 156 156 190 152 218
                                     C 148 244 144 264 142 280
                                     L 78 280
                                     C 76 264 72 244 68 218 C 64 190 60 156 58 126
                                     C 56 106 58 94 62 88
                                     C 74 82 90 78 102 78 Z"
                                  fill="url(#scrubG)" stroke="#1a4868" strokeWidth="1"/>

                            {/* ── NECK ── */}
                            <path d="M 105 66 C 103 70 102 76 102 80 L 118 80 C 118 76 117 70 115 66 Z"
                                  fill="url(#skinG)"/>

                            {/* ── HEAD — slightly wider (rx=24) so all 7 zone hotspots land inside ── */}
                            <ellipse cx="110" cy="38" rx="24" ry="28" fill="url(#skinG)"/>
                        </g>

                        {/* Hair */}
                        <path d="M 86 22 C 86 8 94 4 110 4 C 126 4 134 8 134 22
                                  C 130 12 120 9 110 9 C 100 9 90 12 86 22 Z"
                              fill="url(#hairG)"/>
                        <path d="M 86 22 C 86 34 86 42 88 50" stroke="#180802" strokeWidth="4.5" fill="none" strokeLinecap="round" opacity={0.7}/>
                        <path d="M 134 22 C 134 34 134 42 132 50" stroke="#180802" strokeWidth="4.5" fill="none" strokeLinecap="round" opacity={0.7}/>

                        {/* Ears */}
                        <path d="M 86 36 C 83 30 81 40 81 46 C 81 52 84 56 86 54 C 88 52 88 44 86 36 Z" fill="url(#skinG)"/>
                        <path d="M 134 36 C 137 30 139 40 139 46 C 139 52 136 56 134 54 C 132 52 132 44 134 36 Z" fill="url(#skinG)"/>

                        {/* Eyebrows */}
                        <path d="M 96 26 C 99 23 104 22 107 24" stroke="#180804" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
                        <path d="M 113 24 C 116 22 121 23 124 26" stroke="#180804" strokeWidth="1.8" fill="none" strokeLinecap="round"/>

                        {/* Left eye */}
                        <path d="M 94 34 C 96 30 101 30 104 34 C 101 38 96 38 94 34 Z" fill="white" opacity={0.92}/>
                        <ellipse cx="99" cy="34" rx="3" ry="3.2" fill="#2a1806"/>
                        <ellipse cx="99" cy="34" rx="1.6" ry="1.7" fill="#080302"/>
                        <circle cx="100" cy="32.8" r="0.8" fill="white" opacity={0.85}/>
                        <path d="M 94 34 C 96 30 101 30 104 34" stroke="#2a1008" strokeWidth="0.8" fill="none"/>
                        <path d="M 94 34 C 96 38 101 38 104 34" stroke="#2a1008" strokeWidth="0.4" fill="none" strokeOpacity={0.45}/>

                        {/* Right eye */}
                        <path d="M 116 34 C 119 30 124 30 126 34 C 124 38 119 38 116 34 Z" fill="white" opacity={0.92}/>
                        <ellipse cx="121" cy="34" rx="3" ry="3.2" fill="#2a1806"/>
                        <ellipse cx="121" cy="34" rx="1.6" ry="1.7" fill="#080302"/>
                        <circle cx="122" cy="32.8" r="0.8" fill="white" opacity={0.85}/>
                        <path d="M 116 34 C 119 30 124 30 126 34" stroke="#2a1008" strokeWidth="0.8" fill="none"/>
                        <path d="M 116 34 C 119 38 124 38 126 34" stroke="#2a1008" strokeWidth="0.4" fill="none" strokeOpacity={0.45}/>

                        {/* Nose */}
                        <path d="M 109 40 Q 107 46 107 52 Q 109 57 110 58 Q 111 57 113 52 Q 113 46 111 40"
                              stroke="#8a5030" strokeWidth="0.9" fill="none" strokeOpacity={0.42}/>
                        <path d="M 107 52 Q 104 56 105 59 Q 108 62 110 61" stroke="#7a4020" strokeWidth="0.8" fill="none" strokeOpacity={0.42}/>
                        <path d="M 113 52 Q 116 56 115 59 Q 112 62 110 61" stroke="#7a4020" strokeWidth="0.8" fill="none" strokeOpacity={0.42}/>

                        {/* Lips */}
                        <path d="M 104 63 Q 107 61 110 62 Q 113 61 116 63" stroke="#7a3018" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
                        <path d="M 104 63 Q 110 69 116 63" stroke="#6a2814" strokeWidth="1.0" fill="none" strokeLinecap="round"/>
                        <path d="M 106 63 Q 110 67 114 63 Q 113 61 110 62 Q 107 61 106 63 Z" fill="#7a3018" opacity={0.14}/>

                        {/* Jaw shadow */}
                        <path d="M 90 46 Q 88 58 96 66 Q 102 72 110 72 Q 118 72 124 66 Q 132 58 130 46"
                              stroke="#8a5030" strokeWidth="0.5" fill="none" strokeOpacity={0.12}/>

                        {/* Scrub details */}
                        <path d="M 103 80 L 110 94 L 117 80" stroke="#1e4a60" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                        <rect x="66" y="148" width="20" height="15" rx="2" fill="none" stroke="#1e4a60" strokeWidth="0.7" opacity={0.45}/>
                        <line x1="110" y1="94" x2="110" y2="280" stroke="#1e4a60" strokeWidth="0.5" strokeOpacity={0.18} strokeDasharray="5,5"/>
                        <line x1="78" y1="280" x2="142" y2="280" stroke="#1e4a60" strokeWidth="0.6" strokeOpacity={0.4} strokeDasharray="3,3"/>
                        <path d="M 103 82 Q 84 86 68 92" stroke="#9a6838" strokeWidth="0.7" fill="none" strokeOpacity={0.2}/>
                        <path d="M 117 82 Q 136 86 152 92" stroke="#9a6838" strokeWidth="0.7" fill="none" strokeOpacity={0.2}/>
                        <line x1="110" y1="280" x2="110" y2="314" stroke="#0e2838" strokeWidth="0.5" strokeOpacity={0.35}/>

                        {/* Anatomical overlays */}
                        <path d="M 64 128 Q 48 150 46 186 Q 44 222 56 244 Q 66 260 80 258 Q 98 254 102 226 Q 106 200 102 172 Q 96 142 78 126 Z"
                              fill="url(#gLung)" stroke="#8b5cf6" strokeWidth="0.65" strokeDasharray="3,3" opacity={0.38}/>
                        <path d="M 156 126 Q 172 128 174 162 Q 178 196 174 224 Q 170 254 156 258 Q 142 260 130 244 Q 118 222 116 186 Q 114 150 128 128 Z"
                              fill="url(#gLung)" stroke="#8b5cf6" strokeWidth="0.65" strokeDasharray="3,3" opacity={0.38}/>
                        <circle cx="97" cy="170" r="7" fill="none" stroke="#ef4444" strokeWidth="0.6" strokeDasharray="2,2" opacity={0.22}/>
                        <line x1="108" y1="46" x2="108" y2="60" stroke="#3b82f6" strokeWidth="0.65" strokeDasharray="2,3" opacity={0.25}/>
                        <line x1="112" y1="46" x2="112" y2="60" stroke="#3b82f6" strokeWidth="0.65" strokeDasharray="2,3" opacity={0.25}/>

                        {/* ── ZONE GLOW OVERLAYS ── */}
                        {/* Brain / neurological — covers anxiety(cy=22) + sleep(cy=34) */}
                        <circle cx="110" cy="28" r={hovered === "anxiety" || hovered === "sleep" ? 30 : 22}
                            fill="url(#gBrain)" opacity={hovered === "anxiety" || hovered === "sleep" ? 0.6 : 0.22}
                            style={{ transition: "all 0.35s", cursor: "pointer" }}
                            onMouseEnter={() => setHovered("anxiety")} onMouseLeave={() => setHovered(null)}/>
                        <circle cx="110" cy="28" r={hovered === "anxiety" || hovered === "sleep" ? 28 : 20}
                            fill="none" stroke="#6366f1" strokeWidth={hovered === "anxiety" || hovered === "sleep" ? 1.8 : 0.7} strokeDasharray="6,3"
                            opacity={hovered === "anxiety" || hovered === "sleep" ? 0.9 : 0.35} style={{ transition: "all 0.35s" }}/>

                        {/* Nasal cavity — covers nasal(48)+dryness(55)+burning(62) */}
                        <ellipse cx="110" cy="55" rx={hovered === "nasal" || hovered === "dryness" || hovered === "burning" ? 18 : 12}
                            ry={hovered === "nasal" || hovered === "dryness" || hovered === "burning" ? 14 : 9}
                            fill="url(#gNasal)" opacity={hovered === "nasal" || hovered === "dryness" || hovered === "burning" ? 0.65 : 0.28}
                            style={{ transition: "all 0.35s", cursor: "pointer" }}
                            onMouseEnter={() => setHovered("nasal")} onMouseLeave={() => setHovered(null)}/>
                        <ellipse cx="110" cy="55" rx={hovered === "nasal" || hovered === "dryness" || hovered === "burning" ? 16 : 10}
                            ry={hovered === "nasal" || hovered === "dryness" || hovered === "burning" ? 12 : 7}
                            fill="none" stroke="#3b82f6" strokeWidth={hovered === "nasal" || hovered === "dryness" || hovered === "burning" ? 1.8 : 0.7} strokeDasharray="4,3"
                            opacity={hovered === "nasal" || hovered === "dryness" || hovered === "burning" ? 0.9 : 0.35} style={{ transition: "all 0.35s" }}/>

                        {/* Chest / respiratory — covers suffocation(196) + humidity(222) */}
                        <ellipse cx="110" cy="209" rx={hovered === "suffocation" || hovered === "humidity" ? 52 : 44}
                            ry={hovered === "suffocation" || hovered === "humidity" ? 46 : 38}
                            fill="url(#gChest)" opacity={hovered === "suffocation" || hovered === "humidity" ? 0.5 : 0.18}
                            style={{ transition: "all 0.35s", cursor: "pointer" }}
                            onMouseEnter={() => setHovered("suffocation")} onMouseLeave={() => setHovered(null)}/>
                        <ellipse cx="110" cy="209" rx={hovered === "suffocation" || hovered === "humidity" ? 50 : 42}
                            ry={hovered === "suffocation" || hovered === "humidity" ? 44 : 36}
                            fill="none" stroke="#8b5cf6" strokeWidth={hovered === "suffocation" || hovered === "humidity" ? 1.8 : 0.7} strokeDasharray="6,3"
                            opacity={hovered === "suffocation" || hovered === "humidity" ? 0.85 : 0.3} style={{ transition: "all 0.35s" }}/>

                        {/* Section labels */}
                        <text x="284" y="22" textAnchor="middle" fontSize="7" fontWeight="800" fill="#6366f155" letterSpacing="1.5">NEUROLOGICAL</text>
                        <text x="284" y="82" textAnchor="middle" fontSize="7" fontWeight="800" fill="#3b82f655" letterSpacing="1.5">NASAL CAVITY</text>
                        <text x="284" y="192" textAnchor="middle" fontSize="7" fontWeight="800" fill="#8b5cf655" letterSpacing="1.5">RESPIRATORY</text>
                        <line x1="222" y1="26" x2="222" y2="268" stroke="white" strokeWidth="0.35" strokeOpacity={0.1}/>

                        {/* ── HOTSPOT DOTS + LEADER LINES + LABEL PILLS ── */}
                        {ZONES.map((z, idx) => {
                            const sc = scores[z.key] ?? 0;
                            const col = scoreColor(sc);
                            const isHov = hovered === z.id;
                            const tr = trendIcon(z.key);
                            return (
                                <g key={z.id} style={{ cursor: "pointer" }}
                                    onMouseEnter={() => setHovered(z.id)} onMouseLeave={() => setHovered(null)}>
                                    <line x1={z.cx + 8} y1={z.cy} x2={z.lx - 4} y2={z.ly}
                                        stroke={col} strokeWidth={isHov ? 1.3 : 0.7} strokeDasharray="4,3" opacity={isHov ? 0.95 : 0.5} style={{ transition: "all 0.3s" }}/>
                                    <circle cx={z.cx} cy={z.cy} r={isHov ? 8 : 6} fill={col} opacity={0.9} filter="url(#bGlow)" style={{ transition: "all 0.3s" }}/>
                                    <circle cx={z.cx} cy={z.cy} r={isHov ? 4.5 : 3} fill="white" opacity={0.92} style={{ transition: "all 0.3s" }}/>
                                    <circle cx={z.cx} cy={z.cy} r="8" fill="none" stroke={col} strokeWidth="1" opacity={0.5}
                                        style={{ animationName: "rmPulse", animationDuration: `${1.8 + idx * 0.22}s`, animationTimingFunction: "ease-out", animationIterationCount: "infinite", animationDelay: `${idx * 0.18}s` }}/>
                                    <rect x={z.lx} y={z.ly - 11} width="110" height="22" rx="6"
                                        fill={isHov ? col : "transparent"} fillOpacity={isHov ? 0.18 : 1}
                                        stroke={col} strokeWidth={isHov ? 1.5 : 0.6} strokeOpacity={isHov ? 0.95 : 0.4} style={{ transition: "all 0.3s" }}/>
                                    <rect x={z.lx + 74} y={z.ly - 8} width="28" height="16" rx="4" fill={col} opacity={0.9}/>
                                    <text x={z.lx + 88} y={z.ly + 2.5} textAnchor="middle" fontSize="8.5" fontWeight="800" fill="white">{sc}/5</text>
                                    <text x={z.lx + 5} y={z.ly - 0.5} fontSize="8.5" fontWeight={isHov ? "800" : "700"} fill={isHov ? col : "rgba(255,255,255,0.85)"} style={{ transition: "all 0.3s" }}>{z.label}</text>
                                </g>
                            );
                        })}

                        {/* Severity legend */}
                        <text x="110" y="466" textAnchor="middle" fontSize="7" fill="white" opacity={0.28} letterSpacing="1">SEVERITY SCALE</text>
                        {(["#10b981", "Mild 0–1", "#f59e0b", "Moderate 2–3", "#ef4444", "Severe 4–5"] as string[]).reduce<[string, string][]>((acc, _, i, arr) => i % 2 === 0 ? [...acc, [arr[i], arr[i + 1]]] : acc, []).map(([col, lbl], i) => (
                            <g key={i}>
                                <rect x={14 + i * 108} y={470} width="12" height="6" rx="2" fill={col} opacity={0.8}/>
                                <text x={29 + i * 108} y={476} fontSize="7" fill={col} opacity={0.7}>{lbl}</text>
                            </g>
                        ))}

                        <style>{`@keyframes rmPulse{0%{r:8;opacity:.6}70%{r:20;opacity:0}100%{r:8;opacity:0}}`}</style>
                    </svg>
                </div>

                {/* ── Right: scores list + hover detail ── */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                    {/* Scores summary */}
                    <div style={{ padding: "10px 12px", borderRadius: 10, background: "linear-gradient(135deg,#0d0d0d,#1a1500)", border: `1.5px solid ${T.gold}66` }}>
                        <div style={{ fontSize: "0.6rem", fontWeight: 700, color: T.gold, letterSpacing: "0.1em", marginBottom: 6, textTransform: "uppercase" }}>All 7 Parameters</div>
                        {ZONES.map(z => {
                            const sc = scores[z.key] ?? 0;
                            const col = scoreColor(sc);
                            const isHov = hovered === z.id;
                            const tr = trendIcon(z.key);
                            return (
                                <div key={z.id}
                                    onMouseEnter={() => setHovered(z.id)} onMouseLeave={() => setHovered(null)}
                                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 7, background: isHov ? `${col}18` : "transparent", border: `1px solid ${isHov ? col + "55" : "transparent"}`, cursor: "pointer", transition: "all 0.2s", marginBottom: 2 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: col, flexShrink: 0 }} />
                                    <span style={{ fontSize: "0.7rem", color: isHov ? T.text : T.textMuted, flex: 1, fontWeight: isHov ? 700 : 400, transition: "all 0.2s", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{z.label}</span>
                                    <div style={{ color: tr.color, display: "flex", alignItems: "center" }}>{tr.icon}</div>
                                    <span style={{ fontSize: "0.7rem", fontWeight: 800, color: col, minWidth: 24, textAlign: "right" }}>{sc}/5</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Hover detail */}
                    {hovered && (() => {
                        const z = ZONES.find(z => z.id === hovered);
                        if (!z) return null;
                        const sc = scores[z.key] ?? 0;
                        const col = scoreColor(sc);
                        const pct = (sc / 5) * 100;
                        return (
                            <div style={{ padding: "12px", borderRadius: 10, background: `${col}12`, border: `1.5px solid ${col}55`, boxShadow: `0 0 16px ${col}20`, transition: "all 0.3s" }}>
                                <div style={{ fontSize: "0.58rem", fontWeight: 800, color: col, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 3 }}>{z.bodyPart}</div>
                                <div style={{ fontSize: "0.84rem", fontWeight: 700, color: T.text, marginBottom: 2 }}>{z.label}</div>
                                <div style={{ fontSize: "0.7rem", color: T.textMuted, lineHeight: 1.5, marginBottom: 8 }}>{z.desc}</div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                                    <span style={{ fontSize: "0.68rem", color: T.textMuted }}>Severity Score</span>
                                    <span style={{ fontSize: "0.8rem", fontWeight: 800, color: col }}>{sc}/5 — {severityLabel(sc)}</span>
                                </div>
                                <div style={{ height: 6, borderRadius: 3, background: "#2a2a2a" }}>
                                    <div style={{ height: "100%", width: `${pct}%`, background: col, borderRadius: 3, transition: "width 0.4s" }} />
                                </div>
                            </div>
                        );
                    })()}
                    {!hovered && (
                        <div style={{ padding: "12px", borderRadius: 10, background: T.cardAlt, border: `1px dashed ${T.gold}44`, textAlign: "center" }}>
                            <div style={{ fontSize: "0.75rem", color: T.textMuted }}>👆 Hover a dot or label</div>
                            <div style={{ fontSize: "0.68rem", color: T.textSub, marginTop: 2 }}>to see symptom detail</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ScoreRadarCard({ scores, symptomData }: { scores: Record<string, number>; symptomData: Record<string, number>[] }) {
    const avgScores = useMemo(() => {
        const sums: Record<string, number> = {};
        const counts: Record<string, number> = {};
        symptomData.forEach(row => {
            SYMPTOMS.forEach(s => {
                sums[s.key] = (sums[s.key] ?? 0) + (row[s.key] ?? 0);
                counts[s.key] = (counts[s.key] ?? 0) + 1;
            });
        });
        return Object.fromEntries(SYMPTOMS.map(s => [s.key, Number(((sums[s.key] ?? 0) / Math.max(counts[s.key] ?? 1, 1)).toFixed(1))]));
    }, [symptomData]);

    const radarData = SYMPTOMS.map(s => ({
        symptom: s.label.length > 10 ? s.label.slice(0, 9) + "…" : s.label,
        today: scores[s.key] ?? 0,
        avg: avgScores[s.key] ?? 0,
    }));

    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    const avgTotal = Object.values(avgScores).reduce((a, b) => a + b, 0);
    const delta = total - avgTotal;
    const deltaColor = delta > 2 ? "#ef4444" : delta < -2 ? "#10b981" : T.textMuted;
    const deltaLabel = delta > 2 ? `↑ ${delta.toFixed(0)} pts above average — trending worse`
        : delta < -2 ? `↓ ${Math.abs(delta).toFixed(0)} pts below average — improving`
        : "→ On par with recent average";

    return (
        <div style={{ background: T.card, borderRadius: 14, border: T.border, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <BarChart2 size={15} color={T.gold} />
                <span style={{ fontWeight: 700, fontSize: "0.88rem", color: T.text }}>Symptom Radar — Today vs {symptomData.length}-Day Average</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.66rem", color: T.textMuted }}>
                        <div style={{ width: 12, height: 2, background: T.gold, borderRadius: 1 }} /> Today <span style={{ color: T.goldLight, fontWeight: 700 }}>({total}/35)</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.66rem", color: T.textMuted }}>
                        <div style={{ width: 12, height: 2, background: "#64748b", borderRadius: 1, opacity: 0.7 }} /> Avg <span style={{ fontWeight: 600 }}>({avgTotal.toFixed(0)}/35)</span>
                    </div>
                </div>
            </div>
            <div style={{ fontSize: "0.68rem", color: deltaColor, marginBottom: 10, fontWeight: 600 }}>{deltaLabel}</div>
            <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData} margin={{ top: 10, right: 28, bottom: 10, left: 28 }}>
                    <PolarGrid stroke="#2a2a2a" />
                    <PolarAngleAxis dataKey="symptom" tick={{ fontSize: 10, fill: T.textMuted }} />
                    <Radar name="Today" dataKey="today" stroke={T.gold} fill={T.gold} fillOpacity={0.22} strokeWidth={2} dot={{ r: 3, fill: T.gold }} />
                    <Radar name="Avg" dataKey="avg" stroke="#64748b" fill="#64748b" fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="4 4" />
                    <Tooltip contentStyle={{ fontSize: "0.72rem", borderRadius: 8, border: `1px solid ${T.gold}`, background: T.card, color: T.text }}
                        formatter={(v: any, name?: string) => [`${v}/5`, name === "today" ? "Today" : "7-day avg"]} />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}

function SymptomTrends({ symptomData, days }: { symptomData: Record<string, number>[]; days: number }) {
    const labels = Array.from({ length: days }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });
    const chartData = symptomData.map((row, i) => ({ ...row, label: labels[i] }));

    // Pre-compute per-symptom averages and trend direction
    const symStats = useMemo(() => Object.fromEntries(SYMPTOMS.map(s => {
        const vals = symptomData.map(r => r[s.key] ?? 0);
        const avg = vals.reduce((a, b) => a + b, 0) / Math.max(vals.length, 1);
        const recent = vals.slice(-3).reduce((a, b) => a + b, 0) / Math.max(Math.min(vals.length, 3), 1);
        const older  = vals.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(vals.length - 3, 1);
        const trend  = vals.length >= 4
            ? (recent > older + 0.4 ? "up" : recent < older - 0.4 ? "down" : "flat")
            : "flat";
        const latest = vals.at(-1) ?? 0;
        return [s.key, { avg: Number(avg.toFixed(1)), trend, latest }];
    })), [symptomData]);

    return (
        <div style={{ background: T.card, borderRadius: 14, border: T.border, padding: "16px" }}>
            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: T.text, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <TrendingUp size={15} color={T.gold} />
                Symptom Trend Charts
                <span style={{ marginLeft: "auto", fontSize: "0.62rem", color: T.textMuted }}>
                    — gold line = {days}d average
                </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {SYMPTOMS.map(s => {
                    const stat = symStats[s.key];
                    const trendColor = stat.trend === "up" ? "#ef4444" : stat.trend === "down" ? "#10b981" : "#f59e0b";
                    const trendArrow = stat.trend === "up" ? "↑" : stat.trend === "down" ? "↓" : "→";
                    const latestColor = stat.latest >= 4 ? "#ef4444" : stat.latest >= 2 ? "#f59e0b" : "#10b981";
                    return (
                        <div key={s.key} style={{ borderRadius: 10, border: `1px solid ${T.gold}55`, padding: "10px", background: T.cardAlt }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                                <s.Icon size={12} color={s.color} />
                                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: T.text, flex: 1 }}>{s.label}</span>
                                {/* Latest value badge */}
                                <span style={{ fontSize: "0.62rem", fontWeight: 800, color: latestColor, background: `${latestColor}18`, border: `1px solid ${latestColor}44`, borderRadius: 4, padding: "1px 5px" }}>
                                    {stat.latest}/5
                                </span>
                                {/* Trend badge */}
                                <span style={{ fontSize: "0.62rem", fontWeight: 700, color: trendColor, background: `${trendColor}15`, borderRadius: 4, padding: "1px 4px" }}>
                                    {trendArrow}
                                </span>
                            </div>
                            <ResponsiveContainer width="100%" height={76}>
                                <LineChart data={chartData} margin={{ top: 4, right: 6, left: -30, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                                    <XAxis dataKey="label" tick={{ fontSize: 7, fill: T.textMuted }} axisLine={false} tickLine={false}
                                        interval={Math.floor(chartData.length / 3)} />
                                    <YAxis domain={[0, 5]} tick={{ fontSize: 7, fill: T.textMuted }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ fontSize: "0.7rem", borderRadius: 8, border: `1px solid ${T.gold}`, background: T.card, color: T.text }}
                                        formatter={(v: any) => [`${v}/5`, s.label]} labelFormatter={(l) => l} />
                                    {/* 7-day average reference line */}
                                    <ReferenceLine y={stat.avg} stroke={T.gold} strokeWidth={0.85} strokeDasharray="5,4" strokeOpacity={0.55}
                                        label={{ value: `avg ${stat.avg}`, position: "insideTopRight", fontSize: 7, fill: T.gold, opacity: 0.7 }} />
                                    <Line type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={1.8} dot={false}
                                        activeDot={{ r: 3, fill: s.color }} />
                                </LineChart>
                            </ResponsiveContainer>
                            <div style={{ fontSize: "0.58rem", color: T.textSub, textAlign: "center", marginTop: 2 }}>
                                avg {stat.avg}/5 · last {days}d
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function FunctionalImpact({ history, symptomData }: { history: DayRecord[]; symptomData: Record<string, number>[] }) {
    const answered = history.filter(d => d.answered);
    const sleepAffected = answered.filter(d => d.total >= 11).length;
    // humidity_level score >= 3 means "Slight effect" (3) or "Strong effect" (5)
    const humiditTriggered = symptomData.filter(d => (d.humidity_level ?? 0) >= 3).length;
    const effortImpact = answered.filter(d => d.total >= 18).length;

    const items = [
        { label: "Sleep Affected", value: sleepAffected, total: history.length, color: "#6366f1", Icon: Moon },
        { label: "Humidity-Triggered", value: humiditTriggered, total: history.length, color: "#0ea5e9", Icon: CloudRain },
        { label: "Effort Impact Days", value: effortImpact, total: history.length, color: "#f97316", Icon: Activity },
    ];

    return (
        <div style={{ background: T.card, borderRadius: 14, border: T.border, padding: "16px" }}>
            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: T.text, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={15} color={T.gold} />
                Functional Impact
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {items.map(item => (
                    <div key={item.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <item.Icon size={13} color={item.color} />
                                <span style={{ fontSize: "0.78rem", color: T.text }}>{item.label}</span>
                            </div>
                            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: item.color }}>{item.value}<span style={{ fontSize: "0.68rem", color: T.textMuted }}>/{item.total}d</span></span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: "#2a2a2a" }}>
                            <div style={{ height: "100%", width: `${(item.value / Math.max(item.total, 1)) * 100}%`, background: item.color, borderRadius: 3, transition: "width 0.5s" }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ResponseConsistency({ history }: { history: DayRecord[] }) {
    const barData = history.map(d => ({
        date: new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        score: d.answered ? d.total : 0,
        status: d.status,
        missed: d.answered ? 0 : 1,
    }));

    return (
        <div style={{ background: T.card, borderRadius: 14, border: T.border, padding: "16px" }}>
            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: T.text, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={15} color="#10b981" />
                Response Consistency
            </div>
            <div style={{ fontSize: "0.72rem", color: T.textMuted, marginBottom: 12 }}>
                {history.filter(d => d.answered).length}/{history.length} days responded — gaps highlighted
            </div>
            <ResponsiveContainer width="100%" height={100}>
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 7, fill: T.textMuted }} axisLine={false} tickLine={false}
                        interval={Math.floor(barData.length / 5)} />
                    <YAxis domain={[0, 35]} tick={{ fontSize: 7, fill: T.textMuted }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: "0.72rem", borderRadius: 8, background: T.card, border: `1px solid ${T.gold}`, color: T.text }}
                        formatter={(v: any, _: any, p: any) => [p.payload.missed ? "MISSED" : `${v}/35`, "Score"]} />
                    <Bar dataKey="score" radius={[3, 3, 0, 0]}>
                        {barData.map((d, i) => (
                            <Cell key={i} fill={d.missed ? "#333" : STATUS_COLOR[d.status as DayStatus]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

function AIHistoryTable({ scores }: { scores: Record<string, number> }) {
    const [filterSym, setFilterSym] = useState("All");
    const [filterSev, setFilterSev] = useState("All");

    const filtered = MOCK_AI_HISTORY.filter(r =>
        (filterSym === "All" || r.parameter === filterSym) &&
        (filterSev === "All" || r.severity === filterSev)
    );

    const sevColor: Record<string, string> = { Mild: "#10b981", Moderate: "#f59e0b", Severe: "#ef4444" };

    return (
        <div style={{ background: T.card, borderRadius: 14, border: T.border, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <Filter size={15} color={T.gold} />
                <span style={{ fontWeight: 700, fontSize: "0.88rem", color: T.text }}>Agentic AI History</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    <select value={filterSym} onChange={e => setFilterSym(e.target.value)}
                        style={{ padding: "3px 8px", fontSize: "0.72rem", borderRadius: 6, border: `1px solid ${T.gold}66`, color: T.text, background: T.cardAlt, cursor: "pointer" }}>
                        <option>All</option>
                        {SYMPTOMS.map(s => <option key={s.key}>{s.label}</option>)}
                    </select>
                    <select value={filterSev} onChange={e => setFilterSev(e.target.value)}
                        style={{ padding: "3px 8px", fontSize: "0.72rem", borderRadius: 6, border: `1px solid ${T.gold}66`, color: T.text, background: T.cardAlt, cursor: "pointer" }}>
                        <option>All</option>
                        <option>Mild</option>
                        <option>Moderate</option>
                        <option>Severe</option>
                    </select>
                </div>
            </div>
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                    <thead>
                        <tr style={{ borderBottom: `1.5px solid ${T.gold}55` }}>
                            {["Date", "Time", "Parameter", "Severity", "AI Suggestion"].map(h => (
                                <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontSize: "0.65rem", fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.slice(0, 8).map((r, i) => (
                            <tr key={r.id} style={{ borderBottom: `1px solid #222`, background: i % 2 === 0 ? T.card : T.cardAlt }}>
                                <td style={{ padding: "7px 8px", color: T.text }}>{r.date}</td>
                                <td style={{ padding: "7px 8px", color: T.textMuted }}>{r.time}</td>
                                <td style={{ padding: "7px 8px", fontWeight: 600, color: T.goldLight }}>{r.parameter}</td>
                                <td style={{ padding: "7px 8px" }}>
                                    <span style={{ background: `${sevColor[r.severity]}25`, color: sevColor[r.severity], borderRadius: 6, padding: "2px 8px", fontWeight: 700, fontSize: "0.68rem" }}>{r.severity}</span>
                                </td>
                                <td style={{ padding: "7px 8px", color: T.textMuted, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.suggestion}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ClinicalAlerts({ history, scores }: { history: DayRecord[]; scores: Record<string, number> }) {
    const alerts: Array<{ type: "critical" | "warning" | "info"; msg: string }> = [];

    // Consecutive escalation days (most recent streak)
    let consecutiveRed = 0;
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].answered && history[i].status === "red") consecutiveRed++;
        else break;
    }
    if (consecutiveRed >= 2) {
        alerts.push({ type: "critical", msg: `${consecutiveRed} consecutive escalation days — urgent specialist review is required` });
    }

    // Compliance check (last 7 days)
    const recent7 = history.slice(-7);
    const missed = recent7.filter(d => !d.answered).length;
    if (missed >= 3) {
        alerts.push({ type: "warning", msg: `${missed} of the last 7 check-ins were missed — patient engagement intervention needed` });
    }

    // Max-severity symptom
    const maxEntry = Object.entries(scores).find(([, v]) => v >= 5);
    if (maxEntry) {
        const label = SYMPTOMS.find(s => s.key === maxEntry[0])?.label ?? maxEntry[0];
        alerts.push({ type: "warning", msg: `${label} at maximum severity (5/5) — targeted mucosal assessment is recommended` });
    }

    // Positive: improving trend
    const answered = history.filter(d => d.answered);
    if (answered.length >= 3 && consecutiveRed === 0) {
        const last = answered.at(-1)!.total;
        const prev = answered.at(-3)!.total;
        if (prev - last >= 6) {
            alerts.push({ type: "info", msg: `Positive trajectory — ENS score dropped ${prev - last} pts over the last 3 check-ins` });
        }
    }

    if (alerts.length === 0) return null;

    const palette = {
        critical: { bg: "#2d0808", border: "#ef4444", text: "#fca5a5", icon: "🚨" },
        warning:  { bg: "#2d1f00", border: "#f59e0b", text: "#fde68a", icon: "⚠️" },
        info:     { bg: "#052e1c", border: "#10b981", text: "#6ee7b7", icon: "✅" },
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            {alerts.map((a, i) => {
                const c = palette[a.type];
                return (
                    <div key={i} style={{ padding: "10px 16px", borderRadius: 10, background: c.bg, border: `1.5px solid ${c.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: "0.9rem", flexShrink: 0 }}>{c.icon}</span>
                        <span style={{ fontSize: "0.8rem", color: c.text, fontWeight: 600, lineHeight: 1.4 }}>{a.msg}</span>
                    </div>
                );
            })}
        </div>
    );
}

function AISummary({ history, scores }: { history: DayRecord[]; scores: Record<string, number> }) {
    const answeredDays = history.filter(d => d.answered);
    const redDays = history.filter(d => d.status === "red").length;
    const avgScore = answeredDays.reduce((s, d) => s + d.total, 0) / Math.max(answeredDays.length, 1);
    const worstKey = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "air_sensation";
    const worstLabel = SYMPTOMS.find(s => s.key === worstKey)?.label ?? worstKey;
    const worstScore = scores[worstKey] ?? 0;

    // Risk level
    const riskLevel = (redDays >= 3 || worstScore >= 5 || avgScore >= 20) ? "HIGH"
        : (redDays >= 1 || worstScore >= 3 || avgScore >= 11) ? "MODERATE" : "LOW";
    const riskColor = riskLevel === "HIGH" ? "#ef4444" : riskLevel === "MODERATE" ? "#f59e0b" : "#10b981";

    // Trend: compare recent 3 vs older
    const recentAvg = answeredDays.slice(-3).reduce((s, d) => s + d.total, 0) / Math.max(answeredDays.slice(-3).length, 1);
    const olderAvg  = answeredDays.slice(0, -3).reduce((s, d) => s + d.total, 0) / Math.max(answeredDays.slice(0, -3).length, 1);
    const trend = answeredDays.length >= 4
        ? (recentAvg > olderAvg + 3 ? "Worsening" : recentAvg < olderAvg - 3 ? "Improving" : "Stable")
        : "Stable";
    const trendColor = trend === "Worsening" ? "#ef4444" : trend === "Improving" ? "#10b981" : "#f59e0b";
    const trendArrow = trend === "Worsening" ? "↑" : trend === "Improving" ? "↓" : "→";

    // Key findings
    const findings: string[] = [];
    if (worstScore >= 3) findings.push(`${worstLabel} is the dominant symptom at ${worstScore}/5 severity`);
    if (redDays >= 2) findings.push(`${redDays} escalation days exceed the specialist-referral threshold`);
    const compliance = answeredDays.length / Math.max(history.length, 1);
    if (compliance < 0.7) findings.push(`Compliance at ${Math.round(compliance * 100)}% — adherence monitoring required`);
    if (trend === "Worsening") findings.push(`Symptom burden trending up — recent avg ${recentAvg.toFixed(1)} vs baseline ${olderAvg.toFixed(1)}`);
    if (trend === "Improving") findings.push(`Positive response — recent avg ${recentAvg.toFixed(1)} vs baseline ${olderAvg.toFixed(1)}`);
    if (findings.length === 0) findings.push(`All ENS parameters within stable monitoring range`);

    // Recommended actions
    const actions: Array<{ priority: "urgent" | "monitor" | "continue"; text: string }> = [];
    if (riskLevel === "HIGH") actions.push({ priority: "urgent", text: "Immediate ENT specialist review — consider CT imaging of nasal cavity" });
    if (worstScore >= 3) actions.push({ priority: "monitor", text: `Targeted mucosal support protocol for ${worstLabel}` });
    actions.push({ priority: "continue", text: riskLevel === "HIGH" ? "Document escalation and initiate referral pathway" : riskLevel === "MODERATE" ? "Intensify check-in frequency to every 3 days" : "Continue current management and scheduled follow-up" });

    return (
        <div style={{ background: "linear-gradient(135deg,#0d0d0d,#1a1500)", borderRadius: 14, padding: "16px 20px", border: `2px solid ${T.gold}` }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: "0.1em" }}>Dr. Aria AI Clinical Summary</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ padding: "4px 12px", borderRadius: 20, background: `${riskColor}18`, border: `1.5px solid ${riskColor}`, fontSize: "0.7rem", fontWeight: 800, color: riskColor, letterSpacing: "0.05em" }}>
                        {riskLevel === "HIGH" ? "🔴" : riskLevel === "MODERATE" ? "🟡" : "🟢"} {riskLevel} RISK
                    </div>
                    <div style={{ padding: "4px 10px", borderRadius: 20, background: `${trendColor}15`, border: `1px solid ${trendColor}44`, fontSize: "0.68rem", fontWeight: 700, color: trendColor }}>
                        {trendArrow} {trend}
                    </div>
                </div>
            </div>

            {/* Two columns: Findings + Actions */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                    <div style={{ fontSize: "0.6rem", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 7 }}>Key Findings</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {findings.map((f, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, padding: "6px 10px", borderRadius: 7, background: "#161616" }}>
                                <span style={{ color: T.gold, fontSize: "0.7rem", marginTop: 2, flexShrink: 0 }}>•</span>
                                <span style={{ fontSize: "0.76rem", color: T.text, lineHeight: 1.5 }}>{f}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: "0.6rem", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 7 }}>Recommended Actions</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {actions.map((a, i) => {
                            const ac = a.priority === "urgent" ? "#ef4444" : a.priority === "monitor" ? "#f59e0b" : "#10b981";
                            const bg = a.priority === "urgent" ? "#2d0808" : a.priority === "monitor" ? "#2d1f00" : "#052e1c";
                            const label = a.priority === "urgent" ? "🚨 Urgent" : a.priority === "monitor" ? "⚠️ Monitor" : "✅ Continue";
                            return (
                                <div key={i} style={{ padding: "7px 10px", borderRadius: 7, background: bg, border: `1px solid ${ac}33`, display: "flex", alignItems: "flex-start", gap: 8 }}>
                                    <span style={{ fontSize: "0.62rem", fontWeight: 800, color: ac, flexShrink: 0, marginTop: 1, minWidth: 58 }}>{label}</span>
                                    <span style={{ fontSize: "0.75rem", color: T.text, lineHeight: 1.5, flex: 1 }}>{a.text}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Stats footer */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 12, borderTop: `1px solid ${T.gold}22` }}>
                <div style={{ padding: "4px 10px", borderRadius: 6, background: `${T.gold}15`, border: `1px solid ${T.gold}44`, fontSize: "0.68rem", color: T.textMuted }}>Avg Score: <strong style={{ color: T.goldLight }}>{avgScore.toFixed(1)}/35</strong></div>
                <div style={{ padding: "4px 10px", borderRadius: 6, background: "#ef444415", border: "1px solid #ef444444", fontSize: "0.68rem", color: T.textMuted }}>Escalation Days: <strong style={{ color: "#f87171" }}>{redDays}</strong></div>
                <div style={{ padding: "4px 10px", borderRadius: 6, background: `${T.gold}15`, border: `1px solid ${T.gold}44`, fontSize: "0.68rem", color: T.textMuted }}>Top Symptom: <strong style={{ color: T.gold }}>{worstLabel}</strong></div>
                <div style={{ padding: "4px 10px", borderRadius: 6, background: `${trendColor}10`, border: `1px solid ${trendColor}33`, fontSize: "0.68rem", color: T.textMuted }}>Trend: <strong style={{ color: trendColor }}>{trendArrow} {trend}</strong></div>
            </div>
        </div>
    );
}

// ── Animated PDF Overlay ──────────────────────────────────────────────────────
const PDF_STEPS = [
    { label: "Initialising report engine", icon: "⚙️", duration: 150 },
    { label: "Analysing symptom scores", icon: "🧬", duration: 180 },
    { label: "Building score cards", icon: "📊", duration: 180 },
    { label: "Generating trend charts", icon: "📈", duration: 180 },
    { label: "Rendering radar profile", icon: "🕸️", duration: 150 },
    { label: "Compiling clinical notes", icon: "📋", duration: 180 },
    { label: "Adding bounds reference", icon: "🔬", duration: 130 },
    { label: "Finalising PDF", icon: "✅", duration: 100 },
];

function PDFOverlay({ step, total }: { step: number; total: number }) {
    const pct = Math.round((step / total) * 100);
    const current = PDF_STEPS[Math.min(step, PDF_STEPS.length - 1)];
    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(5,10,25,0.92)",
            backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
        }}>
            <style>{`
                @keyframes orbSpin   { to { transform: rotate(360deg); } }
                @keyframes orbSpin2  { to { transform: rotate(-360deg); } }
                @keyframes stepPop   { 0%{transform:scale(0.8);opacity:0} 100%{transform:scale(1);opacity:1} }
                @keyframes shimmerPdf{
                    0%   { background-position: -400px 0; }
                    100% { background-position:  400px 0; }
                }
                @keyframes floatUp {
                    0%   { transform: translateY(0)   opacity:1; }
                    100% { transform: translateY(-60px); opacity:0; }
                }
                @keyframes pulse2 { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.95)} }
            `}</style>

            <div style={{
                position: "relative", width: 420, padding: "40px 36px", borderRadius: 24,
                background: "linear-gradient(145deg,#0d1b38,#162040)",
                border: "1px solid rgba(99,102,241,0.4)",
                boxShadow: "0 0 80px rgba(99,102,241,0.25), 0 0 0 1px rgba(99,102,241,0.15)"
            }}>

                {/* Spinning orbs */}
                <div style={{ position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)", width: 80, height: 80 }}>
                    <div style={{
                        position: "absolute", inset: 0, borderRadius: "50%",
                        border: "2px solid transparent",
                        borderTopColor: "#6366f1", borderRightColor: "#6366f1",
                        animation: "orbSpin 1s linear infinite"
                    }} />
                    <div style={{
                        position: "absolute", inset: 8, borderRadius: "50%",
                        border: "2px solid transparent",
                        borderBottomColor: "#38bdf8", borderLeftColor: "#38bdf8",
                        animation: "orbSpin2 0.7s linear infinite"
                    }} />
                    <div style={{
                        position: "absolute", inset: 16, borderRadius: "50%",
                        border: "2px solid transparent",
                        borderTopColor: "#a855f7",
                        animation: "orbSpin 0.5s linear infinite"
                    }} />
                    <div style={{
                        position: "absolute", inset: "50%", transform: "translate(-50%,-50%)",
                        width: 16, height: 16, borderRadius: "50%",
                        background: "linear-gradient(135deg,#6366f1,#38bdf8)",
                        boxShadow: "0 0 20px #6366f1"
                    }} />
                </div>

                <div style={{ marginTop: 20, textAlign: "center" }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: 4, animation: "pulse2 1s ease-in-out infinite" }}>
                        {current.icon}
                    </div>
                    <div style={{
                        fontSize: "0.65rem", fontWeight: 700, color: "#6366f1", letterSpacing: "0.12em",
                        textTransform: "uppercase", marginBottom: 8
                    }}>Generating Report</div>
                    <div style={{
                        fontSize: "0.92rem", fontWeight: 700, color: "white", marginBottom: 20,
                        animation: "stepPop 0.3s ease-out", minHeight: 24
                    }}>
                        {current.label}
                    </div>

                    {/* Big progress bar */}
                    <div style={{ height: 8, borderRadius: 8, background: "rgba(255,255,255,0.07)", marginBottom: 8, overflow: "hidden" }}>
                        <div style={{
                            height: "100%", borderRadius: 8, width: `${pct}%`,
                            background: "linear-gradient(90deg, #4f46e5, #6366f1, #818cf8, #38bdf8)",
                            backgroundSize: "400px 100%",
                            animation: "shimmerPdf 1.4s linear infinite",
                            transition: "width 0.5s ease",
                            boxShadow: "0 0 12px #6366f199",
                        }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                        <span style={{ fontSize: "0.68rem", color: "#64748b" }}>Step {Math.min(step + 1, PDF_STEPS.length)}/{PDF_STEPS.length}</span>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#38bdf8" }}>{pct}%</span>
                    </div>

                    {/* Step list */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, textAlign: "left" }}>
                        {PDF_STEPS.map((s, i) => {
                            const done = i < step;
                            const active = i === step;
                            return (
                                <div key={i} style={{
                                    display: "flex", alignItems: "center", gap: 8,
                                    padding: "5px 10px", borderRadius: 8,
                                    background: active ? "rgba(99,102,241,0.15)" : "transparent",
                                    border: `1px solid ${active ? "rgba(99,102,241,0.5)" : "transparent"}`,
                                    transition: "all 0.3s"
                                }}>
                                    <div style={{
                                        width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                                        background: done ? "#10b981" : active ? "#6366f1" : "rgba(255,255,255,0.08)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: "0.55rem", color: "white", transition: "all 0.3s",
                                        boxShadow: active ? "0 0 8px #6366f1" : "none"
                                    }}>
                                        {done ? "✓" : active ? <Loader2 size={9} style={{ animation: "spin 0.8s linear infinite" }} /> : ""}
                                    </div>
                                    <span style={{
                                        fontSize: "0.72rem",
                                        color: done ? "#10b981" : active ? "white" : "#475569",
                                        fontWeight: active ? 700 : 400, transition: "all 0.3s"
                                    }}>
                                        {s.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Doctor Dashboard ──────────────────────────────────────────────────────
interface Props {
    answers: Record<string, number>;
    latestDayAnswers: Record<string, number>;
    history: DayRecord[];
    submitted: boolean;
}

export default function DoctorDashboard({ answers, latestDayAnswers, history, submitted }: Props) {
    const [dateRange, setDateRange] = useState("7 Days");
    const [isPrinting, setIsPrinting] = useState(false);
    const [selectedDay, setSelectedDay] = useState<FullDayRecord | null>(null);
    const dashboardRef = useRef<HTMLDivElement>(null);

    const days = dateRange === "30 Days" ? 30 : dateRange === "14 Days" ? 14 : 7;

    const fullHistory = useMemo(() => generateMockHistory(days), [days]);
    const mergedHistory = useMemo(() => {
        const merged = [...fullHistory];
        history.forEach((d, i) => {
            if (d.answered) merged[merged.length - 7 + i] = d;
        });
        return merged;
    }, [fullHistory, history, days]);

    const scores: Record<string, number> = useMemo(() => Object.fromEntries(
        ["air_sensation", "nasal_dryness", "nasal_burning", "suffocation",
            "anxiety_score", "humidity_level", "sleep_quality"].map(k => {
            // Prefer today's latestDayAnswers (real patient data), fall back to passed answers, then 0
            const idx = latestDayAnswers[k] >= 0 ? latestDayAnswers[k]
                : answers[k] >= 0 ? answers[k] : -1;
            return [k, idx >= 0 ? SCORE_MAP[idx] : 0];
        })
    ), [latestDayAnswers, answers]);

    const symptomData = useMemo(() => generateSymptomHistory(days), [days]);

    const aiInsight = useMemo(() => {
        const worst = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
        const worstLabel = SYMPTOMS.find(s => s.key === worst?.[0])?.label ?? "symptoms";
        const redCount = mergedHistory.filter(d => d.status === "red").length;
        if (redCount >= 3) return `${redCount} escalation days — ${worstLabel} is the primary driver. Urgent specialist review advised.`;
        if (worst?.[1] >= 3) return `${worstLabel} is elevated (${worst[1]}/5). Monitoring is recommended over the coming week.`;
        return `Patient trajectory is stable. Continue current ENS management and scheduled follow-up.`;
    }, [scores, mergedHistory]);

    // Build patient context for clinical AI — injected as system-level context
    const patientContext = useMemo(() => {
        const lines = [
            `Patient 7-Day History (oldest → newest):`,
            ...mergedHistory.map(d => `  ${d.date}: ${STATUS_LABEL[d.status]} — Score ${d.total}/35${!d.answered ? " (no data)" : ""}`),
            ``,
            `Latest Symptom Scores:`,
            ...SYMPTOMS.map(s => `  ${s.label}: ${scores[s.key] ?? 0}/5`),
            ``,
            `Total: ${Object.values(scores).reduce((a: number, b) => a + b, 0)}/35`,
            `AI Insight: ${aiInsight}`,
        ];
        return lines.join("\n");
    }, [mergedHistory, scores, aiInsight]);

    // Load full day record (with answers) from localStorage when a bar is clicked
    const handleSelectDay = useCallback((d: DayRecord) => {
        const raw = typeof window !== "undefined" ? localStorage.getItem(`ens_day_${d.date}`) : null;
        setSelectedDay(raw ? (JSON.parse(raw) as FullDayRecord) : (d as FullDayRecord));
    }, []);

    // Animated print
    function handlePrint() {
        if (!dashboardRef.current) { window.print(); return; }
        setIsPrinting(true);
        const el = dashboardRef.current;
        const prevOverflow = el.style.overflowY;
        const prevHeight = el.style.height;
        const prevMaxHeight = el.style.maxHeight;
        el.style.overflowY = "visible";
        el.style.height = "auto";
        el.style.maxHeight = "none";
        // Give browser a frame to reflow, then print
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                window.print();
                // Restore after printing dialog closes
                el.style.overflowY = prevOverflow;
                el.style.height = prevHeight;
                el.style.maxHeight = prevMaxHeight;
                setIsPrinting(false);
            });
        });
    }

    return (
        <div ref={dashboardRef} id="print-root" className="print-area" style={{ flex: 1, overflowY: "auto", padding: "1.25rem", display: "flex", flexDirection: "column", gap: 14, background: T.bg }}>

            {/* 0 - Clinical Alerts — shown only when action is needed */}
            <ClinicalAlerts history={mergedHistory} scores={scores} />

            {/* 1 - Summary Bar */}
            <div className="avoid-break">
                <SummaryBar history={mergedHistory} dateRange={dateRange} setDateRange={setDateRange} aiInsight={aiInsight} />
            </div>

            {/* 2 - State Timeline — clickable bars open patient daily report */}
            <div className="avoid-break">
                <StateTimeline history={mergedHistory} onSelectDay={handleSelectDay} />
            </div>

            {/* 3 - Radar: Today vs Average */}
            <div className="avoid-break">
                <ScoreRadarCard scores={scores} symptomData={symptomData} />
            </div>

            {/* 4 - Human Model (full width) — new page */}
            <div className="page-break avoid-break">
                <HumanModel scores={scores} />
            </div>

            {/* 4 - Symptom Trends — new page */}
            <div className="page-break avoid-break">
                <SymptomTrends symptomData={symptomData} days={days} />
            </div>

            {/* 5+7 - Functional Impact + Response Consistency */}
            <div className="avoid-break" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FunctionalImpact history={mergedHistory} symptomData={symptomData} />
                <ResponseConsistency history={mergedHistory} />
            </div>

            {/* 6 - AI History Table */}
            <div className="avoid-break">
                <AIHistoryTable scores={scores} />
            </div>

            {/* AI Summary */}
            <div className="avoid-break">
                <AISummary history={mergedHistory} scores={scores} />
            </div>

            {/* Action buttons — hidden in print */}
            <div className="no-print" style={{ display: "flex", gap: 12, justifyContent: "flex-end", alignItems: "center" }}>

                {/* Print button */}
                <button onClick={handlePrint} disabled={isPrinting}
                    style={{
                        position: "relative", overflow: "hidden",
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "10px 22px", borderRadius: 12,
                        border: `2px solid ${T.gold}`,
                        background: isPrinting
                            ? "linear-gradient(135deg,#1a1500,#0d0d0d)"
                            : T.card,
                        color: isPrinting ? T.goldLight : T.text,
                        fontSize: "0.82rem", fontWeight: 700, cursor: isPrinting ? "not-allowed" : "pointer",
                        boxShadow: isPrinting ? `0 0 20px ${T.gold}55` : `0 2px 8px rgba(0,0,0,0.4)`,
                        transition: "all 0.3s",
                        animation: isPrinting ? "printBounce 0.4s ease-in-out" : "none",
                    }}>
                    {isPrinting
                        ? <Loader2 size={15} style={{ animation: "spin 0.6s linear infinite", color: T.gold }} />
                        : <Printer size={15} color={T.gold} />}
                    {isPrinting ? "Preparing Print…" : "Print Report"}
                </button>
            </div>

            {/* Keyframe animations — @media print is now in globals.css */}
            <style>{`
                @keyframes spin        { to   { transform: rotate(360deg); } }
                @keyframes pulse       { 0%,100%{opacity:1} 50%{opacity:0.4} }
                @keyframes printBounce { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
                @keyframes btnShimmer  { 0%{background-position:-300px 0} 100%{background-position:300px 0} }
                @keyframes rmPulse     { 0%{r:8;opacity:.6} 70%{r:20;opacity:0} 100%{r:8;opacity:0} }
                @keyframes bodyPulse   { 0%{r:6;opacity:.6} 70%{r:13;opacity:0} 100%{r:6;opacity:0} }
                select { appearance: auto; }
            `}</style>

            {/* Day Detail Modal — rendered at root so it overlays everything */}
            {selectedDay && <DayDetailModal day={selectedDay} onClose={() => setSelectedDay(null)} />}
        </div>
    );
}
