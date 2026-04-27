import jsPDF from "jspdf";

// ─── Types & constants ────────────────────────────────────────────────────────
type C3 = [number, number, number];
type SC = Record<string, number>;
const SCORE_MAP = [0, 3, 5];
const W = 210, ML = 11, CW = 188;

const CRIT = [
  { key: "air_sensation", label: "Air Sensation", short: "Air", c: [59, 130, 246] as C3, t: 3 },
  { key: "nasal_dryness", label: "Nasal Dryness", short: "Dryness", c: [249, 115, 22] as C3, t: 3 },
  { key: "nasal_burning", label: "Nasal Burning", short: "Burning", c: [239, 68, 68] as C3, t: 2 },
  { key: "suffocation", label: "Suffocation", short: "Suffoc.", c: [139, 92, 246] as C3, t: 3 },
  { key: "anxiety_score", label: "Anxiety", short: "Anxiety", c: [99, 102, 241] as C3, t: 3 },
  { key: "humidity_level", label: "Humidity Level", short: "Humidity", c: [14, 165, 233] as C3, t: 3 },
  { key: "sleep_quality", label: "Sleep Quality", short: "Sleep", c: [100, 116, 139] as C3, t: 2 },
];

const BOUNDS: Record<string, [string, string]> = {
  air_sensation: ["Normal airflow perception", "Complete absence of airflow"],
  nasal_dryness: ["Adequately moistened", "Severe desiccation, bleeding risk"],
  nasal_burning: ["No burning", "Continuous neuropathic burning"],
  suffocation: ["No paradoxical suffocation", "Persistent suffocation despite open airway"],
  anxiety_score: ["No distress", "Panic attacks & avoidance behaviour"],
  humidity_level: ["Adequate humidification", "Cannot tolerate any environment"],
  sleep_quality: ["Sleep unaffected", "Severe nightly disruption & insomnia"],
};

const CLINICAL: Record<string, string> = {
  air_sensation: "Paradoxical airflow absent sensation is the hallmark of ENS. Therapy centres on nasal implants or CBT-based retraining.",
  nasal_dryness: "Mucosal desiccation leads to crusting and epistaxis. Saline irrigation 3-4× daily and humidity control are essential.",
  nasal_burning: "Neuropathic burning suggests mucosal atrophy or nerve damage. Topical vitamin E oil and ENT review are indicated.",
  suffocation: "Paradoxical suffocation indicates severe central processing dysfunction. Head elevation 30° and breathing retraining are recommended.",
  anxiety_score: "ENS-related anxiety is a recognised comorbidity. Diaphragmatic breathing and ENS-specialist psychological support are key.",
  humidity_level: "Environmental sensitivity requires indoor humidity 45-55%. A HEPA humidifier in the bedroom makes a measurable difference.",
  sleep_quality: "Sleep disruption compounds ENS severity. Avoiding overhead AC, using a chin strap if needed, and consistent sleep hygiene are critical.",
};

const TIPS = [
  { w: (s: SC) => s.nasal_dryness >= 3, t: "ACTION", tx: "Use a saline nasal spray 3-4 times daily to maintain mucosal moisture and prevent crusting." },
  { w: (s: SC) => s.nasal_burning >= 2, t: "WARNING", tx: "Nasal burning suggests mucosal atrophy. Avoid dry environments and use a cool-mist humidifier." },
  { w: (s: SC) => s.air_sensation >= 3, t: "TIP", tx: "Pursed-lip breathing or a damp cloth near the nose can help stimulate an airflow sensation." },
  { w: (s: SC) => s.suffocation >= 3, t: "WARNING", tx: "Paradoxical suffocation is core ENS. Elevate head 30° during sleep and avoid supine position." },
  { w: (s: SC) => s.anxiety_score >= 3, t: "ACTION", tx: "Diaphragmatic breathing and ENS-aware CBT are strongly recommended for anxiety management." },
  { w: (s: SC) => s.humidity_level >= 3, t: "TIP", tx: "Maintain indoor humidity 45-55%. A bedroom humidifier makes a measurable difference." },
  { w: (s: SC) => s.sleep_quality >= 2, t: "ACTION", tx: "Elevate head 30°; avoid overhead air conditioning during sleep to reduce disruption." },
  { w: (s: SC) => s.anxiety_score >= 4 && s.suffocation >= 4, t: "URGENT", tx: "Combined severe anxiety and suffocation indicate acute distress. Discuss ENS counselling with your ENT immediately." },
  { w: (s: SC) => Object.values(s).reduce((a, b) => a + b, 0) >= 23, t: "URGENT", tx: "Total score is in the severe range. Specialist ENS consultation is strongly advised within 2 weeks." },
];

