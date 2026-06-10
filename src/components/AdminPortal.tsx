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

export const AdminPortal: React.FC = () => {
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
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.6rem", color: C.navy, marginBottom: 6 }}>
        Admin Portal
      </h1>
      <p style={{ color: C.muted, fontSize: "0.9rem", marginBottom: 24 }}>
        Platform overview and user management.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        {stats.map((s) => (
          <Card key={s.label} style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: "1.3rem", marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "1.6rem", fontWeight: 800, color: C.navy }}>
              {loading ? "..." : s.value}
            </div>
            <div style={{ fontSize: "0.78rem", color: C.muted }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.navy }}>
          Registered Platform Users
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading user directory...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
              <thead>
                <tr style={{ background: C.offwhite }}>
                  {["Name", "Email", "Role", "Plan", "Joined"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 16px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: C.muted,
                        textAlign: "left",
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.email} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 ? C.white : C.offwhite }}>
                    <td style={{ padding: "12px 16px", fontSize: "0.875rem", fontWeight: 600, color: C.navy }}>
                      {u.full_name || "Anonymous User"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.82rem", color: C.muted }}>{u.email}</td>
                    <td style={{ padding: "12px 16px", fontSize: "0.82rem", color: C.text }}>{u.role}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <Badge
                        color={planColors[u.plan?.toLowerCase()]?.[0] || C.muted}
                        bg={planColors[u.plan?.toLowerCase()]?.[1] || C.offwhite}
                      >
                        {u.plan?.toUpperCase() || "FREE"}
                      </Badge>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.82rem", color: C.muted }}>
                      {new Date(u.created_at).toLocaleDateString()}
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
