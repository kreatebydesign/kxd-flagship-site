/**
 * Resolve authoritative recurring service definitions from a contract lifecycle package.
 *
 * Authority chain (Edition 1):
 *   commercialAmendments.recurringService
 *     → structuredPaymentTerms.recurring (derived overlay)
 *     → operatorRecurringServices (operational projection/cache only)
 *
 * Never silently pick newest/larger amount. Divergent operator defs vs legal
 * recurring produce an explicit conflict — do not auto-materialize.
 */

import type { ContractLifecyclePackage } from "./types.ts";
import type { OperatorRecurringServiceDefinition } from "./ensure-payable-surfaces.ts";
import { slugifyServiceKey } from "./ensure-payable-surfaces.ts";

export type RecurringServiceSource =
  | "commercial-amendment"
  | "structured-payment-terms"
  | "operator-definition";

export type RecurringActivationStatus =
  | "active"
  | "pending-trigger"
  | "inactive"
  | "conflict";

export type ResolvedRecurringService = {
  serviceKey: string;
  title: string;
  description: string | null;
  amountCents: number;
  currency: string;
  cadence: "monthly" | "quarterly" | "annual";
  billDay: number;
  /** First billable calendar date (YYYY-MM-DD) when known. */
  effectiveDate: string | null;
  /** Exclusive end — periods on/after this date are not generated. */
  endDate: string | null;
  active: boolean;
  activationStatus: RecurringActivationStatus;
  activationReason: string;
  source: RecurringServiceSource;
  startTrigger: string | null;
  startBillingDateStatus: string | null;
};

export type RecurringAuthorityConflict = {
  code:
    | "legal-vs-operator-amount"
    | "legal-vs-operator-identity"
    | "legal-vs-existing-obligation"
    | "multiple-operator-defs-without-legal"
    | "ambiguous-recurring-authority";
  message: string;
  legalServiceKey?: string | null;
  legalAmountCents?: number | null;
  operatorServiceKey?: string | null;
  operatorAmountCents?: number | null;
  obligationId?: string | null;
};

export type ResolveRecurringAuthorityResult = {
  services: ResolvedRecurringService[];
  conflicts: RecurringAuthorityConflict[];
  warnings: string[];
};

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function asPositiveCents(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return 0;
  return n;
}

function includesText(includes: string[] | null | undefined): string | null {
  const parts = (includes ?? []).map((item) => String(item).trim()).filter(Boolean);
  return parts.length ? parts.join("; ") : null;
}

function yearMonth(date: string | null | undefined): string | null {
  const raw = trimOrNull(date);
  if (!raw) return null;
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 7);
  return null;
}

/**
 * Activation requires a trustworthy start signal — never calendar alone.
 *
 * Active when:
 * - startBillingDateStatus is confirmed with a startBillingDate, OR
 * - operator definition supplies effectiveDate (operator-attested start), OR
 * - start trigger is on-date / confirmed-start-date with a date
 *
 * website-launch / pending-confirmation / milestone without a calendar date → pending.
 */
