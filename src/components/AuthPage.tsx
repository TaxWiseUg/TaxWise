import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { C } from "../lib/constants";
import { Button, Card, Input } from "./UI";

interface AuthPageProps {
  onLoginSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
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
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${C.navy} 0%, #1a3260 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "2.2rem", color: C.white, fontWeight: 800 }}>
            Tax<span style={{ color: C.teal }}>Wise</span>
          </div>
          <div style={{ color: "rgba(255,255,255,.6)", fontSize: "0.85rem", marginTop: 6 }}>
            Uganda's AI Tax Platform
          </div>
        </div>
        <Card style={{ padding: 32 }}>
          <div style={{ display: "flex", marginBottom: 24, background: C.offwhite, borderRadius: 8, padding: 4 }}>
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: 6,
                  border: "none",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  background: mode === m ? C.white : "transparent",
                  color: mode === m ? C.navy : C.muted,
                  transition: "all .15s",
                  fontFamily: "inherit",
                  boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,.1)" : "none",
                }}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {mode === "signup" && (
            <Input label="Full Name" value={name} onChange={setName} placeholder="e.g. Ronald Kakembo" required />
          )}
          <Input label="Email Address" value={email} onChange={setEmail} type="email" placeholder="you@example.com" required />
          <Input label="Password" value={password} onChange={setPassword} type="password" placeholder="••••••••" required />

          {mode === "signup" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: C.navy, marginBottom: 6 }}>
                Your Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: "100%",
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: "0.875rem",
                  fontFamily: "inherit",
                  background: C.offwhite,
                  color: C.text,
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
                padding: "10px 14px",
                fontSize: "0.82rem",
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <Button onClick={handleAuth} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? "⟳ Please wait..." : mode === "login" ? "Sign In →" : "Create My Account →"}
          </Button>
          
          <div style={{ textAlign: "center", marginTop: 16, fontSize: "0.78rem", color: C.muted }}>
            {mode === "login" 
              ? "Sign in with your registered account credentials." 
              : "Free 14-day trial. Cancel anytime."}
          </div>
        </Card>
      </div>
    </div>
  );
};
