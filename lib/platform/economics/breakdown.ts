import type { PlatformSubsystemDefinition } from "../types";
import type { PlatformEngineeringHealth } from "../types";
import type {
  EconomicsValuationInputs,
  IntegrationReadiness,
  SubsystemValuationBreakdownRow,
} from "./types";
import {
  MATURITY_HOUR_FACTOR,
  STATUS_DEBT_FACTOR,
  roundHours,
  roundUsd,
  subsystemHoursBeforeIntegration,
} from "./valuation-internals";

function integrationReadiness(
  maturity: PlatformSubsystemDefinition["maturity"],
  status: PlatformSubsystemDefinition["status"],
): IntegrationReadiness {
  if (maturity === "production" && (status === "stable" || status === "active")) {
    return "production-ready";
  }
  if (maturity === "beta" || maturity === "production") return "emerging";
  return "limited";
}

function maturityAdjustmentLabel(
  maturity: PlatformSubsystemDefinition["maturity"],
  status: PlatformSubsystemDefinition["status"],
): string {
  const factor = MATURITY_HOUR_FACTOR[maturity] ?? 0.85;
  const debt = STATUS_DEBT_FACTOR[status] ?? 0.05;
  return `Maturity ${Math.round(factor * 100)}% · status +${Math.round(debt * 100)}% hours`;
}

export function buildSubsystemValuationBreakdown(
  subsystems: PlatformSubsystemDefinition[],
  health: PlatformEngineeringHealth,
  inputs: EconomicsValuationInputs,
  integrationMultiplier: number,
  midHourlyRate: number,
): SubsystemValuationBreakdownRow[] {
  const credits = subsystemHoursBeforeIntegration(subsystems, inputs);
  const subsystemHours = credits.reduce((sum, row) => sum + row.hours, 0);
  const integrationHours =
    health.payloadCollections * inputs.hoursPerPayloadCollection +
    Math.floor(health.adminRoutes / 25) * inputs.hoursPerAdminRouteBlock;
  const integrationPool = roundHours(integrationHours * integrationMultiplier);

  const rows = credits.map((credit) => {
    const subsystem = subsystems.find((s) => s.id === credit.id)!;
    const share = subsystemHours > 0 ? credit.hours / subsystemHours : 0;
    const allocatedIntegration = roundHours(integrationPool * share);
    const totalHours = roundHours(credit.hours + allocatedIntegration);
    const debt = STATUS_DEBT_FACTOR[subsystem.status] ?? 0.05;

    return {
      id: credit.id,
      name: credit.name,
      category: subsystem.category,
      owner: subsystem.owner,
      completionPercent: subsystem.completionPercent,
      status: subsystem.status,
      maturity: subsystem.maturity,
      estimatedHours: totalHours,
      replacementCostMidUsd: roundUsd(totalHours * midHourlyRate),
      integrationReadiness: integrationReadiness(subsystem.maturity, subsystem.status),
      maturityAdjustmentLabel: maturityAdjustmentLabel(subsystem.maturity, subsystem.status),
      technicalDebtAdjustmentPercent: Math.round(debt * 1000) / 10,
      contributionPercent: 0,
    };
  });

  const totalMidUsd = rows.reduce((sum, r) => sum + r.replacementCostMidUsd, 0);
  return rows
    .map((row) => ({
      ...row,
      contributionPercent:
        totalMidUsd > 0 ? Math.round((row.replacementCostMidUsd / totalMidUsd) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.replacementCostMidUsd - a.replacementCostMidUsd);
}
