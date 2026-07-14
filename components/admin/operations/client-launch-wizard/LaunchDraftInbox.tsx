"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { getLaunchPackagePreset, type LaunchWizardDraftRecord } from "@/lib/client-launch-wizard";

type InboxRow = {
  draft: LaunchWizardDraftRecord;
  readinessLabel: string;
  canLaunch: boolean;
  blockerCount: number;
};

const STEP_LABELS: Record<string, string> = {
  identity: "Identity",
  package: "Package",
  experience: "Experience",
  modules: "Modules",
  infrastructure: "Infrastructure",
  team: "Team",
  automation: "Automation",
  review: "Review",
  launch: "Launch",
};

export function LaunchDraftInbox({ rows }: { rows: InboxRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function abandon(draftId: string | number, name: string) {
    const confirmed = window.confirm(
      `Abandon draft for “${name || "Untitled client"}”? Live clients are not affected.`,
    );
    if (!confirmed) return;
    setError(null);
    setPendingId(draftId);
    startTransition(async () => {
      const response = await fetch(
        `/api/admin/client-launch-wizard/drafts/${draftId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "abandon" }),
        },
      );
      const data = await response.json();
      setPendingId(null);
      if (!response.ok || !data.success) {
        setError(data.message || "Could not abandon draft.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="kxd-launch-wizard__panel kxd-launch-wizard__inbox-panel">
      <header className="kxd-launch-wizard__step-head">
        <h2>Open drafts</h2>
        <p className="kxd-launch-wizard__hint">
          Resume configuration. Abandoned and launched drafts stay out of this list.
        </p>
      </header>
      {error ? <p className="kxd-launch-wizard__error">{error}</p> : null}
      {rows.length === 0 ? (
        <div className="kxd-launch-wizard__empty-state">
          <p>No open drafts.</p>
          <p className="kxd-launch-wizard__hint">
            Start a new client when you are ready to configure the workspace.
          </p>
        </div>
      ) : (
        <div className="kxd-launch-wizard__inbox">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Package</th>
                <th>Step</th>
                <th>Status</th>
                <th>Readiness</th>
                <th>Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ draft, readinessLabel, blockerCount }) => {
                const packageLabel =
                  getLaunchPackagePreset(draft.payload.package.packageId)?.catalogLabel ??
                  draft.payload.package.packageId;
                const name =
                  draft.payload.identity.businessName.trim() || `Draft ${draft.id}`;
                return (
                  <tr key={draft.id}>
                    <td>
                      <strong className="kxd-launch-wizard__inbox-name">{name}</strong>
                    </td>
                    <td>{packageLabel}</td>
                    <td>{STEP_LABELS[draft.currentStep] ?? draft.currentStep}</td>
                    <td>
                      <span
                        className="kxd-launch-wizard__status-pill"
                        data-status={draft.status}
                      >
                        {draft.status}
                      </span>
                    </td>
                    <td>
                      {readinessLabel}
                      {blockerCount > 0
                        ? ` · ${blockerCount} blocker${blockerCount === 1 ? "" : "s"}`
                        : ""}
                    </td>
                    <td>
                      {new Date(draft.updatedAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="kxd-launch-wizard__inbox-actions">
                      <Link
                        href={`/admin/operations/clients/launch/${draft.id}`}
                        className="kxd-launch-wizard__secondary"
                      >
                        Resume
                      </Link>
                      {draft.status !== "launching" ? (
                        <button
                          type="button"
                          className="kxd-launch-wizard__ghost"
                          disabled={pending && pendingId === draft.id}
                          onClick={() => abandon(draft.id, name)}
                        >
                          Abandon
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
