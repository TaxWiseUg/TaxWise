import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { C, riskColors } from "../lib/constants";
import { Badge, Button, Card } from "./UI";

interface CaseAnalyzerProps {
  user: {
    id: string;
    email: string;
  };
}

interface AnalysisResult {
  summary: string;
  keyIssues: string[];
  verdict: string;
  risk: "low" | "medium" | "high";
  riskNote: string;
  advice: string;
  applicableLaw?: string[];
  tags?: string[];
  error?: boolean;
}

interface CaseRecord {
  id: string;
  title: string;
  created_at: string;
  risk_level: "low" | "medium" | "high";
  ai_summary: AnalysisResult;
}

export const CaseAnalyzer: React.FC<CaseAnalyzerProps> = ({ user }) => {
  const [text, setText] = useState("");
  const [caseType, setCaseType] = useState("TAT Ruling");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [reports, setReports] = useState<CaseRecord[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch past reports from database
  const fetchPastReports = async () => {
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("id, title, created_at, risk_level, ai_summary")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setReports(data as unknown as CaseRecord[]);
    } catch (err) {
      console.error("Error fetching past reports:", err);
    }
  };

  useEffect(() => {
    fetchPastReports();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setFileName(selectedFile.name);
    
    // Autofill text preview indicating upload
    setText(
      `[File Uploaded: ${selectedFile.name}]\n\nThis file is ready for analysis. The server will parse the PDF text and analyze it using the Anthropic Claude API.\n\nYou can also add custom notes or paste additional excerpts here if you'd like to combine them with the document.`
    );
  };

  const analyze = async () => {
    if (!text.trim() && !file) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      const formData = new FormData();
      if (file) {
        formData.append("file", file);
      }
      formData.append("text", text);
      formData.append("caseType", caseType);
      formData.append("userId", user.id);

      const res = await fetch("/api/cases/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("API call failed");
      }

      const data = await res.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data.analysis);
      
      // Reset input fields
      setFile(null);
      setFileName("");
      setText("");
      
      // Refresh list
      fetchPastReports();
    } catch (err: any) {
      console.error("Analysis error:", err);
      setResult({
        summary: "",
        keyIssues: [],
        verdict: "",
        risk: "medium",
        riskNote: "",
        advice: "",
        error: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!result || result.error) return;
    const content = `TAXWISE CASE ANALYSIS REPORT\n${"=".repeat(50)}\nGenerated: ${new Date().toLocaleString()}\nCase Type: ${caseType}\n\nSUMMARY\n${result.summary}\n\nKEY LEGAL ISSUES\n${result.keyIssues.map((i, n) => `${n + 1}. ${i}`).join("\n")}\n\nVERDICT / OUTCOME\n${result.verdict}\n\nRISK LEVEL: ${result.risk?.toUpperCase()}\n${result.riskNote}\n\nPRACTICAL ADVICE\n${result.advice}\n\nAPPLICABLE LAW\n${result.applicableLaw?.join("\n") || "N/A"}\n\nTAGS: ${result.tags?.join(", ") || "None"}\n\n${"=".repeat(50)}\nPowered by TaxWise Uganda | taxwise.ug`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taxwise-case-report-${Date.now()}.txt`;
    a.click();
  };

  const loadPastReport = (report: CaseRecord) => {
    setResult(report.ai_summary);
    setCaseType(report.title.startsWith("File Analysis:") ? "TAT Ruling" : "General Scenario");
  };

  return (
    <div>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.6rem", color: C.navy, marginBottom: 6 }}>
        Case Analyzer
      </h1>
      <p style={{ color: C.muted, fontSize: "0.9rem", marginBottom: 24 }}>
        Paste case text or upload a PDF. AI delivers a structured legal summary in seconds.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24 }}>
        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, color: C.navy, marginBottom: 16 }}>📄 Input</div>

          {/* PDF Upload */}
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${C.border}`,
              borderRadius: 10,
              padding: "18px",
              textAlign: "center",
              cursor: "pointer",
              marginBottom: 14,
              background: fileName ? C.tealLight : C.offwhite,
              transition: "background .15s",
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>📎</div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: fileName ? C.teal : C.muted }}>
              {fileName || "Click to upload PDF or TXT"}
            </div>
            <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 3 }}>
              or drag & drop your case document
            </div>
          </div>

          <div style={{ textAlign: "center", color: C.muted, fontSize: "0.8rem", marginBottom: 12 }}>
            — or paste text directly —
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the full text of a TAT ruling, URA assessment letter, or describe a tax scenario in detail..."
            style={{
              width: "100%",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: 14,
              fontSize: "0.85rem",
              fontFamily: "inherit",
              resize: "vertical",
              minHeight: 180,
              outline: "none",
              background: C.offwhite,
              boxSizing: "border-box",
              color: C.text,
            }}
          />

          <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
            <select
              value={caseType}
              onChange={(e) => setCaseType(e.target.value)}
              style={{
                flex: 1,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "9px 12px",
                fontSize: "0.85rem",
                fontFamily: "inherit",
                background: C.white,
              }}
            >
              {["TAT Ruling", "URA Assessment", "Income Tax", "VAT Dispute", "PAYE Issue", "eFRIS Compliance", "General Scenario"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <Button onClick={analyze} disabled={loading || (!text.trim() && !file)}>
              {loading ? "⟳ Analyzing..." : "Analyze →"}
            </Button>
          </div>
        </Card>

        <Card style={{ padding: 24, minHeight: 380 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: C.navy }}>✦ AI Analysis</div>
            {result && !result.error && (
              <Button onClick={downloadReport} small variant="outline">
                ⬇ Download Report
              </Button>
            )}
          </div>

          {!result && !loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                minHeight: 280,
                color: C.muted,
                gap: 8,
              }}
            >
              <div style={{ fontSize: "2.5rem", opacity: 0.3 }}>📋</div>
              <div style={{ fontSize: "0.875rem" }}>Analysis appears here</div>
            </div>
          )}

          {loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                minHeight: 280,
                gap: 12,
              }}
            >
              <div style={{ fontSize: "2rem", animation: "spin 1s linear infinite" }}>⟳</div>
              <div style={{ fontSize: "0.875rem", color: C.muted }}>Reading and analyzing case...</div>
            </div>
          )}

          {result && result.error && (
            <div style={{ color: C.red, fontSize: "0.875rem", padding: "20px 0" }}>
              Analysis failed. Please check your internet connection and verify that you have added your Anthropic API Key in `.env.local`.
            </div>
          )}

          {result && !result.error && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: C.teal,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    marginBottom: 4,
                  }}
                >
                  Summary
                </div>
                <p style={{ fontSize: "0.875rem", color: C.text, lineHeight: 1.7 }}>{result.summary}</p>
              </div>

              <div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: C.teal,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    marginBottom: 4,
                  }}
                >
                  Key Issues
                </div>
                {result.keyIssues?.map((i, n) => (
                  <div key={n} style={{ fontSize: "0.85rem", color: C.text, marginBottom: 4 }}>
                    • {i}
                  </div>
                ))}
              </div>

              <div
                style={{
                  borderLeft: `3px solid ${C.gold}`,
                  paddingLeft: 12,
                  background: C.goldLight,
                  borderRadius: "0 8px 8px 0",
                  padding: "10px 14px",
                }}
              >
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: C.gold, textTransform: "uppercase", marginBottom: 4 }}>
                  Verdict
                </div>
                <div style={{ fontSize: "0.875rem", color: C.text }}>{result.verdict}</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: C.muted }}>RISK:</span>
                <Badge
                  color={riskColors[result.risk]?.[0] || C.muted}
                  bg={riskColors[result.risk]?.[1] || C.offwhite}
                >
                  {result.risk?.toUpperCase()}
                </Badge>
                <span style={{ fontSize: "0.78rem", color: C.muted }}>{result.riskNote}</span>
              </div>

              <div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: C.teal,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    marginBottom: 4,
                  }}
                >
                  Advice
                </div>
                <p style={{ fontSize: "0.875rem", color: C.text, lineHeight: 1.7 }}>{result.advice}</p>
              </div>

              {result.applicableLaw && result.applicableLaw.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: C.teal,
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                      marginBottom: 4,
                    }}
                  >
                    Applicable Law
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {result.applicableLaw.map((l) => (
                      <Badge key={l} color={C.navy} bg="#E8EDF5">
                        {l}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.tags?.map((t) => (
                  <Badge key={t} color={C.teal} bg={C.tealLight}>
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {reports.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontWeight: 700, color: C.navy, marginBottom: 14 }}>📁 Recent Reports</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {reports.map((r) => (
              <Card
                key={r.id}
                style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                hover
                onClick={() => loadPastReport(r)}
              >
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: C.navy }}>{r.title}</div>
                  <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 2 }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                <Badge
                  color={riskColors[r.risk_level]?.[0] || C.muted}
                  bg={riskColors[r.risk_level]?.[1] || C.offwhite}
                >
                  {r.risk_level?.toUpperCase()}
                </Badge>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
