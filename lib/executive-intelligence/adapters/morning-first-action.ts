/**
 * Phase 28B — Adapter for Morning Brief first action shape.
 */

import type { MorningFirstAction, MorningFirstActionKind } from "@/lib/rituals/morning-first-action";
import type { PrimaryRecommendation } from "../types";

function kindFromRecommendation(rec: PrimaryRecommendation): MorningFirstActionKind {
  if (rec.id === "rec-review-new") return "website-review-new";
  if (rec.id === "rec-review-active") return "website-review-active";
  if (rec.id === "rec-comms-reply") return "communication";
  if (
    rec.id === "rec-portfolio-overdue" ||
    rec.id === "rec-high-priority-work" ||
    rec.id === "rec-blocked-work" ||
    rec.id === "rec-schedule-overdue" ||
    rec.id === "rec-current-linked-work"
  ) {
    return "work";
  }
  if (rec.id === "rec-client-request") return "client-request";
  return "none";
}

export function mapRecommendationToMorningFirstAction(
  rec: PrimaryRecommendation,
): MorningFirstAction {
  const kind = kindFromRecommendation(rec);
  const hasAction = kind !== "none" && rec.source !== "calm";

  return {
    title: "Recommended First Action",
    kind: hasAction ? kind : "none",
    hasAction,
    label: rec.action,
    clientName: rec.clientName ?? null,
    itemTitle: rec.itemTitle ?? null,
    detail: rec.reasoning,
    href: rec.href,
    hrefLabel: rec.hrefLabel,
  };
}
