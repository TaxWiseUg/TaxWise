import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { COMPLIANCE_ITEMS, C, riskColors } from "../lib/constants";
import { Badge, Button, Card } from "./UI";

interface ComplianceCheckerProps {
  user: {
    id: string;
  };
}

interface PastReport {
  id: string;
  type: string;
  score: number;
  risk_report: string;
  created_at: string;
}

export const ComplianceChecker: React.FC<ComplianceCheckerProps> = ({ user }) => {
  const [tab, setTab] = useState<"efris" | "vat" | "paye">("efris");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [aiReport, setAiReport] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [pastReports, setPastReports] = useState<PastReport[]>([]);

  const items = COMPLIANCE_ITEMS[tab];
  const totalItemsCount = items.length;
  const checkedItemsCount = items.filter((i) => checked[`${tab}-${i.id}`]).length;
  const score = totalItemsCount ? Math.round((checkedItemsCount / totalItemsCount) * 100) : 0;
  
  const highRisks = items.filter((i) => i.risk === "high" && !checked[`${tab}-${i.id}`]);
  const tabs = [
    { key: "efris", label: "eFRIS" },
    { key: "vat", label: "VAT" },
    { key: "paye", label: "PAYE" },
  ] as const;

  const toggle = (id: string) => {
    setChecked((c) => ({ ...c, [`${tab}-${id}`]: !c[`${tab}-${id}`] }));
  };

  const fetchPastReports = async () => {
    try {
      const { data, error } = await supabase
        .from("compliance_reports")
        .select("id, type, score, risk_report, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setPastReports(data as PastReport[]);
    } catch (err) {
      console.error("Error fetching compliance reports:", err);
    }
  };

  useEffect(() => {
    fetchPastReports();
  }, []);

  const generateReport = async () => {
    setAiLoading(true);
    setAiReport("");
    
    // Gaps represent the unchecked items
    const gaps = items.filter((i) => !checked[`${tab}-${i.id}`]).map((i) => i.text);

    try {
      const res = await fetch("/api/compliance/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complianceType: tab,
          score,
          gaps,
          userId: user.id,
          responses: checked, // Save response map
        }),
      });

      if (!res.ok) throw new Error("API request failed");
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setAiReport(data.report);
      fetchPastReports(); // Refresh history
    } catch (err: any) {
      console.error("Compliance report generation error:", err);
      setAiReport(
        "Failed to generate audit report. Please verify your internet connection and verify that you have added your Anthropic API Key in `.env.local`."
      );
    } finally {
      setAiLoading(false);
    }
  };

  const loadPastReport = (report: PastReport) => {
    setAiReport(report.risk_report);
    setTab(report.type as "efris" | "vat" | "paye");
  };

  return (
    <div>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.6rem", color: C.navy, marginBottom: 6 }}>
        Compliance Checker
      </h1>
      <p style={{ color: C.muted, fontSize: "0.9rem", marginBottom: 24 }}>
        Work through each checklist and get an AI-generated risk report for your business.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  setAiReport("");
                }}
                style={{
                  padding: "9px 20px",
                  borderRadius: 8,
                  border: `2px solid ${tab === t.key ? C.teal : C.border}`,
                  background: tab === t.key ? C.teal : C.white,
                  color: tab === t.key ? C.white : C.muted,
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <Card style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: C.navy }}>
                {tabs.find((t) => t.key === tab)?.label} Compliance Checklist
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    fontFamily: "Georgia, serif",
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    color: score >= 80 ? C.green : score >= 50 ? C.gold : C.red,
                  }}
                >
                  {score}%
                </div>
                <div style={{ fontSize: "0.75rem", color: C.muted }}>complete</div>
              </div>
            </div>
            <div style={{ height: 8, background: C.border, borderRadius: 4, marginBottom: 20, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${score}%`,
                  background: score >= 80 ? C.green : score >= 50 ? C.gold : C.red,
                  borderRadius: 4,
                  transition: "width .3s",
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map((item) => {
                const isChecked = checked[`${tab}-${item.id}`];
                const [rc, rb] = riskColors[item.risk];
                return (
                  <div
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "13px 16px",
                      borderRadius: 10,
                      border: `1px solid ${isChecked ? C.teal : C.border}`,
                      background: isChecked ? C.tealLight : C.white,
                      cursor: "pointer",
                      transition: "all .15s",
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        border: `2px solid ${isChecked ? C.teal : C.border}`,
                        background: isChecked ? C.teal : C.white,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        color: C.white,
                        fontSize: "0.8rem",
                        fontWeight: 700,
                      }}
                    >
                      {isChecked ? "✓" : ""}
                    </div>
                    <span
                      style={{
                        flex: 1,
                        fontSize: "0.875rem",
                        color: isChecked ? C.teal : C.text,
                        textDecoration: isChecked ? "line-through" : "none",
                        lineHeight: 1.5,
                      }}
                    >
                      {item.text}
                    </span>
                    <Badge color={rc} bg={rb}>
                      {item.risk}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, color: C.navy, marginBottom: 14 }}>Score Summary</div>
            {["high", "medium", "low"].map((r) => {
              const total = items.filter((i) => i.risk === r);
              const done = total.filter((i) => checked[`${tab}-${i.id}`]);
              const [rc, rb] = riskColors[r];
              return (
                <div
                  key={r}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}
                >
                  <Badge color={rc} bg={rb}>
                    {r} risk
                  </Badge>
                  <span style={{ fontSize: "0.85rem", color: C.muted }}>
                    {done.length}/{total.length} done
                  </span>
                </div>
              );
            })}
            {highRisks.length > 0 && (
              <div style={{ background: C.redLight, borderRadius: 8, padding: 12, marginTop: 12 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: C.red, marginBottom: 6 }}>
                  ⚠ {highRisks.length} HIGH-RISK ITEMS OUTSTANDING
                </div>
                {highRisks.slice(0, 2).map((h) => (
                  <div key={h.id} style={{ fontSize: "0.75rem", color: C.red, marginBottom: 3 }}>
                    • {h.text.slice(0, 60)}...
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, color: C.navy, marginBottom: 10 }}>✦ AI Risk Report</div>
            <p style={{ fontSize: "0.82rem", color: C.muted, lineHeight: 1.65, marginBottom: 14 }}>
              Get a professional risk report based on your current checklist — including potential penalties under Uganda
              tax law.
            </p>
            <Button onClick={generateReport} disabled={aiLoading} style={{ width: "100%", justifyContent: "center" }}>
              {aiLoading ? "⟳ Generating..." : "Generate Report"}
            </Button>
            {aiReport && (
              <div
                style={{
                  marginTop: 14,
                  background: C.offwhite,
                  borderRadius: 8,
                  padding: 14,
                  fontSize: "0.82rem",
                  color: C.text,
                  lineHeight: 1.75,
                  maxHeight: 300,
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {aiReport}
              </div>
            )}
          </Card>

          {pastReports.length > 0 && (
            <Card style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, color: C.navy, marginBottom: 12 }}>📁 Past Audits</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 180, overflowY: "auto" }}>
                {pastReports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => loadPastReport(report)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 6,
                      background: C.offwhite,
                      cursor: "pointer",
                      fontSize: "0.78rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <div>
                      <strong style={{ color: C.navy }}>{report.type.toUpperCase()}</strong> ({report.score}%)
                    </div>
                    <div style={{ color: C.muted, fontSize: "0.72rem" }}>
                      {new Date(report.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
