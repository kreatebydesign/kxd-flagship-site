"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  RESEARCH_LEAD_SOURCES,
  RESEARCH_SERVICES,
} from "@/lib/research-leads";

const C = {
  bgInput: "#0B0B0B",
  cream: "#F5F1E8",
  creamMuted: "rgba(245,241,232,0.72)",
  gold: "#C9A962",
  green: "#C9A962",
  red: "#d25a5a",
  border: "rgba(255,255,255,0.08)",
  borderGold: "rgba(201,169,98,0.12)",
  sans: "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
} as const;

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontFamily: C.sans,
  fontSize: "0.8125rem",
  color: C.cream,
  background: C.bgInput,
  border: `1px solid ${C.border}`,
  padding: "0.625rem 0.75rem",
  outline: "none",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: C.sans, fontSize: "0.4375rem", fontWeight: 600,
      letterSpacing: "0.14em", textTransform: "uppercase",
      color: "rgba(255,255,255,0.35)", marginBottom: "0.5rem",
    }}>
      {children}
    </p>
  );
}

export function JuniorLeadForm() {
  const router = useRouter();
  const [source, setSource] = useState("Craigslist");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [leadUrl, setLeadUrl] = useState("");
  const [estimatedService, setEstimatedService] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/junior-creators/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          state,
          city,
          leadUrl,
          estimatedService: estimatedService || undefined,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message || "Submission failed.");
        return;
      }
      setState("");
      setCity("");
      setLeadUrl("");
      setEstimatedService("");
      setNotes("");
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Network error — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel>Lead Source</FieldLabel>
          <select value={source} onChange={(e) => setSource(e.target.value)} style={inputStyle}>
            {RESEARCH_LEAD_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>State</FieldLabel>
          <input value={state} onChange={(e) => setState(e.target.value)} placeholder="OR" style={inputStyle} />
        </div>
        <div>
          <FieldLabel>City</FieldLabel>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Portland" style={inputStyle} />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel>Opportunity URL</FieldLabel>
          <input value={leadUrl} onChange={(e) => setLeadUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
        </div>
        <div>
          <FieldLabel>Recommended Service</FieldLabel>
          <select value={estimatedService} onChange={(e) => setEstimatedService(e.target.value)} style={inputStyle}>
            <option value="">Select service…</option>
            {RESEARCH_SERVICES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <FieldLabel>Research Notes</FieldLabel>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Opportunity context, fit signals, follow-up notes…"
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>
      </div>
      {error && (
        <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.red, marginTop: "1rem" }}>{error}</p>
      )}
      {success && (
        <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.green, marginTop: "1rem" }}>
          Research lead submitted — great work.
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        style={{
          marginTop: "1.25rem",
          fontFamily: C.sans,
          fontWeight: 500,
          fontSize: "0.4375rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#080808",
          background: `linear-gradient(180deg, #d1b06b 0%, ${C.gold} 48%, #b09040 100%)`,
          border: "none",
          padding: "0.75rem 1.5rem",
          cursor: submitting ? "wait" : "pointer",
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? "Submitting…" : "Submit Research Lead"}
      </button>
    </form>
  );
}
