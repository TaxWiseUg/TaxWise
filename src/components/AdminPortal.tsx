import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { C } from "../lib/constants";
import { Badge, Card } from "./UI";

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  plan: string;
  created_at: string;
}

interface AdminPortalProps {
  onNavigate?: (page: string) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onNavigate }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState([
    { label: "Total Users", value: "0", icon: "👥" },
    { label: "Revenue (MRR)", value: "UGX 0", icon: "💰" },
    { label: "Cases Today", value: "0", icon: "⚖️" },
    { label: "Active Trials", value: "0", icon: "🎯" },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);

        // 1. Fetch user list
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("id, full_name, email, role, plan, created_at")
          .order("created_at", { ascending: false });

        if (usersError) throw usersError;

        const adminUsers = (usersData || []) as AdminUser[];
        setUsers(adminUsers);

        // 2. Fetch total case volume today
        const todayStr = new Date().toISOString().split("T")[0];
        const { count: casesToday, error: casesError } = await supabase
          .from("cases")
          .select("*", { count: "exact", head: true })
          .gte("created_at", `${todayStr}T00:00:00.000Z`);

        if (casesError) console.error("Error fetching admin cases:", casesError);

        // 3. Compute MRR based on actual user plans
        // starter = 50K, professional = 150K, firm = 400K
        let totalMrr = 0;
        let trialsCount = 0;

        adminUsers.forEach((u) => {
          const plan = u.plan?.toLowerCase();
          if (plan === "starter") {
            totalMrr += 50000;
          } else if (plan === "professional") {
            totalMrr += 150000;
          } else if (plan === "firm") {
            totalMrr += 400000;
          } else {
            // Treat free plan as trial for dashboard metric
            trialsCount++;
          }
        });

        // Format MRR to K/M
        let mrrDisplay = `UGX ${(totalMrr / 1000).toLocaleString()}K`;
        if (totalMrr >= 1000000) {
          mrrDisplay = `UGX ${(totalMrr / 1000000).toFixed(1)}M`;
        }

        setStats([
          { label: "Total Users", value: String(adminUsers.length), icon: "👥" },
          { label: "Revenue (MRR)", value: mrrDisplay, icon: "💰" },
          { label: "Cases Today", value: String(casesToday || 0), icon: "⚖️" },
          { label: "Active Trials", value: String(trialsCount), icon: "🎯" },
        ]);
      } catch (err) {
        console.error("Error loading admin data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const planColors: Record<string, [string, string]> = {
    professional: [C.teal, C.tealLight],
    firm: [C.navy, "#E8EDF5"],
    starter: [C.muted, C.offwhite],
    free: [C.muted, C.offwhite],
  };

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        {onNavigate && (
          <button
            onClick={() => onNavigate("dashboard")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: `1.5px solid rgba(15,32,68,0.1)`,
              borderRadius: 10,
              color: C.muted,
              fontSize: "0.8rem",
              fontWeight: 600,
              fontFamily: "inherit",
              padding: "7px 14px",
              cursor: "pointer",
              marginBottom: 20,
              transition: "all 0.2s ease",
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = C.offwhite;
              e.currentTarget.style.color = C.navy;
              e.currentTarget.style.borderColor = `rgba(15,32,68,0.2)`;
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = C.muted;
              e.currentTarget.style.borderColor = `rgba(15,32,68,0.1)`;
            }}
          >
            ← Back to Dashboard
          </button>
        )}
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.85rem", color: C.navy, marginBottom: 6, fontWeight: 800 }}>
          Admin Portal
        </h1>
        <p style={{ color: C.muted, fontSize: "0.92rem", fontWeight: 500 }}>
          Platform metrics overview, usage monitoring, and user directory administration.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
        {stats.map((s) => (
          <Card key={s.label} style={{ padding: "22px 24px", display: "flex", alignItems: "center", gap: 18 }} hover>
            <div style={{ 
              width: 44, 
              height: 44, 
              borderRadius: 12, 
              background: "rgba(15,32,68,0.04)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              fontSize: "1.40rem",
              flexShrink: 0
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.8rem", fontWeight: 800, color: C.navy, lineHeight: 1.2 }}>
                {loading ? "..." : s.value}
              </div>
              <div style={{ fontSize: "0.78rem", color: C.muted, marginTop: 4, fontWeight: 600, letterSpacing: "0.02em", textTransform: "uppercase" }}>
                {s.label}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card style={{ padding: 0, overflow: "hidden", boxShadow: "0 8px 32px rgba(15,32,68,0.03)" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid rgba(15,32,68,0.05)`, fontWeight: 800, color: C.navy, fontSize: "0.95rem" }}>
          Registered Platform Users
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
            <div style={{ fontSize: "2rem", animation: "spin 1s linear infinite", color: C.teal, marginBottom: 12 }}>⟳</div>
            <div style={{ fontWeight: 600 }}>Loading user directory...</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ background: C.offwhite }}>
                  {["Name", "Email Address", "Professional Role", "Subscription Plan", "Joined Date"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 24px",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        color: C.muted,
                        textAlign: "left",
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                        borderBottom: `1.5px solid rgba(15,32,68,0.04)`
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr 
                    key={u.email} 
                    style={{ 
                      borderBottom: `1px solid rgba(15,32,68,0.03)`, 
                      background: i % 2 ? C.white : "rgba(15,32,68,0.01)",
                      transition: "background 0.2s"
                    }}
                    onMouseOver={e => e.currentTarget.style.background = "rgba(15,32,68,0.02)"}
                    onMouseOut={e => e.currentTarget.style.background = i % 2 ? C.white : "rgba(15,32,68,0.01)"}
                  >
                    <td style={{ padding: "14px 24px", fontSize: "0.875rem", fontWeight: 700, color: C.navy }}>
                      {u.full_name || "Anonymous User"}
                    </td>
                    <td style={{ padding: "14px 24px", fontSize: "0.82rem", color: C.muted, fontWeight: 500 }}>{u.email}</td>
                    <td style={{ padding: "14px 24px", fontSize: "0.82rem", color: C.text, fontWeight: 600 }}>{u.role}</td>
                    <td style={{ padding: "14px 24px" }}>
                      <Badge
                        color={planColors[u.plan?.toLowerCase()]?.[0] || C.muted}
                        bg={planColors[u.plan?.toLowerCase()]?.[1] || C.offwhite}
                        style={{ fontWeight: 800 }}
                      >
                        {u.plan?.toUpperCase() || "FREE"}
                      </Badge>
                    </td>
                    <td style={{ padding: "14px 24px", fontSize: "0.82rem", color: C.muted, fontWeight: 500 }}>
                      {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
