"use client";

import { useState } from "react";
import Link from "next/link";
import { runClientActivityBackfill } from "@/lib/client-command/activity/actions";
import type { ActivityBackfillResult } from "@/lib/client-command/activity/types";

export function ClientActivityBackfillPanel() {
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<ActivityBackfillResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBackfill() {
    setStatus("running");
    setError(null);
    setResult(null);

    try {
      const parsed = clientId.trim() ? Number(clientId) : undefined;
      const backfillResult = await runClientActivityBackfill(parsed);
      setResult(backfillResult);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backfill failed.");
      setStatus("error");
    }
  }

  return (
    <div className="kxd-os-command-backfill">
      <header className="kxd-os-command-backfill__hero">
        <p className="kxd-os-eyebrow">KXD OS · Client Command</p>
        <h1 className="kxd-os-headline kxd-os-headline--presence">Activity backfill</h1>
        <p className="kxd-os-command-hub__lead">
          Scans existing client records — projects, requests, proposals, retainers, notes,
          meetings, and infrastructure — and publishes missing timeline events to{" "}
          <code>executive-timeline-events</code>. Safe to run multiple times: duplicate{" "}
          <code>sourceId + eventType</code> pairs are skipped.
        </p>
      </header>

      <div className="kxd-os-command-timeline-form">
        <label className="kxd-os-command-timeline-form__field">
          <span>Client ID (optional — leave blank for all clients up to 500)</span>
          <input
            type="number"
            min={1}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="e.g. 12"
            className="kxd-os-command-timeline-form__input"
          />
        </label>

        <div className="kxd-os-command-timeline-form__actions">
          <button
            type="button"
            className="kxd-os-command-timeline-actions__btn kxd-os-command-timeline-actions__btn--primary"
            disabled={status === "running"}
            onClick={() => handleBackfill()}
          >
            {status === "running" ? "Running backfill…" : "Run backfill"}
          </button>
          <Link href="/admin/operations/client-command" className="kxd-os-link-quiet">
            ← Back to hub
          </Link>
        </div>

        {error ? <p className="kxd-os-command-timeline-form__error">{error}</p> : null}

        {result ? (
          <ul className="kxd-os-workspace-list">
            <li className="kxd-os-workspace-list__item">
              Created: {result.created} · Skipped (already present): {result.skipped}
            </li>
            <li className="kxd-os-workspace-list__item">
              Clients processed: {result.clientsProcessed}
            </li>
            {result.errors.length > 0 ? (
              <li className="kxd-os-workspace-list__item">
                Errors: {result.errors.join("; ")}
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