export function evaluateRecurringActivation(input: {
  startTrigger: string | null | undefined;
  startBillingDate: string | null | undefined;
  startBillingDateStatus: string | null | undefined;
  effectiveDate: string | null | undefined;
  activeFlag?: boolean;
}): { status: RecurringActivationStatus; reason: string; effectiveDate: string | null } {
  if (input.activeFlag === false) {
    return {
      status: "inactive",
      reason: "Service marked inactive.",
      effectiveDate: null,
    };
  }

  const confirmedDate =
    trimOrNull(input.startBillingDate) || trimOrNull(input.effectiveDate);
  const status = String(input.startBillingDateStatus ?? "").trim();
  const trigger = String(input.startTrigger ?? "").trim();

  if (status === "confirmed" && confirmedDate) {
    return {
      status: "active",
      reason: `Start date confirmed (${confirmedDate}).`,
      effectiveDate: confirmedDate.slice(0, 10),
    };
  }

  if (
    (trigger === "on-date" || trigger === "confirmed-start-date") &&
    confirmedDate
  ) {
    return {
      status: "active",
      reason: `Fixed start date (${confirmedDate.slice(0, 10)}).`,
      effectiveDate: confirmedDate.slice(0, 10),
    };
  }

  // Operator-attested effectiveDate alone activates operational materialization
  // only when present on a resolved definition (caller supplies it).
  if (trimOrNull(input.effectiveDate)) {
    const date = String(input.effectiveDate).slice(0, 10);
    return {
      status: "active",
      reason: `Effective date recorded (${date}).`,
      effectiveDate: date,
    };
  }

  if (status === "pending-confirmation" || trigger === "pending-confirmation") {
    return {
      status: "pending-trigger",
      reason: "Start/billing date pending confirmation.",
      effectiveDate: null,
    };
  }

  if (trigger === "website-launch" || trigger === "after-launch-verified") {
    return {
      status: "pending-trigger",
      reason:
        "Begins at website launch — no confirmed start/effective date recorded yet.",
      effectiveDate: null,
    };
  }

  if (status === "milestone-confirmed" && !confirmedDate) {
    return {
      status: "pending-trigger",
      reason: "Milestone confirmed commercially but no calendar start date recorded.",
      effectiveDate: null,
    };
  }

  return {
    status: "pending-trigger",
    reason: "No trustworthy activation signal.",
    effectiveDate: null,
  };
}

function legalRecurringFromPackage(
  pkg: ContractLifecyclePackage,
): ResolvedRecurringService | null {
  const amendment = pkg.commercialAmendments?.recurringService ?? null;
  const terms = pkg.structuredPaymentTerms?.recurring ?? null;
  const currency = pkg.structuredPaymentTerms?.currency ?? pkg.billingPlan?.currency ?? "USD";

  if (amendment && asPositiveCents(amendment.amountCents) > 0) {
    const serviceKey = slugifyServiceKey(amendment.title);
    const activation = evaluateRecurringActivation({
      startTrigger: amendment.startTrigger,
      startBillingDate: amendment.startBillingDate,
      startBillingDateStatus: amendment.startBillingDateStatus,
      effectiveDate: amendment.startBillingDate,
      activeFlag: true,
    });
    return {
      serviceKey,
      title: amendment.title,
      description: includesText(amendment.includes),
      amountCents: amendment.amountCents,
      currency,
      cadence: "monthly",
      billDay: 1,
      effectiveDate: activation.effectiveDate,
      endDate: null,
      active: activation.status === "active",
      activationStatus: activation.status,
      activationReason: activation.reason,
      source: "commercial-amendment",
      startTrigger: amendment.startTrigger,
      startBillingDateStatus: amendment.startBillingDateStatus,
    };
  }

  if (terms && asPositiveCents(terms.amountCents) > 0 && terms.cadence !== "none") {
    const title = trimOrNull(terms.serviceTitle) || "Recurring client service";
    const serviceKey = slugifyServiceKey(title);
    const cadence =
      terms.cadence === "quarterly" || terms.cadence === "annual"
        ? terms.cadence
        : "monthly";
    const activation = evaluateRecurringActivation({
      startTrigger: terms.startTrigger,
      startBillingDate: terms.startBillingDate,
      startBillingDateStatus: terms.startBillingDateStatus,
      effectiveDate: terms.startBillingDate,
      activeFlag: terms.status !== "cancelled",
    });
    return {
      serviceKey,
      title,
      description: includesText(terms.includes),
      amountCents: terms.amountCents,
      currency,
      cadence,
      billDay: 1,
      effectiveDate: activation.effectiveDate,
      endDate: null,
      active: activation.status === "active" && terms.status !== "cancelled",
      activationStatus:
        terms.status === "cancelled" ? "inactive" : activation.status,
      activationReason:
        terms.status === "cancelled" ? "Recurring terms cancelled." : activation.reason,
      source: "structured-payment-terms",
      startTrigger: terms.startTrigger ?? null,
      startBillingDateStatus: terms.startBillingDateStatus ?? null,
    };
  }

  return null;
}

