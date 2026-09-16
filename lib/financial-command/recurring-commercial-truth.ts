/**
 * Dual-read recurring commercial truth.
 *
 * Direction of travel: contract lifecycle recurring authority is canonical.
 * Retainers remain legacy compatibility shadows during migration.
 *
 * Never invents amounts. On retainer vs contract disagreement, reports conflict
 * and keeps the portfolio MRR number on the legacy Retainer value so Financial
 * Command does not silently change reported truth.
 */
import type { ContractLifecyclePackage } from "@/lib/proposal-lifecycle/types";
import {
  resolveRecurringAuthority,
  type ResolvedRecurringService,
} from "@/lib/proposal-lifecycle/recurring-authority";
import { normalizeLifecyclePackage } from "@/lib/proposal-lifecycle/package";
import { slugifyServiceKey } from "@/lib/proposal-lifecycle/ensure-payable-surfaces";

export type RecurringTruthSource =
  | "contract-authority"
  | "retainer-legacy"
  | "conflict"
  | "none";

export type ClientRecurringCommercialTruth = {
  clientId: number;
  /** Amount used for portfolio MRR compatibility (dollars, not cents). */
  portfolioMrrDollars: number;
  /** Canonical commercial monthly-equivalent when unambiguous (dollars). */
  commercialMonthlyDollars: number;
  retainerMonthlyDollars: number;
  contractMonthlyDollars: number;
  source: RecurringTruthSource;
  activeServiceCount: number;
  services: ResolvedRecurringService[];
  conflicts: string[];
  warnings: string[];
};

const ACTIVE_RETAINER_STATUSES = new Set(["current", "active", "upcoming"]);

export function monthlyDollarsFromCents(
  amountCents: number,
  cadence: "monthly" | "quarterly" | "annual",
): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) return 0;
  const dollars = amountCents / 100;
  if (cadence === "quarterly") return dollars / 3;
  if (cadence === "annual") return dollars / 12;
  return dollars;
}

