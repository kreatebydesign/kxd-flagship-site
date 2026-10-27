import type { PlatformMaturity, PlatformSubsystemDefinition } from "../types";
import type { EconomicsValuationInputs } from "./types";

export const MATURITY_HOUR_FACTOR: Record<PlatformMaturity, number> = {
  prototype: 0.55,
  alpha: 0.72,
  beta: 0.88,
  production: 1,
};

export const STATUS_DEBT_FACTOR: Record<string, number> = {
  stable: 0,
  active: 0.04,
  building: 0.08,
  consolidation: 0.14,
  planned: 0.18,
};

export function roundUsd(n: number): number {
  return Math.round(n);
}

export function roundHours(n: number): number {
  return Math.round(n * 10) / 10;
}

export function subsystemHoursBeforeIntegration(
  subsystems: PlatformSubsystemDefinition[],
  inputs: EconomicsValuationInputs,
): { id: string; name: string; hours: number }[] {
  return subsystems.map((s) => {
    const completion = Math.min(100, Math.max(0, s.completionPercent)) / 100;
    const maturity = MATURITY_HOUR_FACTOR[s.maturity] ?? 0.85;
    const statusDebt = STATUS_DEBT_FACTOR[s.status] ?? 0.05;
    const hours =
      completion * inputs.baseHoursPerSubsystemAt100 * maturity * (1 + statusDebt);
    return { id: s.id, name: s.name, hours: roundHours(hours) };
  });
}

export function integrationMultiplierFromHealth(health: {
  automationModules: number;
  automationModulesConnected: number;
}): number {
  const automationGap =
    health.automationModules > 0
      ? 1 - health.automationModulesConnected / health.automationModules
      : 0;
  return 1 + Math.min(0.35, automationGap * 0.25);
}
