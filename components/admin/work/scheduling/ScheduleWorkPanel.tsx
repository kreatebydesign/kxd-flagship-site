"use client";

/**
 * Phase 26A — Schedule Work panel.
 * Editorial availability → propose. No Google writes. No approval UI.
 */

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  WORK_PRIORITY_LABELS,
  WORK_STATUS_LABELS,
} from "@/lib/work/constants";
import { formatTimeBudgetHours } from "@/lib/work/composer";
import { formatWorkDue } from "@/lib/work/display";
import {
  SCHEDULE_WORK_CLOSE_EVENT,
  SCHEDULE_WORK_OPEN_EVENT,
  SCHEDULING_STATUS_LABELS,
  canShowScheduleWorkAction,
  emitScheduleWorkProposed,
  formatConfidenceLabel,
  formatScheduleDay,
  formatScheduleTimeRange,
  resolveScheduleDurationMinutes,
  type ScheduleWorkOpenDetail,
} from "@/lib/work/scheduling";
import type { WorkListItem } from "@/lib/work/types";

export type AvailabilityCandidateView = {
  kind: string;
  start: string;
  end: string;
  durationMinutes: number;
  timeZone: string;
  score: number;
  confidence: "low" | "medium" | "high";
  reasons: string[];
  warnings: string[];
  tradeoffs: string[];
  explanations: string[];
};

type AvailabilitySummaryView = {
  timeZone: string;
  calendarAvailabilityAssessed: boolean;
  warnings: string[];
  candidateCount: number;
  freeMinutesTotal: number;
  busyMinutesTotal: number;
};

type ProposalLinkView = {
  id: number;
  status: string;
  proposedStart: string;
  proposedEnd: string;
  timezone: string;
  durationMinutes: number;
  confidence: string;
  approvalStatus: string;
};

type PanelPhase = "browse" | "success" | "proposal-detail";

type ScheduleWorkPanelProps = {
  work: WorkListItem;
  onWorkRefresh?: (work: WorkListItem) => void;
};

const HORIZON_DAYS = 7;
const CANDIDATE_LIMIT = 6;

