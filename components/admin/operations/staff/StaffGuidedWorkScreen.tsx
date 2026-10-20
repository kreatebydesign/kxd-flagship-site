"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import { KxdButton, KxdPage, type KxdBadgeVariant } from "@/components/os";
import { assignedApproverLine, resolveAssignedApproverName } from "@/lib/staff/approval-presentation";
import type { StaffDeliverableView } from "@/lib/staff/work-deliverables";
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

function formatActivityLabel(action: string): string {
  switch (action) {
    case "staff-progress-saved":
      return "Progress saved";
    case "staff-checklist-updated":
      return "Confirmation updated";
    case "staff-deliverables-updated":
      return "Deliverables updated";
    case "assignment-deliverables-updated":
      return "Assignment deliverables updated";
    case "staff-submitted-for-review":
      return "Submitted for review";
    case "status-changed":
      return "Status changed";
    case "returned":
      return "Returned for revision";
    case "updated":
      return "Updated";
    default:
      return action;
  }
}

type ProgressSaveState = "idle" | "saving" | "saved" | "error";
type ChecklistSaveState = "idle" | "saving" | "saved" | "error";
type DeliverableSaveState = "idle" | "saving" | "saved" | "error";

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
  const [staffProgress, setStaffProgress] = useState(data.staffProgressNotes ?? "");
  const [progressSaveState, setProgressSaveState] = useState<ProgressSaveState>("idle");
  const [progressSaveError, setProgressSaveError] = useState<string | null>(null);
  const [savedProgressSnapshot, setSavedProgressSnapshot] = useState(
    data.staffProgressNotes ?? "",
  );

  const [checked, setChecked] = useState<Record<string, boolean>>(() => ({
    ...data.checklistChecked,
  }));
  const [checklistSaveState, setChecklistSaveState] = useState<ChecklistSaveState>("idle");
  const [checklistSaveError, setChecklistSaveError] = useState<string | null>(null);
  const checklistDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedChecklistRef = useRef(JSON.stringify(data.checklistChecked));

  const [deliverables, setDeliverables] = useState<StaffDeliverableView[]>(() => [
    ...data.deliverables,
  ]);
  const [deliverableSaveState, setDeliverableSaveState] =
    useState<DeliverableSaveState>("idle");
  const [deliverableSaveError, setDeliverableSaveError] = useState<string | null>(null);
  const deliverableDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedDeliverablesRef = useRef(JSON.stringify(data.deliverables));

  const [busy, setBusy] = useState<"check" | "review" | "complete" | "progress" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const confirmationsComplete = useMemo(
    () => data.checklist.filter((item) => item.required).every((item) => checked[item.id]),
    [checked, data.checklist],
  );

  const deliverablesComplete = useMemo(() => {
    if (deliverables.length === 0) return true;
    return deliverables.filter((d) => d.required).every((d) => d.completed);
  }, [deliverables]);

  const requiredComplete = confirmationsComplete && deliverablesComplete;

  const deliverableProgressLabel = useMemo(() => {
    if (deliverables.length === 0) return null;
    const completed = deliverables.filter((d) => d.completed).length;
    return `${completed} of ${deliverables.length} deliverables`;
  }, [deliverables]);

  const mutationsDisabled = readOnly || !canAct;
  const dueLabel = formatDue(data.dueDate);
  const approverName = resolveAssignedApproverName({
    requiresApproval: data.requiresMattApproval,
  });
  const approverLine = assignedApproverLine(approverName);

  const progressDirty = staffProgress !== savedProgressSnapshot;

  useEffect(() => {
    if (progressSaveState !== "saved") return;
    const timer = setTimeout(() => setProgressSaveState("idle"), 3000);
    return () => clearTimeout(timer);
  }, [progressSaveState]);

  useEffect(() => {
    if (checklistSaveState !== "saved") return;
    const timer = setTimeout(() => setChecklistSaveState("idle"), 2500);
    return () => clearTimeout(timer);
  }, [checklistSaveState]);

  useEffect(() => {
    return () => {
      if (checklistDebounceRef.current) clearTimeout(checklistDebounceRef.current);
      if (deliverableDebounceRef.current) clearTimeout(deliverableDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    setDeliverables([...data.deliverables]);
    savedDeliverablesRef.current = JSON.stringify(data.deliverables);
  }, [data.deliverables]);

  const persistExecution = useCallback(
    async (body: {
      staffProgress?: string | null;
      checklist?: Record<string, boolean>;
      deliverables?: Record<string, boolean>;
    }) => {
      const res = await fetch(`/api/admin/staff/work/${data.workId}/execution`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json()) as {
        success?: boolean;
        error?: string;
        staffProgress?: string | null;
        checklist?: Record<string, boolean>;
        deliverables?: StaffDeliverableView[];
      };
      if (!res.ok || payload.success === false) {
        throw new Error(payload.error ?? "Could not save.");
      }
      if (payload.staffProgress !== undefined) {
        const next = payload.staffProgress ?? "";
        setStaffProgress(next);
        setSavedProgressSnapshot(next);
      }
      if (payload.checklist) {
        setChecked(payload.checklist);
        savedChecklistRef.current = JSON.stringify(payload.checklist);
      }
      if (payload.deliverables) {
        setDeliverables(payload.deliverables);
        savedDeliverablesRef.current = JSON.stringify(payload.deliverables);
      }
      return payload;
    },
    [data.workId],
  );

  const saveProgress = useCallback(async () => {
    if (mutationsDisabled) return;
    setBusy("progress");
    setProgressSaveState("saving");
    setProgressSaveError(null);
    try {
      await persistExecution({ staffProgress });
      setProgressSaveState("saved");
    } catch (err) {
      setProgressSaveState("error");
      setProgressSaveError(err instanceof Error ? err.message : "Could not save progress.");
    } finally {
      setBusy(null);
    }
  }, [mutationsDisabled, persistExecution, staffProgress]);

  const saveChecklist = useCallback(
    async (nextChecked: Record<string, boolean>) => {
      if (mutationsDisabled) return;
      const serialized = JSON.stringify(nextChecked);
      if (serialized === savedChecklistRef.current) return;

      setChecklistSaveState("saving");
      setChecklistSaveError(null);
      try {
        await persistExecution({ checklist: nextChecked });
        setChecklistSaveState("saved");
      } catch (err) {
        setChecklistSaveState("error");
        setChecklistSaveError(
          err instanceof Error ? err.message : "Could not save checklist.",
        );
      }
    },
    [mutationsDisabled, persistExecution],
  );

  function toggleChecklist(id: string) {
    if (mutationsDisabled) return;
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (checklistDebounceRef.current) clearTimeout(checklistDebounceRef.current);
      checklistDebounceRef.current = setTimeout(() => {
        void saveChecklist(next);
      }, 400);
      return next;
    });
  }

  const saveDeliverableToggle = useCallback(
    async (id: string, nextCompleted: boolean) => {
      if (mutationsDisabled) return;
      setDeliverableSaveState("saving");
      setDeliverableSaveError(null);
      try {
        await persistExecution({ deliverables: { [id]: nextCompleted } });
        setDeliverableSaveState("saved");
      } catch (err) {
        setDeliverableSaveState("error");
        setDeliverableSaveError(
          err instanceof Error ? err.message : "Could not save deliverable.",
        );
      }
    },
    [mutationsDisabled, persistExecution],
  );

  function toggleDeliverable(id: string) {
    if (mutationsDisabled) return;
    setDeliverables((prev) => {
      const next = prev.map((item) =>
        item.id === id
          ? {
              ...item,
              completed: !item.completed,
              completedAt: !item.completed ? new Date().toISOString() : null,
            }
          : item,
      );
      const target = next.find((item) => item.id === id);
      if (!target) return prev;
      if (deliverableDebounceRef.current) clearTimeout(deliverableDebounceRef.current);
      deliverableDebounceRef.current = setTimeout(() => {
        void saveDeliverableToggle(id, target.completed);
      }, 350);
      return next;
    });
  }

  async function flushBeforeSubmit() {
    if (progressDirty) {
      await persistExecution({ staffProgress });
      setProgressSaveState("saved");
    }
    const serialized = JSON.stringify(checked);
    if (serialized !== savedChecklistRef.current) {
      await persistExecution({ checklist: checked });
      setChecklistSaveState("saved");
    }
    if (JSON.stringify(deliverables) !== savedDeliverablesRef.current) {
      const toggles = Object.fromEntries(
        deliverables.map((item) => [item.id, item.completed]),
      );
      await persistExecution({ deliverables: toggles });
      setDeliverableSaveState("saved");
    }
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
      await flushBeforeSubmit();
      const res = await fetch(`/api/admin/staff/work/${data.workId}/submit-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
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
      await flushBeforeSubmit();
      const res = await fetch(`/api/admin/staff/work/${data.workId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
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
            {deliverableProgressLabel ? (
              <span className="kxd-os-staff-guided__meta-item kxd-os-staff-guided__meta-item--progress">
                {deliverableProgressLabel}
              </span>
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
            {(data.summary || data.instructionBlocks.length > 0) ? (
              <OpsCard className="kxd-os-ops-card-padding kxd-os-staff-guided__section">
                <OpsSectionHead label="Assignment overview" />
                {data.summary ? (
                  <p className="kxd-os-staff-guided__overview-summary">{data.summary}</p>
                ) : null}
                {data.instructionBlocks.length > 0 ? (
                  <div className="kxd-os-staff-guided__instruction-blocks">
                    {data.instructionBlocks.map((block) => (
                      <p key={block} className="kxd-os-staff-my-work__prose kxd-os-staff-guided__instructions">
                        {block}
                      </p>
                    ))}
                  </div>
                ) : null}
              </OpsCard>
            ) : null}

            {deliverables.length > 0 ? (
              <OpsCard className="kxd-os-ops-card-padding kxd-os-staff-guided__section">
                <OpsSectionHead label="Deliverables" />
                <p className="kxd-os-meta kxd-os-staff-guided__deliverables-count">
                  {deliverableProgressLabel}
                </p>
                <p className="kxd-os-meta kxd-os-staff-guided__deliverables-lead">
                  Check off each step when it is honestly complete. Required items must be done
                  before you submit for review.
                </p>
                <ul className="kxd-os-staff-guided__deliverables">
                  {deliverables.map((item, index) => (
                    <li
                      key={item.id}
                      className={
                        item.completed
                          ? "kxd-os-staff-guided__deliverable kxd-os-staff-guided__deliverable--done"
                          : "kxd-os-staff-guided__deliverable"
                      }
                    >
                      <label className="kxd-os-staff-guided__deliverable-label">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          disabled={mutationsDisabled}
                          onChange={() => toggleDeliverable(item.id)}
                        />
                        <span className="kxd-os-staff-guided__deliverable-body">
                          <span className="kxd-os-staff-guided__deliverable-title">
                            <span className="kxd-os-staff-guided__deliverable-index">
                              {index + 1}.
                            </span>
                            {item.title}
                            {item.required ? (
                              <span className="kxd-os-meta"> Required</span>
                            ) : (
                              <span className="kxd-os-meta"> Optional</span>
                            )}
                          </span>
                          {item.instructions ? (
                            <span className="kxd-os-meta kxd-os-staff-guided__deliverable-instructions">
                              {item.instructions}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                {deliverableSaveState === "saving" ? (
                  <p className="kxd-os-meta kxd-os-staff-guided__checklist-hint">Saving progress…</p>
                ) : null}
                {deliverableSaveState === "saved" ? (
                  <p className="kxd-os-meta kxd-os-staff-guided__checklist-hint kxd-os-staff-guided__checklist-hint--ok">
                    Progress saved
                  </p>
                ) : null}
                {deliverableSaveState === "error" && deliverableSaveError ? (
                  <p className="kxd-os-meta kxd-os-staff-guided__checklist-hint kxd-os-staff-guided__checklist-hint--error">
                    {deliverableSaveError}
                  </p>
                ) : null}
              </OpsCard>
            ) : null}

            {data.studioNotes ? (
              <OpsCard className="kxd-os-ops-card-padding kxd-os-staff-guided__section">
                <OpsSectionHead label="Studio notes" />
                <pre className="kxd-os-staff-my-work__notes kxd-os-staff-guided__studio-notes">
                  {data.studioNotes}
                </pre>
                <p className="kxd-os-meta kxd-os-staff-guided__studio-hint">
                  From the studio — read only. Add your updates under Your progress.
                </p>
              </OpsCard>
            ) : null}

            <OpsCard className="kxd-os-ops-card-padding kxd-os-staff-guided__section">
              <OpsSectionHead label="Your progress" />
              <p className="kxd-os-meta kxd-os-staff-guided__progress-lead">
                Document setup steps, facts gathered, and what is ready for review. Saved separately
                from the assignment brief.
              </p>
              <textarea
                className="kxd-os-staff-guided__progress-input"
                rows={6}
                value={staffProgress}
                disabled={mutationsDisabled}
                placeholder="What you completed, what is verified, and what still needs Matt…"
                onChange={(e) => {
                  setStaffProgress(e.target.value);
                  if (progressSaveState === "saved") setProgressSaveState("idle");
                }}
              />
              <div className="kxd-os-staff-guided__progress-actions">
                <KxdButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={busy === "progress"}
                  disabled={mutationsDisabled || !progressDirty}
                  onClick={() => void saveProgress()}
                >
                  Save progress
                </KxdButton>
                {progressSaveState === "saving" ? (
                  <span className="kxd-os-meta kxd-os-staff-guided__save-hint">Saving…</span>
                ) : null}
                {progressSaveState === "saved" ? (
                  <span className="kxd-os-meta kxd-os-staff-guided__save-hint kxd-os-staff-guided__save-hint--ok">
                    Saved
                  </span>
                ) : null}
                {progressSaveState === "error" && progressSaveError ? (
                  <span className="kxd-os-meta kxd-os-staff-guided__save-hint kxd-os-staff-guided__save-hint--error">
                    {progressSaveError}
                  </span>
                ) : null}
              </div>
            </OpsCard>

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
                        {formatActivityLabel(entry.action)}
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
              <OpsSectionHead label="Submit confirmation" />
              <p className="kxd-os-meta kxd-os-staff-guided__confirmation-lead">
                Compliance checks before you complete or submit — not the assignment steps
                themselves.
              </p>
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

              {checklistSaveState === "saving" ? (
                <p className="kxd-os-meta kxd-os-staff-guided__checklist-hint">Saving checklist…</p>
              ) : null}
              {checklistSaveState === "saved" ? (
                <p className="kxd-os-meta kxd-os-staff-guided__checklist-hint kxd-os-staff-guided__checklist-hint--ok">
                  Checklist saved
                </p>
              ) : null}
              {checklistSaveState === "error" && checklistSaveError ? (
                <p className="kxd-os-meta kxd-os-staff-guided__checklist-hint kxd-os-staff-guided__checklist-hint--error">
                  {checklistSaveError}
                </p>
              ) : null}

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
