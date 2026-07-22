/**
 * Phase 37F — Pure billing-readiness assessment.
 * Free of server-only so verification scripts can import it.
 *
 * Server owns all monetary classification, readiness, and fingerprint.
 * Browser-supplied prices, currency, cadence, and Stripe IDs are ignored.
 */

import { createHash } from "node:crypto";
import { isClientPlanKey } from "@/lib/client-plans/catalog";
import type { ClientPlanKey, ClientPlanStatus } from "@/lib/client-plans/types";
import { PARTNERSHIP_ADD_ONS } from "@/lib/partnerships/packages";
import {
  commercialAddOnLabel,
  getCommercialAgreement,
  isCommercialAgreementId,
} from "./definitions";
import { mapAgreementToPlan } from "./activation-logic";
import type { CommercialAgreementId } from "./types";
import {
  BILLING_OWNERSHIP,
  BILLING_READINESS_NOTICES,
  BILLING_READINESS_SYSTEMS_UNCHANGED,
  type BillingMoneyAmount,
  type BillingReadinessBlockCode,
  type BillingReadinessSnapshot,
  type BillingReadinessStatus,
  type CommercialTermClassification,
  type ExternalBillingIdentity,
  type FutureStripeMappingProposal,
} from "./billing-readiness-types";

export type BillingReadinessClientState = {
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  updatedAt: string | null;
  commercialAgreementId: string | null;
  monthlyRetainerAmount: number | null;
  setupFee: number | null;
  monthlyServiceCredits: number | null;
  commercialAddOns: string[];
  commercialNotes: string | null;
  planKey: ClientPlanKey | null;
  planStatus: ClientPlanStatus | null;
};

export type BillingProfileReadState = {
  profilePresent: boolean;
  billingContact: string | null;
  billingEmail: string | null;
  invoiceCadence: string | null;
  paymentTerms: string | null;
  billingStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  quickbooksCustomerId: string | null;
  waveCustomerId: string | null;
  /** True when more than one billing-profiles doc exists for the client. */
  duplicateProfiles: boolean;
};

const CENTS_EPS = 1e-8;

/**
 * Exact cents check — never silently round.
 * null is allowed and distinct from zero.
 */
export function validateMonetaryAmount(
  value: number | null,
  fieldLabel: string,
):
  | {
      ok: true;
      amount: number | null;
      amountCents: number | null;
      presence: BillingMoneyAmount["presence"];
    }
  | { ok: false; message: string; code: BillingReadinessBlockCode } {
  if (value === null || value === undefined) {
    return { ok: true, amount: null, amountCents: null, presence: "null" };
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return {
      ok: false,
      code: "invalid_precision",
      message: `${fieldLabel} is not a finite number.`,
    };
  }
  if (value < 0) {
    return {
      ok: false,
      code: "negative_amount",
      message: `${fieldLabel} cannot be negative.`,
    };
  }
  const centsExact = value * 100;
  const centsRounded = Math.round(centsExact);
  if (Math.abs(centsExact - centsRounded) > CENTS_EPS) {
    return {
      ok: false,
      code: "invalid_precision",
      message: `${fieldLabel} must use at most two decimal places (cents-safe).`,
    };
  }
  if (centsRounded === 0) {
    return { ok: true, amount: 0, amountCents: 0, presence: "zero" };
  }
  return {
    ok: true,
    amount: centsRounded / 100,
    amountCents: centsRounded,
    presence: "positive",
  };
}

export function validateServiceCredits(
  value: number | null,
):
  | { ok: true; amount: number | null; presence: BillingMoneyAmount["presence"] }
  | { ok: false; message: string; code: BillingReadinessBlockCode } {
  if (value === null || value === undefined) {
    return { ok: true, amount: null, presence: "null" };
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return {
      ok: false,
      code: "invalid_precision",
      message: "Monthly service credits must be a finite whole number.",
    };
  }
  if (value < 0) {
    return {
      ok: false,
      code: "negative_amount",
      message: "Monthly service credits cannot be negative.",
    };
  }
  if (!Number.isInteger(value)) {
    return {
      ok: false,
      code: "invalid_precision",
      message: "Monthly service credits must be a whole number.",
    };
  }
  if (value === 0) return { ok: true, amount: 0, presence: "zero" };
  return { ok: true, amount: value, presence: "positive" };
}