// ─── Severity helper ──────────────────────────────────────────────────────────
function sev(t: number) {
  if (t >= 30) return { l: "Maximum", c: [127, 29, 29] as C3, b: [220, 38, 38] as C3 };
  if (t >= 23) return { l: "Severe", c: [185, 28, 28] as C3, b: [239, 68, 68] as C3 };
  if (t >= 18) return { l: "Mod-Severe", c: [154, 52, 18] as C3, b: [249, 115, 22] as C3 };
  if (t >= 11) return { l: "Moderate", c: [146, 64, 14] as C3, b: [245, 158, 11] as C3 };
  if (t >= 6) return { l: "Mild", c: [4, 120, 87] as C3, b: [16, 185, 129] as C3 };
  return { l: "Subclinical", c: [51, 65, 85] as C3, b: [100, 116, 139] as C3 };
}

// ─── jsPDF helpers ────────────────────────────────────────────────────────────
function fill(d: jsPDF, c: C3) { d.setFillColor(...c); }
function draw(d: jsPDF, c: C3, lw = 0.25) { d.setDrawColor(...c); d.setLineWidth(lw); }
function txt(d: jsPDF, c: C3, sz: number, bold = false) { d.setTextColor(...c); d.setFontSize(sz); d.setFont("helvetica", bold ? "bold" : "normal"); }
function rr(d: jsPDF, x: number, y: number, w: number, h: number, r = 2, s: "F" | "S" | "FD" = "F") { d.roundedRect(x, y, w, h, r, r, s); }

function arcLine(d: jsPDF, cx: number, cy: number, r: number, a0: number, a1: number, lw: number, col: C3) {
  d.setLineWidth(lw); draw(d, col);
  const steps = Math.max(10, Math.round(Math.abs(a1 - a0) / 3));
  for (let i = 1; i <= steps; i++) {
    const pa = (a0 + (a1 - a0) * (i - 1) / steps) * Math.PI / 180;
    const ca = (a0 + (a1 - a0) * i / steps) * Math.PI / 180;
    d.line(cx + r * Math.cos(pa), cy + r * Math.sin(pa), cx + r * Math.cos(ca), cy + r * Math.sin(ca));
  }
}

function footer(d: jsPDF, total: number, date: string) {
  const n = d.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    d.setPage(p);
    fill(d, [10, 15, 30]); d.rect(0, 284, W, 13, "F");
    // Accent bar
    fill(d, [79, 70, 229]); d.rect(0, 284, 4, 13, "F");
    txt(d, [71, 85, 105], 6);
    d.text("ENS Intelligent Agent  |  Dr. Aria AI Clinical Report  |  For monitoring purposes only", ML + 6, 290.5);
    d.text(`Page ${p}/${n}  •  ${date}  •  Total: ${total}/35`, W - ML, 290.5, { align: "right" });
  }
}

