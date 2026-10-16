"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import { KxdButton, KxdPage, type KxdBadgeVariant } from "@/components/os";
import { assignedApproverLine, resolveAssignedApproverName } from "@/lib/staff/approval-presentation";
import type { StaffGuidedWorkData } from "@/lib/staff/types";
import { WORK_STATUS_LABELS } from "@/lib/work/constants";
import type { WorkStatus } from "@/lib/work/types";
import { StaffAskHelpControl } from "./StaffAskHelpControl";

function statusVariant(status: string): KxdBadgeVariant {
  if (status === "blocked") return "critical";
  if (status === "review" || status === "waiting-on-kxd") return "pending";
  if (status === "completed") return "success";
  if (status === "in-progress") return "warning";
  return "status";
}

function displayStatus(status: string): string {
  const key = status as WorkStatus;
  return WORK_STATUS_LABELS[key] ?? status;
}

function formatDue(dueDate: string | null): string | null {
  if (!dueDate) return null;
  const key = dueDate.slice(0, 10);
  const date = new Date(`${key}T12:00:00`);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export interface StaffGuidedWorkScreenProps {
  data: StaffGuidedWorkData;
  readOnly?: boolean;
  canAct?: boolean;
  onCheck?: () => void | Promise<void>;
}

export function StaffGuidedWorkScreen({
  data,
  readOnly = false,
  canAct = true,
  onCheck,
}: StaffGuidedWorkScreenProps) {
  const router = useRouter();
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(data.checklist.map((item) => [item.id, false])),
  );
  const [busy, setBusy] = useState<"check" | "review" | "complete" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requiredComplete = useMemo(
    () => data.checklist.filter((item) => item.required).every((item) => checked[item.id]),
    [checked, data.checklist],
  );

  const mutationsDisabled = readOnly || !canAct;
  const dueLabel = formatDue(data.dueDate);
  const approverName = resolveAssignedApproverName({
    requiresApproval: data.requiresMattApproval,
  });
  const approverLine = assignedApproverLine(approverName);

  function toggleChecklist(id: string) {
    if (mutationsDisabled) return;
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleCheck() {
    if (onCheck) {
      setBusy("check");
      setError(null);
      try {
        await onCheck();
        setMessage("Checklist review recorded. Adjust anything that is not honestly complete.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not check work.");
      } finally {
        setBusy(null);
      }
      return;
    }
    setMessage("Review each checklist item against KXD records. Do not mark complete unless it is true.");
  }

  async function handleSubmitReview() {
    if (mutationsDisabled || !data.requiresMattApproval) return;
    setBusy("review");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/staff/work/${data.workId}/submit-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist: checked }),
      });
      const payload = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || payload.success === false) {
        throw new Error(payload.error ?? "Could not submit for approval.");
      }
      setMessage("Submitted for approval. Do not send or finalize externally.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit for review.");
    } finally {
      setBusy(null);
    }
  }

  async function handleComplete() {
    if (mutationsDisabled || !data.canCompleteIndependently || !requiredComplete) return;
    setBusy("complete");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/staff/work/${data.workId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklist: checked }),
      });
      const payload = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || payload.success === false) {
        throw new Error(payload.error ?? "Could not complete this work item.");
      }
      setMessage("Work marked complete. Return to staff home for your next action.");
      router.push(data.hrefBack);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete work.");
    } finally {
      setBusy(null);
    }
  }

  const heroLead =
    data.summary?.trim() ||
    (data.description
      ? "Open the instructions below, then use the checklist when you are ready to finish."
      : data.whyItMatters);

  return (
    <OperationsShell activeId="staff" variant="staff">
      <KxdPage className="kxd-os-page--ops kxd-os-page--staff kxd-os-page--staff-guided-work">
        <div className="kxd-os-staff-guided__header">
          <OperationsPageHero eyebrow="Assigned task" title={data.title} lead={heroLead} />

          <p className="kxd-os-staff-guided__crumb">
            <Link href={data.hrefMyWork} className="kxd-os-link-quiet">
              My work
            </Link>
            <span aria-hidden="true"> · </span>
            <Link href={data.hrefBack} className="kxd-os-link-quiet">
              Staff home
            </Link>
          </p>

          <div className="kxd-os-staff-guided__meta-bar">
            <OpsStatusBadge label={displayStatus(data.status)} variant={statusVariant(data.status)} />
            {data.priority ? (
              <OpsStatusBadge label={data.priority} variant="warning" />
            ) : null}
            {data.clientLabel ? (
              <span className="kxd-os-staff-guided__meta-item">Client · {data.clientLabel}</span>
            ) : null}
            {dueLabel ? (
              <span className="kxd-os-staff-guided__meta-item">Due · {dueLabel}</span>
            ) : (
              <span className="kxd-os-meta kxd-os-staff-guided__meta-item">No due date</span>
            )}
          </div>

          {data.requiresMattApproval ? (
            <div className="kxd-os-staff-guided__approval" role="note">
              <p className="kxd-os-staff-guided__approval-title">Studio approval required</p>
              <p className="kxd-os-meta">
                Prepare your work, then use <strong>Prepare for Review</strong>. Do not send, publish,
                or change access, billing, or client commitments without approval.
              </p>
              {approverLine ? <p className="kxd-os-meta">{approverLine}</p> : null}
            </div>
          ) : (
            <p className="kxd-os-meta kxd-os-staff-guided__independent">
              You may complete this task when the checklist is honestly done — stay inside your
              permission boundary.
            </p>
          )}
        </div>

        <div className="kxd-os-staff-guided__layout">
          <div className="kxd-os-staff-guided__main">
            {data.description ? (
              <OpsCard className="kxd-os-ops-card-padding kxd-os-staff-guided__section">
                <OpsSectionHead label="Instructions" />
                <p className="kxd-os-staff-my-work__prose kxd-os-staff-guided__instructions">
                  {data.description}
                </p>
              </OpsCard>
            ) : null}

            {data.notes ? (
              <OpsCard className="kxd-os-ops-card-padding kxd-os-staff-guided__section">
                <OpsSectionHead label="Notes" />
                <pre className="kxd-os-staff-my-work__notes">{data.notes}</pre>
              </OpsCard>
            ) : null}

            <OpsCard className="kxd-os-ops-card-padding kxd-os-staff-guided__section">
              <OpsSectionHead label="Permission boundary" />
              <p className="kxd-os-staff-guided__boundary">{data.permissionBoundary}</p>
            </OpsCard>

            <details className="kxd-os-staff-guided__details">
              <summary className="kxd-os-staff-guided__details-summary">Work guidance</summary>
              <div className="kxd-os-staff-guided__details-body">
                <section>
                  <h3 className="kxd-os-section__label">What to produce</h3>
                  <ul className="kxd-os-staff-guided__bullets">
                    {data.whatToProduce.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h3 className="kxd-os-section__label">Steps</h3>
                  <ol className="kxd-os-staff-guided__steps">
                    {data.steps.map((step) => (
                      <li key={step.title}>
                        <span className="kxd-os-staff-guided__step-title">{step.title}</span>
                        <span className="kxd-os-meta">{step.detail}</span>
                      </li>
                    ))}
                  </ol>
                </section>
                {data.examples.length > 0 ? (
                  <section>
                    <h3 className="kxd-os-section__label">Examples</h3>
                    <ul className="kxd-os-staff-guided__bullets">
                      {data.examples.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                <section>
                  <h3 className="kxd-os-section__label">Context on file</h3>
                  <ul className="kxd-os-staff-guided__bullets">
                    {data.whatKxdKnows.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              </div>
            </details>

            {data.activityHistory.length > 0 ? (
              <OpsCard className="kxd-os-ops-card-padding kxd-os-staff-guided__section">
                <OpsSectionHead label="Activity" />
                <ul className="kxd-os-staff-my-work__activity">
                  {data.activityHistory.map((entry, index) => (
                    <li key={`${entry.at}-${index}`}>
                      <span className="kxd-os-meta">
                        {entry.at.slice(0, 16).replace("T", " ")}
                        {entry.actor ? ` · ${entry.actor}` : ""}
                      </span>
                      <p>
                        {entry.action}
                        {entry.detail ? ` — ${entry.detail}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </OpsCard>
            ) : null}
          </div>

          <aside className="kxd-os-staff-guided__aside">
            <OpsCard className="kxd-os-ops-card-padding kxd-os-staff-guided__checklist-card">
              <OpsSectionHead label="Completion checklist" />
              <ul className="kxd-os-staff-guided__checklist">
                {data.checklist.map((item) => (
                  <li key={item.id}>
                    <label className="kxd-os-staff-guided__check-label">
                      <input
                        type="checkbox"
                        checked={Boolean(checked[item.id])}
                        disabled={mutationsDisabled}
                        onChange={() => toggleChecklist(item.id)}
                      />
                      <span>
                        {item.label}
                        {item.required ? (
                          <span className="kxd-os-meta"> Required</span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>

              {message ? <p className="kxd-os-meta kxd-os-staff-guided__feedback">{message}</p> : null}
              {error ? (
                <p className="kxd-os-meta kxd-os-staff-guided__feedback kxd-os-staff-guided__feedback--error">
                  {error}
                </p>
              ) : null}

              <div className="kxd-os-staff-guided__actions">
                <KxdButton
                  type="button"
                  variant="secondary"
                  loading={busy === "check"}
                  disabled={mutationsDisabled}
                  onClick={handleCheck}
                >
                  Check my work
                </KxdButton>

                {data.requiresMattApproval ? (
                  <KxdButton
                    type="button"
                    variant="primary"
                    loading={busy === "review"}
                    disabled={mutationsDisabled || !requiredComplete}
                    onClick={handleSubmitReview}
                  >
                    Prepare for Review
                  </KxdButton>
                ) : null}

                {data.canCompleteIndependently && canAct ? (
                  <KxdButton
                    type="button"
                    variant="primary"
                    loading={busy === "complete"}
                    disabled={mutationsDisabled || !requiredComplete}
                    onClick={handleComplete}
                  >
                    Complete
                  </KxdButton>
                ) : null}
              </div>

              {readOnly ? (
                <p className="kxd-os-meta kxd-os-staff-guided__preview-note">
                  Preview mode — changes are disabled.
                </p>
              ) : null}
            </OpsCard>

            <StaffAskHelpControl
              pagePath={`/admin/operations/staff/work/${data.workId}`}
              workId={data.workId}
              workTitle={data.title}
              clientLabel={data.clientLabel}
              canAct={canAct}
              isPreview={readOnly}
              existing={data.helpRequests}
              defaultOpen={data.status === "blocked"}
              contextKind="guided-work"
              contextLabel={data.title}
            />
          </aside>
        </div>
      </KxdPage>
    </OperationsShell>
  );
}