export function dollarsToCentsExact(value: number | null): number | null {
  if (value === null) return null;
  const validated = validateMonetaryAmount(value, "Amount");
  if (!validated.ok) return null;
  return validated.amountCents;
}

export function sanitizeExternalId(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 6) return `${trimmed.slice(0, 2)}…`;
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}

export function classifyCommercialAddOn(addOnId: string) {
  const catalog = PARTNERSHIP_ADD_ONS.find((row) => row.id === addOnId);
  const label = commercialAddOnLabel(addOnId);
  if (!catalog) {
    return {
      id: addOnId,
      label,
      pricingNote: "Unknown add-on",
      classification: "unsupported" as const,
      kind: "ambiguous" as const,
      stripeSafe: false,
      notes: [
        "Unknown commercial add-on is not mapped to Stripe. Operator clarification required.",
      ],
    };
  }

  const note = catalog.pricingNote.toLowerCase();
  const requiresProposal =
    note.includes("proposal") ||
    note.includes("scope") ||
    note.includes("priced according");

  if (requiresProposal) {
    return {
      id: catalog.id,
      label: catalog.name,
      pricingNote: catalog.pricingNote,
      classification: "requires_review" as const,
      kind: "ambiguous" as const,
      stripeSafe: false,
      notes: [
        "Commercial add-on pricing is proposal-scoped. Not treated as billable without explicit billing terms.",
        "Cadence (one-time vs recurring) is not authoritative for this add-on.",
      ],
    };
  }

  return {
    id: catalog.id,
    label: catalog.name,
    pricingNote: catalog.pricingNote,
    classification: "informational" as const,
    kind: "informational" as const,
    stripeSafe: false,
    notes: [
      "Add-on recorded commercially but has no fixed billable amount in the catalog.",
    ],
  };
}

function buildMoneyTerm(input: {
  validated:
    | {
        ok: true;
        amount: number | null;
        amountCents: number | null;
        presence: BillingMoneyAmount["presence"];
      }
    | { ok: false; message: string; code: BillingReadinessBlockCode };
  kind: BillingMoneyAmount["kind"];
  classification: CommercialTermClassification;
  label: string;
  source: string;
  extraNotes?: string[];
}): BillingMoneyAmount {
  if (!input.validated.ok) {
    return {
      amount: null,
      amountCents: null,
      presence: "invalid",
      kind: input.kind,
      classification: "requires_review",
      label: input.label,
      source: input.source,
      notes: [input.validated.message, ...(input.extraNotes ?? [])],
    };
  }
  return {
    amount: input.validated.amount,
    amountCents: input.validated.amountCents,
    presence: input.validated.presence,
    kind: input.kind,
    classification: input.classification,
    label: input.label,
    source: input.source,
    notes: input.extraNotes ?? [],
  };
}

export function assessCurrency() {
  return {
    code: null as string | null,
    authoritative: false,
    documentedFieldUnit: "USD" as string | null,
    explanation:
      "Commercial amount fields are documented as USD in the client schema, but no discrete currency code is stored for external billing. Currency is never inferred for Stripe.",
  };
}

export function assessCadence(
  profile: BillingProfileReadState | null,
  hasMonthlyRetainer: boolean,
) {
  const retainerCadence = hasMonthlyRetainer ? ("monthly" as const) : null;
  const profileInvoiceCadence = profile?.invoiceCadence?.trim() || null;
  return {
    retainerCadence,
    profileInvoiceCadence,
    authoritative: retainerCadence !== null,
    explanation: retainerCadence
      ? "Monthly retainer cadence is authoritative from the monthlyRetainerAmount field definition. Profile invoice cadence is preference only and is not invented when absent."
      : profileInvoiceCadence
        ? "No monthly retainer is recorded. Profile invoice cadence is preference only — not treated as an approved commercial billing cadence."
        : "No authoritative billing cadence is available. Cadence is never invented.",
  };
}

