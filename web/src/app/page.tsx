"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Wind, Droplets, Flame, Activity, Brain, CloudRain, Moon, ClipboardCheck, Loader2, Microscope, BarChart2, RefreshCw, AlertTriangle, CheckCircle2, MessageSquare, Phone } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";
import DoctorDashboard, { DoctorChat } from "./DoctorDashboard";
import AriaCallPanel from "./AriaCallPanel";

// ─── Data ─────────────────────────────────────────────────────────────────────
const SCORE_MAP = [0, 3, 5];
const CORE_QUESTIONS = [
  { key: "air_sensation", label: "Air Sensation", Icon: Wind, color: "#3b82f6", question: "How natural did your breathing feel today?", options: ["Felt normal", "Slightly unnatural", "Very unnatural"] },
  { key: "nasal_dryness", label: "Nasal Dryness", Icon: Droplets, color: "#f97316", question: "Did your nose feel dry today?", options: ["Not at all", "Mild dryness", "Severe dryness"] },
  { key: "nasal_burning", label: "Nasal Burning", Icon: Flame, color: "#ef4444", question: "Did you feel any burning inside your nose?", options: ["None", "Mild burning", "Strong burning"] },
  { key: "suffocation", label: "Suffocation", Icon: Activity, color: "#8b5cf6", question: "Did you feel short of air or suffocated today?", options: ["No", "Occasionally", "Frequently"] },
  { key: "anxiety_score", label: "Anxiety", Icon: Brain, color: "#6366f1", question: "Did breathing discomfort make you feel anxious today?", options: ["Not at all", "A little anxious", "Quite anxious"] },
  { key: "humidity_level", label: "Humidity Level", Icon: CloudRain, color: "#0ea5e9", question: "Did dry or humid air make your symptoms worse today?", options: ["No difference", "Slight effect", "Strong effect"] },
  { key: "sleep_quality", label: "Sleep Quality", Icon: Moon, color: "#64748b", question: "Did your breathing affect your sleep last night?", options: ["Slept well", "Some disruption", "Significantly disrupted"] },
];
const FOLLOWUP_QUESTIONS = [
  "Did you need to consciously focus on your breathing more than usual today?",
  "Did you feel any discomfort in quiet or still environments?",
  "Were your symptoms noticeably worse when indoors today?",
  "Did you avoid any activities today because of breathing discomfort?",
  "Did you feel any nasal irritation from air movement today?",
  "Was there any environment today where you felt some relief?",
  "Were your symptoms noticeably worse in the evening or at night?",
];

type Msg = { role: "user" | "assistant"; content: string };
type DayStatus = "green" | "yellow" | "red" | "grey";
type DayRecord = { status: DayStatus; total: number; answered: boolean; date: string };

function getDate(offset = 0) { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().split("T")[0]; }
function computeStatus(t: number, a: boolean): DayStatus { if (!a) return "grey"; if (t >= 23) return "red"; if (t >= 11) return "yellow"; return "green"; }
const STATUS_COLOR: Record<DayStatus, string> = { green: "#10b981", yellow: "#f59e0b", red: "#ef4444", grey: "#e2e8f0" };
const STATUS_LABEL: Record<DayStatus, string> = { green: "🟢 Stable", yellow: "🟡 Drift", red: "🔴 Escalation", grey: "⚪ No Data" };

// ─── Markdown helpers ─────────────────────────────────────────────────────────
function stripMarkdown(t: string) {
  return t
    .replace(/\*\*\*([\s\S]*?)\*\*\*/g, "$1")
    .replace(/\*\*([\s\S]*?)\*\*/g, "$1")
    .replace(/__([\s\S]*?)__/g, "$1")
    .replace(/\*([\s\S]*?)\*/g, "$1")
    .replace(/_([\s\S]*?)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\u2014/g, ",")
    .replace(/\u2013/g, ",")
    .replace(/[\u{1F499}\u{2764}\u{FE0F}\u{1FA7A}\u{1F497}\u{1F496}\u{1F495}]/gu, "");
}

// ─── Chart renderer ───────────────────────────────────────────────────────────
interface ChartData { type: "bar" | "radar"; title: string; labels: string[]; values: number[]; max: number; }
function parseCharts(text: string): { text?: string; chart?: ChartData }[] {
  const segs: { text?: string; chart?: ChartData }[] = [];
  const re = /\[CHART:([\s\S]*?\})\]/g; let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ text: text.slice(last, m.index) });
    try { segs.push({ chart: JSON.parse(m[1]) }); } catch { segs.push({ text: m[0] }); }
    last = re.lastIndex;
  }
  if (last < text.length) segs.push({ text: text.slice(last) });
  return segs;
}

function ENSChart({ data }: { data: ChartData }) {
  const cd = data.labels.map((l, i) => ({ name: l.length > 10 ? l.slice(0, 9) + "…" : l, fullName: l, value: data.values[i] ?? 0 }));
  return (
    <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "1rem", marginTop: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}><BarChart2 size={14} color="#6366f1" /><p style={{ fontWeight: 700, fontSize: "0.82rem", color: "#1e293b", margin: 0 }}>{data.title}</p></div>
      {data.type === "radar" ? (
        <ResponsiveContainer width="100%" height={200}><RadarChart data={cd}><PolarGrid stroke="#f1f5f9" /><PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} /><Radar name="Score" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} /><Tooltip formatter={v => [`${v}/${data.max}`, "Score"]} /></RadarChart></ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={190}><BarChart data={cd} barSize={30}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} /><YAxis domain={[0, data.max]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={18} /><Tooltip cursor={{ fill: "#f8fafc" }} formatter={(v, _, p) => [`${v}/${data.max}`, p.payload?.fullName ?? ""]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.78rem" }} /><Bar dataKey="value" radius={[5, 5, 0, 0]} fill="#6366f1" label={{ position: "top", fontSize: 10, fill: "#6366f1", fontWeight: 700 }} /></BarChart></ResponsiveContainer>
      )}
      <p style={{ fontSize: "0.68rem", color: "#94a3b8", textAlign: "center", marginTop: 4, margin: "4px 0 0" }}>Scores out of {data.max} — SAARTHI</p>
    </div>
  );
}

