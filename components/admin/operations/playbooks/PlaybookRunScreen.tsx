"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  KxdBadge,
  KxdPage,
  KxdSection,
  type KxdBadgeVariant,
} from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsKpiStrip,
  OpsListRow,
  OpsSectionHead,
} from "@/components/admin/operations/shared/OpsBriefing";
import {
  AUTOMATION_TRIGGER_LABELS,
  PLAYBOOK_RUN_STATUS_LABELS,
} from "@/lib/playbooks/labels";
import type { PlaybookRunDetail } from "@/lib/playbooks/types";

function statusVariant(status: string): KxdBadgeVariant {
  switch (status) {
    case "completed":
      return "success";
    case "blocked":
      return "critical";
    case "in-progress":
      return "status";
    default:
      return "default";
  }
}

export function PlaybookRunScreen({ run }: { run: PlaybookRunDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function post(path: string, body?: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function completeStep(stepId: number) {
    void post(`/api/admin/playbooks/runs/${run.id}/complete-step`, { stepId });
  }

  function skipStep(stepId: number) {
    void post(`/api/admin/playbooks/runs/${run.id}/skip-step`, { stepId });
  }

  function blockRun() {
    void post(`/api/admin/playbooks/runs/${run.id}/block`, { reason: "Marked blocked from runner" });
  }

  return (
    <OperationsShell activeId="playbooks">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Playbook Runner"
          title={run.playbookName}
          lead={`${run.clientName} · ${PLAYBOOK_RUN_STATUS_LABELS[run.status]}`}
        />

        <p className="kxd-os-meta" style={{ marginBottom: "1rem" }}>
          <Link href="/admin/operations/playbooks" className="kxd-os-link-quiet">
            ← All playbooks
          </Link>
          {" · "}
          <Link
            href={`/admin/operations/client-command/${run.clientId}`}
            className="kxd-os-link-quiet"
          >
            Client Command Center
          </Link>
        </p>

        <OpsKpiStrip
          items={[
            { label: "Progress", value: `${run.percentComplete}%`, alert: run.status === "blocked" },
            { label: "Status", value: PLAYBOOK_RUN_STATUS_LABELS[run.status] },
            { label: "Steps", value: String(run.steps.length) },
            {
              label: "Duration",
              value: run.durationMinutes != null ? `${run.durationMinutes} min` : "—",
            },
          ]}
        />

        <KxdSection label="Steps" className="kxd-os-operations-section">
          <div className="kxd-os-list-stack">
            {run.steps.map((step) => (
              <div key={step.id} className="kxd-os-ops-list-row">
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <p className="kxd-os-body">
                      {step.order}. {step.title}
                    </p>
                    {step.description ? <p className="kxd-os-meta">{step.description}</p> : null}
                    {step.linkedModule ? (
                      <p className="kxd-os-meta">Module · {step.linkedModule}</p>
                    ) : null}
                    {step.automationTrigger && step.automationTrigger !== "none" ? (
                      <p className="kxd-os-meta">
                        Hook · {AUTOMATION_TRIGGER_LABELS[step.automationTrigger as keyof typeof AUTOMATION_TRIGGER_LABELS] ?? step.automationTrigger}
                      </p>
                    ) : null}
                  </div>
                  <KxdBadge variant={step.state === "completed" ? "success" : step.state === "current" ? "status" : "default"}>
                    {step.state}
                  </KxdBadge>
                </div>
                {step.state === "current" || step.state === "pending" ? (
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
                      disabled={busy || run.status === "completed"}
                      onClick={() => completeStep(step.id)}
                    >
                      Complete step
                    </button>
                    {!step.required ? (
                      <button
                        type="button"
                        className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
                        disabled={busy}
                        onClick={() => skipStep(step.id)}
                      >
                        Skip
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </KxdSection>

        {run.status !== "completed" && run.status !== "blocked" ? (
          <div style={{ marginTop: "1rem" }}>
            <button
              type="button"
              className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
              disabled={busy}
              onClick={blockRun}
            >
              Mark blocked
            </button>
          </div>
        ) : null}
      </KxdPage>
    </OperationsShell>
  );
}