export function assessBillingContact(profile: BillingProfileReadState | null) {
  if (!profile?.profilePresent) {
    return {
      contactName: null as string | null,
      email: null as string | null,
      source: "none" as const,
      present: false,
      explanation:
        "No billing-profiles record found. Billing contact is not inferred from other client fields.",
    };
  }
  const contactName = profile.billingContact?.trim() || null;
  const email = profile.billingEmail?.trim() || null;
  const present = Boolean(contactName || email);
  return {
    contactName,
    email,
    source: "billing-profiles" as const,
    present,
    explanation: present
      ? "Billing contact loaded from the authoritative billing-profiles collection."
      : "Billing profile exists but billing contact and email are unset.",
  };
}

export function collectExternalIdentities(
  profile: BillingProfileReadState | null,
): ExternalBillingIdentity[] {
  if (!profile?.profilePresent) return [];
  const rows: Array<{
    provider: ExternalBillingIdentity["provider"];
    field: string;
    raw: string | null;
  }> = [
    {
      provider: "stripe",
      field: "stripeCustomerId",
      raw: profile.stripeCustomerId,
    },
    {
      provider: "stripe",
      field: "stripeSubscriptionId",
      raw: profile.stripeSubscriptionId,
    },
    {
      provider: "quickbooks",
      field: "quickbooksCustomerId",
      raw: profile.quickbooksCustomerId,
    },
    {
      provider: "wave",
      field: "waveCustomerId",
      raw: profile.waveCustomerId,
    },
  ];
  return rows
    .filter((row) => Boolean(row.raw?.trim()))
    .map((row) => ({
      provider: row.provider,
      field: row.field,
      present: true,
      sanitizedId: sanitizeExternalId(row.raw),
    }));
}

export function assessAgreementPlanAlignment(state: BillingReadinessClientState) {
  const planKey = state.planKey;
  const planStatus = state.planStatus;
  const agreementId = state.commercialAgreementId;

  if (!agreementId) {
    if (planStatus === "legacy" || (!planKey && planStatus !== "active")) {
      return {
        status: "legacy_access_only" as const,
        expectedPlanKey: null as ClientPlanKey | "custom" | null,
        actualPlanKey: planKey,
        actualPlanStatus: planStatus,
        explanation:
          "Legacy or unset access is not proof of a billing agreement. Missing agreement remains a blocker for billing readiness.",
      };
    }
    return {
      status: "not_applicable" as const,
      expectedPlanKey: null as ClientPlanKey | "custom" | null,
      actualPlanKey: planKey,
      actualPlanStatus: planStatus,
      explanation: "No recorded commercial agreement.",
    };
  }

  if (!isCommercialAgreementId(agreementId)) {
    return {
      status: "requires_review" as const,
      expectedPlanKey: null as ClientPlanKey | "custom" | null,
      actualPlanKey: planKey,
      actualPlanStatus: planStatus,
      explanation: "Unknown agreement cannot be aligned to a plan for billing.",
    };
  }

  if (planStatus === "paused") {
    const mapping = mapAgreementToPlan(agreementId);
    return {
      status: "paused" as const,
      expectedPlanKey:
        agreementId === "custom-legacy"
          ? ("custom" as const)
          : mapping.ok
            ? mapping.proposedPlanKey
            : null,
      actualPlanKey: planKey,
      actualPlanStatus: planStatus,
      explanation:
        "Plan is paused. Access is inactive; commercial terms remain recorded. Billing readiness is represented conservatively.",
    };
  }

  if (agreementId === "custom-legacy") {
    if (planKey === "custom" && (planStatus === "active" || planStatus === "trial")) {
      return {
        status:
          planStatus === "trial"
            ? ("trial_aligned" as const)
            : ("aligned_custom" as const),
        expectedPlanKey: "custom" as const,
        actualPlanKey: planKey,
        actualPlanStatus: planStatus,
        explanation:
          "Custom agreement aligns with canonical custom plan assignment. Commercial terms remain the approved source — module selection does not imply price.",
      };
    }
    if (
      planKey &&
      planKey !== "custom" &&
      (planStatus === "active" || planStatus === "trial")
    ) {
      return {
        status:
          planStatus === "trial"
            ? ("trial_mismatch" as const)
            : ("mismatch" as const),
        expectedPlanKey: "custom" as const,
        actualPlanKey: planKey,
        actualPlanStatus: planStatus,
        explanation:
          "Custom agreement is recorded but a standard plan is assigned. Billing readiness requires operator review.",
      };
    }
    return {
      status: "requires_review" as const,
      expectedPlanKey: "custom" as const,
      actualPlanKey: planKey,
      actualPlanStatus: planStatus,
      explanation:
        "Custom agreement is recorded. Custom plan assignment is optional for commercial recording but recommended before future billing sync.",
    };
  }

  const mapping = mapAgreementToPlan(agreementId);
  const expected = mapping.ok ? mapping.proposedPlanKey : null;

  if (!planKey || planStatus === "legacy" || planStatus == null) {
    return {
      status: "no_plan" as const,
      expectedPlanKey: expected,
      actualPlanKey: planKey,
      actualPlanStatus: planStatus,
      explanation:
        "Agreement is recorded without an active modern plan. Access provisioning is separate from billing readiness.",
    };
  }

  if (
    expected &&
    planKey === expected &&
    (planStatus === "active" || planStatus === "trial")
  ) {
    return {
      status:
        planStatus === "trial"
          ? ("trial_aligned" as const)
          : ("aligned_standard" as const),
      expectedPlanKey: expected,
      actualPlanKey: planKey,
      actualPlanStatus: planStatus,
      explanation:
        "Standard agreement aligns with the mapped modern plan. Recorded commercial amounts are the approved source — no separate price catalog is invented.",
    };
  }

  if (
    expected &&
    planKey !== expected &&
    (planStatus === "active" || planStatus === "trial")
  ) {
    return {
      status:
        planStatus === "trial"
          ? ("trial_mismatch" as const)
          : ("mismatch" as const),
      expectedPlanKey: expected,
      actualPlanKey: planKey,
      actualPlanStatus: planStatus,
      explanation: `Agreement maps to ${expected} but assigned plan is ${planKey}.`,
    };
  }

  return {
    status: "requires_review" as const,
    expectedPlanKey: expected,
    actualPlanKey: planKey,
    actualPlanStatus: planStatus,
    explanation: "Agreement/plan relationship requires operator review.",
  };
}

