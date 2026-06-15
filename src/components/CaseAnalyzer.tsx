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
  const [dragActive, setDragActive] = useState(false);
  
  // Accordion state to organize report findings
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    summary: true,
    issues: true,
    verdict: true,
    advice: true,
    law: true
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setText(
        `[File Uploaded: ${selectedFile.name}]\n\nThis file is ready for analysis. The server will parse the PDF text and analyze it using the Anthropic Claude API.\n\nYou can also add custom notes or paste additional excerpts here if you'd like to combine them with the document.`
      );
    }
  };

  // Visual Risk Gauge Helper Component
  const RiskGauge = ({ level }: { level: "low" | "medium" | "high" }) => {
    const isLow = level === "low";
    const isMed = level === "medium";
    const isHigh = level === "high";

    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center", width: "100%", maxWidth: 220 }}>
        {[
          { label: "LOW", active: isLow || isMed || isHigh, color: C.teal, bg: C.tealLight },
          { label: "MED", active: isMed || isHigh, color: C.gold, bg: C.goldLight },
          { label: "HIGH", active: isHigh, color: C.red, bg: C.redLight }
        ].map((bar, idx) => (
          <div 
            key={bar.label} 
            style={{ 
              flex: 1, 
              padding: "4px 0", 
              borderRadius: 4, 
              fontSize: "0.65rem", 
              fontWeight: 800, 
              textAlign: "center", 
              transition: "all 0.3s ease",
              background: bar.active ? bar.bg : "#E5E7EB",
              color: bar.active ? bar.color : C.muted,
              border: bar.active ? `1px solid ${bar.color}25` : "1px solid transparent"
            }}
          >
            {bar.label}
          </div>
        ))}
      </div>
    );
  };

  // Accordion Header component
  const AccordionHeader = ({ title, isOpen, onClick }: { title: string; isOpen: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        padding: "12px 14px",
        background: "rgba(15, 32, 68, 0.02)",
        border: `1px solid rgba(15, 32, 68, 0.05)`,
        borderRadius: 8,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        fontSize: "0.85rem",
        fontWeight: 700,
        color: C.navy,
        transition: "background 0.2s"
      }}
      onMouseOver={e => e.currentTarget.style.background = "rgba(15, 32, 68, 0.04)"}
      onMouseOut={e => e.currentTarget.style.background = "rgba(15, 32, 68, 0.02)"}
    >
      <span>{title}</span>
      <span style={{ 
        transform: isOpen ? "rotate(180deg)" : "rotate(0)", 
        transition: "transform 0.2s",
        fontSize: "0.65rem",
        color: C.muted
      }}>
        ▼
      </span>
    </button>
  );

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.85rem", color: C.navy, marginBottom: 6, fontWeight: 800 }}>
          Case Analyzer
        </h1>
        <p style={{ color: C.muted, fontSize: "0.92rem", fontWeight: 500 }}>
          Upload a TAT ruling PDF or paste dispute details. AI extracts structured legal analysis instantly.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 28, alignItems: "start" }}>
        <Card style={{ padding: 28 }}>
          <div style={{ fontWeight: 800, color: C.navy, marginBottom: 20, fontSize: "0.98rem" }}>📄 Document & Details Input</div>

          {/* PDF Upload Dropzone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragActive ? C.teal : C.border}`,
              borderRadius: 14,
              padding: "26px 20px",
              textAlign: "center",
              cursor: "pointer",
              marginBottom: 16,
              background: dragActive ? C.tealLight : fileName ? "rgba(26,123,107,0.04)" : C.offwhite,
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              transform: dragActive ? "scale(1.01)" : "scale(1)"
            }}
            onMouseOver={e => { if(!dragActive && !fileName) e.currentTarget.style.background = "rgba(15, 32, 68, 0.02)"; }}
            onMouseOut={e => { if(!dragActive && !fileName) e.currentTarget.style.background = C.offwhite; }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <div style={{ fontSize: "1.8rem", marginBottom: 8, animation: dragActive ? "spin 1s linear infinite" : "none" }}>
              {fileName ? "📄" : "📎"}
            </div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: fileName ? C.teal : C.navy }}>
              {fileName || "Upload TAT Ruling / URA Letter"}
            </div>
            <div style={{ fontSize: "0.74rem", color: C.muted, marginTop: 4, fontWeight: 500 }}>
              Supports PDF or TXT up to 15MB
            </div>
          </div>

          <div style={{ textAlign: "center", color: C.muted, fontSize: "0.78rem", fontWeight: 600, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            — or paste text excerpts —
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste text contents of the ruling or write a detailed summary of your tax query here..."
            className="input-focus-ring"
            style={{
              width: "100%",
              border: `1.5px solid ${C.border}`,
              borderRadius: 10,
              padding: 16,
              fontSize: "0.875rem",
              fontFamily: "inherit",
              resize: "vertical",
              minHeight: 200,
              outline: "none",
              background: C.offwhite,
              boxSizing: "border-box",
              color: C.text,
              transition: "all 0.2s ease"
            }}
          />

          <div style={{ display: "flex", gap: 12, marginTop: 18, alignItems: "center" }}>
            <select
              value={caseType}
              onChange={(e) => setCaseType(e.target.value)}
              className="input-focus-ring"
              style={{
                flex: 1,
                border: `1.5px solid ${C.border}`,
                borderRadius: 8,
                padding: "11px 14px",
                fontSize: "0.85rem",
                fontFamily: "inherit",
                background: C.white,
                color: C.navy,
                fontWeight: 600,
                outline: "none",
                transition: "all 0.2s ease"
              }}
            >
              {["TAT Ruling", "URA Assessment", "Income Tax", "VAT Dispute", "PAYE Issue", "eFRIS Compliance", "General Scenario"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <Button onClick={analyze} disabled={loading || (!text.trim() && !file)}>
              {loading ? "⟳ Analyzing..." : "Run AI Analysis →"}
            </Button>
          </div>
        </Card>

        <Card style={{ padding: 28, minHeight: 460, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid rgba(15,32,68,0.05)", paddingBottom: 16 }}>
            <div style={{ fontWeight: 800, color: C.navy, fontSize: "0.98rem" }}>✦ Analysis Findings</div>
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
                flex: 1,
                color: C.muted,
                gap: 12,
                padding: "40px 0"
              }}
            >
              <div style={{ fontSize: "3rem", opacity: 0.25 }}>📊</div>
              <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>Ready for case analysis</div>
              <p style={{ fontSize: "0.78rem", color: C.muted, textAlign: "center", maxWidth: 240 }}>
                Upload your document or paste the content on the left to see findings.
              </p>
            </div>
          )}

          {loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                gap: 16,
                padding: "40px 0"
              }}
            >
              <div style={{ fontSize: "2.5rem", animation: "spin 1s linear infinite", color: C.teal }}>⟳</div>
              <div style={{ fontSize: "0.9rem", color: C.navy, fontWeight: 700 }}>AI Tax Engine Active...</div>
              <p style={{ fontSize: "0.78rem", color: C.muted, textAlign: "center", maxWidth: 220 }}>
                Reading pages, matching precedents, and drafting summaries.
              </p>
            </div>
          )}

          {result && result.error && (
            <div style={{ color: C.red, fontSize: "0.875rem", padding: "24px 0", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>⚠</div>
              <strong>Analysis failed.</strong>
              <p style={{ marginTop: 8, fontSize: "0.82rem", color: C.muted }}>
                Please check your internet connection and verify that you have added your Anthropic API Key in `.env.local`.
              </p>
            </div>
          )}

          {result && !result.error && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              
              {/* Risk Level Badge Row */}
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between", 
                background: C.offwhite, 
                padding: "12px 16px", 
                borderRadius: 12,
                border: "1px solid rgba(15,32,68,0.04)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 800, color: C.navy }}>EXPOSURE LEVEL:</span>
                  <Badge
                    color={riskColors[result.risk]?.[0] || C.muted}
                    bg={riskColors[result.risk]?.[1] || C.offwhite}
                    style={{ fontWeight: 800 }}
                  >
                    {result.risk?.toUpperCase()}
                  </Badge>
                </div>
                <RiskGauge level={result.risk} />
              </div>

              {/* Accordion Summary */}
              <div>
                <AccordionHeader title="1. Summary of Dispute" isOpen={openSections.summary} onClick={() => toggleSection("summary")} />
                {openSections.summary && (
                  <div style={{ padding: "12px 14px 4px", fontSize: "0.875rem", color: C.text, lineHeight: 1.7 }}>
                    {result.summary}
                  </div>
                )}
              </div>

              {/* Accordion Key Issues */}
              <div>
                <AccordionHeader title="2. Key Legal Issues Identified" isOpen={openSections.issues} onClick={() => toggleSection("issues")} />
                {openSections.issues && (
                  <div style={{ padding: "12px 14px 4px" }}>
                    {result.keyIssues?.map((i, n) => (
                      <div key={n} style={{ fontSize: "0.875rem", color: C.text, marginBottom: 8, display: "flex", gap: 8 }}>
                        <span style={{ color: C.teal, fontWeight: 700 }}>•</span>
                        <span>{i}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Accordion Verdict */}
              <div>
                <AccordionHeader title="3. Tribunal Verdict / Decision" isOpen={openSections.verdict} onClick={() => toggleSection("verdict")} />
                {openSections.verdict && (
                  <div style={{ padding: "12px 14px 4px" }}>
                    <div style={{ borderLeft: `3.5px solid ${C.gold}`, background: C.goldLight, padding: "12px 16px", borderRadius: "0 8px 8px 0" }}>
                      <div style={{ fontSize: "0.875rem", color: C.text, lineHeight: 1.6, fontWeight: 500 }}>
                        {result.verdict}
                      </div>
                      {result.riskNote && (
                        <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 8, fontStyle: "italic" }}>
                          ℹ {result.riskNote}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion Advice */}
              <div>
                <AccordionHeader title="4. Professional Advice & Next Steps" isOpen={openSections.advice} onClick={() => toggleSection("advice")} />
                {openSections.advice && (
                  <div style={{ padding: "12px 14px 4px", fontSize: "0.875rem", color: C.text, lineHeight: 1.7 }}>
                    {result.advice}
                  </div>
                )}
              </div>

              {/* Accordion Law & Tags */}
              <div>
                <AccordionHeader title="5. Applicable Law & References" isOpen={openSections.law} onClick={() => toggleSection("law")} />
                {openSections.law && (
                  <div style={{ padding: "12px 14px 4px", display: "flex", flexDirection: "column", gap: 12 }}>
                    {result.applicableLaw && result.applicableLaw.length > 0 && (
                      <div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {result.applicableLaw.map((l) => (
                            <Badge key={l} color={C.navy} bg="#E8EDF5">
                              ⚖️ {l}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.tags && result.tags.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, borderTop: "1px solid rgba(15,32,68,0.03)", paddingTop: 8 }}>
                        {result.tags.map((t) => (
                          <Badge key={t} color={C.teal} bg={C.tealLight}>
                            #{t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}
        </Card>
      </div>

      {reports.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <div style={{ fontWeight: 800, color: C.navy, marginBottom: 16, fontSize: "0.98rem" }}>📁 Recent Analyses Reports</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {reports.map((r) => (
              <Card
                key={r.id}
                style={{ padding: "18px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", gap: 12 }}
                hover
                onClick={() => loadPastReport(r)}
              >
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 700, color: C.navy, lineHeight: 1.45 }}>{r.title}</div>
                  <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 4, fontWeight: 500 }}>
                    📅 {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", borderTop: "1px solid rgba(15,32,68,0.04)", paddingTop: 10 }}>
                  <span style={{ fontSize: "0.78rem", color: C.teal, fontWeight: 700 }}>View Report →</span>
                  <Badge
                    color={riskColors[r.risk_level]?.[0] || C.muted}
                    bg={riskColors[r.risk_level]?.[1] || C.offwhite}
                    style={{ fontWeight: 700 }}
                  >
                    {r.risk_level?.toUpperCase()}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};;