// ─── Clinical analysis section renderer ───────────────────────────────────────
const SECTION_META: Record<string, { color: string; icon: string; bg: string; border: string }> = {
  "clinical summary": { color: "#6366f1", icon: "🩺", bg: "#f5f3ff", border: "#ede9fe" },
  "symptom": { color: "#ef4444", icon: "📊", bg: "#fef2f2", border: "#fecaca" },
  "attention": { color: "#f97316", icon: "⚠️", bg: "#fff7ed", border: "#fed7aa" },
  "precaution": { color: "#0ea5e9", icon: "🛡️", bg: "#f0f9ff", border: "#bae6fd" },
  "treatment": { color: "#10b981", icon: "💊", bg: "#f0fdf4", border: "#a7f3d0" },
  "urgent": { color: "#dc2626", icon: "🚨", bg: "#fef2f2", border: "#fca5a5" },
  "encouraging": { color: "#6366f1", icon: "💙", bg: "#eff6ff", border: "#bfdbfe" },
  "closing": { color: "#6366f1", icon: "💙", bg: "#eff6ff", border: "#bfdbfe" },
  "default": { color: "#64748b", icon: "📋", bg: "#f8fafc", border: "#e2e8f0" },
};

function getSectionMeta(heading: string) {
  const h = heading.toLowerCase();
  for (const [key, val] of Object.entries(SECTION_META)) {
    if (key !== "default" && h.includes(key)) return val;
  }
  return SECTION_META["default"];
}

function parseInlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} style={{ color: "#0f172a", fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i} style={{ color: "#475569", fontStyle: "italic" }}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} style={{ background: "#f1f5f9", color: "#6366f1", padding: "1px 5px", borderRadius: 4, fontSize: "0.82em", fontFamily: "monospace" }}>{part.slice(1, -1)}</code>;
    return part;
  });
}

