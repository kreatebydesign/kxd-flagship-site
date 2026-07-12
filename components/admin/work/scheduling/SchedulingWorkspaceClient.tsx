"use client";

/**
 * Phase 26B — Scheduling Proposal Workspace.
 * Editorial inbox for reviewing scheduling recommendations.
 */

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { KxdShell } from "@/components/os";
import { ExecutiveWorkspaceShell } from "@/components/admin/executive-workspace";
import { SchedulingProposalDetailPanel } from "./SchedulingProposalDetailPanel";
import { formatTimeBudgetHours } from "@/lib/work/composer";
import { WORK_ENGINE_HOME } from "@/lib/work/constants";
import {
  formatConfidenceLabel,
  formatScheduleDay,
  formatScheduleTimeRange,
} from "@/lib/work/scheduling";
import {
  SCHEDULING_WORKSPACE_GROUPS,
  SCHEDULING_WORKSPACE_GROUP_LABELS,
  groupProposals,
  humanScheduleLinkStatus,
  type SchedulingProposalCard,
  type SchedulingWorkspaceCapabilities,
  type SchedulingWorkspaceGroupId,
} from "@/lib/scheduling/workspace";

type ActorView = {
  userId: number | null;
  email: string | null;
  displayName: string | null;
  role: string | null;
};

export function SchedulingWorkspaceClient({
  initialProposals,
  capabilities,
  actor,
}: {
  initialProposals: SchedulingProposalCard[];
  capabilities: SchedulingWorkspaceCapabilities;
  actor: ActorView;
}) {
  const [proposals, setProposals] = useState(initialProposals);
  const [selected, setSelected] = useState<SchedulingProposalCard | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(() => groupProposals(proposals), [proposals]);

  const awaitingCount = groups["awaiting-approval"].length;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/scheduling/proposals?limit=100");
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        proposals?: SchedulingProposalCard[];
      };
      if (!res.ok || data.ok === false) {
        setError(data.error ?? "Could not refresh proposals.");
        return;
      }
      setProposals(data.proposals ?? []);
    } catch {
      setError("Could not refresh proposals.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <KxdShell className="kxd-os-shell--ritual">
      <ExecutiveWorkspaceShell workspaceId="work" includeWorkComposer={false}>
        <div className="kxd-os-work-engine kxd-os-work-engine--planning">
          <header className="kxd-os-work-engine__header kxd-os-work-engine__header--secondary">
            <nav className="kxd-os-work-engine__nav" aria-label="Work Engine">
              <Link href={WORK_ENGINE_HOME}>Work</Link>
              <Link href="/admin/operations/today">Today</Link>
              <Link href="/admin/operations/review-inbox">Review Inbox</Link>
              <span className="kxd-os-work-engine__nav-active">Scheduling</span>
            </nav>
            <button
              type="button"
              className="kxd-os-work-engine__exit"
              onClick={() => void refresh()}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </header>

          <main className="kxd-os-work-engine__main kxd-os-work-engine__main--planning">
            <header className="kxd-os-work-engine__hero">
              <p className="kxd-os-work-engine__eyebrow">Work · Scheduling</p>
              <h1 className="kxd-os-work-engine__headline">
                Scheduling proposals
              </h1>
              <p className="kxd-os-work-engine__lede">
                Review thoughtful recommendations. Approve what belongs on the
                calendar — without leaving Work.
              </p>
              <p className="kxd-os-work-engine__stats">
                {awaitingCount} awaiting approval · {proposals.length} total ·
                no calendar writes
              </p>
            </header>

            {error ? (
              <p className="kxd-os-schedule-panel__error" role="alert">
                {error}
              </p>
            ) : null}

            {SCHEDULING_WORKSPACE_GROUPS.map((groupId) => (
              <ProposalGroup
                key={groupId}
                groupId={groupId}
                items={groups[groupId]}
                onOpen={setSelected}
              />
            ))}
          </main>
        </div>

        {selected ? (
          <SchedulingProposalDetailPanel
            card={selected}
            actor={actor}
            capabilities={capabilities}
            onClose={() => setSelected(null)}
            onChanged={async () => {
              await refresh();
            }}
          />
        ) : null}
      </ExecutiveWorkspaceShell>
    </KxdShell>
  );
}

