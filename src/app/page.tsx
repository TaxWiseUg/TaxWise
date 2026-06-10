"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { C } from "../lib/constants";
import { AuthPage } from "../components/AuthPage";
import { Dashboard } from "../components/Dashboard";
import { CaseAnalyzer } from "../components/CaseAnalyzer";
import { CaseLibrary } from "../components/CaseLibrary";
import { EducationHub } from "../components/EducationHub";
import { ComplianceChecker } from "../components/ComplianceChecker";
import { PricingPage } from "../components/PricingPage";
import { AdminPortal } from "../components/AdminPortal";

interface DbProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  plan: string;
}

export default function TaxWiseSaaS() {
  const [user, setUser] = useState<any>(null);
  const [dbUser, setDbUser] = useState<DbProfile | null>(null);
  const [page, setPage] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        
        // Fetch public user profile from postgres
        const { data, error } = await supabase
          .from("users")
          .select("id, email, full_name, role, plan")
          .eq("id", session.user.id)
          .single();

        if (error) {
          console.warn("Could not load database profile, falling back to auth metadata:", error.message);
        }

        if (data) {
          setDbUser(data as DbProfile);
        } else {
          // Fallback to auth metadata if public profile record sync is delayed
          setDbUser({
            id: session.user.id,
            email: session.user.email || "",
            full_name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
            role: session.user.user_metadata?.role || "Student",
            plan: "free",
          });
        }
      } else {
        setUser(null);
        setDbUser(null);
      }
    } catch (err) {
      console.error("Auth sync error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
    
    // Subscribe to auth state updates (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setPage("dashboard");
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "⊞" },
    { id: "analyzer", label: "Case Analyzer", icon: "⚖️" },
    { id: "library", label: "Case Library", icon: "📚" },
    { id: "education", label: "Learning Hub", icon: "🎓" },
    { id: "compliance", label: "Compliance", icon: "✅" },
    { id: "pricing", label: "Pricing", icon: "💳" },
  ];

  // Include Admin navigation if the user is an Admin
  if (dbUser?.role?.toLowerCase() === "admin") {
    navItems.push({ id: "admin", label: "Admin Portal", icon: "🛡️" });
  }

  const renderActivePage = () => {
    if (!dbUser) return null;
    
    switch (page) {
      case "dashboard":
        return <Dashboard user={dbUser} onNavigate={setPage} />;
      case "analyzer":
        return <CaseAnalyzer user={dbUser} />;
      case "library":
        return <CaseLibrary />;
      case "education":
        return <EducationHub user={dbUser} />;
      case "compliance":
        return <ComplianceChecker user={dbUser} />;
      case "pricing":
        return <PricingPage user={dbUser} onRefreshUser={refreshUser} />;
      case "admin":
        return <AdminPortal />;
      default:
        return <Dashboard user={dbUser} onNavigate={setPage} />;
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: C.offwhite }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", animation: "spin 1s linear infinite", marginBottom: 12, color: C.teal }}>⟳</div>
          <div style={{ fontSize: "0.9rem", color: C.muted, fontWeight: 500 }}>Syncing session...</div>
        </div>
      </div>
    );
  }

  // Redirect to AuthPage if user is not logged in
  if (!user || !dbUser) {
    return <AuthPage onLoginSuccess={refreshUser} />;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif", background: C.offwhite }}>
      {/* SIDEBAR */}
      <div style={{ width: 220, background: C.navy, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", flexShrink: 0 }}>
        <div style={{ padding: "22px 20px 16px", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
          <div style={{ fontFamily: "Georgia, serif", fontSize: "1.3rem", color: C.white, fontWeight: 800 }}>
            Tax<span style={{ color: C.teal }}>Wise</span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,.4)", marginTop: 2 }}>Uganda Tax Platform</div>
        </div>
        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {navItems.map((n) => (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "none",
                background: page === n.id ? "rgba(26,123,107,.3)" : "transparent",
                color: page === n.id ? C.white : "rgba(255,255,255,.55)",
                fontWeight: page === n.id ? 700 : 500,
                fontSize: "0.875rem",
                cursor: "pointer",
                transition: "all .15s",
                marginBottom: 2,
                textAlign: "left",
                fontFamily: "inherit",
                borderLeft: page === n.id ? `3px solid ${C.teal}` : "3px solid transparent",
              }}
            >
              <span style={{ minWidth: 20 }}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,.1)" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: C.white, marginBottom: 2 }}>
            {dbUser.full_name}
          </div>
          <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,.4)", marginBottom: 10 }}>
            {dbUser.role} · <span style={{ color: C.teal, fontWeight: 700 }}>{dbUser.plan?.toUpperCase()}</span>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              fontSize: "0.75rem",
              color: "rgba(255,255,255,.4)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              padding: 0,
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div style={{ flex: 1, padding: "32px 36px", overflowY: "auto", maxHeight: "100vh" }}>
        <main>{renderActivePage()}</main>
      </div>
    </div>
  );
}