export function monthlyDollarsFromRetainer(doc: {
  monthlyAmount?: unknown;
  billingCadence?: unknown;
  billingStatus?: unknown;
}): number {
  const status = String(doc.billingStatus ?? "");
  if (!ACTIVE_RETAINER_STATUSES.has(status)) return 0;
  const amount = Number(doc.monthlyAmount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const cadence = String(doc.billingCadence ?? "monthly");
  if (cadence === "quarterly") return amount / 3;
  if (cadence === "annual") return amount / 12;
  return amount;
}

/**
 * Collect operational recurring services from a package without guessing when
 * legal vs operator authority conflicts. Falls back to listing active operator
 * defs only when resolveRecurringAuthority returns no conflict and no legal row
 * (already handled inside resolveRecurringAuthority).
 *
 * Additionally includes active operator definitions whose keys differ from the
 * single legal monthly service (e.g. annual Media Vault alongside management)
 * when amounts are positive and inactive≠true — these are distinct services,
 * not competing authorities for the same key.
 */
export function listContractRecurringServices(
  pkgRaw: unknown,
): { services: ResolvedRecurringService[]; conflicts: string[]; warnings: string[] } {
  const pkg = normalizeLifecyclePackage(pkgRaw);
  const authority = resolveRecurringAuthority(pkg);
  const conflicts = authority.conflicts.map((c) => c.message);
  const warnings = [...authority.warnings];
  const services: ResolvedRecurringService[] = [];

  for (const row of authority.services) {
    if (row.activationStatus === "conflict") continue;
    if (!row.active && row.activationStatus !== "pending-trigger") continue;
    if (row.amountCents > 0 && row.active) services.push(row);
  }

  // Distinct active operator services not already represented (resource add-ons).
  const seen = new Set(services.map((s) => s.serviceKey));
  for (const def of pkg.operatorRecurringServices ?? []) {
    if (def.active === false) continue;
    if (!Number.isFinite(def.amountCents) || def.amountCents <= 0) continue;
    const key = slugifyServiceKey(def.serviceKey || def.title);
    if (seen.has(key)) continue;
    // Skip when authority already flagged identity conflicts for this key.
    const blocked = authority.conflicts.some(
      (c) =>
        c.operatorServiceKey === key ||
        (c.legalServiceKey === key && c.code === "legal-vs-operator-amount"),
    );
    if (blocked) continue;
    seen.add(key);
    services.push({
      serviceKey: key,
      title: def.title,
      description: def.description?.trim() || null,
      amountCents: def.amountCents,
      currency: def.currency || "USD",
      cadence: def.cadence,
      billDay: def.billDay || 1,
      effectiveDate: def.effectiveDate ?? null,
      endDate: null,
      active: true,
      activationStatus: "active",
      activationReason: "Active operator recurring service (distinct resource/service).",
      source: "operator-definition",
      startTrigger: def.effectiveDate ? "on-date" : null,
      startBillingDateStatus: def.effectiveDate ? "confirmed" : null,
    });
  }

  return { services, conflicts, warnings };
}

export function sumContractMonthlyDollars(services: readonly ResolvedRecurringService[]): number {
  let total = 0;
  for (const service of services) {
    if (!service.active) continue;
    total += monthlyDollarsFromCents(service.amountCents, service.cadence);
  }
  return total;
}

export function resolveClientRecurringCommercialTruth(input: {
  clientId: number;
  retainerDocs?: ReadonlyArray<{
    monthlyAmount?: unknown;
    billingCadence?: unknown;
    billingStatus?: unknown;
  }>;
  contractPackages?: ReadonlyArray<unknown>;
}): ClientRecurringCommercialTruth {
  const retainerMonthlyDollars = (input.retainerDocs ?? []).reduce(
    (sum, doc) => sum + monthlyDollarsFromRetainer(doc),
    0,
  );

  const services: ResolvedRecurringService[] = [];
  const conflicts: string[] = [];
  const warnings: string[] = [];

  for (const pkg of input.contractPackages ?? []) {
    const listed = listContractRecurringServices(pkg);
    services.push(...listed.services);
    conflicts.push(...listed.conflicts);
    warnings.push(...listed.warnings);
  }

  const contractMonthlyDollars = sumContractMonthlyDollars(services);
  const activeServiceCount = services.filter((s) => s.active).length;

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const retainer = round2(retainerMonthlyDollars);
  const contract = round2(contractMonthlyDollars);
  const disagree =
    retainer > 0 && contract > 0 && Math.abs(retainer - contract) >= 0.01;

  if (disagree || conflicts.length > 0) {
    return {
      clientId: input.clientId,
      // Preserve legacy Financial Command number during migration.
      portfolioMrrDollars: retainer > 0 ? retainer : contract,
      commercialMonthlyDollars: contract > 0 ? contract : retainer,
      retainerMonthlyDollars: retainer,
      contractMonthlyDollars: contract,
      source: "conflict",
      activeServiceCount,
      services,
      conflicts: disagree
        ? [
            ...conflicts,
            `Retainer monthly $${retainer.toFixed(2)} disagrees with contract recurring monthly-equivalent $${contract.toFixed(2)}. Portfolio MRR keeps retainer until operator reconciles.`,
          ]
        : conflicts,
      warnings,
    };
  }

  if (contract > 0) {
    return {
      clientId: input.clientId,
      portfolioMrrDollars: contract,
      commercialMonthlyDollars: contract,
      retainerMonthlyDollars: retainer,
      contractMonthlyDollars: contract,
      source: "contract-authority",
      activeServiceCount,
      services,
      conflicts,
      warnings:
        retainer > 0
          ? [
              ...warnings,
              "Retainer shadow present and matches contract recurring monthly-equivalent.",
            ]
          : warnings,
    };
  }

  if (retainer > 0) {
    return {
      clientId: input.clientId,
      portfolioMrrDollars: retainer,
      commercialMonthlyDollars: retainer,
      retainerMonthlyDollars: retainer,
      contractMonthlyDollars: 0,
      source: "retainer-legacy",
      activeServiceCount: 0,
      services: [],
      conflicts,
      warnings: [
        ...warnings,
        "No active contract recurring authority; using legacy Retainer for portfolio MRR.",
      ],
    };
  }

  return {
    clientId: input.clientId,
    portfolioMrrDollars: 0,
    commercialMonthlyDollars: 0,
    retainerMonthlyDollars: 0,
    contractMonthlyDollars: 0,
    source: "none",
    activeServiceCount: 0,
    services: [],
    conflicts,
    warnings,
  };
}

export function relClientId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}