function fromOperatorDefinition(
  def: OperatorRecurringServiceDefinition,
): ResolvedRecurringService {
  const activation = evaluateRecurringActivation({
    startTrigger: def.effectiveDate ? "on-date" : null,
    startBillingDate: def.effectiveDate,
    startBillingDateStatus: def.effectiveDate ? "confirmed" : "pending-confirmation",
    effectiveDate: def.effectiveDate,
    activeFlag: def.active !== false,
  });
  return {
    serviceKey: slugifyServiceKey(def.serviceKey || def.title),
    title: def.title,
    description: trimOrNull(def.description),
    amountCents: def.amountCents,
    currency: def.currency || "USD",
    cadence: def.cadence,
    billDay: def.billDay || 1,
    effectiveDate: activation.effectiveDate,
    endDate: null,
    active: def.active !== false && activation.status === "active",
    activationStatus: def.active === false ? "inactive" : activation.status,
    activationReason:
      def.active === false ? "Operator service marked inactive." : activation.reason,
    source: "operator-definition",
    startTrigger: def.effectiveDate ? "on-date" : null,
    startBillingDateStatus: def.effectiveDate ? "confirmed" : "pending-confirmation",
  };
}

/**
 * Resolve the active recurring definition(s) for a contract package.
 * Returns conflicts instead of guessing when legal and operator disagree.
 */
export function resolveRecurringAuthority(
  pkg: ContractLifecyclePackage,
): ResolveRecurringAuthorityResult {
  const conflicts: RecurringAuthorityConflict[] = [];
  const warnings: string[] = [];
  const legal = legalRecurringFromPackage(pkg);
  const allOperatorDefs = pkg.operatorRecurringServices ?? [];
  const operatorDefs = allOperatorDefs.filter(
    (def) => def.active !== false && asPositiveCents(def.amountCents) > 0,
  );

  if (legal) {
    for (const def of operatorDefs) {
      const opKey = slugifyServiceKey(def.serviceKey || def.title);
      if (opKey !== legal.serviceKey) {
        conflicts.push({
          code: "legal-vs-operator-identity",
          message: `Legal recurring service "${legal.title}" (${legal.serviceKey}, $${(legal.amountCents / 100).toFixed(2)}) conflicts with operator service "${def.title}" (${opKey}, $${(def.amountCents / 100).toFixed(2)}). Resolve with a commercial amendment before auto-materializing.`,
          legalServiceKey: legal.serviceKey,
          legalAmountCents: legal.amountCents,
          operatorServiceKey: opKey,
          operatorAmountCents: def.amountCents,
        });
        continue;
      }
      if (def.amountCents !== legal.amountCents) {
        conflicts.push({
          code: "legal-vs-operator-amount",
          message: `Legal amount $${(legal.amountCents / 100).toFixed(2)} for "${legal.title}" conflicts with operator amount $${(def.amountCents / 100).toFixed(2)}. Do not guess.`,
          legalServiceKey: legal.serviceKey,
          legalAmountCents: legal.amountCents,
          operatorServiceKey: opKey,
          operatorAmountCents: def.amountCents,
        });
      }
    }

    // Existing recurring-period obligations that disagree with legal amount/title.
    for (const obl of pkg.billingPlan?.obligations ?? []) {
      if (obl.kind !== "recurring-period") continue;
      const rawOblKey =
        trimOrNull(obl.serviceDefinitionKey) ||
        trimOrNull(obl.serviceTitle) ||
        (obl.sourceKey?.startsWith("recurring:")
          ? obl.sourceKey.split(":")[1] ?? null
          : null);
      if (!rawOblKey) continue;
      const oblKey = slugifyServiceKey(rawOblKey);
      if (oblKey === legal.serviceKey) {
        if (obl.amountCents !== legal.amountCents) {
          conflicts.push({
            code: "legal-vs-existing-obligation",
            message: `Existing obligation ${obl.id} amount $${(obl.amountCents / 100).toFixed(2)} disagrees with legal $${(legal.amountCents / 100).toFixed(2)} for ${legal.title}.`,
            legalServiceKey: legal.serviceKey,
            legalAmountCents: legal.amountCents,
            obligationId: obl.id,
          });
        }
        continue;
      }
      // Different service key on the same contract's recurring slot — competing product.
      conflicts.push({
        code: "legal-vs-existing-obligation",
        message: `Existing recurring obligation "${obl.serviceTitle || obl.label}" (${oblKey}, $${(obl.amountCents / 100).toFixed(2)}) does not match legal recurring "${legal.title}" (${legal.serviceKey}, $${(legal.amountCents / 100).toFixed(2)}).`,
        legalServiceKey: legal.serviceKey,
        legalAmountCents: legal.amountCents,
        operatorServiceKey: oblKey,
        operatorAmountCents: obl.amountCents,
        obligationId: obl.id,
      });
    }

    if (conflicts.length > 0) {
      return {
        services: [
          {
            ...legal,
            activationStatus: "conflict",
            activationReason: "Conflicting recurring definitions block auto-materialization.",
            active: false,
          },
        ],
        conflicts,
        warnings,
      };
    }

    // Align operator cache when it matches legal (no conflict).
    return { services: [legal], conflicts, warnings };
  }

  // No legal recurring — operator defs may operate only when unambiguous.
  if (operatorDefs.length === 0) {
    const inactiveOnly = allOperatorDefs.filter(
      (def) => def.active === false && asPositiveCents(def.amountCents) > 0,
    );
    if (inactiveOnly.length > 0) {
      return {
        services: inactiveOnly.map((def) => fromOperatorDefinition(def)),
        conflicts,
        warnings,
      };
    }
    return { services: [], conflicts, warnings };
  }

  if (operatorDefs.length > 1) {
    conflicts.push({
      code: "multiple-operator-defs-without-legal",
      message:
        "Multiple operator recurring services exist without a commercial-amendment / structured recurring authority. Resolve to one legal definition before auto-materializing.",
    });
    return {
      services: operatorDefs.map((def) => ({
        ...fromOperatorDefinition(def),
        activationStatus: "conflict" as const,
        activationReason: "Ambiguous operator-only recurring authority.",
        active: false,
      })),
      conflicts,
      warnings,
    };
  }

  warnings.push(
    "No commercial-amendment recurring service found; using single operator recurring definition as operational authority.",
  );
  return {
    services: [fromOperatorDefinition(operatorDefs[0]!)],
    conflicts,
    warnings,
  };
}

