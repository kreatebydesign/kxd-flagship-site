/**
 * Phase 29C — Feed provider results into Phase 29B composition.
 * Pure. No Google APIs. No Payload.
 */

import { composeReportingIntelligence } from "@/lib/reporting/compose/intelligence";
import type { PeriodWindow } from "@/lib/reporting/domain";
import type { ReportingProviderResult } from "./types";

export function composeReportingFromProviderResults(input: {
  clientId: number;
  period: PeriodWindow;
  results: ReportingProviderResult[];
}) {
  const enabledCapabilities = Array.from(
    new Set(
      input.results
        .filter((r) => r.status === "connected" || r.status === "no-rows")
        .map((r) => r.capabilityId),
    ),
  );

  const facts = input.results.flatMap((r) =>
    r.status === "connected" || r.status === "no-rows" ? r.facts : [],
  );

  return composeReportingIntelligence({
    clientId: input.clientId,
    period: input.period,
    facts,
    enabledCapabilities,
  });
}