function assignmentClassification(state: BillingReadinessClientState): string {
  if (
    state.planStatus === "legacy" ||
    (!state.planKey && state.planStatus !== "active")
  ) {
    return "legacy_or_unassigned";
  }
  if (state.planStatus === "paused") return "paused";
  if (state.planStatus === "trial") return "trial";
  if (state.planKey === "custom") return "custom_active";
  if (state.planKey && state.planStatus === "active") return "standard_active";
  return "other";
}

function buildFutureMapping(
  currency: ReturnType<typeof assessCurrency>,
  contact: ReturnType<typeof assessBillingContact>,
): FutureStripeMappingProposal {
  return {
    clientToCustomer:
      "Future controlled sync would create or attach one Stripe Customer per KXD client using server-owned identity — never browser-supplied customer IDs.",
    agreementToTerms:
      "Recorded commercial agreement remains the approved billing-terms source. Plan assignment does not rewrite prices.",
    setupFee:
      "Setup fee maps to a one-time Stripe invoice item (or approved equivalent) only when presence is non-null and classification is billable.",
    monthlyRetainer:
      "Monthly retainer maps to a recurring subscription item. Prefer shared Stripe products/prices for standard agreements; custom agreements need reviewed price data.",
    addOns:
      "Only explicitly billable, cadence-resolved add-ons may map. Proposal-scoped add-ons stay requires_review and must not auto-map.",
    currency: currency.authoritative
      ? `Use authoritative currency ${currency.code}.`
      : "Currency code is not stored authoritatively; future sync must confirm currency before creating Stripe objects.",
    billingEmail: contact.email
      ? "Use billing-profiles.billingEmail as Stripe customer email when present."
      : "Billing email missing — collect via billing profile before sync.",
    metadata:
      "Safe metadata only: internal client id, agreement id, billing-readiness fingerprint. Never copy commercial notes into Stripe metadata automatically.",
    catalogStrategy:
      "Recommended: shared Stripe products/prices for standard agreements (starter/growth/premium retainers + setup fees); per-agreement reviewed amounts for custom-legacy. Avoid per-client product proliferation and avoid trusting inline browser price data.",
    explicitNotice:
      "This proposal is documentation only. Phase 37F does not create customers, products, prices, subscriptions, invoices, or charges.",
  };
}

