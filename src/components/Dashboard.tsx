import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { C } from "../lib/constants";
import { Card } from "./UI";

interface DashboardProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    plan: string;
  };
  onNavigate: (page: string) => void;
}

interface ActivityItem {
  title: string;
  time: string;
  type: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate }) => {
  const [stats, setStats] = useState([
    { label: "Cases Analyzed", value: "0", icon: "⚖️", color: C.teal },
    { label: "Reports Generated", value: "0", icon: "📄", color: C.navy },
    { label: "Lessons Completed", value: "0", icon: "🎓", color: C.gold },
    { label: "Compliance Score", value: "--%", icon: "✅", color: C.green },
  ]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch count of cases analyzed
        const { count: casesCount, error: casesError } = await supabase
          .from("cases")
          .select("*", { count: "exact", head: true });
        
        if (casesError) console.error("Error fetching cases count:", casesError);

        // 2. Fetch count of compliance reports
        const { data: complianceData, count: reportsCount, error: reportsError } = await supabase
          .from("compliance_reports")
          .select("score, created_at", { count: "exact" });
        
        if (reportsError) console.error("Error fetching reports count:", reportsError);

        // 3. Fetch count of completed lessons
        const { data: enrollmentsData, error: enrollmentsError } = await supabase
          .from("enrollments")
          .select("completed_lessons");
        
        if (enrollmentsError) console.error("Error fetching enrollments:", enrollmentsError);

        let lessonsCompletedCount = 0;
        if (enrollmentsData) {
          enrollmentsData.forEach(e => {
            lessonsCompletedCount += e.completed_lessons ? e.completed_lessons.length : 0;
          });
        }

        // 4. Calculate latest compliance score
        let complianceScoreDisplay = "Not Run";
        if (complianceData && complianceData.length > 0) {
          // Get the most recent report score
          const sortedReports = [...complianceData].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          complianceScoreDisplay = `${sortedReports[0].score}%`;
        }

        setStats([
          { label: "Cases Analyzed", value: String(casesCount || 0), icon: "⚖️", color: C.teal },
          { label: "Reports Generated", value: String(reportsCount || 0), icon: "📄", color: C.navy },
          { label: "Lessons Completed", value: String(lessonsCompletedCount), icon: "🎓", color: C.gold },
          { label: "Compliance Score", value: complianceScoreDisplay, icon: "✅", color: C.green },
        ]);

        // 5. Build Recent Activity feed
        const { data: recentCases } = await supabase
          .from("cases")
          .select("title, created_at")
          .order("created_at", { ascending: false })
          .limit(3);

        const { data: recentReports } = await supabase
          .from("compliance_reports")
          .select("type, created_at")
          .order("created_at", { ascending: false })
          .limit(3);

        const activityFeed: ActivityItem[] = [];

        if (recentCases) {
          recentCases.forEach(c => {
            activityFeed.push({
              title: c.title,
              type: "Case Analysis",
              time: formatRelativeTime(c.created_at),
            });
          });
        }

        if (recentReports) {
          recentReports.forEach(r => {
            activityFeed.push({
              title: `${r.type.toUpperCase()} Compliance Checklist`,
              type: "Compliance Check",
              time: formatRelativeTime(r.created_at),
            });
          });
        }

        // Sort combined feed by time
        setActivities(activityFeed.slice(0, 3));
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatRelativeTime = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffMins < 60) {
      return diffMins <= 1 ? "Just now" : `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.6rem", color: C.navy, marginBottom: 4 }}>
          Welcome back, {user.full_name?.split(" ")[0] || "User"} 👋
        </h1>
        <p style={{ color: C.muted, fontSize: "0.9rem" }}>Here's what's happening with your TaxWise account.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
        {stats.map(s => (
          <Card key={s.label} style={{ padding: "20px 22px" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 800, color: s.color }}>
              {loading ? "..." : s.value}
            </div>
            <div style={{ fontSize: "0.78rem", color: C.muted, marginTop: 2 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, color: C.navy, marginBottom: 16, fontSize: "0.95rem" }}>Quick Actions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "📄 Analyze a New Case", page: "analyzer" },
              { label: "📚 Continue Learning", page: "education" },
              { label: "🔍 Search TAT Cases", page: "library" },
              { label: "✅ Run Compliance Check", page: "compliance" },
            ].map(a => (
              <button
                key={a.label}
                onClick={() => onNavigate(a.page)}
                style={{
                  background: C.offwhite,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "11px 14px",
                  textAlign: "left",
                  fontSize: "0.875rem",
                  color: C.navy,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background .15s",
                  fontFamily: "inherit",
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </Card>

        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, color: C.navy, marginBottom: 16, fontSize: "0.95rem" }}>Recent Activity</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {loading ? (
              <div style={{ fontSize: "0.85rem", color: C.muted }}>Loading recent activities...</div>
            ) : activities.length > 0 ? (
              activities.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.teal, marginTop: 6, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: C.navy }}>{r.title}</div>
                    <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 2 }}>{r.type} · {r.time}</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: "0.85rem", color: C.muted, textAlign: "center", padding: "20px 0" }}>
                No recent activity. Start by analyzing a case or taking a course!
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
