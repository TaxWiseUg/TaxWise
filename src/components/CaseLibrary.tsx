import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { C } from "../lib/constants";
import { Badge, Card, Modal } from "./UI";

interface TatCase {
  id: string;
  case_number: string;
  title: string;
  year: number;
  tax_type: string;
  outcome: string; // Allowed, Dismissed, Partial
  summary: string;
  full_text?: string;
  ai_commentary?: string;
}

export const CaseLibrary: React.FC = () => {
  const [cases, setCases] = useState<TatCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [outcomeFilter, setOutcomeFilter] = useState("All");
  const [selected, setSelected] = useState<TatCase | null>(null);

  // Fetch precedents from database
  useEffect(() => {
    const fetchCases = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("tat_cases")
          .select("*")
          .order("year", { ascending: false });

        if (error) throw error;
        if (data) setCases(data as TatCase[]);
      } catch (err) {
        console.error("Error fetching TAT cases:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCases();
  }, []);

  const types = ["All", ...new Set(cases.map((c) => c.tax_type))];
  const years = ["All", ...new Set(cases.map((c) => String(c.year)))];
  const outcomes = ["All", "Allowed", "Dismissed", "Partial"];

  const filtered = cases.filter((c) => {
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.case_number.toLowerCase().includes(q) ||
      c.summary.toLowerCase().includes(q) ||
      c.tax_type.toLowerCase().includes(q);

    const matchesType = typeFilter === "All" || c.tax_type === typeFilter;
    const matchesYear = yearFilter === "All" || String(c.year) === yearFilter;
    const matchesOutcome = outcomeFilter === "All" || c.outcome === outcomeFilter;

    return matchesQuery && matchesType && matchesYear && matchesOutcome;
  });

  const outcomeColors: Record<string, [string, string]> = {
    Allowed: [C.green, C.greenLight],
    Dismissed: [C.red, C.redLight],
    Partial: [C.gold, C.goldLight],
  };

  return (
    <div>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.6rem", color: C.navy, marginBottom: 6 }}>
        TAT Case Precedent Library
      </h1>
      <p style={{ color: C.muted, fontSize: "0.9rem", marginBottom: 20 }}>
        Search and explore Tax Appeals Tribunal rulings. Click any case for an AI-powered expert analysis.
      </p>

      <Card style={{ padding: 20, marginBottom: 20 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍  Search by case name, reference, tags, or keyword..."
          style={{
            width: "100%",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "11px 16px",
            fontSize: "0.9rem",
            fontFamily: "inherit",
            outline: "none",
            background: C.offwhite,
            boxSizing: "border-box",
            color: C.text,
            marginBottom: 14,
          }}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {[
            ["Type", types, typeFilter, setTypeFilter],
            ["Year", years, yearFilter, setYearFilter],
            ["Outcome", outcomes, outcomeFilter, setOutcomeFilter],
          ].map(([label, opts, val, set]) => (
            <div key={label as string} style={{ display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: C.muted, marginRight: 6 }}>
                {label as string}:
              </span>
              <select
                value={val as string}
                onChange={(e) => (set as React.Dispatch<React.SetStateAction<string>>)(e.target.value)}
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: "6px 10px",
                  fontSize: "0.82rem",
                  fontFamily: "inherit",
                  background: C.white,
                  color: C.text,
                }}
              >
                {(opts as string[]).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          ))}
          <div style={{ marginLeft: "auto", fontSize: "0.82rem", color: C.muted }}>
            {filtered.length} case{filtered.length !== 1 ? "s" : ""} found
          </div>
        </div>
      </Card>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
          <div style={{ fontSize: "1.8rem", animation: "spin 1s linear infinite", marginBottom: 10 }}>⟳</div>
          <div>Loading TAT precedents...</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((c) => (
            <Card key={c.id} hover style={{ padding: "18px 22px", cursor: "pointer" }} onClick={() => setSelected(c)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: C.navy, fontSize: "0.95rem", marginBottom: 3 }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: C.muted, marginBottom: 8 }}>
                    {c.case_number} · {c.year}
                  </div>
                  <p style={{ fontSize: "0.85rem", color: C.text, lineHeight: 1.65, marginBottom: 10 }}>
                    {c.summary}
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
                  <Badge
                    color={outcomeColors[c.outcome]?.[0] || C.muted}
                    bg={outcomeColors[c.outcome]?.[1] || C.offwhite}
                  >
                    {c.outcome}
                  </Badge>
                  <Badge color={C.navy} bg="#E8EDF5">
                    {c.tax_type}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: C.muted }}>
              No cases match your search. Try different keywords or clear the filters.
            </div>
          )}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.case_number} width={640}>
        {selected && (
          <div>
            <h3 style={{ color: C.navy, marginBottom: 4, fontSize: "1rem" }}>{selected.title}</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <Badge
                color={outcomeColors[selected.outcome]?.[0] || C.muted}
                bg={outcomeColors[selected.outcome]?.[1] || C.offwhite}
              >
                {selected.outcome}
              </Badge>
              <Badge color={C.navy} bg="#E8EDF5">
                {selected.tax_type}
              </Badge>
              <Badge color={C.muted} bg={C.offwhite}>
                {selected.year}
              </Badge>
            </div>
            <div style={{ fontSize: "0.875rem", color: C.text, lineHeight: 1.75, marginBottom: 20 }}>
              {selected.summary}
            </div>
            {selected.ai_commentary && (
              <div style={{ background: C.tealLight, borderRadius: 10, padding: 16 }}>
                <div
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: C.teal,
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    marginBottom: 8,
                  }}
                >
                  ✦ AI Expert Commentary
                </div>
                <p style={{ fontSize: "0.875rem", color: C.text, lineHeight: 1.75 }}>{selected.ai_commentary}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
