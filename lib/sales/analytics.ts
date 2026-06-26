/**
 * Proposal analytics — Payload-safe aggregation helpers.
 */
import type { Payload } from "payload";
import { parseUserAgent } from "./public-core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export function formatAnalyticsDisplay(proposal: AnyDoc): {
  lastViewedLabel: string;
  timeOnProposalLabel: string;
  sectionInsights: string[];
} {
  const lastViewed = proposal.lastViewedAt
    ? formatRelativeTime(String(proposal.lastViewedAt))
    : "Not viewed yet";

  const totalSeconds = Number(proposal.totalTimeOnProposalSeconds ?? 0);
  const minutes = Math.max(1, Math.round(totalSeconds / 60));
  const timeLabel =
    totalSeconds > 0 ? `Spent ${minutes} minute${minutes === 1 ? "" : "s"} reading` : "No reading time yet";

  const summary = (proposal.viewedSectionsSummary as Record<string, number> | null) ?? {};
  const sectionInsights = Object.entries(summary)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([section, count]) => `Viewed ${section} ${count} time${count === 1 ? "" : "s"}`);

  return {
    lastViewedLabel: lastViewed === "Not viewed yet" ? lastViewed : `Viewed ${lastViewed}`,
    timeOnProposalLabel: timeLabel,
    sectionInsights,
  };
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export async function recordProposalViewEvent(
  payload: Payload,
  proposal: AnyDoc,
  input: {
    eventType: "page-view" | "section-view" | "heartbeat" | "session-end";
    sectionId?: string;
    durationSeconds?: number;
    userAgent?: string | null;
    ipAddress?: string | null;
  },
): Promise<AnyDoc> {
  const { deviceType, browser } = parseUserAgent(input.userAgent ?? null);
  const now = new Date().toISOString();

  await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposal-view-events" as any,
    data: {
      proposal: proposal.id,
      eventType: input.eventType,
      sectionId: input.sectionId,
      durationSeconds: input.durationSeconds,
      deviceType,
      browser,
      approximateLocation: "Pending enrichment",
      userAgent: input.userAgent ?? undefined,
      ipAddress: input.ipAddress ?? undefined,
      occurredAt: now,
    },
    overrideAccess: true,
  });

  const viewedSections = { ...((proposal.viewedSectionsSummary as Record<string, number>) ?? {}) };
  if (input.sectionId) {
    viewedSections[input.sectionId] = (viewedSections[input.sectionId] ?? 0) + 1;
  }

  const totalViews =
    input.eventType === "page-view"
      ? Number(proposal.totalViews ?? 0) + 1
      : Number(proposal.totalViews ?? 0);

  const addedTime = Number(input.durationSeconds ?? 0);
  const totalTime = Number(proposal.totalTimeOnProposalSeconds ?? 0) + addedTime;

  const status =
    proposal.status === "sent" || proposal.status === "draft" ? "viewed" : proposal.status;

  const updated = await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposals" as any,
    id: proposal.id as number,
    data: {
      firstViewedAt: proposal.firstViewedAt ?? now,
      lastViewedAt: now,
      viewedAt: proposal.viewedAt ?? now,
      totalViews,
      totalTimeOnProposalSeconds: totalTime,
      viewedSectionsSummary: viewedSections,
      status,
    },
    overrideAccess: true,
  });

  return updated as AnyDoc;
}