function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listOrdered = false;

  const flushList = (k: number | string) => {
    if (!listItems.length) return;
    const Tag = listOrdered ? "ol" : "ul";
    nodes.push(
      <Tag key={`list-${k}`} style={{ margin: "4px 0 6px", paddingLeft: listOrdered ? 22 : 18, display: "flex", flexDirection: "column", gap: 3 }}>
        {listItems.map((item, j) => (
          <li key={j} style={{ fontSize: "0.87rem", lineHeight: 1.65, color: "#1e293b" }}>{parseInlineMarkdown(item)}</li>
        ))}
      </Tag>
    );
    listItems = [];
  };

  lines.forEach((line, idx) => {
    const blank = line.trim() === "";
    const h3m = line.match(/^###\s+(.+)/);
    const h2m = !h3m && line.match(/^##\s+(.+)/);
    const h1m = !h3m && !h2m && line.match(/^#\s+(.+)/);
    const ulm = line.match(/^[-*•]\s+(.*)/);
    const olm = !ulm && line.match(/^\d+\.\s+(.*)/);

    if (blank) {
      flushList(idx);
      nodes.push(<div key={`sp-${idx}`} style={{ height: 6 }} />);
    } else if (h3m) {
      flushList(idx);
      nodes.push(<div key={idx} style={{ fontSize: "0.78rem", fontWeight: 700, color: "#334155", margin: "8px 0 3px", lineHeight: 1.3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{parseInlineMarkdown(h3m[1])}</div>);
    } else if (h2m) {
      flushList(idx);
      nodes.push(<div key={idx} style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a", margin: "10px 0 4px", lineHeight: 1.3, borderBottom: "1px solid #f1f5f9", paddingBottom: 3 }}>{parseInlineMarkdown(h2m[1])}</div>);
    } else if (h1m) {
      flushList(idx);
      nodes.push(<div key={idx} style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", margin: "12px 0 5px", lineHeight: 1.3 }}>{parseInlineMarkdown(h1m[1])}</div>);
    } else if (ulm) {
      if (listOrdered && listItems.length) flushList(idx);
      listOrdered = false;
      listItems.push(ulm[1]);
    } else if (olm) {
      if (!listOrdered && listItems.length) flushList(idx);
      listOrdered = true;
      listItems.push(olm[1]);
    } else {
      flushList(idx);
      nodes.push(<p key={idx} style={{ margin: "1px 0", fontSize: "0.87rem", lineHeight: 1.72, color: "#1e293b" }}>{parseInlineMarkdown(line)}</p>);
    }
  });
  flushList("end");
  return <>{nodes}</>;
}

function ClinicalAnalysis({ text }: { text: string }) {
  // Split into sections by numbered headings (e.g., "1. Clinical Summary" or "## Clinical Summary")
  const lines = text.split("\n");
  type Section = { heading: string; items: string[] };
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  let preamble: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match numbered section headings: "1. Title", "**1. Title**", "### 1. Title" etc.
    const headingMatch = trimmed.match(/^(?:\*{0,2}#{0,3}\s*)?(?:\d+\.\s+)([A-Z][^:*\n]+?)(?::|\*{0,2})?$/) ||
      trimmed.match(/^(?:#+\s+)(.+)$/) ||
      trimmed.match(/^\*\*(.+?)\*\*:?$/);

    if (headingMatch && headingMatch[1].length > 3 && headingMatch[1].length < 60) {
      currentSection = { heading: headingMatch[1].replace(/\*+/g, "").trim(), items: [] };
      sections.push(currentSection);
    } else if (currentSection) {
      // Bullet items or plain lines
      const bulletText = trimmed.replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+(?=[a-z])/i, "");
      if (bulletText) currentSection.items.push(bulletText);
    } else {
      preamble.push(trimmed);
    }
  }

  if (sections.length < 2) {
    return <div style={{ fontSize: "0.88rem", color: "#1e293b" }}>{renderMarkdown(text)}</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      {/* Preamble */}
      {preamble.length > 0 && (
        <div style={{ fontSize: "0.88rem", color: "#475569", lineHeight: 1.65 }}>
          {preamble.map((p, i) => <p key={i} style={{ margin: "0 0 4px" }}>{parseInlineMarkdown(stripMarkdown(p))}</p>)}
        </div>
      )}
      {/* Section cards */}
      {sections.map((sec, si) => {
        const meta = getSectionMeta(sec.heading);
        return (
          <div key={si} style={{ borderRadius: 12, background: meta.bg, border: `1.5px solid ${meta.border}`, overflow: "hidden" }}>
            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderBottom: `1px solid ${meta.border}`, background: `${meta.color}10` }}>
              <span style={{ fontSize: "1rem", lineHeight: 1 }}>{meta.icon}</span>
              <span style={{ fontSize: "0.72rem", fontWeight: 800, color: meta.color, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {si + 1}. {sec.heading}
              </span>
            </div>
            {/* Section body */}
            <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
              {sec.items.length === 0 ? null : sec.items.map((item, ii) => (
                <div key={ii} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color, flexShrink: 0, marginTop: 7 }} />
                  <span style={{ fontSize: "0.83rem", color: "#1e293b", lineHeight: 1.6 }}>
                    {parseInlineMarkdown(stripMarkdown(item))}
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

function MsgContent({ content, isUser, isAnalysis }: { content: string; isUser: boolean; isAnalysis?: boolean }) {
  if (isUser) return <span style={{ whiteSpace: "pre-wrap" }}>{content}</span>;
  const segs = parseCharts(content);
  return (
    <>
      {segs.map((s, i) =>
        s.chart ? <ENSChart key={i} data={s.chart} /> :
          isAnalysis && i === 0 ?
            <ClinicalAnalysis key={i} text={s.text ?? ""} /> :
            <div key={i} style={{ fontSize: "0.88rem", lineHeight: 1.75 }}>{renderMarkdown(s.text ?? "")}</div>
      )}
    </>
  );
}

// ─── SVG Arc Score Gauge ──────────────────────────────────────────────────────
function ScoreGauge({ score, max = 35 }: { score: number; max?: number }) {
  const pct = Math.min(score / max, 1);
  const color = score >= 23 ? "#ef4444" : score >= 11 ? "#f59e0b" : "#10b981";
  const label = score >= 23 ? "Severe" : score >= 11 ? "Moderate" : "Stable";
  const R = 52, cx = 70, cy = 74;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const pt = (d: number) => ({ x: +(cx + R * Math.cos(toRad(d))).toFixed(2), y: +(cy + R * Math.sin(toRad(d))).toFixed(2) });
  const startDeg = 150, totalSweep = 240;
  const s = pt(startDeg), e = pt(startDeg + totalSweep), f = pt(startDeg + totalSweep * pct);
  const filledSweep = totalSweep * pct;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={140} height={108} viewBox="0 0 140 108">
        <path d={`M ${s.x} ${s.y} A ${R} ${R} 0 1 1 ${e.x} ${e.y}`}
          fill="none" stroke="#e2e8f0" strokeWidth={11} strokeLinecap="round" />
        {pct > 0.02 && (
          <path d={`M ${s.x} ${s.y} A ${R} ${R} 0 ${filledSweep > 180 ? 1 : 0} 1 ${f.x} ${f.y}`}
            fill="none" stroke={color} strokeWidth={11} strokeLinecap="round"
            style={{ transition: "all 0.9s cubic-bezier(0.4,0,0.2,1)" }} />
        )}
        <text x={cx} y={cy + 6} textAnchor="middle" fill={color} fontSize={28} fontWeight={800} fontFamily="Inter,system-ui,sans-serif">{score}</text>
        <text x={cx} y={cy + 20} textAnchor="middle" fill="#94a3b8" fontSize={10} fontFamily="Inter,system-ui,sans-serif">/ {max}</text>
        <text x={s.x} y={s.y + 13} textAnchor="middle" fill="#cbd5e1" fontSize={8}>0</text>
        <text x={e.x} y={e.y + 13} textAnchor="middle" fill="#cbd5e1" fontSize={8}>{max}</text>
      </svg>
      <span style={{ fontSize: "0.68rem", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: -4 }}>{label}</span>
    </div>
  );
}

// ─── Severity pill constants ──────────────────────────────────────────────────
const SEV_PILLS = [
  { label: "Mild", color: "#10b981", bg: "#f0fdf4" },
  { label: "Moderate", color: "#f59e0b", bg: "#fffbeb" },
  { label: "Severe", color: "#ef4444", bg: "#fef2f2" },
];

// ─── Single animated question card ───────────────────────────────────────────
function QuestionCard({ label, color, Icon, question, options, value, onAnswer, isActive, index }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      style={{ background: "white", borderRadius: 16, padding: "1rem", border: value >= 0 ? `2px solid ${color}55` : "1.5px solid #000", boxShadow: isActive ? `0 4px 20px ${color}20` : "0 1px 4px rgba(0,0,0,0.05)", transition: "box-shadow 0.3s, border-color 0.3s" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <motion.div animate={{ scale: isActive ? 1.1 : 1 }} transition={{ duration: 0.3 }}
          style={{ width: 32, height: 32, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={15} color={color} />
        </motion.div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: "0.58rem", fontWeight: 700, color: "white", background: color, borderRadius: 4, padding: "1px 7px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{index + 1} / 7</span>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
          </div>
          <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e293b", margin: 0, lineHeight: 1.35 }}>{question}</p>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {options.map((opt: string, oi: number) => {
          const sev = SEV_PILLS[oi] ?? SEV_PILLS[2];
          const sel = value === oi;
          return (
            <motion.button key={oi} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
              onClick={() => onAnswer(oi)}
              style={{ padding: "9px 12px 9px 14px", borderRadius: 10, border: `1.5px solid ${sel ? color : "#e2e8f0"}`, background: sel ? `${color}12` : "#fafbfc", color: sel ? color : "#475569", fontSize: "0.82rem", fontWeight: sel ? 700 : 500, cursor: "pointer", textAlign: "left", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${sel ? color : "#cbd5e1"}`, background: sel ? color : "transparent", flexShrink: 0, transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {sel && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "white" }} />}
              </div>
              <span style={{ flex: 1 }}>{opt}</span>
              <span style={{ fontSize: "0.6rem", fontWeight: 700, color: sev.color, background: sev.bg, border: `1px solid ${sev.color}44`, borderRadius: 5, padding: "1px 6px", flexShrink: 0 }}>{sev.label}</span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Welcome ──────────────────────────────────────────────────────────────────
const WELCOME: Msg = {
  role: "assistant",
  content: `👋 Hello, I'm Dr. Aria — your ENS specialist.

I know that living with Empty Nose Syndrome can feel incredibly isolating, and that many patients struggle to feel heard. I'm here to change that.

Complete today's check-in on the left — answer each question honestly, and I'll give you a detailed clinical analysis with charts, precautions, and personalised suggestions.

For deeper research on latest ENS treatments, use the Deep Research mode (the microscope button).

How I track your health:
🟢 Stable  🟡 Drift  🔴 Escalation  ⚪ No Data

I'm here for you.`,
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  // ready = true only when we have confirmed the user is logged in
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<"doctor" | "patient" | null>(null);
  const [userName, setUserName] = useState("");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>(Object.fromEntries(CORE_QUESTIONS.map(q => [q.key, -1])));
  const [followupAnswer, setFollowupAnswer] = useState(-1);
  const [tab, setTab] = useState<"chat" | "doctor" | "clinical-ai" | "aria-call">("chat");
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState<DayRecord[]>([]);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [deepMode, setDeepMode] = useState(false);
  const [toolUsed, setToolUsed] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");
  const [dayOfYear, setDayOfYear] = useState(0);
  const [latestDayAnswers, setLatestDayAnswers] = useState<Record<string, number>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const followupQ = FOLLOWUP_QUESTIONS[dayOfYear % 7];
  const totalScore = Object.entries(answers).reduce((s, [, v]) => s + (v >= 0 ? SCORE_MAP[v] : 0), 0);
  const currentQ = CORE_QUESTIONS[step];

  // ONE atomic init — reads localStorage, seeds data, sets all state or redirects
  useEffect(() => {
    const storedRole = localStorage.getItem("saarthi_role") as "doctor" | "patient" | null;
    const storedName = localStorage.getItem("saarthi_user") ?? "";

    if (!storedRole) {
      // Not logged in — go to sign-in immediately
      router.replace("/signin");
      return;
    }

    // Logged in — set everything at once, then mark ready
    setRole(storedRole);
    setUserName(storedName);
    setDayOfYear(Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000));
    if (storedRole === "doctor") setTab("doctor");
    setReady(true);
    seedDemoData();
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps


  // ─── Seed 7-day demo data ────────────────────────────────────────────────────
  function seedDemoData() {
    const KEYS = ["air_sensation", "nasal_dryness", "nasal_burning", "suffocation", "anxiety_score", "humidity_level", "sleep_quality"];
    const SM = [0, 3, 5];
    // Story arc: Escalation → Drift → Stable → Mild today
    const dayProfiles: number[][] = [
      [2, 2, 2, 1, 2, 2, 2], // Day -6: Escalation  (total 33)
      [2, 2, 1, 2, 1, 2, 2], // Day -5: Escalation  (total 31)
      [1, 2, 1, 1, 1, 2, 1], // Day -4: Drift       (total 25)
      [1, 1, 1, 1, 1, 1, 1], // Day -3: Drift       (total 21)
      [0, 1, 1, 0, 1, 1, 0], // Day -2: Stable      (total 12)
      [0, 1, 0, 0, 0, 1, 0], // Day -1: Stable      (total 6)
      [0, 0, 0, 0, 1, 0, 0], // Day  0: Mild today  (total 3)
    ];
    const followupAnswers = [1, 1, 0, 0, 0, 0, 2];
    dayProfiles.forEach((profile, i) => {
      const offset = -(6 - i);
      const date = getDate(offset);
      if (localStorage.getItem(`ens_day_${date}`)) return; // don't overwrite real data
      const answers: Record<string, number> = {};
      KEYS.forEach((k, ki) => { answers[k] = profile[ki]; });
      const total = Object.values(answers).reduce((s, v) => s + SM[v], 0);
      const status = total >= 23 ? "red" : total >= 11 ? "yellow" : "green";
      localStorage.setItem(`ens_day_${date}`, JSON.stringify({ date, answered: true, total, status, answers, followup: followupAnswers[i] }));
    });
  }

  useEffect(() => {
    const hist: DayRecord[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = getDate(-i), raw = localStorage.getItem(`ens_day_${date}`);
      hist.push(raw ? JSON.parse(raw) : { status: "grey", total: 0, answered: false, date });
    }
    setHistory(hist);

    // Load the most recent answered day's per-symptom answers (used by doctor left panel + patientContext)
    const latestAnsweredDay = [...hist].reverse().find(d => d.answered);
    if (latestAnsweredDay) {
      const raw = localStorage.getItem(`ens_day_${latestAnsweredDay.date}`);
      if (raw) { try { setLatestDayAnswers(JSON.parse(raw).answers || {}); } catch { } }
    }

    const todayRaw = localStorage.getItem(`ens_day_${getDate()}`);
    if (todayRaw && JSON.parse(todayRaw).answered) { setSubmitted(true); setStep(8); }
    const yes = localStorage.getItem(`ens_day_${getDate(-1)}`), dayb = localStorage.getItem(`ens_day_${getDate(-2)}`);
    const missed2 = (!yes || !JSON.parse(yes).answered) && (!dayb || !JSON.parse(dayb).answered);
    if (missed2) setTimeout(() => setMessages(p => [...p, { role: "assistant", content: "We haven't heard from you in a couple of days. That's okay — checking in when you're ready is what matters. How are you feeling?" }]), 1500);
  }, []);

  function handleAnswer(oi: number) {
    const key = CORE_QUESTIONS[step].key;
    setAnswers(a => ({ ...a, [key]: oi }));
    // auto-advance after a short delay for smoothness
    setTimeout(() => {
      if (step < 6) setStep(s => s + 1);
      else setStep(7); // go to follow-up
    }, 350);
  }

  function handleFollowupAnswer(oi: number) {
    setFollowupAnswer(oi);
    setTimeout(() => setStep(8), 300);
  }

  function handleSubmit() {
    if (step < 8) return;
    const today = getDate();
    const rec = { status: computeStatus(totalScore, true), total: totalScore, answered: true, date: today, answers, followup: followupAnswer };
    localStorage.setItem(`ens_day_${today}`, JSON.stringify(rec));
    setSubmitted(true);
    setLatestDayAnswers(answers);
    setHistory(p => { const h = [...p]; h[6] = rec as DayRecord; return h; });

    const scoreLines = CORE_QUESTIONS.map(q => `${q.label}: ${answers[q.key] >= 0 ? q.options[answers[q.key]] : 'skipped'} (score ${answers[q.key] >= 0 ? SCORE_MAP[answers[q.key]] : 0}/5)`).join('\n');
    const msg = `Here are my ENS check-in results for today:\n\n${scoreLines}\n\nFollow-up: ${followupQ} — Answer: ${["Yes", "Somewhat", "No"][followupAnswer] ?? 'skipped'}\n\nTotal score: ${totalScore}/35\n\nPlease provide a full detailed doctor's analysis including:\n1. Clinical summary of my symptoms\n2. A bar chart of my scores\n3. Which symptoms need most attention\n4. Practical precautions I should take today\n5. Treatment suggestions\n6. When I should seek urgent care\n7. An encouraging closing note`;
    sendMessage(msg, true);
  }

  function handleReset() {
    setAnswers(Object.fromEntries(CORE_QUESTIONS.map(q => [q.key, -1])));
    setFollowupAnswer(-1); setSubmitted(false); setStep(0);
    localStorage.removeItem(`ens_day_${getDate()}`);
    setHistory(p => { const h = [...p]; h[6] = { status: "grey", total: 0, answered: false, date: getDate() }; return h; });
  }

  const sendMessage = useCallback(async (text: string, forceGroq = false) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text };
    const hist = messages[0] === WELCOME && messages.length === 1 ? [userMsg] : [...messages, userMsg];
    setMessages(p => [...p, userMsg, { role: "assistant", content: "" }]);
    setInput(""); if (textareaRef.current) { textareaRef.current.value = ""; textareaRef.current.style.height = "auto"; }
    setIsLoading(true); setToolUsed(null); setStatusText("");

    const endpoint = (!forceGroq && deepMode) ? "/api/claude-agent" : "/api/chat";
    let content = "";
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: hist.map(m => ({ role: m.role, content: m.content })), mode: "research" }) });
      const reader = res.body!.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim(); if (data === "[DONE]") continue;
          try {
            const p = JSON.parse(data);
            if (p.type === "text") { content += p.content; setMessages(prev => [...prev.slice(0, -1), { role: "assistant", content }]); chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }
            else if (p.type === "tool_call") setToolUsed(p.name);
            else if (p.type === "status") setStatusText(p.text);
          } catch { }
        }
      }
    } catch (err: any) { setMessages(p => [...p.slice(0, -1), { role: "assistant", content: `Connection error: ${err?.message || "Unknown error"}. Make sure the API keys are set in .env.local and the Next.js server is running.` }]); }
    finally { setIsLoading(false); setToolUsed(null); setStatusText(""); chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }
  }, [messages, isLoading, deepMode]);

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }
  function resize(e: React.ChangeEvent<HTMLTextAreaElement>) { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }

  const missedAfterRed = history.length >= 2 && history[5]?.status === "red" && history[6]?.status === "grey";
  const sev = totalScore >= 23 ? { label: "Severe", color: "#ef4444", bg: "#fef2f2" } : totalScore >= 11 ? { label: "Moderate", color: "#f59e0b", bg: "#fffbeb" } : { label: "Mild", color: "#10b981", bg: "#f0fdf4" };

  // Show nothing until auth is resolved — avoids all flicker
  if (!ready) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", fontFamily: "'Inter',system-ui,sans-serif" }}>
      <style>{`
        *{box-sizing:border-box;}body{margin:0;}
        @keyframes bounce3d{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-7px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        textarea:focus{outline:none;}textarea::placeholder{color:#94a3b8;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:10px;}
        nextjs-portal{display:none!important;}
      `}</style>

      {/* Outer gold ring → inner black ring → white content */}
      <div style={{ padding: 4, borderRadius: 28, background: "#c9a84c", boxShadow: "0 0 0 1px #7a5f1a, 0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(201,168,76,0.15)", display: "inline-flex", width: "100%", maxWidth: 1320 }}>
        <div style={{ padding: 4, borderRadius: 24, background: "#000000", width: "100%", display: "flex" }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            style={{ width: "100%", height: "calc(92vh - 16px)", background: "white", borderRadius: 20, display: "flex", overflow: "hidden" }}>

            {/* ── LEFT: CHECK-IN — Patients only ── */}
            {role === "patient" && <div style={{ width: 390, flexShrink: 0, borderRight: "3px solid #000", background: "#fafbfc", display: "flex", flexDirection: "column", overflowY: "auto", border: "3px solid #000", borderRadius: 16, margin: 6 }}>
              {/* Header */}
              <div style={{ padding: "1.25rem", borderBottom: "1.5px solid #000" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg,#3b82f6,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ClipboardCheck size={20} color="white" />
                  </div>
                  <div>
                    <h1 style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.01em" }}>SAARTHI</h1>
                    <p style={{ fontSize: "0.62rem", color: "#64748b", margin: 0, fontStyle: "italic", lineHeight: 1.3 }}>A steady voice when the road feels uncertain</p>
                  </div>
                </div>
                {/* 7-day timeline */}
                <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
                  {history.map((day, i) => (
                    <div key={i} title={`${day.date}: ${STATUS_LABEL[day.status]}`} style={{ flex: 1, textAlign: "center" }}>
                      <motion.div whileHover={{ scale: 1.2 }} style={{ width: "100%", aspectRatio: "1", borderRadius: 8, background: STATUS_COLOR[day.status], marginBottom: 3, opacity: i === 6 ? 1 : 0.6, cursor: "default" }} />
                      <p style={{ fontSize: "0.6rem", color: "#94a3b8", margin: 0, fontWeight: i === 6 ? 700 : 400 }}>{new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)}</p>
                    </div>
                  ))}
                </div>
                {missedAfterRed && <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", fontSize: "0.72rem", color: "#ef4444", fontWeight: 600 }}>⚠️ No follow-up after yesterday's escalation</div>}
                {history.slice(4).every(d => d.status === "grey") && <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 8, background: "#fffbeb", border: "1px solid #fde68a", fontSize: "0.72rem", color: "#f59e0b", fontWeight: 600 }}>🟡 Monitoring Gap — 3+ missed days</div>}
              </div>

              {/* Progress bar */}
              {!submitted && (
                <div style={{ padding: "0.75rem 1.25rem 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>
                    <span>PROGRESS</span>
                    <span>{Math.min(step, 7)}/8 questions</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 4, background: "#f1f5f9", overflow: "hidden" }}>
                    <motion.div animate={{ width: `${(Math.min(step, 7) / 8) * 100}%` }} transition={{ duration: 0.4, type: "spring" }} style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg,#3b82f6,#6366f1)" }} />
                  </div>
                </div>
              )}

              {/* Questions / submitted view */}
              <div style={{ padding: "0.75rem 1rem 1rem", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                {submitted ? (
                  <>
                    {/* Gauge card */}
                    <div style={{ borderRadius: 14, background: sev.bg, border: `1.5px solid ${sev.color}44`, padding: "0.8rem 1rem 0.6rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <p style={{ fontSize: "0.58rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>Today's ENS Score</p>
                      <ScoreGauge score={totalScore} />
                      <p style={{ fontWeight: 800, fontSize: "0.88rem", color: sev.color, margin: "2px 0 0", textAlign: "center" }}>{STATUS_LABEL[computeStatus(totalScore, true)]}</p>
                    </div>

                    {/* Day-over-day comparison */}
                    {(() => {
                      const prev = history.filter(d => d.answered).at(-2);
                      if (!prev) return null;
                      const delta = totalScore - prev.total;
                      const isWorse   = delta > 2;
                      const isBetter  = delta < -2;
                      const dc = isWorse ? "#ef4444" : isBetter ? "#10b981" : "#f59e0b";
                      const arrow = isWorse ? "↑" : isBetter ? "↓" : "→";
                      const label = isWorse
                        ? `${delta > 0 ? "+" : ""}${delta}pts vs last check-in — symptoms worsened`
                        : isBetter
                        ? `${delta}pts vs last check-in — symptoms improved`
                        : "On par with last check-in";
                      return (
                        <div style={{ padding: "7px 12px", borderRadius: 8, background: `${dc}10`, border: `1px solid ${dc}44`, display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: "0.88rem", color: dc }}>{arrow}</span>
                          <div>
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: dc }}>{label}</span>
                            <div style={{ fontSize: "0.62rem", color: "#94a3b8", marginTop: 1 }}>
                              Today {totalScore}/35 · Previous {prev.total}/35
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <p style={{ fontSize: "0.68rem", color: "#10b981", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "2px 0 0", display: "flex", alignItems: "center", gap: 5 }}>
                      <CheckCircle2 size={12} /> Check-in complete — see analysis in chat
                    </p>
                    {CORE_QUESTIONS.map(q => {
                      const ai = answers[q.key];
                      const sc = ai >= 0 ? SCORE_MAP[ai] : -1;
                      const scColor = sc >= 5 ? "#ef4444" : sc >= 3 ? "#f59e0b" : sc >= 0 ? "#10b981" : "#94a3b8";
                      return (
                        <div key={q.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderRadius: 8, background: "white", border: "1.5px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><q.Icon size={12} color={q.color} /><span style={{ fontSize: "0.75rem", color: "#64748b" }}>{q.label}</span></div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: "0.68rem", color: "#94a3b8", fontStyle: "italic" }}>{ai >= 0 ? q.options[ai] : "—"}</span>
                            {sc >= 0 && <span style={{ fontSize: "0.65rem", fontWeight: 800, color: scColor, background: `${scColor}15`, border: `1px solid ${scColor}44`, borderRadius: 4, padding: "1px 5px" }}>{sc}/5</span>}
                          </div>
                        </div>
                      );
                    })}
                    <button onClick={handleReset} style={{ marginTop: 8, padding: "0.6rem", border: "1.5px solid #000", borderRadius: 10, background: "white", color: "#64748b", fontSize: "0.78rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <RefreshCw size={12} /> Redo Today's Check-in
                    </button>
                  </>
                ) : (
                  <AnimatePresence mode="wait">
                    {step <= 6 && currentQ && (
                      <QuestionCard key={step} label={currentQ.label} color={currentQ.color} Icon={currentQ.Icon} question={currentQ.question} options={currentQ.options} value={answers[currentQ.key]} onAnswer={handleAnswer} isActive={true} index={step} />
                    )}
                    {step === 7 && (
                      <motion.div key="followup" initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
                        style={{ background: "white", borderRadius: 16, padding: "1rem", border: "1.5px solid #000", boxShadow: "0 4px 20px #6366f120" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: "0.6rem", background: "#ede9fe", color: "#6366f1", borderRadius: 4, padding: "2px 8px", fontWeight: 700 }}>DAILY EXTRA</span>
                        </div>
                        <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e293b", margin: "6px 0 12px", lineHeight: 1.4 }}>{followupQ}</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {["Yes", "Somewhat", "No"].map((opt, oi) => (
                            <motion.button key={oi} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => handleFollowupAnswer(oi)}
                              style={{ padding: "9px 14px", borderRadius: 10, border: "1.5px solid", borderColor: followupAnswer === oi ? "#6366f1" : "#e2e8f0", background: followupAnswer === oi ? "#ede9fe" : "#fafbfc", color: followupAnswer === oi ? "#6366f1" : "#475569", fontSize: "0.82rem", fontWeight: followupAnswer === oi ? 700 : 500, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${followupAnswer === oi ? "#6366f1" : "#cbd5e1"}`, background: followupAnswer === oi ? "#6366f1" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {followupAnswer === oi && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "white" }} />}
                              </div>
                              {opt}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                    {step === 8 && !submitted && (
                      <motion.div key="submit" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ padding: "1rem", borderRadius: 14, background: "linear-gradient(135deg,#eff6ff,#f5f3ff)", border: "1.5px solid #000", textAlign: "center" }}>
                          <CheckCircle2 size={32} color="#6366f1" style={{ margin: "0 auto 8px" }} />
                          <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b", margin: 0 }}>All questions answered!</p>
                          <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 4 }}>Score so far: {totalScore}/35 — {sev.label}</p>
                        </div>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSubmit} disabled={isLoading}
                          style={{ width: "100%", padding: "1rem", background: "linear-gradient(135deg,#3b82f6,#6366f1)", color: "white", border: "none", borderRadius: 14, fontSize: "0.92rem", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(99,102,241,0.4)" }}>
                          {isLoading ? "Analyzing…" : "⚡ Submit & Get Dr. Aria's Analysis"}
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            </div>}

            {/* ── LEFT: DOCTOR SUMMARY PANEL ── */}
            {role === "doctor" && (
              <div style={{ width: 300, flexShrink: 0, background: "#080808", display: "flex", flexDirection: "column", border: "2px solid #c9a84c", borderRadius: 16, margin: 6, overflow: "hidden" }}>
                {/* Header */}
                <div style={{ padding: "1.1rem 1.2rem 0.9rem", borderBottom: "1px solid #c9a84c33" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg,#1a1500,#2a2000)", border: "2px solid #c9a84c", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Activity size={17} color="#c9a84c" />
                    </div>
                    <div>
                      <h1 style={{ fontSize: "0.88rem", fontWeight: 800, color: "#c9a84c", margin: 0, letterSpacing: "-0.01em" }}>SAARTHI</h1>
                      <p style={{ fontSize: "0.58rem", color: "#a09070", margin: 0, fontStyle: "italic" }}>Clinical Monitoring Dashboard</p>
                    </div>
                  </div>
                  {/* Latest patient state */}
                  {(() => {
                    const latest = history.filter(d => d.answered).at(-1);
                    if (!latest) return <div style={{ padding: "10px 12px", borderRadius: 10, background: "#1a1a2e", border: "1.5px solid #64748b", fontSize: "0.72rem", color: "#64748b", textAlign: "center" }}>⚪ No check-in data yet</div>;
                    const c = latest.status === "red" ? "#ef4444" : latest.status === "yellow" ? "#f59e0b" : latest.status === "green" ? "#10b981" : "#64748b";
                    const bg = latest.status === "red" ? "#2d0808" : latest.status === "yellow" ? "#2d1f00" : latest.status === "green" ? "#052e1c" : "#1a1a2e";
                    const prev = history.filter(d => d.answered).at(-2);
                    const trend = prev ? (latest.total > prev.total + 2 ? { label: "↑ Worsening", color: "#ef4444" } : latest.total < prev.total - 2 ? { label: "↓ Improving", color: "#10b981" } : { label: "→ Stable", color: "#f59e0b" }) : null;
                    return (
                      <div style={{ padding: "10px 12px", borderRadius: 10, background: bg, border: `1.5px solid ${c}` }}>
                        <div style={{ fontSize: "0.56rem", fontWeight: 700, color: "#a09070", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Latest Check-in</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.82rem", fontWeight: 800, color: c }}>
                            {latest.status === "green" ? "🟢 Stable" : latest.status === "yellow" ? "🟡 Monitoring" : latest.status === "red" ? "🔴 Escalation" : "⚪ No Data"}
                          </span>
                          <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "#c9a84c" }}>
                            {latest.total}<span style={{ fontSize: "0.6rem", color: "#a09070" }}>/35</span>
                          </span>
                        </div>
                        {trend && <div style={{ marginTop: 4, fontSize: "0.62rem", fontWeight: 700, color: trend.color }}>{trend.label} vs previous day</div>}
                      </div>
                    );
                  })()}
                </div>

                {/* 7-day timeline */}
                <div style={{ padding: "0.85rem 1.2rem", borderBottom: "1px solid #c9a84c22" }}>
                  <div style={{ fontSize: "0.56rem", fontWeight: 700, color: "#c9a84c", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>7-Day Patient Timeline</div>
                  <div style={{ display: "flex", gap: 3 }}>
                    {history.map((d, i) => {
                      const dotColor = d.status === "red" ? "#ef4444" : d.status === "yellow" ? "#f59e0b" : d.status === "green" ? "#10b981" : "#222";
                      return (
                        <div key={i} style={{ flex: 1, textAlign: "center" }}>
                          <div style={{ width: "100%", aspectRatio: "1", borderRadius: 4, background: dotColor, opacity: i === 6 ? 1 : 0.6, border: i === 6 ? "1px solid #c9a84c" : "1px solid #333", marginBottom: 3 }} title={`${d.date}: ${d.answered ? `Score ${d.total}/35` : "No data"}`} />
                          <div style={{ fontSize: "0.5rem", color: "#6b5e40" }}>{new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Per-symptom profile */}
                <div style={{ padding: "0.85rem 1.2rem", flex: 1, overflowY: "auto" }}>
                  <div style={{ fontSize: "0.56rem", fontWeight: 700, color: "#c9a84c", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Symptom Profile</div>
                  {CORE_QUESTIONS.map(q => {
                    const score = latestDayAnswers[q.key] >= 0 ? SCORE_MAP[latestDayAnswers[q.key]] : 0;
                    const scoreColor = score >= 5 ? "#ef4444" : score >= 3 ? "#f59e0b" : score > 0 ? "#10b981" : "#2a2a2a";
                    const borderColor = score >= 5 ? "#ef4444" : score >= 3 ? "#f59e0b" : score > 0 ? "#10b981" : "#222";
                    return (
                      <div key={q.key} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", borderBottom: "1px solid #c9a84c12" }}>
                        <q.Icon size={10} color={q.color} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: "0.7rem", color: "#f5f0e8", flex: 1, lineHeight: 1 }}>{q.label}</span>
                        <div style={{ display: "flex", gap: 2 }}>
                          {[1, 2, 3, 4, 5].map(pip => (
                            <div key={pip} style={{ width: 6, height: 6, borderRadius: 1, background: pip <= score ? scoreColor : "#1a1a1a", border: `1px solid ${pip <= score ? borderColor : "#2a2a2a"}` }} />
                          ))}
                        </div>
                        <span style={{ fontSize: "0.62rem", fontWeight: 700, color: score > 0 ? scoreColor : "#3a3a3a", minWidth: 22, textAlign: "right" }}>{score}/5</span>
                      </div>
                    );
                  })}
                </div>

                {/* Quick actions */}
                <div style={{ padding: "0.7rem 1.2rem", borderTop: "1px solid #c9a84c22", display: "flex", gap: 6 }}>
                  <button onClick={() => setTab("aria-call")} style={{ flex: 1, padding: "0.5rem", borderRadius: 8, border: "1px solid #c9a84c55", background: "#1a1500", color: "#c9a84c", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, transition: "all 0.15s" }}>
                    <Phone size={10} /> Call Patient
                  </button>
                  <button onClick={() => setTab("clinical-ai")} style={{ flex: 1, padding: "0.5rem", borderRadius: 8, border: "1px solid #6366f155", background: "#0e0e1a", color: "#818cf8", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, transition: "all 0.15s" }}>
                    <MessageSquare size={10} /> AI Chat
                  </button>
                </div>
              </div>
            )}

            {/* ── RIGHT: CHAT / DASHBOARD ── */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Tab header */}
              <div style={{ padding: "0.75rem 1.5rem", borderBottom: "1.5px solid #000", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 4, background: "#f8fafc", borderRadius: 12, padding: 4 }}>
                  {/* Patients: Chat + Aria Call. Doctors: Doctor View + Clinical AI + Aria Call */}
                  {role === "patient" && (
                    <>
                      <button onClick={() => setTab("chat")}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 9, border: "none", background: tab === "chat" ? "white" : "transparent", color: tab === "chat" ? "#1e293b" : "#94a3b8", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", boxShadow: tab === "chat" ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>
                        <MessageSquare size={13} /> Chat
                      </button>
                      <button onClick={() => setTab("aria-call")}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 9, border: "none", background: tab === "aria-call" ? "#0d1218" : "transparent", color: tab === "aria-call" ? "#4aeaaa" : "#94a3b8", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", boxShadow: tab === "aria-call" ? "0 1px 4px rgba(0,0,0,0.12)" : "none", transition: "all 0.15s" }}>
                        <Phone size={13} /> Aria Call
                      </button>
                    </>
                  )}
                  {role === "doctor" && (
                    <>
                      <button onClick={() => setTab("doctor")}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 9, border: "none", background: tab === "doctor" ? "white" : "transparent", color: tab === "doctor" ? "#1e293b" : "#94a3b8", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", boxShadow: tab === "doctor" ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>
                        <Activity size={13} /> Doctor View
                      </button>
                      <button onClick={() => setTab("clinical-ai")}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 9, border: "none", background: tab === "clinical-ai" ? "white" : "transparent", color: tab === "clinical-ai" ? "#6366f1" : "#94a3b8", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", boxShadow: tab === "clinical-ai" ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>
                        <MessageSquare size={13} /> Clinical AI
                      </button>
                      <button onClick={() => setTab("aria-call")}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 9, border: "none", background: tab === "aria-call" ? "#0d1218" : "transparent", color: tab === "aria-call" ? "#4aeaaa" : "#94a3b8", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", boxShadow: tab === "aria-call" ? "0 1px 4px rgba(0,0,0,0.12)" : "none", transition: "all 0.15s" }}>
                        <Phone size={13} /> Aria Call
                      </button>
                    </>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {/* User name badge */}
                  {userName && (
                    <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: role === "doctor" ? "#6366f1" : "#10b981", display: "inline-block" }} />
                      {userName}
                    </div>
                  )}
                  {(toolUsed || statusText) && <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.72rem", color: "#6366f1", background: "#eff6ff", padding: "3px 10px", borderRadius: 20, border: "1px solid #e0e7ff" }}><Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />{statusText || "Searching…"}</div>}
                  {role === "patient" && (
                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => setDeepMode(d => !d)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${deepMode ? "#6366f1" : "#e2e8f0"}`, background: deepMode ? "#eff6ff" : "white", color: deepMode ? "#6366f1" : "#64748b", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                      <Microscope size={13} />{deepMode ? "Deep Research ON" : "Deep Research"}
                    </motion.button>
                  )}
                  {/* Sign out */}
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { localStorage.removeItem("saarthi_role"); localStorage.removeItem("saarthi_user"); router.replace("/signin"); }}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 20, border: "1.5px solid #e2e8f0", background: "white", color: "#94a3b8", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                    Sign Out
                  </motion.button>
                </div>
              </div>

              {/* Doctor dashboard */}
              {role === "doctor" && tab === "doctor" && (
                <DoctorDashboard answers={answers} latestDayAnswers={latestDayAnswers} history={history} submitted={submitted} />
              )}

              {/* Doctor Clinical AI tab — full chat panel */}
              {role === "doctor" && tab === "clinical-ai" && (
                <DoctorChat
                  patientContext={[
                    "Patient 7-Day History (oldest → newest):",
                    ...history.map(d => `  ${d.date}: ${STATUS_LABEL[d.status]} — Score ${d.total}/35${!d.answered ? " (no data)" : ""}`),
                    "",
                    "Latest Symptom Scores:",
                    ...CORE_QUESTIONS.map(q => `  ${q.label}: ${latestDayAnswers[q.key] >= 0 ? SCORE_MAP[latestDayAnswers[q.key]] : 0}/5 — ${latestDayAnswers[q.key] >= 0 ? q.options[latestDayAnswers[q.key]] : "no data"}`),
                    "",
                    `Total: ${CORE_QUESTIONS.reduce((s, q) => s + (latestDayAnswers[q.key] >= 0 ? SCORE_MAP[latestDayAnswers[q.key]] : 0), 0)}/35`,
                  ].join("\n")}
                  fullPage
                />
              )}

              {/* Aria Call tab — available for both patient and doctor */}
              {tab === "aria-call" && (
                <div style={{ flex: 1, overflow: "hidden", padding: "6px", background: "#080c0f", borderRadius: 16, margin: "6px 6px 6px 0" }}>
                  <AriaCallPanel />
                </div>
              )}

              {/* Chat — only for patient role */}
              {role === "patient" && tab === "chat" && (
                <>
                  <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", border: "3px solid #000", borderRadius: 16, margin: "6px 6px 0", background: "#fff" }}>
                    <AnimatePresence initial={false}>
                      {messages.map((msg, i) => {
                        const isUser = msg.role === "user";
                        const isEmpty = !msg.content && isLoading && i === messages.length - 1;
                        // Detect if this is the clinical analysis response (assistant msg after check-in submission)
                        const prevMsg = messages[i - 1];
                        const isAnalysis = !isUser && !!prevMsg && prevMsg.role === "user" &&
                          prevMsg.content.includes("ENS check-in results");
                        return (
                          <motion.div key={i} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.25 }}
                            style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                            <div style={{ maxWidth: isUser ? "70%" : isAnalysis ? "96%" : "88%", padding: isAnalysis ? "0.75rem" : "1rem 1.125rem", borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: isUser ? "linear-gradient(135deg,#3b82f6,#2563eb)" : isAnalysis ? "transparent" : "#f8fafc", color: isUser ? "white" : "#1e293b", border: isUser ? "none" : isAnalysis ? "none" : "1.5px solid #000", boxShadow: isUser ? "0 4px 14px rgba(37,99,235,0.25)" : isAnalysis ? "none" : "0 1px 3px rgba(0,0,0,0.04)", fontSize: "0.88rem", lineHeight: 1.75, wordBreak: "break-word" }}>
                              {isEmpty ? <div style={{ display: "flex", gap: 4, padding: "4px 0" }}>{[0, 1, 2].map(k => <motion.div key={k} animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.2, delay: k * 0.2 }} style={{ width: 7, height: 7, borderRadius: "50%", background: "#94a3b8" }} />)}</div>
                                : <MsgContent content={msg.content} isUser={isUser} isAnalysis={isAnalysis} />}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input bar — only in chat tab */}
                  <div style={{ padding: "1rem 1.25rem", borderTop: "1.5px solid #000", background: "white", flexShrink: 0 }}>
                    {deepMode && <div style={{ marginBottom: 8, padding: "6px 12px", borderRadius: 10, background: "linear-gradient(135deg,#eff6ff,#faf5ff)", border: "1px solid #e0e7ff", fontSize: "0.72rem", color: "#6366f1", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><Microscope size={12} />Deep Research mode — using Claude Opus</div>}
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, background: "#f8fafc", borderRadius: 16, border: "3px solid #000", padding: "0.625rem 0.625rem 0.625rem 1rem" }}>
                      <textarea ref={textareaRef} value={input} onChange={resize} onKeyDown={handleKey} disabled={isLoading}
                        placeholder={deepMode ? "Ask Dr. Aria anything for deep ENS research…" : "Ask about ENS, request a chart, or describe your symptoms…"} rows={1}
                        style={{ flex: 1, border: "none", background: "transparent", resize: "none", fontSize: "0.92rem", color: "#0f172a", lineHeight: 1.55, minHeight: 28, maxHeight: 120, fontFamily: "inherit", padding: "6px 0", cursor: isLoading ? "not-allowed" : "text" }} />
                      <button onClick={() => sendMessage(input)} disabled={!input.trim() || isLoading}
                        style={{ width: 40, height: 40, borderRadius: 12, border: "none", background: !input.trim() || isLoading ? "#f1f5f9" : deepMode ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "linear-gradient(135deg,#3b82f6,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", cursor: !input.trim() || isLoading ? "not-allowed" : "pointer", flexShrink: 0, transition: "all 0.2s", boxShadow: input.trim() && !isLoading ? "0 3px 10px rgba(37,99,235,0.35)" : "none" }}>
                        {isLoading ? <Loader2 size={17} color="#94a3b8" style={{ animation: "spin 1s linear infinite" }} /> : <Send size={17} color={!input.trim() ? "#94a3b8" : "white"} />}
                      </button>
                    </div>
                    <p style={{ fontSize: "0.68rem", color: "#cbd5e1", textAlign: "center", marginTop: 6 }}>Enter to send · Shift+Enter for new line · {deepMode ? "Claude Opus active" : "Groq Llama 3.3 active"}</p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
