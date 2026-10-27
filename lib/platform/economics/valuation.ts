import type { PlatformSubsystemDefinition } from "../types";
import type { PlatformEngineeringHealth } from "../types";
import type {
  EconomicsConfidence,
  EconomicsValuationInputs,
  ReplacementCostEstimate,
} from "./types";
import { buildSubsystemValuationBreakdown } from "./breakdown";
import {
  integrationMultiplierFromHealth,
  roundHours,
  roundUsd,
  subsystemHoursBeforeIntegration,
} from "./valuation-internals";

export {
  MATURITY_HOUR_FACTOR,
  STATUS_DEBT_FACTOR,
  roundHours,
  roundUsd,
  subsystemHoursBeforeIntegration,
} from "./valuation-internals";

export function computeReplacementCostEstimate(
  subsystems: PlatformSubsystemDefinition[],
  health: PlatformEngineeringHealth,
  overallCompletionPercent: number,
  inputs: EconomicsValuationInputs,
): ReplacementCostEstimate {
  const subsystemHourCredits = subsystemHoursBeforeIntegration(subsystems, inputs).sort(
    (a, b) => b.hours - a.hours,
  );

  const subsystemHours = subsystemHourCredits.reduce((sum, row) => sum + row.hours, 0);
  const integrationHours =
    health.payloadCollections * inputs.hoursPerPayloadCollection +
    Math.floor(health.adminRoutes / 25) * inputs.hoursPerAdminRouteBlock;
  const integrationMultiplier = integrationMultiplierFromHealth(health);

  const midHours = roundHours((subsystemHours + integrationHours) * integrationMultiplier);
  const lowHours = roundHours(midHours * 0.82);
  const highHours = roundHours(midHours * 1.18);

  const { low, mid, high } = inputs.hourlyRates;

  let confidence: EconomicsConfidence = "medium";
  let confidenceRationale =
    "Registry completion percentages are engineering estimates, not audited timesheets.";
  if (
    health.payloadCollections >= 40 &&
    overallCompletionPercent >= 72 &&
    health.libPlatformModules >= 40
  ) {
    confidence = "high";
    confidenceRationale =
      "Broad subsystem registry, live codebase health counts, and overall completion above 72% increase estimate coherence.";
  } else if (overallCompletionPercent < 55 || health.payloadCollections < 20) {
    confidence = "low";
    confidenceRationale =
      "Lower overall completion or thin health telemetry — widen judgment when interpreting the range.";
  }

  const integrationHoursMid = roundHours(integrationHours * integrationMultiplier);

  const assumptions = [
    `Hourly rates (hypothetical): $${low} / $${mid} / $${high} blended engineering.`,
    `${inputs.baseHoursPerSubsystemAt100} base hours per subsystem at 100% completion, weighted by maturity and status.`,
    `Shared integration pool: ${integrationHoursMid} modeled hours allocated across subsystems (Payload collections, admin routes, automation connectivity). Not double-counted per subsystem.`,
    `Integration proxy: ${health.payloadCollections} Payload collections, ${health.adminRoutes} admin routes, automation connected ${health.automationModulesConnected}/${health.automationModules}.`,
    "Does not include opportunity cost, sales, legal, or ongoing operations labor.",
  ];

  const subsystemBreakdown = buildSubsystemValuationBreakdown(
    subsystems,
    health,
    inputs,
    integrationMultiplier,
    mid,
  );

  return {
    estimatedHoursLow: lowHours,
    estimatedHoursMid: midHours,
    estimatedHoursHigh: highHours,
    replacementCostLowUsd: roundUsd(lowHours * low),
    replacementCostMidUsd: roundUsd(midHours * mid),
    replacementCostHighUsd: roundUsd(highHours * high),
    confidence,
    confidenceRationale,
    assumptions,
    disclaimer:
      "Estimated replacement cost is a planning model only. It is not verified fair market value, a formal appraisal, or tax basis.",
    subsystemHourCredits: subsystemHourCredits.slice(0, 12),
    integrationHoursMid,
    subsystemBreakdown,
  };
}
