import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { C } from "../lib/constants";
import { Button, Card, Input } from "./UI";

interface AuthPageProps {
  onLoginSuccess: () => void;
  onBack?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, onBack }) => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Tax Consultant");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAuth = async () => {
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (mode === "signup" && !name) {
      setError("Please enter your name.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              role: role,
            },
          },
        });

        if (signUpError) throw signUpError;

        // If email verification is enabled, alert the user.
        if (data.session === null) {
          setError("Registration successful! Please check your email for verification.");
          setMode("login");
        } else {
          onLoginSuccess();
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err?.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <style>{`
        .auth-container {
          display: flex;
          width: 100vw;
          min-height: 100vh;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          background: #FAFAF8;
        }
        .auth-showcase {
          flex: 1.1;
          background: radial-gradient(circle at 30% 30%, #162C54 0%, #0F2044 100%);
          color: white;
          padding: 64px 8%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }
        .auth-showcase::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 0);
          background-size: 24px 24px;
          opacity: 0.85;
          pointer-events: none;
        }
        .auth-form-panel {
          flex: 0.9;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 48px 8%;
          background: #FAFAF8;
          position: relative;
        }
        .auth-form-card {
          width: 100%;
          max-width: 440px;
        }
        .auth-back-btn {
          position: absolute;
          top: 32px;
          left: 32px;
          display: flex;
          align-items: center;
          gap: 6px;
          background: white;
          border: 1px solid rgba(15, 32, 68, 0.08);
          border-radius: 10px;
          color: #0F2044;
          font-size: 0.8rem;
          font-weight: 600;
          font-family: inherit;
          padding: 8px 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(15, 32, 68, 0.02);
          z-index: 100;
        }
        .auth-back-btn:hover {
          background: #F8F7F4;
          transform: translateX(-2px);
        }
        @media (max-width: 992px) {
          .auth-showcase {
            display: none !important;
          }
          .auth-form-panel {
            flex: 1 !important;
            padding: 24px 16px !important;
            background: radial-gradient(circle at 50% 50%, #162C54 0%, #0F2044 100%) !important;
          }
          .auth-form-card {
            width: 100% !important;
          }
          .auth-back-btn {
            top: 20px;
            left: 20px;
            background: rgba(255, 255, 255, 0.08) !important;
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
            color: white !important;
            box-shadow: none !important;
          }
          .auth-back-btn:hover {
            background: rgba(255, 255, 255, 0.15) !important;
          }
        }
      `}</style>

      {/* LEFT SHOWCASE PANEL */}
      <div className="auth-showcase">
        {/* Top Branding */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative", zIndex: 10 }}>
          <a href="#" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.65rem", color: "white", display: "flex", alignItems: "center", gap: 8, textDecoration: "none", fontWeight: 800 }}>
            <div style={{ width: 10, height: 10, background: "#C8922A", borderRadius: 3, transform: "rotate(45deg)", flexShrink: 0, boxShadow: "0 0 10px rgba(200, 146, 42, 0.5)" }} />
            Tax<span style={{ color: "#4DD9C0" }}>Wise</span>
          </a>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", padding: "5px 12px", borderRadius: 50, fontSize: ".68rem", color: "rgba(255,255,255,0.75)", fontWeight: 600, width: "fit-content", marginTop: 8 }}>
            🏛️ ICPAU CPD-Eligible Platform
          </div>
        </div>

        {/* Center Marketing Copy */}
        <div style={{ margin: "48px 0", position: "relative", zIndex: 10 }}>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(2rem, 3.2vw, 2.6rem)", lineHeight: 1.15, fontWeight: 700, marginBottom: 28, letterSpacing: "-0.01em" }}>
            Uganda's complete <br />
            <span style={{ color: "#4DD9C0", fontStyle: "italic" }}>tax intelligence</span> platform
          </h1>

          {/* Testimonial Card */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24, marginBottom: 32, backdropFilter: "blur(8px)", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
            <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.6, fontStyle: "italic", marginBottom: 16 }}>
              "TaxWise retrieved a crucial TAT precedent in 4 seconds that would have taken me hours to search for manually. It has completely transformed our tribunal preparation."
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#1A7B6B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".8rem", fontWeight: 700, color: "white" }}>SN</div>
              <div>
                <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>Sarah Nakato</div>
                <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }}>Senior Tax Consultant, Kampala</div>
              </div>
            </div>
          </div>

          {/* Features Checklists */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              "Instant AI TAT Precedents Risk Analyzer",
              "PAYE, VAT, Corporate & Vehicle Import Calculators",
              "Up-to-date URA Practice Notes & Statutory Checklists"
            ].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: "0.85rem", color: "rgba(255,255,255,0.8)" }}>
                <span style={{ color: "#4DD9C0", fontWeight: 800, lineHeight: 1 }}>✓</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 24, position: "relative", zIndex: 10 }}>
          <div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "white", fontFamily: "'Playfair Display', Georgia, serif" }}>4,200+</div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>Cases Analyzed</div>
          </div>
          <div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "white", fontFamily: "'Playfair Display', Georgia, serif" }}>85%</div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>Time Saved vs Manual</div>
          </div>
        </div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="auth-form-panel">
        {onBack && (
          <button onClick={onBack} className="auth-back-btn">
            ← Back to Home
          </button>
        )}

        <div className="auth-form-card">
          <Card style={{ padding: "40px 36px", boxShadow: "0 20px 48px rgba(15,32,68,0.04)", border: "1px solid rgba(15,32,68,0.05)", background: C.white }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: "1.45rem", fontWeight: 800, color: C.navy, letterSpacing: "-0.025em" }}>
                {mode === "login" ? "Welcome back" : "Create Account"}
              </h2>
              <p style={{ color: C.muted, fontSize: "0.85rem", marginTop: 4, fontWeight: 500, lineHeight: 1.4 }}>
                {mode === "login" 
                  ? "Access your dashboard and start analyzing cases." 
                  : "Start your 14-day free trial of TaxWise today."}
              </p>
            </div>

            {/* Switcher Tab */}
            <div style={{ display: "flex", marginBottom: 24, background: "#EAE9E5", borderRadius: 10, padding: 4 }}>
              {(["login", "signup"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setError("");
                  }}
                  style={{
                    flex: 1,
                    padding: "9px 0",
                    borderRadius: 8,
                    border: "none",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    background: mode === m ? C.white : "transparent",
                    color: mode === m ? C.navy : C.muted,
                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    fontFamily: "inherit",
                    boxShadow: mode === m ? "0 2px 8px rgba(15,32,68,.06)" : "none",
                  }}
                >
                  {m === "login" ? "Sign In" : "Register"}
                </button>
              ))}
            </div>

            {/* Form Fields */}
            {mode === "signup" && (
              <Input label="Full Name" value={name} onChange={setName} placeholder="e.g. Ronald Kakembo" required />
            )}
            <Input label="Email Address" value={email} onChange={setEmail} type="email" placeholder="you@example.com" required />
            <Input label="Password" value={password} onChange={setPassword} type="password" placeholder="••••••••" required />

            {mode === "signup" && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: C.navy, marginBottom: 6 }}>
                  Your Professional Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    width: "100%",
                    border: `1.5px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "11px 14px",
                    fontSize: "0.875rem",
                    fontFamily: "inherit",
                    background: C.offwhite,
                    color: C.text,
                    fontWeight: 600,
                    outline: "none",
                    transition: "all 0.2s ease",
                    boxSizing: "border-box"
                  }}
                >
                  {["Tax Consultant", "Accountant", "Tax Lawyer", "Finance Manager", "Business Owner", "Student"].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <div
                style={{
                  background: error.includes("successful") ? C.greenLight : C.redLight,
                  color: error.includes("successful") ? C.green : C.red,
                  borderRadius: 8,
                  padding: "12px 16px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  marginBottom: 20,
                  border: `1px solid ${error.includes("successful") ? `${C.green}25` : `${C.red}25`}`
                }}
              >
                {error}
              </div>
            )}

            <Button onClick={handleAuth} disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
              {loading ? "⟳ Authenticating..." : mode === "login" ? "Sign In →" : "Create My Account →"}
            </Button>
            
            <div style={{ textAlign: "center", marginTop: 20, fontSize: "0.78rem", color: C.muted, fontWeight: 500 }}>
              {mode === "login" 
                ? "Sign in with your registered account credentials." 
                : "Free 14-day trial. Cancel anytime."}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
