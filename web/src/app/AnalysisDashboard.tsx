"use client";
import { useState } from "react";
import { Wind, Droplets, Flame, Activity, Brain, CloudRain, Moon, AlertTriangle, Lightbulb, ShieldAlert, TrendingUp, CheckCircle2, Download, Loader2 } from "lucide-react";
import { generateENSReport } from "./generateReport";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    LineChart, Line, Legend, ReferenceLine,
} from "recharts";

export const CRITERIA = [
    { key: "air_sensation", label: "Air Sensation", short: "Air", Icon: Wind, color: "#3b82f6", threshold: 3 },
    { key: "nasal_dryness", label: "Nasal Dryness", short: "Dryness", Icon: Droplets, color: "#f97316", threshold: 3 },
    { key: "nasal_burning", label: "Nasal Burning", short: "Burning", Icon: Flame, color: "#ef4444", threshold: 2 },
    { key: "suffocation", label: "Suffocation", short: "Suff.", Icon: Activity, color: "#8b5cf6", threshold: 3 },
    { key: "anxiety_score", label: "Anxiety", short: "Anxiety", Icon: Brain, color: "#6366f1", threshold: 3 },
    { key: "humidity_level", label: "Humidity", short: "Humidity", Icon: CloudRain, color: "#0ea5e9", threshold: 3 },
    { key: "sleep_quality", label: "Sleep Quality", short: "Sleep", Icon: Moon, color: "#64748b", threshold: 2 },
];

const SCORE_MAP = [0, 3, 5];

function getSeverity(total: number) {
    if (total >= 30) return { label: "Maximum Severity", color: "#7f1d1d", bg: "#fef2f2", ring: "#fca5a5" };
    if (total >= 23) return { label: "Severe", color: "#ef4444", bg: "#fef2f2", ring: "#fca5a5" };
    if (total >= 18) return { label: "Moderate-Severe", color: "#f97316", bg: "#fff7ed", ring: "#fdba74" };
    if (total >= 11) return { label: "Moderate", color: "#f59e0b", bg: "#fffbeb", ring: "#fcd34d" };
    if (total >= 6) return { label: "Mild", color: "#10b981", bg: "#f0fdf4", ring: "#6ee7b7" };
    return { label: "Subclinical", color: "#64748b", bg: "#f8fafc", ring: "#e2e8f0" };
}

function generateSuggestions(scores: Record<string, number>): { type: "warning" | "tip" | "action"; text: string }[] {
    const tips: { type: "warning" | "tip" | "action"; text: string }[] = [];
    const s = (k: string) => scores[k] ?? 0;

    if (s("nasal_dryness") >= 3) tips.push({ type: "action", text: "Use a saline nasal spray 3 to 4 times daily to maintain mucosal moisture and reduce crusting risk." });
    if (s("nasal_burning") >= 2) tips.push({ type: "warning", text: "Nasal burning at this level may indicate mucosal atrophy. Avoid dry indoor environments and consider a humidifier." });
    if (s("air_sensation") >= 3) tips.push({ type: "tip", text: "Breathing through pursed lips or using a damp cloth near the nose can help stimulate airflow sensation." });
    if (s("suffocation") >= 3) tips.push({ type: "warning", text: "Paradoxical suffocation is a core ENS symptom. Elevation of the head during sleep may provide relief." });
    if (s("anxiety_score") >= 3) tips.push({ type: "action", text: "Breathing anxiety is clinically significant. Diaphragmatic breathing exercises and ENS-aware psychological support are strongly recommended." });
    if (s("humidity_level") >= 3) tips.push({ type: "tip", text: "Keep indoor humidity between 45 and 55 percent. A small humidifier in the bedroom makes a measurable difference." });
    if (s("sleep_quality") >= 2) tips.push({ type: "action", text: "Sleep disruption compounds ENS symptoms significantly. Elevate your head 30 degrees and avoid air conditioning directly overhead." });
    if (s("anxiety_score") >= 4 && s("suffocation") >= 4) tips.push({ type: "warning", text: "Combined high anxiety and suffocation suggest significant psychological distress. Please discuss ENS-specific counselling with your ENT specialist." });
    if (Object.values(scores).reduce((a, b) => a + b, 0) >= 23) tips.push({ type: "warning", text: "Your total score falls in the severe range. Specialist review is strongly advised within the next 2 weeks." });
    if (tips.length === 0) tips.push({ type: "tip", text: "Your scores are in a manageable range. Continue your current nasal hygiene routine and maintain humidity control." });
    return tips;
}

