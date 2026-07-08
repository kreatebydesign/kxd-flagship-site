"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { KxdPage } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  OpsCard,
  OpsFocusPill,
  OpsKpiStrip,
  OpsListRow,
  OpsQuickGrid,
  OpsSectionHead,
  OpsStatusBadge,
} from "@/components/admin/operations/shared/OpsBriefing";
import type { WorkListItem, WorkWorkspaceData } from "@/lib/work/types";
import type { KxdBadgeVariant } from "@/components/os";
import {
  WORK_CATEGORY_LABELS,
  WORK_PRIORITY_LABELS,
  WORK_SOURCE_LABELS,
  WORK_STATUS_LABELS,
} from "@/lib/work/constants";

const QUICK_ACTIONS = [
  {
    label: "Create Work",
    sub: "Open a new relationship work item",
    href: "/admin/collections/work/create",
  },
  {
    label: "Review Inbox",
    sub: "Website Review intake",
    href: "/admin/operations/review-inbox",
  },
  {
    label: "Timeline",
    sub: "Relationship history",
    href: "/admin/operations/timeline",
  },
  {
    label: "Client Command",
    sub: "Operator workspace",
    href: "/admin/operations/client-command",
  },
] as const;

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function greetingName(displayName?: string | null): string {
  if (!displayName?.trim()) return "there";
  return displayName.trim().split(/\s+/)[0] ?? displayName.trim();
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function statusVariant(status: WorkListItem["status"]): KxdBadgeVariant {
  if (status === "blocked") return "critical";
  if (status === "waiting-on-client") return "warning";
  if (status === "completed") return "success";
  if (status === "review") return "pending";
  return "status";
}

function workspaceBrief(stats: WorkWorkspaceData["stats"]): {
  healthLine: string;
  focusLabel: string;
  focusDescription: string;
  tone: "default" | "warning" | "critical" | "clear";
} {
  if (stats.blockedCount > 0) {
    return {
      healthLine: "Some work is blocked and needs operator attention.",
      focusLabel: "Blocked",
      focusDescription: `${stats.blockedCount} item${stats.blockedCount === 1 ? "" : "s"} blocked`,
      tone: "critical",
    };
  }
  if (stats.waitingOnClientCount > 0) {
    return {
      healthLine: "Work is moving — clients are holding a few threads.",
      focusLabel: "Waiting on Client",
      focusDescription: `${stats.waitingOnClientCount} awaiting client input`,
      tone: "warning",
    };
  }
  if (stats.openCount === 0) {
    return {
      healthLine: "The work queue is clear. Ready for what comes next.",
      focusLabel: "Clear",
      focusDescription: "No open work",
      tone: "clear",
    };
  }
  return {
    healthLine: "Studio operations are in motion.",
    focusLabel: "In Motion",
    focusDescription: `${stats.openCount} open work item${stats.openCount === 1 ? "" : "s"}`,
    tone: "default",
  };
}

function WorkRow({ item }: { item: WorkListItem }) {
  return (
    <OpsListRow href={item.adminHref}>
      <div className="kxd-os-ops-list-row__main">
        <p className="kxd-os-ops-list-row__title">{item.title}</p>
        <p className="kxd-os-ops-list-row__meta">
          {item.clientName}
          {" · "}
          {WORK_SOURCE_LABELS[item.source]}
          {" · "}
          {WORK_CATEGORY_LABELS[item.category]}
          {item.dueDate ? ` · Due ${fmtDate(item.dueDate)}` : ""}
        </p>
      </div>
      <div className="kxd-os-ops-list-row__aside">
        <OpsStatusBadge label={WORK_STATUS_LABELS[item.status]} variant={statusVariant(item.status)} />
        <span className="kxd-os-meta">{WORK_PRIORITY_LABELS[item.priority]}</span>
      </div>
    </OpsListRow>
  );
}

function WorkSection({
  label,
  items,
  empty,
  href,
  linkText,
}: {
  label: string;
  items: WorkListItem[];
  empty: string;
  href?: string;
  linkText?: string;
}) {
  return (
    <section className="kxd-os-ops-section">
      <OpsSectionHead label={label} count={items.length || undefined} href={href} linkText={linkText} />
      {items.length === 0 ? (
        <OpsCard className="kxd-os-ops-briefing-card">
          <p className="kxd-os-ops-briefing-card__body">{empty}</p>
        </OpsCard>
      ) : (
        <OpsCard>
          <div className="kxd-os-list-stack">
            {items.slice(0, 8).map((item) => (
              <WorkRow key={item.id} item={item} />
            ))}
          </div>
        </OpsCard>
      )}
    </section>
  );
}

export function WorkEngineScreen({
  data,
  adminDisplayName,
}: {
  data: WorkWorkspaceData;
  adminDisplayName?: string | null;
}) {
  const [search, setSearch] = useState("");
  const brief = useMemo(() => workspaceBrief(data.stats), [data.stats]);

  const q = search.trim().toLowerCase();
  const filterItems = (items: WorkListItem[]) =>
    q
      ? items.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.clientName.toLowerCase().includes(q) ||
            item.summary?.toLowerCase().includes(q),
        )
      : items;

  const kpiItems = [
    { label: "Open", value: String(data.stats.openCount), sub: "Active relationship work" },
    {
      label: "Waiting on Client",
      value: String(data.stats.waitingOnClientCount),
      sub: "Client input needed",
      alert: data.stats.waitingOnClientCount > 0,
    },
    {
      label: "In Progress",
      value: String(data.stats.inProgressCount),
      sub: "Studio execution",
    },
    {
      label: "Review",
      value: String(data.stats.reviewCount),
      sub: "Ready for review",
    },
    {
      label: "Queue",
      value: String(data.stats.queueCount),
      sub: "New & planned",
    },
    {
      label: "Completed Today",
      value: String(data.stats.completedTodayCount),
      sub: "Closed today",
    },
  ];

  return (
    <OperationsShell activeId="work">
      <KxdPage className="kxd-os-page--ops kxd-os-page--work-engine">
        <OperationsPageHero
          eyebrow="KXD OS · Work Engine"
          title={`${timeGreeting()}, ${greetingName(adminDisplayName)}.`}
          lead={brief.healthLine}
          presence
        />

        <div className="kxd-os-ops-hero-row">
          <p className="kxd-os-ops-briefing-card__body">
            The operational heartbeat of every client relationship — one engine for everything KXD performs.
          </p>
          <OpsFocusPill
            label={brief.focusLabel}
            description={brief.focusDescription}
            tone={brief.tone}
          />
        </div>

        <section className="kxd-os-ops-section">
          <OpsSectionHead label="Studio Pulse" />
          <OpsKpiStrip items={kpiItems} />
        </section>

        <div className="kxd-os-ops-toolbar">
          <input
            className="kxd-os-input kxd-os-ops-search"
            type="search"
            placeholder="Search work, clients, summaries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search work"
          />
          <Link href="/admin/operations/focus" className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm">
            Focus
          </Link>
          <Link href="/admin/collections/work/create" className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm">
            New work
          </Link>
        </div>

        {data.stats.openCount === 0 ? (
          <section className="kxd-os-ops-section">
            <OpsCard className="kxd-os-ops-briefing-card">
              <h2 className="kxd-os-headline kxd-os-headline--presence">The engine is ready.</h2>
              <p className="kxd-os-ops-briefing-card__body">
                Work will accumulate here as Website Review, requests, communications, and future modules connect.
                Create manual work to begin, or wait for source systems to spawn items.
              </p>
              <div style={{ marginTop: "var(--kxd-os-space-8)" }}>
                <OpsSectionHead label="Quick actions" />
                <OpsQuickGrid items={[...QUICK_ACTIONS]} />
              </div>
            </OpsCard>
          </section>
        ) : null}

        <div className="kxd-os-work-engine-grid">
          <WorkSection
            label="Current Work"
            items={filterItems(data.currentWork)}
            empty="No open work right now."
          />
          <WorkSection
            label="Waiting on Client"
            items={filterItems(data.waitingOnClient)}
            empty="Nothing waiting on client input."
          />
          <WorkSection
            label="In Progress"
            items={filterItems(data.inProgress)}
            empty="Nothing in active execution."
          />
          <WorkSection
            label="Review"
            items={filterItems(data.review)}
            empty="Nothing in review."
          />
          <WorkSection
            label="Completed Today"
            items={filterItems(data.completedToday)}
            empty="No work completed today yet."
          />
          <WorkSection
            label="Queue"
            items={filterItems(data.queue)}
            empty="The queue is clear."
          />
        </div>

        <WorkSection
          label="Recent Work"
          items={filterItems(data.recentWork)}
          empty="Work history will appear here as the engine fills."
          href="/admin/collections/work"
          linkText="All work"
        />
      </KxdPage>
    </OperationsShell>
  );
}
