/**
 * Compose Client Value Projection — pure, client-scoped.
 */

import type { ReportingFact } from "@/lib/reporting/domain/types";
import type { PeriodWindow } from "@/lib/reporting/domain/types";
import { composeCareContinuity, type ComposeCareContinuityInput } from "./care-continuity";
import { composePerformanceStory } from "./performance-story";
import type { ClientValueProjection } from "./types";

export type ComposeClientValueInput = {
  authorizedClientId: number;
  sourceClientId: number;
  reportingFacts: ReportingFact[];
  reportingEntitled: boolean;
  reportingPeriod: PeriodWindow;
  ga4Mapped: boolean;
  gscMapped: boolean;
  nextMoveHint?: string | null;
  care: ComposeCareContinuityInput;
  websiteReviewEntitled?: boolean;
  engagementLifecycle?: "website-build" | "managed-ongoing" | "unknown";
};

export function composeClientValueProjection(
  input: ComposeClientValueInput,
): ClientValueProjection {
  if (input.sourceClientId !== input.authorizedClientId) {
    throw new Error(
      "Client value composition refused: source client does not match authorized client.",
    );
  }

  return {
    clientId: input.authorizedClientId,
    performanceStory: composePerformanceStory({
      reportingFacts: input.reportingFacts,
      reportingEntitled: input.reportingEntitled,
      reportingPeriod: input.reportingPeriod,
      ga4Mapped: input.ga4Mapped,
      gscMapped: input.gscMapped,
      nextMoveHint: input.nextMoveHint,
      websiteReviewEntitled: input.websiteReviewEntitled,
      engagementLifecycle: input.engagementLifecycle,
    }),
    careContinuity: composeCareContinuity(input.care),
  };
}