export function buildBillingReadinessFingerprint(input: {
  clientId: number;
  agreementId: string | null;
  planKey: string | null;
  planStatus: string | null;
  setupFeeCents: number | null;
  monthlyRetainerCents: number | null;
  monthlyServiceCredits: number | null;
  commercialAddOns: readonly string[];
  readiness: BillingReadinessStatus;
  alignmentStatus: string;
  billingEmail: string | null;
  externalKeys: readonly string[];
}): string {
  const payload = JSON.stringify({
    v: 1,
    clientId: input.clientId,
    agreementId: input.agreementId,
    planKey: input.planKey,
    planStatus: input.planStatus,
    setupFeeCents: input.setupFeeCents,
    monthlyRetainerCents: input.monthlyRetainerCents,
    monthlyServiceCredits: input.monthlyServiceCredits,
    commercialAddOns: [...input.commercialAddOns].slice().sort(),
    readiness: input.readiness,
    alignmentStatus: input.alignmentStatus,
    billingEmail: input.billingEmail,
    externalKeys: [...input.externalKeys].slice().sort(),
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 40);
}

export function billingReadinessStatusLabel(
  status: BillingReadinessStatus,
): string {
  switch (status) {
    case "not_applicable":
      return "Not applicable";
    case "not_configured":
      return "Not configured";
    case "blocked":
      return "Blocked";
    case "ready_for_review":
      return "Ready for review";
    case "ready_for_future_sync":
      return "Ready for a future controlled setup";
    case "externally_linked":
      return "Externally linked";
    case "state_mismatch":
      return "State mismatch";
    default:
      return status;
  }
}

/**
 * Reject browser-authoritative billing fields.
 */
export function rejectBrowserBillingAuthority(body: unknown):
  | { ok: true }
  | { ok: false; message: string } {
  if (body == null) return { ok: true };
  if (typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "Unexpected request body." };
  }
  const row = body as Record<string, unknown>;
  const forbidden = [
    "setupFee",
    "monthlyRetainerAmount",
    "monthlyRetainer",
    "amount",
    "amounts",
    "currency",
    "cadence",
    "stripeCustomerId",
    "stripeSubscriptionId",
    "customerId",
    "priceId",
    "productId",
    "subscriptionId",
    "invoiceId",
    "tax",
    "discount",
    "credits",
    "readiness",
    "fingerprint",
  ] as const;
  for (const key of forbidden) {
    if (key in row && row[key] !== undefined) {
      return {
        ok: false,
        message:
          "Browser-supplied billing fields are ignored. Readiness is calculated server-side only.",
      };
    }
  }
  return { ok: true };
}