/** Periods YYYY-MM from startMonth through endMonth inclusive. */
export function listYearMonthsInclusive(
  startYearMonth: string,
  endYearMonth: string,
): string[] {
  const start = yearMonth(startYearMonth);
  const end = yearMonth(endYearMonth);
  if (!start || !end) return [];
  if (start > end) return [];
  const out: string[] = [];
  let [y, m] = start.split("-").map(Number) as [number, number];
  const [ey, em] = end.split("-").map(Number) as [number, number];
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export function periodYearMonthsForService(input: {
  cadence: "monthly" | "quarterly" | "annual";
  effectiveDate: string;
  throughDate: string;
  endDate?: string | null;
}): string[] {
  const effectiveYm = yearMonth(input.effectiveDate);
  const throughYm = yearMonth(input.throughDate);
  if (!effectiveYm || !throughYm) return [];

  let endYm = throughYm;
  const serviceEnd = yearMonth(input.endDate ?? null);
  if (serviceEnd && serviceEnd < endYm) endYm = serviceEnd;

  const months = listYearMonthsInclusive(effectiveYm, endYm);
  if (input.cadence === "monthly") return months;

  if (input.cadence === "quarterly") {
    const startMonth = Number(effectiveYm.slice(5, 7));
    return months.filter((ym) => {
      const month = Number(ym.slice(5, 7));
      const offset = (month - startMonth + 12) % 12;
      return offset % 3 === 0;
    });
  }

  // annual — anniversary month only
  const anniversaryMonth = effectiveYm.slice(5, 7);
  return months.filter((ym) => ym.slice(5, 7) === anniversaryMonth);
}
