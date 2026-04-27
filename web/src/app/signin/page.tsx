"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Stethoscope, User, Eye, EyeOff, ArrowRight, ArrowLeft,
    ShieldCheck, HeartPulse, Lock, Mail, IdCard,
} from "lucide-react";

// ─── Theme ───────────────────────────────────────────────────────────────────
const G = {
    gold: "#c9a84c",
    goldLight: "#8a5e00",
    goldDim: "#c9a84c22",
    black: "#000000",
    bg: "#ffffff",
    card: "#ffffff",         // content box is now white
    cardAlt: "#f8f6f0",
    border: "2px solid #c9a84c",
    text: "#111111",         // dark text on white
    textMuted: "#6b5e3a",
};

// ─── Types ───────────────────────────────────────────────────────────────────
type Role = "doctor" | "patient" | null;
type Screen = "role" | "form";

// ─── Role Card ───────────────────────────────────────────────────────────────
function RoleCard({
    role, selected, onSelect, icon: Icon, title, subtitle, features,
}: {
    role: Role; selected: boolean; onSelect: () => void;
    icon: any; title: string; subtitle: string; features: string[];
}) {
    return (
        <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSelect}
            style={{
                flex: 1, cursor: "pointer", borderRadius: 20, padding: "2rem 1.75rem",
                background: selected
                    ? `linear-gradient(145deg, #fffbea, #fff8d6)`
                    : "#fafafa",
                border: selected ? `2px solid ${G.gold}` : `2px solid #e5e5e5`,
                boxShadow: selected
                    ? `0 0 24px ${G.gold}40, 0 0 0 1px ${G.gold}55`
                    : "0 2px 12px rgba(0,0,0,0.08)",
                transition: "all 0.3s",
                position: "relative", overflow: "hidden",
            }}
        >
            {/* Glow top-right corner */}
            {selected && (
                <div style={{
                    position: "absolute", top: -40, right: -40,
                    width: 120, height: 120, borderRadius: "50%",
                    background: `radial-gradient(circle, ${G.gold}30 0%, transparent 70%)`,
                    pointerEvents: "none",
                }} />
            )}

            {/* Icon */}
            <div style={{
                width: 56, height: 56, borderRadius: 16, marginBottom: 20,
                background: selected ? G.goldDim : "#f0f0f0",
                border: selected ? `2px solid ${G.gold}` : "2px solid #ddd",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.3s",
            }}>
                <Icon size={26} color={selected ? G.gold : "#999"} />
            </div>

            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: selected ? G.goldLight : G.text, marginBottom: 6 }}>
                {title}
            </div>
            <div style={{ fontSize: "0.78rem", color: G.textMuted, marginBottom: 20, lineHeight: 1.5 }}>
                {subtitle}
            </div>

            {/* Feature list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {features.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: selected ? G.gold : "#ccc", flexShrink: 0,
                            transition: "background 0.3s",
                        }} />
                        <span style={{ fontSize: "0.74rem", color: selected ? G.gold : "#888" }}>{f}</span>
                    </div>
                ))}
            </div>

            {/* Selected badge */}
            {selected && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                        position: "absolute", top: 14, right: 14,
                        background: G.gold, borderRadius: "50%",
                        width: 22, height: 22, display: "flex",
                        alignItems: "center", justifyContent: "center",
                    }}
                >
                    <ShieldCheck size={13} color="#000" />
                </motion.div>
            )}
        </motion.div>
    );
}

