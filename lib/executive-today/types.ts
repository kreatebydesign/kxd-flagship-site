/**
 * Phase 22A / 27B — Executive Today
 * Permanent home screen composition types.
 */

import type { ExecutiveActivityItem } from "@/lib/activity-engine";
import type { IntelligentRecommendation } from "@/lib/intelligence/briefings/types";
import type { MorningBriefPageData } from "@/lib/rituals/morning-brief";
import type { WorkListItem } from "@/lib/work/types";
import type { ExecutiveTodayBrief } from "./brief/types";

export interface ExecutiveTodayFocusItem {
  id: string;
  title: string;
  meta: string;
  href: string;
}

export interface ExecutiveTodayActivityItem {
  id: string;
  title: string;
  meta: string;
  href: string | null;
  read: boolean;
  /** Presentation emphasis from existing importance — not new logic. */
  emphasis: "quiet" | "notable";
}

export interface ExecutiveTodayUpcomingItem {
  id: string;
  label: string;
  detail: string;
  href: string | null;
  source: "review" | "work" | "calendar";
}

export interface ExecutiveTodayPrimary {
  title: string;
  detail: string;
  href: string | null;
  hrefLabel: string | null;
  reason: string;
  from: "first-action" | "recommendation" | "calm" | "calendar-brief";
}

export interface ExecutiveTodayIntelligenceBlock {
  postureLabel: string;
  headline: string;
  summary: string;
  tone: string;
}

export interface ExecutiveTodayData {
  greeting: string;
  welcome: string;
  dateDisplay: string;
  timeDisplay: string;
  primary: ExecutiveTodayPrimary;
  focus: ExecutiveTodayFocusItem[];
  /** Phase 23B — executive signals (Activity-backed), not raw event log. */
  activity: ExecutiveTodayActivityItem[];
  activityEmptyMessage: string;
  intelligence: ExecutiveTodayIntelligenceBlock;
  upcoming: ExecutiveTodayUpcomingItem[];
  /** Phase 27B — calendar-aware operating brief. */
  brief: ExecutiveTodayBrief | null;
  /** Morning Brief payload retained for deep sections / future expansion. */
  morning: MorningBriefPageData;
  /** Phase 28B — user-facing explainability for the primary recommendation. */
  explainability?: import("@/lib/executive-intelligence").UserFacingExplainability | null;
  generatedAt: string;
}

/** Narrow Work list item → focus row without new reasoning. */
export function mapWorkToFocusItem(item: WorkListItem): ExecutiveTodayFocusItem {
  const due = item.dueDate
    ? `Due ${new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : "Open";
  const client = item.clientName ? ` · ${item.clientName}` : "";
  return {
    id: String(item.id),
    title: item.title,
    meta: `${due}${client}`,
    href: item.adminHref,
  };
}

export function mapActivityToTodayItem(
  item: ExecutiveActivityItem,
): ExecutiveTodayActivityItem {
  const when = (() => {
    try {
      return new Date(item.occurredAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  })();
  const client = item.clientName ? `${item.clientName} · ` : "";
  const module = item.sourceModule ? `${item.sourceModule}` : "";
  const metaParts = [`${client}${when}`.trim(), module].filter(Boolean);

  return {
    id: item.id,
    title: item.title,
    meta: metaParts.join(" · "),
    href: item.href,
    read: item.read,
    emphasis:
      item.importance === "high" || item.importance === "critical" || !item.read
        ? "notable"
        : "quiet",
  };
}

export function mapRecommendationFallback(
  rec: IntelligentRecommendation | null,
): ExecutiveTodayPrimary | null {
  if (!rec) return null;
  return {
    title: rec.title,
    detail: rec.reason,
    href: rec.href ?? null,
    hrefLabel: rec.href ? "Open" : null,
    reason: rec.expectedImpact || rec.whyAppeared || rec.reason,
    from: "recommendation",
  };
}