function ProposalGroup({
  groupId,
  items,
  onOpen,
}: {
  groupId: SchedulingWorkspaceGroupId;
  items: SchedulingProposalCard[];
  onOpen: (card: SchedulingProposalCard) => void;
}) {
  return (
    <section
      className="kxd-os-work-engine__section"
      aria-labelledby={`sched-group-${groupId}`}
    >
      <h2
        id={`sched-group-${groupId}`}
        className="kxd-os-work-engine__section-title"
      >
        {SCHEDULING_WORKSPACE_GROUP_LABELS[groupId]}
        <span className="kxd-os-work-engine__view-count">{items.length}</span>
      </h2>
      {items.length === 0 ? (
        <p className="kxd-os-work-engine__empty">None.</p>
      ) : (
        <ul className="kxd-os-sched-ws-cards">
          {items.map((card) => (
            <li key={card.link.id}>
              <ProposalCardButton card={card} onOpen={() => onOpen(card)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ProposalCardButton({
  card,
  onOpen,
}: {
  card: SchedulingProposalCard;
  onOpen: () => void;
}) {
  const tz = card.link.timezone || "America/Los_Angeles";
  const budget = formatTimeBudgetHours(card.estimatedEffortHours);
  const policyReasons = card.policy?.reasons?.slice(0, 3) ?? [];
  const warnings = card.policy?.warnings?.slice(0, 2) ?? [];

  return (
    <button type="button" className="kxd-os-sched-ws-card" onClick={onOpen}>
      <div className="kxd-os-sched-ws-card__top">
        <p className="kxd-os-sched-ws-card__title">{card.workTitle}</p>
        <p className="kxd-os-sched-ws-card__status">
          {humanScheduleLinkStatus(card.link.status)}
        </p>
      </div>
      <p className="kxd-os-sched-ws-card__meta">
        {card.clientName}
        {card.project ? ` · ${card.project}` : ""}
        {budget ? ` · ${budget}` : ""}
      </p>
      <p className="kxd-os-sched-ws-card__window">
        {formatScheduleDay(card.link.proposedStart, tz)}
        <span>
          {" "}
          ·{" "}
          {formatScheduleTimeRange(
            card.link.proposedStart,
            card.link.proposedEnd,
            tz,
          )}
        </span>
      </p>
      <p className="kxd-os-sched-ws-card__confidence">
        Confidence: {formatConfidenceLabel(card.link.confidence)}
      </p>
      {policyReasons.length > 0 ? (
        <ul className="kxd-os-sched-ws-card__evidence">
          {policyReasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      ) : card.link.evidenceSummary ? (
        <p className="kxd-os-sched-ws-card__evidence-line">
          {card.link.evidenceSummary}
        </p>
      ) : null}
      {warnings.length > 0 ? (
        <ul className="kxd-os-sched-ws-card__tradeoffs">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
      <p className="kxd-os-sched-ws-card__foot">
        {card.requestedByLabel ? `Proposed by ${card.requestedByLabel}` : "Proposed"}
        {" · "}
        {formatShort(card.link.createdAt)}
      </p>
      {card.link.status === "scheduled" ? (
        <div className="kxd-os-sched-ws-card__calendar">
          <p className="kxd-os-sched-ws-card__calendar-label">
            Google Calendar · Created
            {card.link.calendarWriteAt
              ? ` · ${formatShort(card.link.calendarWriteAt)}`
              : ""}
          </p>
          {card.link.googleEventHtmlLink ? (
            <a
              href={card.link.googleEventHtmlLink}
              target="_blank"
              rel="noreferrer"
              className="kxd-os-link-quiet"
              onClick={(e) => e.stopPropagation()}
            >
              Open Calendar
            </a>
          ) : null}
        </div>
      ) : null}
      {card.link.status === "pending_calendar_write" &&
      card.link.syncStatus === "error" ? (
        <p className="kxd-os-sched-ws-card__status">Calendar write failed — retry from detail</p>
      ) : null}
    </button>
  );
}

function formatShort(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
