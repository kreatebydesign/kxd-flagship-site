"use client";

import { useState } from "react";

/**
 * Phase 31C — Minimal production trigger for entitled reporting ingest.
 * Calls protected /api/admin/reporting/ingest (admin session cookies).
 */
export function SyncReportingFactsForm({
  clients,
  defaultClientSlug,
}: {
  clients: { id: number; name: string; slug: string | null }[];
  defaultClientSlug?: string | null;
}) {
  const defaultId =
    clients.find((c) => c.slug === defaultClientSlug)?.id ?? clients[0]?.id ?? "";
  const [clientId, setClientId] = useState<number | "">(defaultId);
  const [provider, setProvider] = useState<"search-console" | "ga4">(
    "search-console",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    if (!clientId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/reporting/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: Number(clientId),
          provider,
          refresh: true,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
        outcome?: string;
        factsWritten?: number;
        factsCreated?: number;
        factsUpdated?: number;
        requestedPeriod?: { label?: string; start?: string; end?: string };
        providerStatus?: string;
      };
      if (!res.ok && !json.success) {
        setError(json.error ?? json.message ?? "Sync failed.");
        return;
      }
      const periodLabel =
        json.requestedPeriod?.label ??
        (json.requestedPeriod?.start
          ? `${json.requestedPeriod.start} → ${json.requestedPeriod.end}`
          : "period");
      setMessage(
        `${json.outcome ?? "done"} · ${periodLabel} · written ${json.factsWritten ?? 0} (created ${json.factsCreated ?? 0}, updated ${json.factsUpdated ?? 0}) · status ${json.providerStatus ?? "—"}`,
      );
    } catch {
      setError("Network error during reporting sync.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kxd-os-card">
      <p className="kxd-os-section__label">Sync live reporting facts</p>
      <p className="kxd-os-body" style={{ marginTop: "0.5rem" }}>
        Pulls entitled Google provider data into Shared Core ReportingFacts.
        Defaults to the previous completed calendar month. Requires production
        Google auth (Vercel OIDC).
      </p>
      <div className="kxd-os-form-grid" style={{ marginTop: "1rem" }}>
        <select
          className="kxd-os-input"
          value={clientId}
          onChange={(e) => setClientId(Number(e.target.value))}
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="kxd-os-input"
          value={provider}
          onChange={(e) =>
            setProvider(e.target.value as "search-console" | "ga4")
          }
        >
          <option value="search-console">Search Console</option>
          <option value="ga4">Google Analytics 4</option>
        </select>
      </div>
      <button
        type="button"
        className="kxd-os-btn kxd-os-btn--primary"
        style={{ marginTop: "1rem" }}
        disabled={busy || !clientId}
        onClick={handleSync}
      >
        {busy ? "Syncing…" : "Sync reporting now"}
      </button>
      {message ? (
        <p className="kxd-os-body" style={{ marginTop: "0.75rem" }}>
          {message}
        </p>
      ) : null}
      {error ? (
        <p
          className="kxd-os-body"
          style={{ color: "var(--kxd-os-critical)", marginTop: "0.75rem" }}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
