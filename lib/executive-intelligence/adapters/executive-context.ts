/**
 * Phase 28B — Executive Context adapter.
 * Carries the canonical engine result — does not arbitrate.
 */

import type { ExecutiveContextRef } from "@/lib/executive-context/types";
import type { PrimaryRecommendation } from "../types";

export function mapRecommendationToContextPriority(
  rec: PrimaryRecommendation,
): ExecutiveContextRef {
  const kind =
    rec.id.includes("review")
      ? ("review" as const)
      : rec.source === "schedule" || rec.id.includes("work") || rec.id.includes("overdue")
        ? ("work" as const)
        : ("activity" as const);

  return {
    id: `priority-engine-${rec.id}`,
    kind,
    title: rec.action,
    detail: [rec.clientName, rec.itemTitle, rec.reasoning].filter(Boolean).join(" · ") || null,
    href: rec.href,
    clientName: rec.clientName ?? null,
  };
}
