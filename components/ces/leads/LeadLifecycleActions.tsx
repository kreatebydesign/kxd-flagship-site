"use client";

/**
 * Client Command — Lead Command lifecycle controls (Primal Phase 1, Build 1).
 * Portal membership-scoped API only. Maps onto existing MCI lifecycle fields —
 * no new stages invented. See lib/client-command/leads/apply-stage.ts.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ClientInquiryRecord, LostReason } from "@/lib/managed-client-leads/types";
import type { LeadOwnerOption } from "@/lib/client-command/leads/types";
import { leadPresentationStageLabel, resolveLeadPresentationStage } from "@/lib/client-command/leads/presentation";
import { SELECTABLE_LEAD_STAGES } from "@/lib/client-command/leads/apply-stage";

const LOST_REASONS: LostReason[] = [
  "not_interested",
  "budget",
  "timing",
  "competitor",
  "no_response",
  "wrong_fit",
  "other",
];

function lostReasonLabel(reason: LostReason): string {
  return reason.replaceAll("_", " ");
}

type ActionBody = Record<string, unknown>;

export function LeadLifecycleActions({
  inquiry,
  owners,
  canManage,
}: {
  inquiry: ClientInquiryRecord;
  owners: LeadOwnerOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState(inquiry.operatorNotes ?? "");
  const [followUp, setFollowUp] = useState(
    inquiry.nextFollowUpAt ? inquiry.nextFollowUpAt.slice(0, 10) : "",
  );
  const [stage, setStage] = useState(resolveLeadPresentationStage(inquiry));
  const [wonRevenue, setWonRevenue] = useState(
    inquiry.wonRevenueCents != null ? (inquiry.wonRevenueCents / 100).toFixed(2) : "",
  );
  const [bookedProgram, setBookedProgram] = useState(inquiry.bookedProgram ?? "");
  const [lostReason, setLostReason] = useState<LostReason>(inquiry.lostReason ?? "not_interested");

  const currentStage = resolveLeadPresentationStage(inquiry);
  const isClosed = currentStage === "WON" || currentStage === "LOST";

  function send(body: ActionBody) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/portal/leads/${inquiry.id}/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || !data.success) {
          setError(data.error || "Update failed.");
          return;
        }
        router.refresh();
      } catch {
        setError("Update failed.");
      }
    });
  }

  if (!canManage) {
    return (
      <p className="kxd-lead-muted">
        Lead actions are available to authorized workspace members.
      </p>
    );
  }

  return (
    <div className="kxd-lead-actions">
      <div className="kxd-lead-actions__primary">
        <div className="kxd-lead-actions__field">
          <label className="kxd-lead-filters__label" htmlFor="lead-stage-select">
            Stage
          </label>
          <div className="kxd-lead-actions__control-row">
            <select
              id="lead-stage-select"
              className="kxd-lead-filters__select"
              disabled={pending}
              value={stage}
              onChange={(e) => setStage(e.target.value as typeof stage)}
            >
              {SELECTABLE_LEAD_STAGES.map((s) => (
                <option key={s} value={s}>
                  {leadPresentationStageLabel(s)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="kxd-ces-btn kxd-ces-btn--primary"
              disabled={pending || stage === currentStage}
              onClick={() => send({ type: "stage", stage })}
            >
              Update stage
            </button>
          </div>
        </div>

        <div className="kxd-lead-actions__field">
          <label className="kxd-lead-filters__label" htmlFor="lead-owner-select">
            Owner
          </label>
          <select
            id="lead-owner-select"
            className="kxd-lead-filters__select"
            disabled={pending}
            defaultValue={inquiry.assignedPortalOwnerId ?? "unassigned"}
            onChange={(e) =>
              send({
                type: "assign",
                portalOwnerId: e.target.value === "unassigned" ? null : Number(e.target.value),
              })
            }
          >
            <option value="unassigned">Unassigned</option>
            {owners.map((owner) => (
              <option key={owner.portalUserId} value={owner.portalUserId}>
                {owner.label}
              </option>
            ))}
          </select>
        </div>

        <div className="kxd-lead-actions__field">
          <label className="kxd-lead-filters__label" htmlFor="lead-follow-up">
            Next follow-up
          </label>
          <div className="kxd-lead-actions__control-row">
            <input
              id="lead-follow-up"
              className="kxd-lead-filters__input"
              type="date"
              disabled={pending}
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
            />
            <button
              type="button"
              className="kxd-ces-btn kxd-ces-btn--ghost"
              disabled={pending}
              onClick={() =>
                send({
                  type: "follow-up",
                  nextFollowUpAt: followUp ? new Date(`${followUp}T09:00:00`).toISOString() : null,
                })
              }
            >
              Save follow-up
            </button>
          </div>
        </div>

        <div className="kxd-lead-actions__field kxd-lead-actions__field--note">
          <label className="kxd-lead-filters__label" htmlFor="lead-note">
            Note
          </label>
          <textarea
            id="lead-note"
            className="kxd-lead-filters__input kxd-lead-filters__textarea"
            rows={3}
            disabled={pending}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Capture the next touch, promise, or blocker…"
          />
          <button
            type="button"
            className="kxd-ces-btn kxd-ces-btn--ghost"
            disabled={pending}
            onClick={() => send({ type: "note", note })}
          >
            Save note
          </button>
        </div>

        {!isClosed ? (
          <div className="kxd-lead-actions__qualify">
            <button
              type="button"
              className="kxd-ces-btn kxd-ces-btn--ghost"
              disabled={pending || currentStage === "QUALIFIED"}
              onClick={() => send({ type: "qualify" })}
            >
              Mark qualified
            </button>
          </div>
        ) : null}
      </div>

      <div className="kxd-lead-actions__terminal">
        <details className="kxd-lead-terminal">
          <summary>Mark won</summary>
          <div className="kxd-lead-terminal__form">
            <label className="kxd-lead-filters__field">
              <span className="kxd-lead-filters__label">Revenue ($)</span>
              <input
                className="kxd-lead-filters__input"
                type="number"
                min="0"
                step="0.01"
                disabled={pending}
                value={wonRevenue}
                onChange={(e) => setWonRevenue(e.target.value)}
              />
            </label>
            <label className="kxd-lead-filters__field">
              <span className="kxd-lead-filters__label">Program</span>
              <input
                className="kxd-lead-filters__input"
                type="text"
                disabled={pending}
                value={bookedProgram}
                onChange={(e) => setBookedProgram(e.target.value)}
              />
            </label>
            <div className="kxd-lead-terminal__cta">
              <button
                type="button"
                className="kxd-ces-btn kxd-ces-btn--primary"
                disabled={pending}
                onClick={() =>
                  send({
                    type: "won",
                    wonRevenueCents: wonRevenue ? Math.round(Number(wonRevenue) * 100) : null,
                    bookedProgram: bookedProgram.trim() || null,
                  })
                }
              >
                Confirm won
              </button>
            </div>
          </div>
        </details>

        <details className="kxd-lead-terminal">
          <summary>Mark lost</summary>
          <div className="kxd-lead-terminal__form">
            <label className="kxd-lead-filters__field">
              <span className="kxd-lead-filters__label">Reason</span>
              <select
                className="kxd-lead-filters__select"
                disabled={pending}
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value as LostReason)}
              >
                {LOST_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {lostReasonLabel(reason)}
                  </option>
                ))}
              </select>
            </label>
            <div className="kxd-lead-terminal__cta">
              <button
                type="button"
                className="kxd-ces-btn kxd-ces-btn--ghost"
                disabled={pending}
                onClick={() => send({ type: "lost", lostReason })}
              >
                Confirm lost
              </button>
            </div>
          </div>
        </details>
      </div>

      {error ? (
        <p className="kxd-lead-error" role="alert">
          {error}
        </p>
      ) : null}
      {pending ? <p className="kxd-lead-muted">Saving…</p> : null}
    </div>
  );
}
