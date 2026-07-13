/**
 * Phase 28A — Adapter for Morning Brief first action shape.
 */

import type { MorningFirstAction, MorningFirstActionKind } from "@/lib/rituals/morning-first-action";
import type { PrimaryRecommendation } from "../types";

function kindFromRecommendation(rec: PrimaryRecommendation): MorningFirstActionKind {
  if (rec.id === "rec-review-new") return "website-review-new";
  if (rec.id === "rec-review-active") return "website-review-active";
  if (rec.id === "rec-comms-reply") return "communication";
  if (rec.id === "rec-portfolio-overdue" || rec.id === "rec-high-priority-work") return "work";
  if (rec.id === "rec-client-request") return "client-request";
  return "none";
}

export function mapRecommendationToMorningFirstAction(
  rec: PrimaryRecommendation,
): MorningFirstAction {
  const kind = kindFromRecommendation(rec);
  const hasAction = kind !== "none";

  return {
    title: "Recommended First Action",
    kind,
    hasAction,
    label: rec.action,
    clientName: rec.clientName ?? null,
    itemTitle: rec.itemTitle ?? null,
    detail: rec.reasoning,
    href: rec.href,
    hrefLabel: rec.hrefLabel,
  };
}
