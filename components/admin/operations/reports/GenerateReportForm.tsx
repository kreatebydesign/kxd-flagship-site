"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GenerateReportForm({
  clients,
  defaultMonth,
  defaultYear,
}: {
  clients: { id: number; name: string }[];
  defaultMonth: number;
  defaultYear: number;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [templateSlug, setTemplateSlug] = useState("standard-monthly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!clientId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: Number(clientId), month, year, templateSlug }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Generation failed.");
        return;
      }
      router.push(`/admin/operations/reports/${json.reportId}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kxd-os-card">
      <p className="kxd-os-section__label">Generate monthly report</p>
      <div className="kxd-os-form-grid" style={{ marginTop: "1rem" }}>
        <select className="kxd-os-input" value={clientId} onChange={(e) => setClientId(Number(e.target.value))}>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input className="kxd-os-input" type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} />
        <input className="kxd-os-input" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        <select className="kxd-os-input" value={templateSlug} onChange={(e) => setTemplateSlug(e.target.value)}>
          <option value="standard-monthly">Standard Monthly</option>
          <option value="website-care">Website Care</option>
          <option value="seo-report">SEO</option>
          <option value="growth-report">Growth</option>
        </select>
      </div>
      <button type="button" className="kxd-os-btn" style={{ marginTop: "1rem" }} disabled={busy} onClick={handleGenerate}>
        {busy ? "Generating…" : "Generate Monthly Report"}
      </button>
      {error ? <p className="kxd-os-body" style={{ color: "var(--kxd-os-critical)", marginTop: "0.75rem" }}>{error}</p> : null}
    </div>
  );
}
