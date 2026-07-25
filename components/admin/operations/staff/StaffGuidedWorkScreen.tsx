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
import type { StaffGuidedWorkData } from "@/lib/staff/types";
import { StaffAskHelpControl } from "./StaffAskHelpControl";

function statusVariant(status: string): KxdBadgeVariant {
  if (status === "blocked") return "critical";
  if (status === "review" || status === "waiting-on-kxd") return "pending";
  if (status === "completed") return "success";
  if (status === "in-progress") return "warning";
  return "status";
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

  return (
    <OperationsShell activeId="staff" variant="staff">
      <KxdPage className="kxd-os-page--ops kxd-os-page--staff">
        <OperationsPageHero
          eyebrow="Guided work"
          title={data.title}
          lead={data.summary ?? data.whyItMatters}
        />

        <p className="kxd-os-meta" style={{ marginBottom: "1rem" }}>
          <Link href={data.hrefBack} className="kxd-os-link-quiet">
            Back to staff home
          </Link>
        </p>

        <div className="kxd-os-ops-briefing-grid" style={{ display: "grid", gap: "1.5rem" }}>
          <OpsCard className="kxd-os-ops-card-padding">
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              <OpsStatusBadge label={data.status} variant={statusVariant(data.status)} />
              {data.priority ? (
                <OpsStatusBadge label={data.priority} variant="warning" />
              ) : null}
              {data.clientLabel ? (
                <span className="kxd-os-meta">Client: {data.clientLabel}</span>
              ) : null}
              {data.dueDate ? (
                <span className="kxd-os-meta">Due {data.dueDate.slice(0, 10)}</span>
              ) : null}
            </div>

            <section style={{ marginTop: "1.5rem" }}>
              <OpsSectionHead label="Why it matters" />
              <p>{data.whyItMatters}</p>
            </section>

            <section style={{ marginTop: "1.5rem" }}>
              <OpsSectionHead label="What KXD knows" />
              <ul style={{ paddingLeft: "1.1rem" }}>
                {data.whatKxdKnows.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section style={{ marginTop: "1.5rem" }}>
              <OpsSectionHead label="What to produce" />
              <ul style={{ paddingLeft: "1.1rem" }}>
                {data.whatToProduce.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section style={{ marginTop: "1.5rem" }}>
              <OpsSectionHead label="Steps" />
              {data.steps.map((step) => (
                <div key={step.title} style={{ marginTop: "0.75rem" }}>
                  <p className="kxd-os-card__title">{step.title}</p>
                  <p className="kxd-os-meta">{step.detail}</p>
                </div>
              ))}
            </section>

            {data.examples.length > 0 ? (
              <section style={{ marginTop: "1.5rem" }}>
                <OpsSectionHead label="Examples" />
                <ul style={{ paddingLeft: "1.1rem" }}>
                  {data.examples.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section style={{ marginTop: "1.5rem" }}>
              <OpsSectionHead label="Permission boundary" />
              <p>{data.permissionBoundary}</p>
            </section>
          </OpsCard>

          <OpsCard className="kxd-os-ops-card-padding">
            <OpsSectionHead label="Completion checklist" />
            <ul style={{ listStyle: "none", padding: 0, marginTop: "0.75rem" }}>
              {data.checklist.map((item) => (
                <li key={item.id} style={{ marginBottom: "0.75rem" }}>
                  <label style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start" }}>
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

            {message ? <p className="kxd-os-meta" style={{ marginTop: "1rem" }}>{message}</p> : null}
            {error ? (
              <p className="kxd-os-meta" style={{ marginTop: "1rem", color: "var(--kxd-os-critical)" }}>
                {error}
              </p>
            ) : null}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                marginTop: "1.25rem",
              }}
            >
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
              <p className="kxd-os-meta" style={{ marginTop: "1rem" }}>
                Preview mode — changes are disabled.
              </p>
            ) : null}
          </OpsCard>

          <div style={{ marginTop: "1.5rem" }}>
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
          </div>
        </div>
      </KxdPage>
    </OperationsShell>
  );
}
