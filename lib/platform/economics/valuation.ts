import type { PlatformMaturity, PlatformSubsystemDefinition } from "../types";
import type { PlatformEngineeringHealth } from "../types";
import type {
  EconomicsConfidence,
  EconomicsValuationInputs,
  ReplacementCostEstimate,
} from "./types";

const MATURITY_HOUR_FACTOR: Record<PlatformMaturity, number> = {
  prototype: 0.55,
  alpha: 0.72,
  beta: 0.88,
  production: 1,
};

const STATUS_DEBT_FACTOR: Record<string, number> = {
  stable: 0,
  active: 0.04,
  building: 0.08,
  consolidation: 0.14,
  planned: 0.18,
};

function roundUsd(n: number): number {
  return Math.round(n);
}

function roundHours(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeReplacementCostEstimate(
  subsystems: PlatformSubsystemDefinition[],
  health: PlatformEngineeringHealth,
  overallCompletionPercent: number,
  inputs: EconomicsValuationInputs,
): ReplacementCostEstimate {
  const subsystemHourCredits = subsystems.map((s) => {
    const completion = Math.min(100, Math.max(0, s.completionPercent)) / 100;
    const maturity = MATURITY_HOUR_FACTOR[s.maturity] ?? 0.85;
    const statusDebt = STATUS_DEBT_FACTOR[s.status] ?? 0.05;
    const hours =
      completion *
      inputs.baseHoursPerSubsystemAt100 *
      maturity *
      (1 + statusDebt);
    return { id: s.id, name: s.name, hours: roundHours(hours) };
  });

  const subsystemHours = subsystemHourCredits.reduce((sum, row) => sum + row.hours, 0);
  const integrationHours =
    health.payloadCollections * inputs.hoursPerPayloadCollection +
    Math.floor(health.adminRoutes / 25) * inputs.hoursPerAdminRouteBlock;
  const automationGap =
    health.automationModules > 0
      ? 1 - health.automationModulesConnected / health.automationModules
      : 0;
  const integrationMultiplier = 1 + Math.min(0.35, automationGap * 0.25);

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

  const assumptions = [
    `Hourly rates (hypothetical): $${low} / $${mid} / $${high} blended engineering.`,
    `${inputs.baseHoursPerSubsystemAt100} base hours per subsystem at 100% completion, weighted by maturity and status.`,
    `Integration proxy: ${health.payloadCollections} Payload collections, ${health.adminRoutes} admin routes, automation connected ${health.automationModulesConnected}/${health.automationModules}.`,
    "Does not include opportunity cost, sales, legal, or ongoing operations labor.",
  ];

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
    subsystemHourCredits: subsystemHourCredits.sort((a, b) => b.hours - a.hours).slice(0, 12),
  };
}