// ─── Input Field ─────────────────────────────────────────────────────────────
function InputField({
    label, type, placeholder, value, onChange, icon: Icon, optional,
}: {
    label: string; type: string; placeholder: string;
    value: string; onChange: (v: string) => void;
    icon: any; optional?: boolean;
}) {
    const [focused, setFocused] = useState(false);
    const [showPwd, setShowPwd] = useState(false);
    const isPassword = type === "password";

    return (
        <div>
            <div style={{
                fontSize: "0.68rem", fontWeight: 700, color: G.gold,
                textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8,
                display: "flex", justifyContent: "space-between",
            }}>
                <span>{label}</span>
                {optional && <span style={{ color: G.textMuted, fontWeight: 400, textTransform: "none" }}>Optional</span>}
            </div>
            <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "#f8f8f8",
                border: focused ? `2px solid ${G.gold}` : "2px solid #e0e0e0",
                borderRadius: 12, padding: "0 14px",
                transition: "border-color 0.2s",
                boxShadow: focused ? `0 0 0 3px ${G.gold}18` : "none",
            }}>
                <Icon size={15} color={focused ? G.gold : "#444"} style={{ flexShrink: 0, transition: "color 0.2s" }} />
                <input
                    type={isPassword && showPwd ? "text" : type}
                    placeholder={placeholder}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    style={{
                        flex: 1, border: "none", background: "transparent",
                        color: "#111", fontSize: "0.88rem",
                        padding: "13px 0", outline: "none", fontFamily: "inherit",
                    }}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPwd(p => !p)}
                        style={{ border: "none", background: "none", cursor: "pointer", padding: 0, color: "#888" }}
                    >
                        {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Main Sign-In Page ────────────────────────────────────────────────────────
export default function SignInPage() {
    const router = useRouter();
    const [screen, setScreen] = useState<Screen>("role");
    const [role, setRole] = useState<Role>(null);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [licenseId, setLicenseId] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // If already signed in, redirect
    useEffect(() => {
        const existing = localStorage.getItem("saarthi_role");
        if (existing) router.replace("/");
    }, [router]);

    function handleContinue() {
        if (!role) { setError("Please select your role to continue."); return; }
        setError("");
        setScreen("form");
    }

    function handleSignIn(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        if (!name.trim()) { setError("Please enter your name."); return; }
        if (!email.trim() || !email.includes("@")) { setError("Please enter a valid email."); return; }
        if (password.length < 4) { setError("Password must be at least 4 characters."); return; }
        if (role === "doctor" && !licenseId.trim()) { setError("Please enter your Medical License ID."); return; }

        setLoading(true);
        // Simulate auth delay — in production, call your API here
        setTimeout(() => {
            localStorage.setItem("saarthi_role", role!);
            localStorage.setItem("saarthi_user", name.trim());
            router.replace("/");
        }, 900);
    }

    return (
        <div style={{
            minHeight: "100vh",
            background: "linear-gradient(135deg, #06080b 0%, #0f1520 50%, #080b12 100%)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "1.5rem", fontFamily: "'Inter', system-ui, sans-serif",
            overflowY: "auto", position: "relative",
        }}>
            {/* Gold grid texture overlay */}
            <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(201,168,76,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.035) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
            <style>{`
        * { box-sizing: border-box; } body { margin: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #888; }
        input:focus { outline: none; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
      `}</style>

            {/* ── Outer double-border wrapper (matches main app) ── */}
            <div style={{ width: "100%", maxWidth: 880, animation: "fadeUp 0.5s ease-out" }}>
                {/* Outer gold → inner black → dark card — matches main app */}
                <div style={{
                    padding: 4, borderRadius: 28,
                    background: G.gold,
                    boxShadow: "0 0 0 1px #7a5f1a, 0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(201,168,76,0.15)",
                }}>
                    <div style={{ padding: 4, borderRadius: 24, background: G.black }}>
                        <div style={{
                            borderRadius: 20, background: G.card,
                            overflow: "hidden",
                        }}>

                            {/* ── Header ── */}
                            <div style={{
                                padding: "2rem 2.5rem 1.5rem",
                                borderBottom: `1.5px solid #e8e0cc`,
                                background: "linear-gradient(180deg, #fffbee 0%, #ffffff 100%)",
                                textAlign: "center",
                            }}>
                                {/* Logo mark */}
                                <div style={{
                                    width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
                                    background: `linear-gradient(135deg, #1a1500, #2a2000)`,
                                    border: `2px solid ${G.gold}`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                }}>
                                    <HeartPulse size={26} color={G.gold} />
                                </div>

                                <h1 style={{
                                    fontSize: "1.75rem", fontWeight: 900, color: "#111",
                                    margin: "0 0 6px", letterSpacing: "-0.03em",
                                }}>SAARTHI</h1>
                                <p style={{
                                    fontSize: "0.78rem", color: G.gold,
                                    margin: 0, fontStyle: "italic", letterSpacing: "0.02em",
                                }}>A steady voice when the road feels uncertain</p>
                            </div>

                            {/* ── Body ── */}
                            <div style={{ padding: "2rem 2.5rem 2.5rem" }}>
                                <AnimatePresence mode="wait">

                                    {/* ═══ SCREEN 1: ROLE SELECTION ═══ */}
                                    {screen === "role" && (
                                        <motion.div key="role"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                                                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: G.gold, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>
                                                    Step 1 of 2
                                                </div>
                                                <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#111", margin: "0 0 6px" }}>
                                                    Who are you signing in as?
                                                </h2>
                                                <p style={{ fontSize: "0.78rem", color: "#888", margin: 0 }}>
                                                    Choose your role to get a personalised experience
                                                </p>
                                            </div>

                                            {/* ENS context callout */}
                                            <div style={{ marginBottom: "1.5rem", padding: "12px 16px", borderRadius: 12, background: "#fffbf0", border: `1.5px solid ${G.gold}55`, display: "flex", gap: 12, alignItems: "flex-start" }}>
                                                <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,#1a1500,#2a2000)`, border: `1.5px solid ${G.gold}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                                                    <HeartPulse size={13} color={G.gold} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: "0.62rem", fontWeight: 700, color: G.gold, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                                                        What is Empty Nose Syndrome (ENS)?
                                                    </div>
                                                    <p style={{ fontSize: "0.73rem", color: "#6b5e3a", margin: 0, lineHeight: 1.6 }}>
                                                        ENS is a rare, iatrogenic condition following nasal turbinate surgery — patients experience paradoxical obstruction despite an open airway. SAARTHI provides AI-powered daily symptom tracking, clinical decision support, and Aria voice calls for ENS patients and their physicians.
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Role cards */}
                                            <div style={{ display: "flex", gap: 16, marginBottom: "2rem" }}>
                                                <RoleCard
                                                    role="doctor"
                                                    selected={role === "doctor"}
                                                    onSelect={() => { setRole("doctor"); setError(""); }}
                                                    icon={Stethoscope}
                                                    title="Doctor"
                                                    subtitle="Clinical monitoring dashboard for your ENS patients"
                                                    features={[
                                                        "Patient state timeline & trends",
                                                        "Body map symptom localisation",
                                                        "AI-powered clinical summaries",
                                                        "Agentic history & analysis",
                                                    ]}
                                                />
                                                <RoleCard
                                                    role="patient"
                                                    selected={role === "patient"}
                                                    onSelect={() => { setRole("patient"); setError(""); }}
                                                    icon={User}
                                                    title="Patient"
                                                    subtitle="Daily ENS check-in and personal health tracking"
                                                    features={[
                                                        "Daily symptom check-in",
                                                        "Dr. Aria AI companion chat",
                                                        "7-day history & progress",
                                                        "Personalised clinical guidance",
                                                    ]}
                                                />
                                            </div>

                                            {error && (
                                                <div style={{ color: "#ef4444", fontSize: "0.78rem", marginBottom: 12, textAlign: "center" }}>
                                                    {error}
                                                </div>
                                            )}

                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={handleContinue}
                                                disabled={!role}
                                                style={{
                                                    width: "100%", padding: "14px",
                                                    borderRadius: 14,
                                                    border: `2px solid ${role ? G.gold : "#ddd"}`,
                                                    background: role
                                                        ? "linear-gradient(135deg, #fffbea, #fff3c4)"
                                                        : "#f5f5f5",
                                                    color: role ? G.goldLight : "#aaa",
                                                    fontSize: "0.92rem", fontWeight: 700,
                                                    cursor: role ? "pointer" : "not-allowed",
                                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                                    transition: "all 0.25s",
                                                    boxShadow: role ? `0 0 20px ${G.gold}20` : "none",
                                                }}
                                            >
                                                Continue as {role === "doctor" ? "Doctor" : role === "patient" ? "Patient" : "…"}
                                                {role && <ArrowRight size={16} />}
                                            </motion.button>
                                        </motion.div>
                                    )}

                                    {/* ═══ SCREEN 2: SIGN-IN FORM ═══ */}
                                    {screen === "form" && (
                                        <motion.div key="form"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            {/* Role badge + back */}
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.75rem" }}>
                                                <button
                                                    onClick={() => { setScreen("role"); setError(""); }}
                                                    style={{
                                                        display: "flex", alignItems: "center", gap: 6,
                                                        background: "none", border: "none",
                                                        color: "#888", fontSize: "0.75rem",
                                                        cursor: "pointer", padding: 0,
                                                    }}
                                                >
                                                    <ArrowLeft size={14} /> Back
                                                </button>

                                                <div style={{
                                                    display: "flex", alignItems: "center", gap: 8,
                                                    padding: "6px 14px", borderRadius: 20,
                                                    background: "#fffbea", border: `1.5px solid ${G.gold}`,
                                                }}>
                                                    {role === "doctor"
                                                        ? <Stethoscope size={13} color={G.gold} />
                                                        : <User size={13} color={G.gold} />}
                                                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: G.gold }}>
                                                        Signing in as {role === "doctor" ? "Doctor" : "Patient"}
                                                    </span>
                                                </div>

                                                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                                                    Step 2 of 2
                                                </div>
                                            </div>

                                            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#111", margin: "0 0 6px" }}>
                                                {role === "doctor" ? "Doctor Sign-In" : "Welcome Back"}
                                            </h2>
                                            <p style={{ fontSize: "0.76rem", color: "#888", margin: "0 0 1.75rem", lineHeight: 1.5 }}>
                                                {role === "doctor"
                                                    ? "Access your patient monitoring dashboard and clinical tools"
                                                    : "Continue your ENS journey with Dr. Aria by your side"}
                                            </p>

                                            <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                                <InputField label="Full Name" type="text" placeholder={role === "doctor" ? "Dr. Jane Smith" : "Your name"} value={name} onChange={setName} icon={User} />
                                                <InputField label="Email Address" type="email" placeholder="you@example.com" value={email} onChange={setEmail} icon={Mail} />
                                                <InputField label="Password" type="password" placeholder="Enter your password" value={password} onChange={setPassword} icon={Lock} />

                                                {/* Doctor-only field */}
                                                {role === "doctor" && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        transition={{ duration: 0.25 }}
                                                    >
                                                        <InputField label="Medical License ID" type="text" placeholder="e.g. MED-2024-XXXX" value={licenseId} onChange={setLicenseId} icon={IdCard} />
                                                    </motion.div>
                                                )}

                                                {error && (
                                                    <div style={{
                                                        padding: "10px 14px", borderRadius: 10,
                                                        background: "#fff5f5", border: "1px solid #f5c6c6",
                                                        color: "#c0392b", fontSize: "0.78rem",
                                                    }}>
                                                        ⚠ {error}
                                                    </div>
                                                )}

                                                <motion.button
                                                    whileHover={{ scale: loading ? 1 : 1.02 }}
                                                    whileTap={{ scale: loading ? 1 : 0.98 }}
                                                    type="submit"
                                                    disabled={loading}
                                                    style={{
                                                        width: "100%", padding: "15px",
                                                        borderRadius: 14, marginTop: 4,
                                                        border: `2px solid ${G.gold}`,
                                                        background: loading
                                                            ? "#f5f5f5"
                                                            : "linear-gradient(135deg, #fffbea, #fff3c4)",
                                                        color: loading ? "#bbb" : G.goldLight,
                                                        fontSize: "0.95rem", fontWeight: 700,
                                                        cursor: loading ? "not-allowed" : "pointer",
                                                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                                        boxShadow: loading ? "none" : `0 0 24px ${G.gold}25`,
                                                        transition: "all 0.3s",
                                                        backgroundSize: loading ? "400px 100%" : "auto",
                                                        animation: loading ? "shimmer 1.4s linear infinite" : "none",
                                                    }}
                                                >
                                                    {loading ? (
                                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                            <div style={{
                                                                width: 16, height: 16, borderRadius: "50%",
                                                                border: `2px solid ${G.gold}44`,
                                                                borderTopColor: G.gold,
                                                                animation: "spin 0.7s linear infinite",
                                                            }} />
                                                            Signing in…
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {role === "doctor" ? "Access Doctor Dashboard" : "Start My Check-In"}
                                                            <ArrowRight size={16} />
                                                        </>
                                                    )}
                                                </motion.button>

                                                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                                            </form>
                                        </motion.div>
                                    )}

                                </AnimatePresence>
                            </div>

                            {/* ── Footer ── */}
                            <div style={{
                                padding: "1rem 2.5rem",
                                borderTop: `1.5px solid #e8e0cc`,
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                background: "#fafaf8",
                            }}>
                                <Lock size={11} color={G.textMuted} />
                                <span style={{ fontSize: "0.65rem", color: G.textMuted }}>
                                    Secure · HIPAA-aware design · Your data stays private
                                </span>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
