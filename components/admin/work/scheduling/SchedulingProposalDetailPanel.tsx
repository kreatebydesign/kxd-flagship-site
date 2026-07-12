"use client";

/**
 * Phase 26B — Scheduling Proposal Workspace detail + actions.
 */

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { formatTimeBudgetHours } from "@/lib/work/composer";
import {
  formatConfidenceLabel,
  formatScheduleDay,
  formatScheduleTimeRange,
} from "@/lib/work/scheduling";
import {
  canActorAdjustProposal,
  canActorCancelProposal,
  humanScheduleLinkStatus,
  type SchedulingProposalCard,
  type SchedulingProposalDetail,
  type SchedulingWorkspaceCapabilities,
} from "@/lib/scheduling/workspace";

type CandidateView = {
  start: string;
  end: string;
  durationMinutes: number;
  timeZone: string;
  confidence: "low" | "medium" | "high";
  reasons: string[];
  warnings: string[];
  tradeoffs: string[];
  explanations: string[];
};

type ActorView = {
  userId: number | null;
  email: string | null;
  displayName: string | null;
  role: string | null;
};

export function SchedulingProposalDetailPanel({
  card,
  actor,
  capabilities,
  onClose,
  onChanged,
}: {
  card: SchedulingProposalCard;
  actor: ActorView;
  capabilities: SchedulingWorkspaceCapabilities;
  onClose: () => void;
  onChanged: () => void;
}) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [detail, setDetail] = useState<SchedulingProposalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [adjustMode, setAdjustMode] = useState(false);
  const [candidates, setCandidates] = useState<CandidateView[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState(0);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/scheduling/proposals/${card.link.id}`);
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        proposal?: SchedulingProposalDetail;
      };
      if (!res.ok || !data.ok || !data.proposal) {
        setError(data.error ?? "Could not load proposal.");
        return;
      }
      setDetail(data.proposal);
    } catch {
      setError("Could not load proposal.");
    } finally {
      setLoading(false);
    }
  }, [card.link.id]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const link = detail?.link ?? card.link;
  const tz = link.timezone || "America/Los_Angeles";

  const canApprove =
    capabilities.canApprove &&
    (link.status === "approval_required" || link.status === "proposed");
  const canReject =
    capabilities.canApprove &&
    (link.status === "approval_required" || link.status === "proposed");
  const canCancel = canActorCancelProposal({
    canApprove: capabilities.canApprove,
    actorUserId: actor.userId,
    requestedById: link.requestedById,
  }) && link.status !== "canceled" && link.status !== "completed";
  const canAdjust = canActorAdjustProposal({
    canApprove: capabilities.canApprove,
    canSuggest: capabilities.canSuggest,
    actorUserId: actor.userId,
    requestedById: link.requestedById,
    status: link.status,
  });

  async function runAction(
    actionId: string,
    fn: () => Promise<void>,
  ): Promise<void> {
    setBusy(actionId);
    setError(null);
    try {
      await fn();
      onChanged();
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  async function approve() {
    await runAction("approve", async () => {
      const res = await fetch(
        `/api/admin/scheduling/proposals/${link.id}/approve`,
        { method: "POST" },
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) {
        throw new Error(data.error ?? "Could not approve.");
      }
    });
  }

  async function reject() {
    await runAction("reject", async () => {
      const res = await fetch(
        `/api/admin/scheduling/proposals/${link.id}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: rejectReason.trim() || "Rejected",
          }),
        },
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) {
        throw new Error(data.error ?? "Could not reject.");
      }
      setShowReject(false);
      setRejectReason("");
    });
  }

  async function cancel() {
    await runAction("cancel", async () => {
      const res = await fetch(
        `/api/admin/scheduling/proposals/${link.id}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Canceled from Scheduling workspace" }),
        },
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) {
        throw new Error(data.error ?? "Could not cancel.");
      }
    });
  }

  async function startAdjust() {
    setAdjustMode(true);
    setLoadingCandidates(true);
    setError(null);
    setCandidates([]);
    setSelectedCandidate(0);
    try {
      const start = new Date();
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      const res = await fetch("/api/admin/calendar/availability/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: start.toISOString(),
          end: end.toISOString(),
          durationMinutes: link.durationMinutes,
          limit: 6,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        candidates?: CandidateView[];
      };
      if (!res.ok || data.ok === false) {
        setError(data.error ?? "Could not load candidates.");
        return;
      }
      setCandidates(data.candidates ?? []);
      if (!data.candidates?.length) {
        setError("No alternate candidate windows available.");
      }
    } catch {
      setError("Could not load candidates.");
    } finally {
      setLoadingCandidates(false);
    }
  }

  async function applyAdjust() {
    const selected = candidates[selectedCandidate];
    if (!selected) return;
    await runAction("adjust", async () => {
      const res = await fetch(`/api/admin/scheduling/proposals/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposedStart: selected.start,
          proposedEnd: selected.end,
          timezone: selected.timeZone,
          durationMinutes: selected.durationMinutes,
          schedulingReason:
            selected.reasons.slice(0, 3).join("; ") || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) {
        throw new Error(data.error ?? "Could not adjust proposal.");
      }
      setAdjustMode(false);
      setCandidates([]);
    });
  }

  if (!mounted) return null;

  const policy = detail?.policy ?? card.policy;
  const budget = formatTimeBudgetHours(
    detail?.estimatedEffortHours ?? card.estimatedEffortHours,
  );

  const panel = (
    <div
      className="kxd-os-schedule-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="kxd-os-schedule-panel kxd-os-schedule-panel--workspace"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="kxd-os-schedule-panel__header">
          <div className="kxd-os-schedule-panel__header-copy">
            <p className="kxd-os-schedule-panel__eyebrow">Proposal</p>
            <h2 id={titleId} className="kxd-os-schedule-panel__title">
              {detail?.workTitle ?? card.workTitle}
            </h2>
            <p className="kxd-os-schedule-panel__lede">
              {humanScheduleLinkStatus(link.status)} ·{" "}
              {formatScheduleDay(link.proposedStart, tz)} ·{" "}
              {formatScheduleTimeRange(
                link.proposedStart,
                link.proposedEnd,
                tz,
              )}
            </p>
          </div>
          <button
            type="button"
            className="kxd-os-schedule-panel__close"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <div className="kxd-os-schedule-panel__scroll">
          {loading ? (
            <p className="kxd-os-schedule-panel__loading">Loading proposal…</p>
          ) : null}
          {error ? (
            <p className="kxd-os-schedule-panel__error" role="alert">
              {error}
            </p>
          ) : null}

          {!loading && detail ? (
            <>
              <section className="kxd-os-schedule-panel__context">
                <Row label="Client" value={detail.clientName} />
                <Row label="Project" value={detail.project ?? "—"} />
                <Row label="Effort" value={budget ?? "Not set"} />
                <Row
                  label="Window"
                  value={`${formatScheduleDay(link.proposedStart, tz)} · ${formatScheduleTimeRange(link.proposedStart, link.proposedEnd, tz)}`}
                />
                <Row
                  label="Confidence"
                  value={formatConfidenceLabel(link.confidence)}
                />
                <Row
                  label="Proposed by"
                  value={detail.requestedByLabel ?? "—"}
                />
                <Row
                  label="Created"
                  value={formatCreated(link.createdAt)}
                />
                <Row
                  label="Approval"
                  value={link.approvalStatus}
                />
                <Row
                  label="Work"
                  value={
                    <Link href={detail.workHref} className="kxd-os-link-quiet">
                      Open work
                    </Link>
                  }
                />
              </section>

              {detail.workSummary || detail.workDescription ? (
                <section className="kxd-os-sched-ws-block">
                  <p className="kxd-os-sched-ws-block__label">Work summary</p>
                  <p className="kxd-os-sched-ws-block__body">
                    {detail.workSummary || detail.workDescription}
                  </p>
                </section>
              ) : null}

              {policy ? (
                <section className="kxd-os-sched-ws-block">
                  <p className="kxd-os-sched-ws-block__label">
                    Scheduling policy
                  </p>
                  <ul className="kxd-os-sched-ws-list">
                    <li>
                      Decision: {policy.decision} · Level{" "}
                      {policy.permissionLevel}
                    </li>
                    {policy.reasons.slice(0, 6).map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                    {policy.warnings.slice(0, 4).map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                  <p className="kxd-os-sched-ws-note">
                    {policy.calendarAvailabilityNote}
                  </p>
                </section>
              ) : null}

              {link.evidenceSummary ? (
                <section className="kxd-os-sched-ws-block">
                  <p className="kxd-os-sched-ws-block__label">Evidence</p>
                  <p className="kxd-os-sched-ws-block__body">
                    {link.evidenceSummary}
                  </p>
                </section>
              ) : null}

              {link.schedulingReason ? (
                <section className="kxd-os-sched-ws-block">
                  <p className="kxd-os-sched-ws-block__label">Reasoning</p>
                  <p className="kxd-os-sched-ws-block__body">
                    {link.schedulingReason}
                  </p>
                </section>
              ) : null}

              {link.rejectionReason ? (
                <section className="kxd-os-sched-ws-block">
                  <p className="kxd-os-sched-ws-block__label">Rejection</p>
                  <p className="kxd-os-sched-ws-block__body">
                    {link.rejectionReason}
                  </p>
                </section>
              ) : null}

              {adjustMode ? (
                <section className="kxd-os-sched-ws-block">
                  <p className="kxd-os-sched-ws-block__label">
                    Adjust — candidate windows
                  </p>
                  {loadingCandidates ? (
                    <p className="kxd-os-schedule-panel__loading">
                      Loading candidates…
                    </p>
                  ) : (
                    <ul className="kxd-os-schedule-alts__list">
                      {candidates.map((c, i) => (
                        <li key={`${c.start}-${c.end}`}>
                          <button
                            type="button"
                            className={`kxd-os-schedule-card${selectedCandidate === i ? " kxd-os-schedule-card--selected" : ""}`}
                            onClick={() => setSelectedCandidate(i)}
                            aria-pressed={selectedCandidate === i}
                          >
                            <p className="kxd-os-schedule-card__day">
                              {formatScheduleDay(c.start, c.timeZone || tz)}
                            </p>
                            <p className="kxd-os-schedule-card__time">
                              {formatScheduleTimeRange(
                                c.start,
                                c.end,
                                c.timeZone || tz,
                              )}
                            </p>
                            <p className="kxd-os-schedule-card__confidence">
                              Confidence:{" "}
                              {formatConfidenceLabel(c.confidence)}
                            </p>
                            <ul className="kxd-os-schedule-card__evidence">
                              {(c.reasons ?? []).slice(0, 3).map((r) => (
                                <li key={r}>{r}</li>
                              ))}
                            </ul>
                            {(c.tradeoffs ?? []).length > 0 ? (
                              <div className="kxd-os-schedule-card__tradeoffs">
                                <p className="kxd-os-schedule-card__tradeoffs-label">
                                  Tradeoffs
                                </p>
                                <ul>
                                  {c.tradeoffs.slice(0, 3).map((t) => (
                                    <li key={t}>{t}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : null}

              {detail.auditHistory.length > 0 ? (
                <section className="kxd-os-sched-ws-block">
                  <p className="kxd-os-sched-ws-block__label">
                    Audit history
                  </p>
                  <ul className="kxd-os-sched-ws-audit">
                    {detail.auditHistory.map((entry, i) => (
                      <li key={`${entry.at}-${entry.action}-${i}`}>
                        <p className="kxd-os-sched-ws-audit__action">
                          {entry.action}
                        </p>
                        <p className="kxd-os-sched-ws-audit__meta">
                          {formatCreated(entry.at)}
                          {entry.actor ? ` · ${entry.actor}` : ""}
                          {entry.detail ? ` · ${entry.detail}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {showReject ? (
                <section className="kxd-os-sched-ws-block">
                  <p className="kxd-os-sched-ws-block__label">
                    Rejection reason
                  </p>
                  <textarea
                    className="kxd-os-sched-ws-textarea"
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Optional note for the requester"
                  />
                </section>
              ) : null}

              <p className="kxd-os-schedule-success__note">
                Approval updates the Scheduling Domain only. No Google Calendar
                event is created.
              </p>
            </>
          ) : null}
        </div>

        <footer className="kxd-os-schedule-panel__footer kxd-os-schedule-panel__footer--wrap">
          {adjustMode ? (
            <>
              <button
                type="button"
                className="kxd-os-schedule-panel__ghost"
                onClick={() => {
                  setAdjustMode(false);
                  setCandidates([]);
                }}
                disabled={busy != null}
              >
                Cancel adjust
              </button>
              <button
                type="button"
                className="kxd-os-schedule-panel__primary"
                disabled={
                  busy != null ||
                  loadingCandidates ||
                  candidates.length === 0
                }
                onClick={() => void applyAdjust()}
              >
                {busy === "adjust" ? "Saving…" : "Apply candidate"}
              </button>
            </>
          ) : showReject ? (
            <>
              <button
                type="button"
                className="kxd-os-schedule-panel__ghost"
                onClick={() => setShowReject(false)}
                disabled={busy != null}
              >
                Back
              </button>
              <button
                type="button"
                className="kxd-os-schedule-panel__primary"
                disabled={busy != null}
                onClick={() => void reject()}
              >
                {busy === "reject" ? "Rejecting…" : "Confirm reject"}
              </button>
            </>
          ) : (
            <>
              <div className="kxd-os-sched-ws-actions">
                {canAdjust ? (
                  <button
                    type="button"
                    className="kxd-os-schedule-panel__ghost"
                    disabled={busy != null}
                    onClick={() => void startAdjust()}
                  >
                    Adjust
                  </button>
                ) : null}
                {canCancel ? (
                  <button
                    type="button"
                    className="kxd-os-schedule-panel__ghost"
                    disabled={busy != null}
                    onClick={() => void cancel()}
                  >
                    {busy === "cancel" ? "Cancelling…" : "Cancel"}
                  </button>
                ) : null}
                {canReject ? (
                  <button
                    type="button"
                    className="kxd-os-schedule-panel__ghost"
                    disabled={busy != null}
                    onClick={() => setShowReject(true)}
                  >
                    Reject
                  </button>
                ) : null}
              </div>
              {canApprove ? (
                <button
                  type="button"
                  className="kxd-os-schedule-panel__primary"
                  disabled={busy != null}
                  onClick={() => void approve()}
                >
                  {busy === "approve" ? "Approving…" : "Approve"}
                </button>
              ) : (
                <button
                  type="button"
                  className="kxd-os-schedule-panel__primary"
                  onClick={onClose}
                >
                  Close
                </button>
              )}
            </>
          )}
        </footer>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}

function Row({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="kxd-os-schedule-context-row">
      <span className="kxd-os-schedule-context-row__label">{label}</span>
      <span className="kxd-os-schedule-context-row__value">{value}</span>
    </div>
  );
}

function formatCreated(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