// ─── Circular gauge ───────────────────────────────────────────────────────────
function circleGauge(d: jsPDF, cx: number, cy: number, score: number, max: number, col: C3, label: string) {
  const pct = score / max, trackR = 10;
  // Track
  arcLine(d, cx, cy, trackR, -220, -40 + 0.01, 3.5, [220, 230, 240]);
  // Fill
  arcLine(d, cx, cy, trackR, -220, -220 + pct * 260, 3.2, col);
  // Centre text
  txt(d, col, 10, true); d.text(`${score}`, cx, cy + 1.5, { align: "center" });
  txt(d, [170, 180, 195], 5); d.text(`/${max}`, cx, cy + 5.5, { align: "center" });
  // Label below
  txt(d, [80, 90, 110], 5.5, true); d.text(label, cx, cy + trackR + 6, { align: "center" });
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export async function generateENSReport(
  answers: SC,
  history: { status: string; total: number; answered: boolean; date: string }[]
) {
  const sc: SC = Object.fromEntries(CRIT.map(c => [c.key, answers[c.key] >= 0 ? SCORE_MAP[answers[c.key]] : 0]));
  const total = Object.values(sc).reduce((a, b) => a + b, 0);
  const sv = sev(total);
  const flagged = CRIT.filter(c => sc[c.key] >= c.t).length;
  const pct = total / 35;
  const tips = TIPS.filter(t => t.w(sc));
  if (!tips.length) tips.push({ w: () => true, t: "TIP", tx: "Scores are in a manageable range. Continue nasal hygiene and humidity control." });
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let Y = 0;

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 1 — HEADER + SCORE OVERVIEW
  // ════════════════════════════════════════════════════════════════════════════

  // ── Deep navy header bg ──
  fill(doc, [8, 12, 28]); doc.rect(0, 0, W, 70, "F");

  // Diagonal stripes (opaque decoration)
  doc.setGState(doc.GState({ opacity: 0.05 }));
  fill(doc, [255, 255, 255]);
  for (let i = 0; i < 8; i++) { const bx = W - 40 + i * 14; doc.triangle(bx, 0, bx + 60, 0, bx - 12, 70, "F"); }
  doc.setGState(doc.GState({ opacity: 1 }));

  // Left accent bars (multi-colour)
  fill(doc, [79, 70, 229]); doc.rect(0, 0, 4, 70, "F");
  fill(doc, [56, 189, 248]); doc.rect(4, 0, 2, 70, "F");

  // Brand row
  txt(doc, [99, 102, 241], 7.5, true); doc.setCharSpace(2.5);
  doc.text("ENS INTELLIGENT AGENT", ML + 8, 12); doc.setCharSpace(0);

  // Title
  txt(doc, [255, 255, 255], 20, true); doc.text("Patient Assessment Report", ML + 8, 26);

  // Date + sub
  txt(doc, [56, 189, 248], 8.5); doc.text(date, ML + 8, 34);
  txt(doc, [100, 116, 139], 7); doc.text("Generated by Dr. Aria — ENS Specialist AI", ML + 8, 41);

  // Severity pill (top-right area)
  const SX = W - ML - 52, SY = 5;
  // Glow effect: outer soft rect
  doc.setGState(doc.GState({ opacity: 0.25 }));
  fill(doc, sv.b); rr(doc, SX - 3, SY - 3, 58, 30, 8, "F");
  doc.setGState(doc.GState({ opacity: 1 }));
  fill(doc, sv.b); rr(doc, SX, SY, 52, 22, 5, "F");
  txt(doc, [255, 255, 255], 6, true); doc.setCharSpace(1.2);
  doc.text("SEVERITY", SX + 26, SY + 7, { align: "center" }); doc.setCharSpace(0);
  txt(doc, [255, 255, 255], 10, true); doc.text(sv.l, SX + 26, SY + 16, { align: "center" });

  // Score gauge (arc)
  const GX = W - ML - 26, GY = 50;
  arcLine(doc, GX, GY, 12, -215, -35, 4.5, [25, 35, 55]);
  arcLine(doc, GX, GY, 12, -215, -215 + pct * 252, 4.2, sv.b);
  txt(doc, sv.b, 14, true); doc.text(`${total}`, GX, GY + 2.5, { align: "center" });
  txt(doc, [100, 116, 139], 6.5); doc.text("/ 35", GX, GY + 7.5, { align: "center" });
  txt(doc, [80, 100, 120], 6); doc.text("ENS Score", GX, GY + 13, { align: "center" });

  // ── Severity gradient strip ──
  let sx = 0;
  ([[14, [100, 116, 139]], [28, [16, 185, 129]], [48, [245, 158, 11]], [65, [249, 115, 22]], [100, [239, 68, 68]]] as [number, C3][])
    .forEach(([end, col]) => { fill(doc, col); doc.rect(sx, 70, (end - sx) / 100 * W, 4, "F"); sx = end / 100 * W; });
  const dotX = pct * W;
  fill(doc, [255, 255, 255]); doc.circle(dotX, 72, 2.5, "F");
  fill(doc, sv.b); doc.circle(dotX, 72, 1.7, "F");
  // Tick labels
  txt(doc, [100, 116, 139], 5);
  ["0", "Mild", "Moderate", "Severe", "35"].forEach((lbl, i) => {
    const positions = [0, 14 / 100 * W, 48 / 100 * W, 65 / 100 * W, W];
    doc.text(lbl, positions[i], 79, { align: i === 4 ? "right" : "left" });
  });
  Y = 84;

  // ── 3-column summary cards ──
  const cW = (CW - 8) / 3, gap = 4;
  [[0, sv.b], [1, [flagged > 3 ? 220 : 16, flagged > 3 ? 38 : 185, flagged > 3 ? 38 : 129] as C3], [2, [79, 70, 229] as C3]].forEach(([idx, col]) => {
    const cx = ML + (idx as number) * (cW + gap);
    fill(doc, [255, 255, 255]); rr(doc, cx, Y, cW, 34, 3, "F");
    draw(doc, [220, 230, 240]); rr(doc, cx, Y, cW, 34, 3, "S");
    // Coloured top border
    fill(doc, col as C3); doc.rect(cx, Y, cW, 2, "F");
  });

  // Card 1 – Total Score
  txt(doc, [148, 163, 184], 6, true); doc.text("TOTAL ENS SCORE", ML + 3, Y + 9);
  txt(doc, sv.c, 22, true); doc.text(`${total}`, ML + 3, Y + 22);
  const tw = doc.getTextWidth(`${total}`);
  txt(doc, [200, 210, 225], 9); doc.text("/35", ML + 4 + tw, Y + 22);
  fill(doc, [235, 240, 248]); rr(doc, ML + 3, Y + 25, cW - 6, 3.5, 1.5, "F");
  fill(doc, sv.b); rr(doc, ML + 3, Y + 25, (cW - 6) * pct, 3.5, 1.5, "F");
  txt(doc, sv.c, 7.5, true); doc.text(sv.l, ML + 3, Y + 32);

  // Card 2 – Criteria flagged with coloured dots
  const c2x = ML + cW + gap;
  txt(doc, [148, 163, 184], 6, true); doc.text("PARAMETERS FLAGGED", c2x + 3, Y + 9);
  const fc: C3 = [flagged > 3 ? 220 : 16, flagged > 3 ? 38 : 185, flagged > 3 ? 38 : 129];
  txt(doc, fc, 22, true); doc.text(`${flagged}`, c2x + 3, Y + 22);
  const twf = doc.getTextWidth(`${flagged}`); txt(doc, [200, 210, 225], 9); doc.text("/7", c2x + 4 + twf, Y + 22);
  CRIT.forEach((c, i) => {
    fill(doc, sc[c.key] >= c.t ? c.c : [220, 230, 240]); doc.circle(c2x + 5 + i * 6.5, Y + 27, 2.5, "F");
  });
  txt(doc, [100, 116, 139], 7); doc.text(`${flagged} of 7 above clinical threshold`, c2x + 3, Y + 32);

  // Card 3 – Severity tiers
  const c3x = ML + (cW + gap) * 2;
  txt(doc, [148, 163, 184], 6, true); doc.text("SEVERITY TIERS", c3x + 3, Y + 9);
  ([[0, "Subclinical", [100, 116, 139]], [6, "Mild", [16, 185, 129]], [11, "Moderate", [245, 158, 11]],
  [18, "Mod-Severe", [249, 115, 22]], [23, "Severe", [239, 68, 68]]] as [number, string, C3][])
    .forEach(([, label, cc], i) => {
      const active = sv.l.includes(label.split("-")[0]);
      const ry = Y + 11 + i * 4;
      if (active) { fill(doc, cc); rr(doc, c3x + 2, ry - 2.5, cW - 4, 4, 1.2, "F"); doc.setGState(doc.GState({ opacity: 0.15 })); doc.setGState(doc.GState({ opacity: 1 })); }
      fill(doc, cc); doc.circle(c3x + 5, ry, 1.3, "F");
      txt(doc, active ? cc : [140, 155, 170], 7, active); doc.text(label, c3x + 9, ry + 0.5);
    });
  Y += 39;

  // ── Symptom score bars — full detail table ──
  fill(doc, [79, 70, 229]); doc.rect(ML, Y, 3, 9, "F");
  txt(doc, [15, 23, 42], 12, true); doc.text("Symptom Score Analysis", ML + 6, Y + 7);
  txt(doc, [148, 163, 184], 7); doc.text("Each parameter scored 0 (none) – 5 (maximum severity)  |  Flagged = above clinical threshold", ML + 6, Y + 13);
  Y += 17;

  const BAR_X = ML + 54, BAR_W = 100, SC_X = ML + 160;
  CRIT.forEach((c, i) => {
    const score = sc[c.key], fl = score >= c.t;
    // Row bg
    fill(doc, i % 2 === 0 ? [248, 250, 252] as C3 : [255, 255, 255] as C3); doc.rect(ML, Y, CW, 13, "F");
    // Left accent stripe if flagged
    if (fl) { fill(doc, c.c); doc.rect(ML, Y, 2, 13, "F"); }
    // Name + status
    txt(doc, fl ? c.c : [30, 41, 59], 8.5, fl); doc.text(c.label, ML + 4, Y + 5);
    if (fl) {
      txt(doc, c.c, 5.5, true);
      fill(doc, c.c); doc.setGState(doc.GState({ opacity: 0.12 }));
      fill(doc, c.c); doc.setGState(doc.GState({ opacity: 0.12 }));
      doc.rect(ML + 4, Y + 6.5, 26, 4, "F"); doc.setGState(doc.GState({ opacity: 1 }));
      txt(doc, c.c, 5.5, true); doc.text("ABOVE THRESHOLD", ML + 5, Y + 10);
    } else {
      txt(doc, [160, 170, 185], 5.5); doc.text("Within range", ML + 4, Y + 10);
    }
    // Bar track
    fill(doc, [235, 240, 250]); rr(doc, BAR_X, Y + 3.5, BAR_W, 4.5, 2, "F");
    // Bar fill (segmented glow effect)
    if (score > 0) {
      // Base fill
      fill(doc, fl ? c.c : [16, 185, 129] as C3); rr(doc, BAR_X, Y + 3.5, BAR_W * (score / 5), 4.5, 2, "F");
      // Sheen
      doc.setGState(doc.GState({ opacity: 0.3 }));
      fill(doc, [255, 255, 255]); rr(doc, BAR_X, Y + 3.5, BAR_W * (score / 5) * 0.5, 2.2, 1, "F");
      doc.setGState(doc.GState({ opacity: 1 }));
    }
    // Tick marks at 1,2,3,4
    [1, 2, 3, 4].forEach(t => { const tx = BAR_X + BAR_W * (t / 5); draw(doc, [180, 190, 200], 0.3); doc.line(tx, Y + 3.5, tx, Y + 8); });
    // Bound labels
    const [lb, ub] = BOUNDS[c.key];
    txt(doc, [160, 170, 185], 5.2); doc.text(`0: ${lb}`, BAR_X, Y + 12, { maxWidth: (BAR_W / 2) - 2 });
    doc.text(`5: ${ub}`, BAR_X + BAR_W, Y + 12, { align: "right", maxWidth: (BAR_W / 2) - 2 });
    // Score number
    txt(doc, fl ? c.c : [120, 135, 155], 15, true); doc.text(`${score}`, SC_X + 8, Y + 8, { align: "center" });
    txt(doc, [190, 200, 210], 6.5); doc.text("/5", SC_X + 14, Y + 8);
    Y += 13;
  });
  Y += 2;

  // Dark summary stripe
  fill(doc, [10, 15, 30]); doc.rect(ML, Y, CW, 9, "F");
  fill(doc, [79, 70, 229]); doc.rect(ML, Y, 3, 9, "F");
  txt(doc, [255, 255, 255], 7.5, true);
  doc.text(`Total: ${total}/35  |  Severity: ${sv.l}  |  Flagged: ${flagged}/7  |  ${date}`, ML + 5, Y + 6);
  Y += 12;

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 2 — CIRCULAR GAUGES + 7-DAY TREND
  // ════════════════════════════════════════════════════════════════════════════
  doc.addPage(); Y = 14;

  // ── Section: individual gauges ──
  fill(doc, [245, 158, 11]); doc.rect(ML, Y, 3, 9, "F");
  txt(doc, [15, 23, 42], 12, true); doc.text("Parameter Gauge Overview", ML + 6, Y + 7);
  txt(doc, [148, 163, 184], 7); doc.text("Circular severity gauges for all 7 ENS parameters — filled arc shows score proportional to maximum", ML + 6, Y + 13);
  Y += 18;

  // Draw 7 gauges in a row
  const gaugeSpacing = CW / 7;
  CRIT.forEach((c, i) => {
    const score = sc[c.key];
    const col: C3 = score >= c.t ? c.c : (score >= c.t / 2 ? [245, 158, 11] : [16, 185, 129]);
    const gx = ML + gaugeSpacing * (i + 0.5);
    // Gauge bg card
    fill(doc, [255, 255, 255]); rr(doc, gx - 13, Y - 2, 26, 34, 3, "F");
    draw(doc, [220, 230, 242]); rr(doc, gx - 13, Y - 2, 26, 34, 3, "S");
    // Coloured border top
    fill(doc, c.c); doc.rect(gx - 13, Y - 2, 26, 1.5, "F");
    circleGauge(doc, gx, Y + 14, score, 5, col, c.short);
  });
  Y += 40;

  // ── 7-day trend chart ──
  fill(doc, [16, 185, 129]); doc.rect(ML, Y, 3, 9, "F");
  txt(doc, [15, 23, 42], 12, true); doc.text("7-Day Score Trend", ML + 6, Y + 7);
  txt(doc, [148, 163, 184], 7); doc.text("Daily total ENS score with severity reference bands and area fill", ML + 6, Y + 13);
  Y += 17;

  fill(doc, [255, 255, 255]); rr(doc, ML, Y, CW, 55, 3, "F");
  draw(doc, [220, 230, 240]); rr(doc, ML, Y, CW, 55, 3, "S");

  const CH = 40, CX = ML + 14, CYB = Y + 8 + CH, CRW = CW - 22;

  // Severity reference bands
  ([[6 / 35, [16, 185, 129], 0.06, "Mild"], [22 / 35, [245, 158, 11], 0.06, "Moderate"], [29 / 35, [239, 68, 68], 0.06, "Severe"]] as [number, C3, number, string][])
    .forEach(([pr, col, op, lbl]) => {
      const ry = CYB - (pr as number) * CH;
      // Thin band
      doc.setGState(doc.GState({ opacity: op as number }));
      fill(doc, col); doc.rect(CX, ry, CRW, CH * (pr as number < 0.5 ? 0.1 : 0.06), "F");
      doc.setGState(doc.GState({ opacity: 1 }));
      doc.setLineDashPattern([2, 2], 0); draw(doc, col, 0.3); doc.line(CX, ry, CX + CRW, ry);
      doc.setLineDashPattern([], 0);
      txt(doc, col, 5.5, true); doc.text(lbl as string, CX + CRW + 2, ry + 1.5);
    });

  // Y-axis labels
  [0, 10, 20, 30].forEach(v => {
    const ry = CYB - (v / 35) * CH;
    draw(doc, [210, 220, 230], 0.2); doc.line(CX, ry, CX + CRW, ry);
    txt(doc, [160, 170, 185], 5.5); doc.text(`${v}`, CX - 3, ry + 1.5, { align: "right" });
  });

  // Axes
  draw(doc, [200, 210, 220], 0.4); doc.line(CX, CYB - CH, CX, CYB); doc.line(CX, CYB, CX + CRW, CYB);

  const pts = history.map((d, i) => ({
    x: CX + (i / Math.max(history.length - 1, 1)) * CRW,
    y: d.answered ? CYB - (d.total / 35) * CH : null,
    total: d.total,
    col: ({ green: [16, 185, 129], yellow: [245, 158, 11], red: [239, 68, 68], grey: [200, 210, 220] } as Record<string, C3>)[d.status] || [200, 210, 220] as C3,
    day: new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }),
    dm: new Date(d.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  // Area fill under line
  const anspts = pts.filter(p => p.y !== null);
  // Area fill: draw filled polygon by tracing outline with individual segments
  const polyPts = [
    { x: anspts[0].x, y: CYB },
    ...anspts.map(p => ({ x: p.x, y: p.y! })),
    { x: anspts[anspts.length - 1].x, y: CYB },
  ];
  for (let pi = 0; pi < polyPts.length - 1; pi++) {
    doc.line(polyPts[pi].x, polyPts[pi].y, polyPts[pi + 1].x, polyPts[pi + 1].y);
  }
  doc.setGState(doc.GState({ opacity: 1 }));

  // Line segments
  draw(doc, [79, 70, 229], 1.2);
  for (let i = 1; i < pts.length; i++) {
    if (pts[i - 1].y !== null && pts[i].y !== null) doc.line(pts[i - 1].x, pts[i - 1].y!, pts[i].x, pts[i].y!);
  }
  // Dots + labels
  pts.forEach(p => {
    if (p.y !== null) {
      fill(doc, [255, 255, 255]); doc.circle(p.x, p.y!, 2, "F");
      fill(doc, p.col); doc.circle(p.x, p.y!, 1.4, "F");
      txt(doc, [79, 70, 229], 6, true); doc.text(`${p.total}`, p.x, p.y! - 3.5, { align: "center" });
    } else {
      fill(doc, [210, 220, 230]); doc.circle(p.x, CYB - CH / 2, 1.4, "F");
    }
    txt(doc, [140, 155, 170], 5.5); doc.text(p.dm, p.x, CYB + 5.5, { align: "center" });
  });

  // Legend
  ([["#10b981", "Stable"], ["#f59e0b", "Monitoring"], ["#ef4444", "Escalation"], ["#e2e8f0", "No Data"]] as [string, string][]).forEach(([col, lbl], i) => {
    const lx = ML + i * 48, ly = Y + 57;
    doc.setFillColor(col); doc.circle(lx + 3, ly - 1, 2, "F");
    txt(doc, [100, 116, 139], 5.5); doc.text(lbl, lx + 7, ly);
  });
  Y += 62;

  // ── Radar spider chart ──
  fill(doc, [139, 92, 246]); doc.rect(ML, Y, 3, 9, "F");
  txt(doc, [15, 23, 42], 12, true); doc.text("ENS Symptom Radar Profile", ML + 6, Y + 7);
  Y += 14;

  const RCw = 90, STw = CW - RCw - 5;
  fill(doc, [255, 255, 255]); rr(doc, ML, Y, RCw, 72, 3, "F"); draw(doc, [220, 230, 240]); rr(doc, ML, Y, RCw, 72, 3, "S");
  const rcx = ML + 45, rcy = Y + 38, rr2 = 28;

  // Concentric rings
  [0.25, 0.5, 0.75, 1].forEach(f => {
    const rp = CRIT.map((_, i) => { const a = (i / 7) * 2 * Math.PI - Math.PI / 2; return { x: rcx + Math.cos(a) * rr2 * f, y: rcy + Math.sin(a) * rr2 * f }; });
    draw(doc, [215, 225, 240], 0.25);
    for (let i = 0; i < rp.length; i++) { const n = rp[(i + 1) % rp.length]; doc.line(rp[i].x, rp[i].y, n.x, n.y); }
  });
  CRIT.forEach((_, i) => { const a = (i / 7) * 2 * Math.PI - Math.PI / 2; draw(doc, [215, 225, 240], 0.2); doc.line(rcx, rcy, rcx + Math.cos(a) * rr2, rcy + Math.sin(a) * rr2); });

  // Radar fill (subtle)
  const rpts = CRIT.map((c, i) => { const a = (i / 7) * 2 * Math.PI - Math.PI / 2, r = (sc[c.key] / 5) * rr2; return { x: rcx + Math.cos(a) * r, y: rcy + Math.sin(a) * r }; });
  doc.setGState(doc.GState({ opacity: 0.15 }));
  fill(doc, [79, 70, 229]);
  // Radar fill: shade each triangle from centre to edge
  rpts.forEach((pt, i) => {
    const nxt = rpts[(i + 1) % rpts.length];
    draw(doc, [79, 70, 229], 0.4);
    doc.line(rcx, rcy, pt.x, pt.y);
    doc.line(pt.x, pt.y, nxt.x, nxt.y);
    doc.line(nxt.x, nxt.y, rcx, rcy);
  });
  doc.setGState(doc.GState({ opacity: 1 }));
  // Radar outline
  draw(doc, [79, 70, 229], 0.9);
  for (let i = 0; i < rpts.length; i++) { const n = rpts[(i + 1) % rpts.length]; doc.line(rpts[i].x, rpts[i].y, n.x, n.y); }
  // Coloured dots
  CRIT.forEach((c, i) => {
    if (sc[c.key] > 0) { fill(doc, c.c); draw(doc, [255, 255, 255], 0.5); doc.circle(rpts[i].x, rpts[i].y, 1.8, "FD"); }
  });
  // Axis labels
  CRIT.forEach((c, i) => {
    const a = (i / 7) * 2 * Math.PI - Math.PI / 2, lx = rcx + Math.cos(a) * (rr2 + 10), ly = rcy + Math.sin(a) * (rr2 + 10);
    txt(doc, [100, 116, 139], 5); doc.text(c.short, lx, ly, { align: "center" });
  });

  // Score table card (right of radar)
  const stx = ML + RCw + 5;
  fill(doc, [255, 255, 255]); rr(doc, stx, Y, STw, 72, 3, "F"); draw(doc, [220, 230, 240]); rr(doc, stx, Y, STw, 72, 3, "S");
  txt(doc, [148, 163, 184], 5.5, true);
  doc.text("PARAMETER", stx + 3, Y + 7); doc.text("SCORE", stx + STw - 24, Y + 7);
  draw(doc, [230, 238, 248], 0.3); doc.line(stx + 3, Y + 9, stx + STw - 3, Y + 9);
  CRIT.forEach((c, i) => {
    const score = sc[c.key], fl = score >= c.t;
    const ry = Y + 13 + i * 7.8;
    if (fl) {
      doc.setGState(doc.GState({ opacity: 0.08 })); fill(doc, c.c); doc.rect(stx, ry - 5, STw, 7.8, "F");
      doc.setGState(doc.GState({ opacity: 1 }));
    }
    txt(doc, fl ? c.c : [40, 55, 75], 7.5, fl); doc.text(c.label, stx + 4, ry);
    fill(doc, [235, 242, 250]); rr(doc, stx + 45, ry - 4.5, STw - 55, 4, 1.5, "F");
    if (score > 0) { fill(doc, fl ? c.c : [16, 185, 129] as C3); rr(doc, stx + 45, ry - 4.5, (STw - 55) * (score / 5), 4, 1.5, "F"); }
    txt(doc, fl ? c.c : [155, 170, 190], 9.5, true); doc.text(`${score}`, stx + STw - 3, ry, { align: "right" });
    if (fl) { txt(doc, c.c, 5, true); doc.text("▲", stx + STw - 3, ry + 3.5, { align: "right" }); }
  });
  Y += 76;

  // ════════════════════════════════════════════════════════════════════════════
  // PAGE 3 — CLINICAL ANALYSIS CARDS + SUGGESTIONS
  // ════════════════════════════════════════════════════════════════════════════
  doc.addPage(); Y = 14;

  // ── Per-symptom Deep Analysis cards ──
  fill(doc, [59, 130, 246]); doc.rect(ML, Y, 3, 9, "F");
  txt(doc, [15, 23, 42], 12, true); doc.text("Clinical Deep Analysis — Per Parameter", ML + 6, Y + 7);
  txt(doc, [148, 163, 184], 7); doc.text("Detailed clinical interpretation and bounds reference for each of the 7 ENS parameters", ML + 6, Y + 13);
  Y += 18;

  const cPerRow = 2, cardW = (CW - 5) / cPerRow;
  CRIT.forEach((c, i) => {
    if (i > 0 && i % cPerRow === 0) Y += 33;
    const score = sc[c.key], fl = score >= c.t;
    const col = fl ? c.c : [16, 185, 129] as C3;
    const cx = ML + (i % cPerRow) * (cardW + 5);
    const [lb, ub] = BOUNDS[c.key];

    if (Y + 33 > 272) { doc.addPage(); Y = 14; }

    // Card bg
    fill(doc, [255, 255, 255]); rr(doc, cx, Y, cardW, 33, 3, "F");
    draw(doc, fl ? c.c : [215, 225, 238], fl ? 0.5 : 0.25); rr(doc, cx, Y, cardW, 33, 3, "S");
    // Top colour block
    fill(doc, col);
    doc.setGState(doc.GState({ opacity: 0.1 }));
    doc.rect(cx, Y, cardW, 7, "F");
    doc.setGState(doc.GState({ opacity: 1 }));
    fill(doc, col); doc.rect(cx, Y, 3, 33, "F");

    // Header
    txt(doc, col, 7.5, true); doc.text(c.label, cx + 6, Y + 5.5);
    if (fl) {
      fill(doc, col); rr(doc, cx + cardW - 22, Y + 1, 20, 5, 2, "F");
      txt(doc, [255, 255, 255], 5.5, true); doc.text("FLAGGED", cx + cardW - 12, Y + 4.5, { align: "center" });
    }

    // Score bar
    fill(doc, [225, 235, 248]); rr(doc, cx + 4, Y + 9, cardW - 8, 4.5, 2, "F");
    if (score > 0) { fill(doc, col); rr(doc, cx + 4, Y + 9, (cardW - 8) * (score / 5), 4.5, 2, "F"); }
    txt(doc, col, 9, true); doc.text(`${score}/5`, cx + cardW - 4, Y + 13.5, { align: "right" });

    // Clinical text
    const clinLines = doc.splitTextToSize(CLINICAL[c.key], cardW - 10) as string[];
    txt(doc, [60, 75, 95], 6.5);
    clinLines.slice(0, 2).forEach((l, li) => doc.text(l, cx + 4, Y + 18 + li * 4));

    // Bounds
    txt(doc, [14, 185, 129], 5.5); doc.text(`Best: ${lb}`, cx + 4, Y + 29);
    txt(doc, [239, 68, 68], 5.5); doc.text(`Worst: ${ub}`, cx + cardW - 4, Y + 29, { align: "right" });
  });
  Y += 36;

  // ── Personalised clinical suggestions ──
  if (Y > 235) { doc.addPage(); Y = 14; }
  fill(doc, [99, 102, 241]); doc.rect(ML, Y, 3, 9, "F");
  txt(doc, [15, 23, 42], 12, true); doc.text("Personalised Clinical Suggestions", ML + 6, Y + 7);
  txt(doc, [148, 163, 184], 7); doc.text("Evidence-based recommendations derived from your check-in scores — prioritised by urgency", ML + 6, Y + 13);
  Y += 17;

  const TC: { [k: string]: { bg: C3, border: C3, txt: C3, icon: string } } = {
    ACTION: { bg: [239, 246, 255], border: [147, 197, 253], txt: [29, 78, 216], icon: "→" },
    WARNING: { bg: [255, 247, 237], border: [253, 186, 116], txt: [194, 65, 12], icon: "⚠" },
    TIP: { bg: [240, 253, 244], border: [110, 231, 183], txt: [5, 150, 105], icon: "✓" },
    URGENT: { bg: [255, 241, 242], border: [252, 165, 165], txt: [185, 28, 28], icon: "!" },
  };

  tips.forEach(tip => {
    const tc = TC[tip.t] || TC.TIP;
    const lines = doc.splitTextToSize(tip.tx, CW - 30) as string[];
    const ch = lines.length * 4.2 + 12;
    if (Y + ch > 272) { doc.addPage(); Y = 14; }
    // Bg
    fill(doc, tc.bg); rr(doc, ML, Y, CW, ch, 3, "F");
    // Left stripe + icon
    fill(doc, tc.border); doc.rect(ML, Y, 3, ch, "F");
    // Icon circle
    fill(doc, tc.txt);
    doc.setGState(doc.GState({ opacity: 0.15 })); doc.circle(ML + 11, Y + ch / 2, 5, "F");
    doc.setGState(doc.GState({ opacity: 1 }));
    txt(doc, tc.txt, 9, true); doc.text(tc.icon, ML + 11, Y + ch / 2 + 1.5, { align: "center" });
    // Type tag
    txt(doc, tc.txt, 6, true); doc.text(tip.t, ML + 20, Y + 7);
    // Body text
    txt(doc, [30, 41, 59], 8); lines.forEach((l, i) => doc.text(l, ML + 20, Y + 6 + i * 4.2 + 4));
    Y += ch + 4;
  });
  Y += 4;

  // ── Bounds reference grid ──
  if (Y > 235) { doc.addPage(); Y = 14; }
  fill(doc, [217, 119, 6]); doc.rect(ML, Y, 3, 9, "F");
  txt(doc, [15, 23, 42], 12, true); doc.text("Clinical Bounds Reference", ML + 6, Y + 7);
  txt(doc, [148, 163, 184], 7); doc.text("Each parameter's position relative to clinical lower (0) and upper (5) bounds", ML + 6, Y + 13);
  Y += 17;

  const bCW = (CW - 5) / 2;
  CRIT.forEach((c, i) => {
    if (i > 0 && i % 2 === 0) Y += 27;
    const bx = ML + (i % 2 === 0 ? 0 : bCW + 5);
    const score = sc[c.key], fl = score >= c.t;
    const [lb, ub] = BOUNDS[c.key];
    if (Y + 27 > 272) { doc.addPage(); Y = 14; }
    fill(doc, [255, 255, 255]); rr(doc, bx, Y, bCW, 25, 2, "F");
    draw(doc, fl ? c.c : [215, 225, 238], fl ? 0.5 : 0.2); rr(doc, bx, Y, bCW, 25, 2, "S");
    if (fl) { fill(doc, c.c); doc.rect(bx, Y, 2.5, 25, "F"); }
    txt(doc, fl ? c.c : [40, 55, 75], 8.5, fl); doc.text(c.label, bx + 5, Y + 6.5);
    txt(doc, fl ? c.c : [148, 163, 184], 13, true); doc.text(`${score}`, bx + bCW - 5, Y + 10, { align: "right" });
    txt(doc, [195, 205, 218], 6.5); doc.text("/5", bx + bCW - 5, Y + 15, { align: "right" });
    fill(doc, [230, 238, 250]); rr(doc, bx + 4, Y + 12, bCW - 10, 3.5, 1.5, "F");
    if (score > 0) { fill(doc, fl ? c.c : [16, 185, 129] as C3); rr(doc, bx + 4, Y + 12, Math.max((bCW - 10) * (score / 5), 0.5), 3.5, 1.5, "F"); }
    txt(doc, [14, 150, 100], 5.8); doc.text(`0: ${lb}`, bx + 4, Y + 20.5, { maxWidth: (bCW - 8) / 2 - 2 });
    txt(doc, [180, 50, 50], 5.8); doc.text(`5: ${ub}`, bx + bCW - 4, Y + 20.5, { align: "right", maxWidth: (bCW - 8) / 2 - 2 });
  });

  // ── Footer on all pages ──
  footer(doc, total, date);
  doc.save(`ENS_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}