function getRiskFlags(scores: Record<string, number>): string[] {
    const flags: string[] = [];
    const s = (k: string) => scores[k] ?? 0;
    if (s("anxiety_score") === 5) flags.push("Maximum anxiety score. Psychological crisis support may be needed.");
    if (s("suffocation") === 5) flags.push("Maximal suffocation sensation. Rule out concurrent sleep apnea.");
    if (s("nasal_burning") >= 4) flags.push("Severe burning. Consider neuropathic component or mucosal atrophy.");
    if (s("sleep_quality") >= 4) flags.push("Severe sleep disruption. Assess for secondary insomnia or nocturnal panic.");
    if (s("nasal_dryness") === 5) flags.push("Maximum dryness. Hemorrhage or crusting risk is elevated.");
    return flags;
}

interface Props {
    answers: Record<string, number>;
    history: { status: string; total: number; answered: boolean; date: string }[];
    submitted: boolean;
}

export default function AnalysisDashboard({ answers, history, submitted }: Props) {
    if (!submitted) {
        return (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#94a3b8", padding: "2rem" }}>
                <TrendingUp size={40} style={{ opacity: 0.3 }} />
                <p style={{ fontSize: "0.88rem", fontWeight: 600, margin: 0 }}>Complete today's check-in to view your analytics dashboard</p>
                <p style={{ fontSize: "0.75rem", margin: 0 }}>Charts, trends, and personalised suggestions will appear here</p>
            </div>
        );
    }

    const scores: Record<string, number> = Object.fromEntries(
        CRITERIA.map(c => [c.key, answers[c.key] >= 0 ? SCORE_MAP[answers[c.key]] : 0])
    );
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    const sev = getSeverity(total);
    const suggestions = generateSuggestions(scores);
    const flags = getRiskFlags(scores);
    const [downloading, setDownloading] = useState(false);
    const [dlStep, setDlStep] = useState(0); // 0=idle 1-5=steps

    const DL_STEPS = [
        "Collecting patient data",
        "Building symptom analysis",
        "Rendering charts and radars",
        "Compiling clinical suggestions",
        "Generating PDF file",
    ];

    async function handleDownload() {
        setDownloading(true);
        setDlStep(1);
        try {
            for (let i = 1; i <= 5; i++) {
                setDlStep(i);
                if (i < 5) await new Promise(r => setTimeout(r, 380));
            }
            await generateENSReport(answers, history);
        } finally {
            setDlStep(0);
            setDownloading(false);
        }
    }

    // Bar chart data
    const barData = CRITERIA.map(c => ({ name: c.short, value: scores[c.key], fill: c.color }));

    // Radar data
    const radarData = CRITERIA.map(c => ({ subject: c.short, score: scores[c.key], max: 5 }));

    // 7-day trend line data
    const trendData = history.map(d => ({
        day: new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }),
        score: d.answered ? d.total : null,
        status: d.status,
    }));

    const tickFmt = (v: number) => `${v}`;

    return (
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* PDF generation animated overlay */}
            {downloading && (
                <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,0.72)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ background: "#ffffff", borderRadius: 20, padding: "2rem 2.5rem", width: 340, boxShadow: "0 24px 80px rgba(0,0,0,0.35)", textAlign: "center" }}>
                        {/* Pulsing logo */}
                        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#1e293b,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", boxShadow: "0 0 0 8px rgba(79,70,229,0.12)", animation: "dlPulse 1.4s ease-in-out infinite" }}>
                            <Loader2 size={28} color="white" style={{ animation: "spin 1.1s linear infinite" }} />
                        </div>
                        <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>Generating Your Report</div>
                        <div style={{ fontSize: "0.76rem", color: "#94a3b8", marginBottom: "1.5rem" }}>ENS Patient Assessment PDF</div>

                        {/* Progress bar */}
                        <div style={{ height: 5, borderRadius: 4, background: "#f1f5f9", marginBottom: "1.5rem", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg,#4f46e5,#38bdf8)", width: `${(dlStep / 5) * 100}%`, transition: "width 0.38s ease" }} />
                        </div>

                        {/* Step list */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
                            {DL_STEPS.map((step, i) => {
                                const done = dlStep > i + 1;
                                const active = dlStep === i + 1;
                                return (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, border: done ? "none" : active ? "2px solid #4f46e5" : "2px solid #e2e8f0", background: done ? "#4f46e5" : active ? "rgba(79,70,229,0.08)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}>
                                            {done ? <CheckCircle2 size={14} color="white" /> : active ? <Loader2 size={11} color="#4f46e5" style={{ animation: "spin 0.9s linear infinite" }} /> : null}
                                        </div>
                                        <span style={{ fontSize: "0.79rem", fontWeight: active ? 700 : done ? 600 : 400, color: active ? "#0f172a" : done ? "#059669" : "#94a3b8", transition: "color 0.3s" }}>{step}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ marginTop: "1.5rem", fontSize: "0.7rem", color: "#cbd5e1" }}>Please wait — your report will download automatically</div>
                    </div>
                </div>
            )}

            {/* Download button */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={handleDownload} disabled={downloading}
                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#1e293b,#334155)", color: "white", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", boxShadow: "0 3px 12px rgba(0,0,0,0.18)", transition: "all 0.2s", opacity: downloading ? 0.5 : 1 }}>
                    <Download size={14} />
                    Download Report (PDF)
                </button>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes dlPulse { 0%,100% { box-shadow: 0 0 0 8px rgba(79,70,229,0.12); } 50% { box-shadow: 0 0 0 16px rgba(79,70,229,0.06); } }
            `}</style>

            {/* Header row */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                {/* Total score */}
                <div style={{ flex: "1 1 150px", padding: "1rem 1.25rem", borderRadius: 14, background: sev.bg, border: `2px solid ${sev.ring}` }}>
                    <p style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", margin: 0 }}>Total ENS Score</p>
                    <p style={{ fontSize: "2.4rem", fontWeight: 900, color: sev.color, margin: "4px 0 0", lineHeight: 1 }}>{total}<span style={{ fontSize: "0.85rem", color: "#cbd5e1", fontWeight: 500 }}>/35</span></p>
                    <p style={{ fontSize: "0.78rem", fontWeight: 700, color: sev.color, margin: "4px 0 0" }}>{sev.label}</p>
                </div>
                {/* Score band reference */}
                <div style={{ flex: "2 1 260px", padding: "1rem 1.25rem", borderRadius: 14, background: "#f8fafc", border: "1px solid #f1f5f9" }}>
                    <p style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", margin: "0 0 8px" }}>Clinical Range</p>
                    <div style={{ display: "flex", gap: 4 }}>
                        {[["0-5", "#64748b", "Subclinical"], ["6-10", "#10b981", "Mild"], ["11-17", "#f59e0b", "Moderate"], ["18-22", "#f97316", "Mod-Severe"], ["23+", "#ef4444", "Severe"]].map(([range, color, label]) => (
                            <div key={range} style={{ flex: 1, background: `${color}15`, borderRadius: 6, padding: "4px 4px", border: `1px solid ${color}30`, textAlign: "center" }}>
                                <p style={{ fontSize: "0.6rem", fontWeight: 700, color, margin: 0 }}>{range}</p>
                                <p style={{ fontSize: "0.55rem", color: "#64748b", margin: 0 }}>{label}</p>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 8, height: 6, borderRadius: 6, background: "linear-gradient(90deg,#64748b,#10b981,#f59e0b,#f97316,#ef4444)", position: "relative" }}>
                        <div style={{ position: "absolute", top: -2, left: `${(total / 35) * 100}%`, transform: "translateX(-50%)", width: 10, height: 10, borderRadius: "50%", background: sev.color, border: "2px solid white", boxShadow: `0 0 0 2px ${sev.color}` }} />
                    </div>
                </div>
                {/* Criteria over threshold */}
                <div style={{ flex: "1 1 140px", padding: "1rem 1.25rem", borderRadius: 14, background: "#f8fafc", border: "1px solid #f1f5f9" }}>
                    <p style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", margin: 0 }}>Above Threshold</p>
                    <p style={{ fontSize: "2.2rem", fontWeight: 900, color: flags.length > 0 ? "#ef4444" : "#10b981", margin: "4px 0 0", lineHeight: 1 }}>{CRITERIA.filter(c => scores[c.key] >= c.threshold).length}<span style={{ fontSize: "0.85rem", color: "#cbd5e1", fontWeight: 500 }}>/7</span></p>
                    <p style={{ fontSize: "0.73rem", color: "#64748b", margin: "4px 0 0" }}>criteria flagged</p>
                </div>
            </div>

            {/* Risk flags */}
            {flags.length > 0 && (
                <div style={{ padding: "0.875rem 1rem", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <AlertTriangle size={14} color="#ef4444" />
                        <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>Clinical Risk Flags</p>
                    </div>
                    {flags.map((f, i) => <p key={i} style={{ fontSize: "0.78rem", color: "#b91c1c", margin: "4px 0 0" }}>{i + 1}. {f}</p>)}
                </div>
            )}

            {/* Charts row 1: Bar + Radar */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 280px", background: "white", borderRadius: 14, border: "1px solid #f1f5f9", padding: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                    <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1e293b", margin: "0 0 10px" }}>Symptom Scores (Bar)</p>
                    <ResponsiveContainer width="100%" height={170}>
                        <BarChart data={barData} barSize={22} margin={{ top: 12, right: 4, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={tickFmt} />
                            <Tooltip formatter={(v: any) => [`${v}/5`, "Score"]} contentStyle={{ borderRadius: 8, fontSize: "0.78rem", border: "1px solid #e2e8f0" }} cursor={{ fill: "#f8fafc" }} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} label={{ position: "top", fontSize: 10, fontWeight: 700, fill: "#64748b" }}>
                                {barData.map((entry, i) => (
                                    <rect key={i} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div style={{ flex: "1 1 240px", background: "white", borderRadius: 14, border: "1px solid #f1f5f9", padding: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                    <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0" }}>ENS Profile (Radar)</p>
                    <ResponsiveContainer width="100%" height={185}>
                        <RadarChart data={radarData} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                            <PolarGrid stroke="#f1f5f9" />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#64748b" }} />
                            <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
                            <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.22} strokeWidth={2} />
                            <Tooltip formatter={(v: any) => [`${v}/5`, "Score"]} contentStyle={{ borderRadius: 8, fontSize: "0.78rem", border: "1px solid #e2e8f0" }} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 7-day trend */}
            <div style={{ background: "white", borderRadius: 14, border: "1px solid #f1f5f9", padding: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1e293b", margin: "0 0 10px" }}>7-Day Score Trend</p>
                <ResponsiveContainer width="100%" height={130}>
                    <LineChart data={trendData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 35]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <ReferenceLine y={10} stroke="#10b981" strokeDasharray="4 3" label={{ value: "Mild", position: "right", fontSize: 9, fill: "#10b981" }} />
                        <ReferenceLine y={22} stroke="#f59e0b" strokeDasharray="4 3" label={{ value: "Moderate", position: "right", fontSize: 9, fill: "#f59e0b" }} />
                        <ReferenceLine y={29} stroke="#ef4444" strokeDasharray="4 3" label={{ value: "Severe", position: "right", fontSize: 9, fill: "#ef4444" }} />
                        <Tooltip formatter={(v: any) => [`${v}/35`, "Total Score"]} contentStyle={{ borderRadius: 8, fontSize: "0.78rem", border: "1px solid #e2e8f0" }} />
                        <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }} connectNulls={false} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Individual criterion cards */}
            <div>
                <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.09em", margin: "0 0 10px" }}>Criterion Detail</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                    {CRITERIA.map(c => {
                        const score = scores[c.key];
                        const pct = (score / 5) * 100;
                        const flagged = score >= c.threshold;
                        return (
                            <div key={c.key} style={{ background: "white", borderRadius: 12, padding: "0.75rem", border: `1.5px solid ${flagged ? c.color + "55" : "#f1f5f9"}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <div style={{ width: 26, height: 26, borderRadius: 7, background: `${c.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <c.Icon size={12} color={c.color} />
                                        </div>
                                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#1e293b" }}>{c.label}</span>
                                    </div>
                                    <span style={{ fontSize: "1rem", fontWeight: 800, color: flagged ? c.color : "#64748b" }}>{score}</span>
                                </div>
                                {/* Bounds bar */}
                                <div style={{ height: 5, borderRadius: 4, background: "#f1f5f9", overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${pct}%`, borderRadius: 4, background: flagged ? c.color : "#10b981", transition: "width 0.6s ease" }} />
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.58rem", color: "#94a3b8", marginTop: 3 }}>
                                    <span>0 Normal</span>
                                    <span>5 Severe</span>
                                </div>
                                {flagged && <p style={{ fontSize: "0.62rem", color: c.color, fontWeight: 600, margin: "5px 0 0" }}>Above clinical threshold ({c.threshold}+)</p>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Suggestions */}
            <div style={{ background: "white", borderRadius: 14, border: "1px solid #f1f5f9", padding: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                    <Lightbulb size={14} color="#6366f1" />
                    <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>Personalised Suggestions</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {suggestions.map((s, i) => {
                        const color = s.type === "warning" ? "#ef4444" : s.type === "action" ? "#6366f1" : "#10b981";
                        const bg = s.type === "warning" ? "#fef2f2" : s.type === "action" ? "#eff6ff" : "#f0fdf4";
                        const Icon = s.type === "warning" ? AlertTriangle : s.type === "action" ? ShieldAlert : CheckCircle2;
                        return (
                            <div key={i} style={{ display: "flex", gap: 10, padding: "0.75rem", borderRadius: 10, background: bg, border: `1px solid ${color}22` }}>
                                <Icon size={14} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
                                <p style={{ fontSize: "0.78rem", color: "#1e293b", margin: 0, lineHeight: 1.6 }}>{s.text}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div style={{ height: 8 }} />
        </div>
    );
}