export function buildBillingReadinessSnapshot(
  state: BillingReadinessClientState,
  profile: BillingProfileReadState | null,
  generatedAt: string = new Date().toISOString(),
): BillingReadinessSnapshot {
  const blockers: Array<{ code: BillingReadinessBlockCode; message: string }> =
    [];
  const warnings: string[] = [];
  const missingRequired: string[] = [];

  const rawAgreement = state.commercialAgreementId;
  let agreementId: CommercialAgreementId | null = null;
  let agreementRecordStatus: BillingReadinessSnapshot["agreementRecordStatus"] =
    "unset";

  if (!rawAgreement) {
    agreementRecordStatus = "unset";
    blockers.push({
      code: "no_agreement",
      message:
        "No recorded commercial agreement. Legacy access alone is not a billing agreement.",
    });
    if (state.planStatus === "legacy" || !state.planKey) {
      blockers.push({
        code: "legacy_without_agreement",
        message:
          "Legacy or unassigned access cannot establish billing readiness without a recorded agreement.",
      });
    }
  } else if (!isCommercialAgreementId(rawAgreement)) {
    agreementRecordStatus = "unknown";
    blockers.push({
      code: "unknown_agreement",
      message: "Unknown commercial agreement blocks billing readiness.",
    });
  } else {
    agreementId = rawAgreement;
    agreementRecordStatus = "recorded";
  }

  const agreement = getCommercialAgreement(agreementId);
  const setupValidated = validateMonetaryAmount(state.setupFee, "Setup fee");
  const retainerValidated = validateMonetaryAmount(
    state.monthlyRetainerAmount,
    "Monthly retainer",
  );
  const creditsValidated = validateServiceCredits(state.monthlyServiceCredits);

  if (!setupValidated.ok) {
    blockers.push({ code: setupValidated.code, message: setupValidated.message });
  }
  if (!retainerValidated.ok) {
    blockers.push({
      code: retainerValidated.code,
      message: retainerValidated.message,
    });
  }
  if (!creditsValidated.ok) {
    blockers.push({
      code: creditsValidated.code,
      message: creditsValidated.message,
    });
  }

  if (
    agreementId &&
    agreementId !== "custom-legacy" &&
    setupValidated.ok &&
    retainerValidated.ok &&
    creditsValidated.ok
  ) {
    const baseline = agreement
      ? {
          monthly: agreement.monthlyStarting,
          setup: agreement.setupFee,
          credits: agreement.monthlyServiceCredits,
        }
      : null;
    if (
      baseline &&
      (retainerValidated.amount !== baseline.monthly ||
        setupValidated.amount !== baseline.setup ||
        creditsValidated.amount !== baseline.credits)
    ) {
      blockers.push({
        code: "invalid_commercial",
        message:
          "Recorded commercial values do not match the canonical standard agreement baseline.",
      });
    }
  }

  const setupFee = buildMoneyTerm({
    validated: setupValidated.ok
      ? {
          ok: true,
          amount: setupValidated.amount,
          amountCents: setupValidated.amountCents,
          presence: setupValidated.presence,
        }
      : setupValidated,
    kind: "one_time",
    classification:
      setupValidated.ok && setupValidated.presence !== "null"
        ? "billable"
        : setupValidated.ok
          ? "informational"
          : "requires_review",
    label: "Setup fee",
    source: "clients.setupFee",
    extraNotes: [
      "Classified as one-time only from the setupFee field. Tax, discount, and proration are not modeled.",
      "Null means unset; zero means explicitly zero — they remain distinct.",
    ],
  });

  const monthlyRetainer = buildMoneyTerm({
    validated: retainerValidated.ok
      ? {
          ok: true,
          amount: retainerValidated.amount,
          amountCents: retainerValidated.amountCents,
          presence: retainerValidated.presence,
        }
      : retainerValidated,
    kind: "recurring",
    classification:
      retainerValidated.ok && retainerValidated.presence !== "null"
        ? "billable"
        : retainerValidated.ok
          ? "informational"
          : "requires_review",
    label: "Monthly retainer",
    source: "clients.monthlyRetainerAmount",
    extraNotes: [
      "Classified as recurring monthly from the monthlyRetainerAmount field definition.",
      "Null means unset; zero means explicitly zero — they remain distinct.",
    ],
  });

  const monthlyServiceCredits: BillingMoneyAmount = (() => {
    if (!creditsValidated.ok) {
      return {
        amount: null,
        amountCents: null,
        presence: "invalid",
        kind: "service_capacity",
        classification: "requires_review",
        label: "Monthly service credits",
        source: "clients.monthlyServiceCredits",
        notes: [creditsValidated.message],
      };
    }
    return {
      amount: creditsValidated.amount,
      amountCents: null,
      presence: creditsValidated.presence,
      kind: "service_capacity",
      classification: "informational",
      label: "Monthly service credits",
      source: "clients.monthlyServiceCredits",
      notes: [
        "Service credits reserve monthly production capacity. They are not cash, currency, rollover balance, or Stripe credit objects.",
        "Never treat service credits as monetary without a separate, explicit commercial proof.",
      ],
    };
  })();

  const commercialAddOns = (state.commercialAddOns ?? []).map((id) =>
    classifyCommercialAddOn(id),
  );
  for (const addon of commercialAddOns) {
    if (addon.classification === "requires_review") {
      warnings.push(
        `Add-on “${addon.label}” requires billing review before any Stripe mapping.`,
      );
    } else if (addon.classification === "unsupported") {
      blockers.push({
        code: "unsupported_billing_model",
        message: `Unsupported commercial add-on “${addon.label}” cannot map to Stripe.`,
      });
    }
  }

  if (agreementId === "custom-legacy") {
    warnings.push(
      "Custom agreement uses recorded commercial terms as the approved source. Module entitlements do not calculate price.",
    );
    if (setupFee.presence === "null" && monthlyRetainer.presence === "null") {
      blockers.push({
        code: "custom_requires_clarification",
        message:
          "Custom agreement has no setup fee or monthly retainer recorded. Billing clarification is required.",
      });
    } else {
      warnings.push(
        "Custom commercial add-ons and negotiated notes require operator review before future sync.",
      );
    }
  }

  if (
    agreementId &&
    setupFee.presence === "null" &&
    monthlyRetainer.presence === "null" &&
    agreementId !== "custom-legacy"
  ) {
    blockers.push({
      code: "missing_billable_terms",
      message: "No setup fee or monthly retainer is recorded for billing.",
    });
  }

  const alignment = assessAgreementPlanAlignment(state);
  if (alignment.status === "mismatch" || alignment.status === "trial_mismatch") {
    blockers.push({
      code: "agreement_plan_mismatch",
      message: alignment.explanation,
    });
  }

  const currency = assessCurrency();
  warnings.push(currency.explanation);

  const hasRetainer =
    monthlyRetainer.presence === "positive" ||
    monthlyRetainer.presence === "zero";
  const cadence = assessCadence(profile, hasRetainer);
  if (!cadence.authoritative && agreementId) {
    missingRequired.push("Authoritative billing cadence for billable terms");
  }

  const billingContact = assessBillingContact(profile);
  if (!billingContact.present) {
    missingRequired.push("Billing contact or billing email (billing-profiles)");
    warnings.push(billingContact.explanation);
  }

  warnings.push(
    "Tax treatment is not modeled — never invent tax-inclusive/exclusive behavior.",
  );
  warnings.push(
    "Discounts are not modeled — never invent discount, coupon, or promotional pricing.",
  );
  warnings.push(
    "Trial billing behavior is not modeled from planStatus=trial — trial access is not a Stripe trial.",
  );
  warnings.push(
    "Proration is not modeled — never invent invoice dates, payment terms due dates, or proration.",
  );

  if (state.commercialNotes?.trim()) {
    warnings.push(
      "Commercial notes are internal only and must not be copied into Stripe metadata automatically.",
    );
  }

  const externalIdentities = collectExternalIdentities(profile);
  if (profile?.duplicateProfiles) {
    blockers.push({
      code: "conflicting_external_identity",
      message:
        "Multiple billing-profiles records exist for this client. Resolve conflicting billing identities before any sync.",
    });
  }

  const stripeCustomer = profile?.stripeCustomerId?.trim() || null;
  const stripeSubscription = profile?.stripeSubscriptionId?.trim() || null;
  if (stripeSubscription && !stripeCustomer) {
    blockers.push({
      code: "conflicting_external_identity",
      message:
        "Stripe subscription id is present without a Stripe customer id. External identity state is inconsistent.",
    });
  }

  const providerCustomerIds = [
    stripeCustomer,
    profile?.quickbooksCustomerId?.trim() || null,
    profile?.waveCustomerId?.trim() || null,
  ].filter(Boolean) as string[];
  if (providerCustomerIds.length > 1) {
    warnings.push(
      "Multiple external billing customer identities are stored. Confirm which system is authoritative before sync — do not assume Stripe ownership.",
    );
  }

  let readiness: BillingReadinessStatus = "not_configured";
  let readinessExplanation =
    "Billing is not configured. This assessment does not activate billing.";

  const hardBlocked = blockers.length > 0;
  const externallyLinked = Boolean(stripeCustomer || stripeSubscription);
  const mismatch =
    alignment.status === "mismatch" || alignment.status === "trial_mismatch";

  if (!rawAgreement && !externallyLinked) {
    readiness = "not_configured";
    readinessExplanation =
      "Not configured — no recorded agreement and no external billing identity.";
  } else if (
    agreementRecordStatus === "unset" &&
    blockers.every(
      (b) =>
        b.code === "no_agreement" || b.code === "legacy_without_agreement",
    )
  ) {
    readiness = "not_configured";
    readinessExplanation =
      "Not configured — record a commercial agreement before billing review.";
  } else if (hardBlocked) {
    readiness = mismatch ? "state_mismatch" : "blocked";
    readinessExplanation = mismatch
      ? "Agreement and plan are misaligned. Resolve access alignment before treating commercial terms as ready for billing sync."
      : "Billing readiness is blocked until listed issues are resolved. No Stripe action is available from this review.";
  } else if (externallyLinked) {
    readiness = "externally_linked";
    readinessExplanation =
      "An external billing identity is already stored. Review carefully — this phase still performs no Stripe requests or mutations.";
  } else if (
    agreementId &&
    !hardBlocked &&
    currency.authoritative &&
    billingContact.email &&
    (setupFee.classification === "billable" ||
      monthlyRetainer.classification === "billable") &&
    commercialAddOns.every(
      (a) =>
        a.classification !== "requires_review" &&
        a.classification !== "unsupported",
    )
  ) {
    readiness = "ready_for_future_sync";
    readinessExplanation =
      "Commercial terms appear complete for a future controlled Stripe setup. No sync has been performed.";
  } else if (agreementId && !hardBlocked) {
    readiness = "ready_for_review";
    readinessExplanation =
      "Commercial terms are recorded and ready for operator billing review. Currency, contact, or add-on clarification may still be required before a future controlled setup.";
  }

  if (
    agreementId &&
    (alignment.status === "no_plan" || alignment.status === "paused")
  ) {
    warnings.push(
      "Plan access is not active. Access provisioning is separate from billing readiness — this does not alone block commercial-term review.",
    );
  }
  if (alignment.status === "trial_aligned" || state.planStatus === "trial") {
    warnings.push(
      "Plan status is trial. Trial access does not imply Stripe trial, free period, or deferred billing.",
    );
  }

  if (!currency.authoritative) {
    missingRequired.push(
      "Discrete authoritative currency code for external billing",
    );
  }

  const futureStripeMapping = buildFutureMapping(currency, billingContact);

  const fingerprint = buildBillingReadinessFingerprint({
    clientId: state.clientId,
    agreementId,
    planKey: state.planKey,
    planStatus: state.planStatus,
    setupFeeCents: setupFee.amountCents,
    monthlyRetainerCents: monthlyRetainer.amountCents,
    monthlyServiceCredits: monthlyServiceCredits.amount,
    commercialAddOns: state.commercialAddOns,
    readiness,
    alignmentStatus: alignment.status,
    billingEmail: billingContact.email,
    externalKeys: externalIdentities.map((e) => `${e.provider}:${e.field}`),
  });

  return {
    clientId: state.clientId,
    clientName: state.clientName,
    clientSlug: state.clientSlug,
    agreementId,
    agreementName: agreement?.name ?? null,
    agreementRecordStatus,
    planKey:
      state.planKey && isClientPlanKey(state.planKey)
        ? state.planKey
        : state.planKey,
    planStatus: state.planStatus,
    assignmentClassification: assignmentClassification(state),
    alignment,
    setupFee,
    monthlyRetainer,
    monthlyServiceCredits,
    commercialAddOns,
    currency,
    cadence,
    billingContact,
    externalIdentities,
    proposedCustomerIdentityInputs: {
      clientId: state.clientId,
      clientName: state.clientName,
      billingEmail: billingContact.email,
      note: "Future Stripe customer inputs are server-owned. Browser cannot supply customer or price IDs.",
    },
    missingRequired: [...new Set(missingRequired)],
    warnings: [...new Set(warnings)],
    blockers,
    readiness,
    readinessExplanation,
    ownership: BILLING_OWNERSHIP,
    futureStripeMapping,
    systemsUnchanged: BILLING_READINESS_SYSTEMS_UNCHANGED,
    notices: BILLING_READINESS_NOTICES,
    fingerprint,
    generatedAt,
  };
}

/** UI helper: billing review is available when an agreement is recorded. */
export function isBillingReviewAvailable(state: {
  commercialAgreementId: string | null;
}): boolean {
  return isCommercialAgreementId(state.commercialAgreementId);
}