export function ScheduleWorkPanel({
  work,
  onWorkRefresh,
}: ScheduleWorkPanelProps) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<PanelPhase>("browse");
  const [loading, setLoading] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<AvailabilityCandidateView[]>([]);
  const [summary, setSummary] = useState<AvailabilitySummaryView | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [proposal, setProposal] = useState<ProposalLinkView | null>(null);

  const duration = resolveScheduleDurationMinutes(work.estimatedEffort);
  const budgetLabel = formatTimeBudgetHours(work.estimatedEffort);
  const timeZone = summary?.timeZone ?? "America/Los_Angeles";

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setPhase("browse");
    setError(null);
    setProposing(false);
    setLoading(false);
  }, []);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCandidates([]);
    setSummary(null);
    setSelectedIndex(0);

    const start = new Date();
    const end = new Date(start.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000);

    try {
      const res = await fetch("/api/admin/calendar/availability/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: start.toISOString(),
          end: end.toISOString(),
          durationMinutes: duration.minutes,
          limit: CANDIDATE_LIMIT,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        candidates?: AvailabilityCandidateView[];
        summary?: AvailabilitySummaryView;
        writeEnabled?: boolean;
      };
      if (!res.ok || data.ok === false) {
        setError(data.error ?? "Could not load availability.");
        return;
      }
      const list = data.candidates ?? [];
      setCandidates(list);
      setSummary(data.summary ?? null);
      setSelectedIndex(0);
      if (list.length === 0) {
        setError(
          data.summary?.calendarAvailabilityAssessed === false
            ? "Calendar availability could not be assessed. Reconnect calendar or try again later."
            : "No available windows found in the next week for this duration.",
        );
      }
    } catch {
      setError("Could not load availability.");
    } finally {
      setLoading(false);
    }
  }, [duration.minutes]);

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<ScheduleWorkOpenDetail>).detail;
      if (!detail || detail.workId !== work.id) return;
      if (!canShowScheduleWorkAction(work)) return;
      setPhase("browse");
      setProposal(null);
      setOpen(true);
      void loadCandidates();
    }
    function onClose() {
      close();
    }
    window.addEventListener(SCHEDULE_WORK_OPEN_EVENT, onOpen);
    window.addEventListener(SCHEDULE_WORK_CLOSE_EVENT, onClose);
    return () => {
      window.removeEventListener(SCHEDULE_WORK_OPEN_EVENT, onOpen);
      window.removeEventListener(SCHEDULE_WORK_CLOSE_EVENT, onClose);
    };
  }, [work, loadCandidates, close]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  async function proposeSelected() {
    const selected = candidates[selectedIndex];
    if (!selected) {
      setError("Select a candidate window before proposing.");
      return;
    }
    if (proposing) return;
    setProposing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/scheduling/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workId: work.id,
          proposedStart: selected.start,
          proposedEnd: selected.end,
          timezone: selected.timeZone,
          durationMinutes: selected.durationMinutes,
          intent: "suggest",
          schedulingReason:
            selected.reasons.slice(0, 3).join("; ") || undefined,
        }),
      });

      let data: {
        ok?: boolean;
        error?: string;
        link?: ProposalLinkView;
      } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        setError(
          `Could not create scheduling proposal (HTTP ${res.status}).`,
        );
        return;
      }

      if (!res.ok || data.ok === false || !data.link) {
        setError(
          data.error ??
            `Could not create scheduling proposal (HTTP ${res.status}).`,
        );
        return;
      }

      setProposal(data.link);
      setPhase("success");
      emitScheduleWorkProposed({
        workId: work.id,
        linkId: data.link.id,
        proposedStart: data.link.proposedStart,
        proposedEnd: data.link.proposedEnd,
      });

      try {
        const refresh = await fetch(`/api/admin/work/${work.id}`);
        const refreshed = (await refresh.json()) as {
          ok?: boolean;
          work?: WorkListItem;
        };
        if (refreshed.ok && refreshed.work) {
          onWorkRefresh?.(refreshed.work);
        } else {
          // Optimistic local projection so Schedule Work hides immediately
          onWorkRefresh?.({
            ...work,
            schedulingStatus: "proposed",
            scheduledStart: data.link.proposedStart,
            scheduledEnd: data.link.proposedEnd,
            activeScheduleLinkId: data.link.id,
          });
        }
      } catch {
        onWorkRefresh?.({
          ...work,
          schedulingStatus: "proposed",
          scheduledStart: data.link.proposedStart,
          scheduledEnd: data.link.proposedEnd,
          activeScheduleLinkId: data.link.id,
        });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create scheduling proposal.",
      );
    } finally {
      setProposing(false);
    }
  }

  if (!mounted || !open) return null;

  const selected = candidates[selectedIndex] ?? null;
  const alternatives = candidates.slice(1);

  function onOverlayKey(e: ReactKeyboardEvent) {
    if (e.key === "Escape") close();
  }

  const panel = (
    <div
      className="kxd-os-schedule-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      onKeyDown={onOverlayKey}
    >
      <div
        className="kxd-os-schedule-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="kxd-os-schedule-panel__header">
          <div className="kxd-os-schedule-panel__header-copy">
            <p className="kxd-os-schedule-panel__eyebrow">Work</p>
            <h2 id={titleId} className="kxd-os-schedule-panel__title">
              Schedule Work
            </h2>
            <p className="kxd-os-schedule-panel__lede">
              Find the best available time for this work.
            </p>
          </div>
          <button
            type="button"
            className="kxd-os-schedule-panel__close"
            onClick={close}
            aria-label="Close"
          >
            Close
          </button>
        </header>

        <div className="kxd-os-schedule-panel__scroll">
          {phase === "browse" ? (
            <>
              <section
                className="kxd-os-schedule-panel__context"
                aria-label="Work context"
              >
                <ContextRow label="Work" value={work.title} />
                <ContextRow
                  label="Estimated effort"
                  value={budgetLabel ?? "Not set"}
                />
                <ContextRow label="Client" value={work.clientName} />
                <ContextRow
                  label="Project"
                  value={work.internalProject ?? "—"}
                />
                <ContextRow
                  label="Priority"
                  value={WORK_PRIORITY_LABELS[work.priority]}
                />
                <ContextRow
                  label="Due date"
                  value={formatWorkDue(work.dueDate) ?? "—"}
                />
                <ContextRow
                  label="Scheduling"
                  value={SCHEDULING_STATUS_LABELS[work.schedulingStatus]}
                />
                <ContextRow
                  label="Status"
                  value={WORK_STATUS_LABELS[work.status]}
                />
              </section>

              {!duration.fromEstimate ? (
                <p className="kxd-os-schedule-panel__notice" role="status">
                  Estimated effort has not been set. Scheduling quality may be
                  reduced. Searching for {duration.minutes}-minute windows.
                </p>
              ) : (
                <p className="kxd-os-schedule-panel__hint">
                  Searching for {duration.minutes}-minute windows over the next{" "}
                  {HORIZON_DAYS} days.
                </p>
              )}

              {error ? (
                <p className="kxd-os-schedule-panel__error" role="alert">
                  {error}
                </p>
              ) : null}

              {loading ? (
                <p className="kxd-os-schedule-panel__loading">
                  Finding available time…
                </p>
              ) : null}

              {!loading && selected ? (
                <section
                  className="kxd-os-schedule-best"
                  aria-label="Best available"
                >
                  <p className="kxd-os-schedule-best__label">Best Available</p>
                  <CandidateCard
                    candidate={selected}
                    timeZone={selected.timeZone || timeZone}
                    selected
                    primary
                    onSelect={() => setSelectedIndex(0)}
                  />
                </section>
              ) : null}

              {!loading && alternatives.length > 0 ? (
                <section
                  className="kxd-os-schedule-alts"
                  aria-label="Alternatives"
                >
                  <p className="kxd-os-schedule-alts__label">Alternatives</p>
                  <ul className="kxd-os-schedule-alts__list">
                    {alternatives.map((c, i) => {
                      const index = i + 1;
                      return (
                        <li key={`${c.start}-${c.end}`}>
                          <CandidateCard
                            candidate={c}
                            timeZone={c.timeZone || timeZone}
                            selected={selectedIndex === index}
                            onSelect={() => setSelectedIndex(index)}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              {summary && !loading ? (
                <p className="kxd-os-schedule-panel__meta-foot">
                  {summary.calendarAvailabilityAssessed
                    ? "Availability assessed from calendar occupancy."
                    : "Calendar occupancy not assessed."}
                  {summary.warnings.length
                    ? ` · ${summary.warnings.slice(0, 2).join(" · ")}`
                    : ""}
                </p>
              ) : null}
            </>
          ) : null}

          {phase === "success" || phase === "proposal-detail" ? (
            <SuccessState
              workTitle={work.title}
              proposal={proposal}
              detail={phase === "proposal-detail"}
              timeZone={proposal?.timezone || timeZone}
            />
          ) : null}
        </div>

        <footer className="kxd-os-schedule-panel__footer">
          {phase === "browse" ? (
            <>
              {error ? (
                <p
                  className="kxd-os-schedule-panel__footer-error"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
              <button
                type="button"
                className="kxd-os-schedule-panel__ghost"
                onClick={close}
                disabled={proposing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="kxd-os-schedule-panel__primary"
                disabled={!selected || proposing || loading}
                onClick={() => void proposeSelected()}
              >
                {proposing ? "Proposing…" : "Propose Schedule"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="kxd-os-schedule-panel__ghost"
                onClick={() =>
                  setPhase(
                    phase === "proposal-detail" ? "success" : "proposal-detail",
                  )
                }
              >
                {phase === "proposal-detail" ? "Back" : "View Proposal"}
              </button>
              <button
                type="button"
                className="kxd-os-schedule-panel__primary"
                onClick={close}
              >
                Close
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="kxd-os-schedule-context-row">
      <span className="kxd-os-schedule-context-row__label">{label}</span>
      <span className="kxd-os-schedule-context-row__value">{value}</span>
    </div>
  );
}

function CandidateCard({
  candidate,
  timeZone,
  selected,
  primary,
  onSelect,
}: {
  candidate: AvailabilityCandidateView;
  timeZone: string;
  selected?: boolean;
  primary?: boolean;
  onSelect: () => void;
}) {
  const evidence = [
    ...candidate.reasons,
    ...candidate.explanations.filter(
      (e) => !candidate.reasons.some((r) => r === e),
    ),
  ].slice(0, primary ? 6 : 3);
  const tradeoffs = (candidate.tradeoffs ?? []).slice(0, 4);
  const warnings = (candidate.warnings ?? []).slice(0, 3);

  return (
    <button
      type="button"
      className={`kxd-os-schedule-card${selected ? " kxd-os-schedule-card--selected" : ""}${primary ? " kxd-os-schedule-card--primary" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <p className="kxd-os-schedule-card__day">
        {formatScheduleDay(candidate.start, timeZone)}
      </p>
      <p className="kxd-os-schedule-card__time">
        {formatScheduleTimeRange(candidate.start, candidate.end, timeZone)}
      </p>
      <p className="kxd-os-schedule-card__confidence">
        Confidence: {formatConfidenceLabel(candidate.confidence)}
      </p>
      {evidence.length > 0 ? (
        <ul className="kxd-os-schedule-card__evidence">
          {evidence.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      {tradeoffs.length > 0 ? (
        <div className="kxd-os-schedule-card__tradeoffs">
          <p className="kxd-os-schedule-card__tradeoffs-label">Tradeoffs</p>
          <ul>
            {tradeoffs.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {warnings.length > 0 ? (
        <ul className="kxd-os-schedule-card__warnings">
          {warnings.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </button>
  );
}

function SuccessState({
  workTitle,
  proposal,
  detail,
  timeZone,
}: {
  workTitle: string;
  proposal: ProposalLinkView | null;
  detail: boolean;
  timeZone: string;
}) {
  if (!proposal) {
    return (
      <div className="kxd-os-schedule-success">
        <p className="kxd-os-schedule-success__title">
          Scheduling proposal created.
        </p>
      </div>
    );
  }

  return (
    <div className="kxd-os-schedule-success">
      <p className="kxd-os-schedule-success__eyebrow">Proposal</p>
      <p className="kxd-os-schedule-success__title">
        Scheduling proposal created.
      </p>
      <p className="kxd-os-schedule-success__awaiting">Awaiting approval.</p>
      <div className="kxd-os-schedule-success__summary">
        <ContextRow label="Work" value={workTitle} />
        <ContextRow
          label="When"
          value={`${formatScheduleDay(proposal.proposedStart, timeZone)} · ${formatScheduleTimeRange(proposal.proposedStart, proposal.proposedEnd, timeZone)}`}
        />
        <ContextRow
          label="Duration"
          value={`${proposal.durationMinutes} minutes`}
        />
        <ContextRow label="Status" value={humanProposalStatus(proposal.status)} />
        {detail ? (
          <>
            <ContextRow label="Proposal ID" value={`#${proposal.id}`} />
            <ContextRow
              label="Approval"
              value={humanApproval(proposal.approvalStatus)}
            />
            <ContextRow
              label="Confidence"
              value={
                proposal.confidence
                  ? formatConfidenceLabel(
                      proposal.confidence as "low" | "medium" | "high",
                    )
                  : "—"
              }
            />
          </>
        ) : null}
      </div>
      <p className="kxd-os-schedule-success__note">
        No calendar event was created. A founder can review this proposal later.
      </p>
    </div>
  );
}

function humanProposalStatus(status: string): string {
  if (status === "approval_required") return "Awaiting approval";
  if (status === "proposed") return "Proposed";
  if (status === "scheduled") return "Scheduled";
  if (status === "pending_calendar_write") return "Pending calendar write";
  if (status === "approved") return "Approved";
  return status;
}

function humanApproval(status: string): string {
  if (status === "pending") return "Pending";
  if (status === "none") return "None";
  if (status === "auto_approved") return "Auto-approved";
  return status;
}
