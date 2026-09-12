/**
 * Post-acceptance commercial amendments stored on the CONTRACT only.
 * Never mutate acceptedSnapshot / proposal commercial history.
 */

import type { Cents } from "../proposal-builder/money.ts";
import type { PaymentScheduleItem } from "../proposal-builder/types.ts";
import {
  DEPOSIT_INSTALLMENT_ACCOMMODATION,
  WEBSITE_CARE_LOCAL_VISIBILITY_EXCLUDES,
  WEBSITE_CARE_LOCAL_VISIBILITY_INCLUDES,
  WEBSITE_CARE_RANKING_DISCLAIMER,
} from "../commercial-legal/standard-contract-provisions.ts";

export type AmendedPaymentGroup = "initial-deposit" | "remaining" | "other";

export type AmendedPaymentScheduleItem = PaymentScheduleItem & {
  group?: AmendedPaymentGroup;
  notes?: string;
};

export type RecurringStartTrigger =
  | "website-launch"
  | "on-date"
  | "pending-confirmation"
  | "after-launch-verified";

export type RecurringServiceAmendment = {
  title: string;
  amountCents: Cents;
  cadence: "monthly";
  includes: string[];
  excludes: string[];
  rankingDisclaimer: string;
  /** Milestone or date trigger — prefer website-launch over inventing a calendar date. */
  startTrigger: RecurringStartTrigger;
  startBillingDate?: string | null;
  startBillingDateStatus: "confirmed" | "pending-confirmation" | "milestone-confirmed";
  commencementNotes?: string;
};

/** Pass-through / ancillary charges separate from the accepted project one-time total. */
export type AncillaryChargeAmendment = {
  id: string;
  kind: "domain-registration" | "managed-hosting" | "other";
  title: string;
  amountCents: Cents;
  cadence: "one-time" | "annual";
  dueTrigger: "on-date" | "website-launch";
  dueDate?: string | null;
  termNotes: string;
  renewalNotes?: string | null;
};

export type ContractCommercialAmendments = {
  schemaVersion: 1;
  recordedAt: string;
  recordedBy?: string | null;
  reason: string;
  /** Must equal accepted proposal one-time total. */
  projectOneTimeTotalCents: Cents;
  paymentScheduleOverride: AmendedPaymentScheduleItem[];
  depositAccommodationNotes: string;
  workMayBeginAfterFirstInstallment: boolean;
  recurringService?: RecurringServiceAmendment | null;
  /** Domain, hosting, and similar charges — never folded into projectOneTimeTotalCents. */
  ancillaryCharges?: AncillaryChargeAmendment[];
  /**
   * Optional full PROJECT PAYMENT SCHEDULE body (contract-only).
   * When set, replaces the auto-formatted deposit/remaining installment block.
   */
  paymentScheduleNarrative?: string | null;
  /** Optional PROPOSAL REFERENCE body line(s). */
  proposalReferenceNote?: string | null;
  /**
   * Clarifies that inherited proposal exclusions apply to the one-time project
   * scope except where separately selected services are expressly included.
   */
  exclusionsClarification?: string | null;
  /** Optional legal provision overrides (contract-only; do not change global standards). */
  legalOverrides?: {
    paymentDefault?: string;
    entireAgreement?: string;
  } | null;
};

export function sumAncillaryChargesCents(
  amendments: ContractCommercialAmendments | null | undefined,
): number {
  return (amendments?.ancillaryCharges ?? []).reduce(
    (acc, item) => acc + Number(item.amountCents || 0),
    0,
  );
}

export function isContractCommercialAmendments(
  value: unknown,
): value is ContractCommercialAmendments {
  if (!value || typeof value !== "object") return false;
  const v = value as ContractCommercialAmendments;
  return (
    v.schemaVersion === 1 &&
    Array.isArray(v.paymentScheduleOverride) &&
    typeof v.projectOneTimeTotalCents === "number"
  );
}

export function reconcileAmendedSchedule(
  amendments: ContractCommercialAmendments,
): { sumCents: number; ok: boolean; differenceCents: number } {
  const sumCents = amendments.paymentScheduleOverride.reduce(
    (acc, item) => acc + Number(item.amountCents || 0),
    0,
  );
  const differenceCents = sumCents - amendments.projectOneTimeTotalCents;
  return { sumCents, differenceCents, ok: differenceCents === 0 };
}

export const PLATINUM_EXCLUSIONS_CLARIFICATION = [
  "For clarity: ongoing SEO, website hosting fees, domain registration fees, and ongoing website maintenance are excluded from the $2,500 one-time website project scope except where separately selected and expressly included elsewhere in this Agreement.",
  "The Client has separately selected Website Care & Local Visibility ($250/month beginning at website launch), KXD Managed Website Hosting ($299.99/year), and first-year .com domain registration ($10.19), which are expressly included as separate charges under this Agreement and are not contradicted by the project-level exclusions above.",
].join(" ");

/** Platinum Film Workz post-acceptance payment accommodation + care + launch ancillaries. */
export function buildPlatinumFilmWorkzCommercialAmendments(input?: {
  recordedBy?: string | null;
  recordedAt?: string;
}): ContractCommercialAmendments {
  return {
    schemaVersion: 1,
    recordedAt: input?.recordedAt ?? new Date().toISOString(),
    recordedBy: input?.recordedBy ?? null,
    reason:
      "Post-acceptance commercial amendments: deposit installment accommodation; Website Care & Local Visibility beginning at website launch; first-year .com domain registration; KXD Managed Website Hosting due at launch.",
    projectOneTimeTotalCents: 250_000,
    depositAccommodationNotes: DEPOSIT_INSTALLMENT_ACCOMMODATION,
    workMayBeginAfterFirstInstallment: true,
    paymentScheduleOverride: [
      {
        id: "pfw-dep-1",
        label: "Initial project deposit installment 1 of 4",
        amountCents: 31_250,
        due: "on-date",
        dueDate: "2026-08-20",
        sortOrder: 1,
        group: "initial-deposit",
        notes: "Part of $1,250 initial 50% project deposit",
      },
      {
        id: "pfw-dep-2",
        label: "Initial project deposit installment 2 of 4",
        amountCents: 31_250,
        due: "on-date",
        dueDate: "2026-08-21",
        sortOrder: 2,
        group: "initial-deposit",
        notes: "Part of $1,250 initial 50% project deposit",
      },
      {
        id: "pfw-dep-3",
        label: "Initial project deposit installment 3 of 4",
        amountCents: 31_250,
        due: "on-date",
        dueDate: "2026-08-22",
        sortOrder: 3,
        group: "initial-deposit",
        notes: "Part of $1,250 initial 50% project deposit",
      },
      {
        id: "pfw-dep-4",
        label: "Initial project deposit installment 4 of 4",
        amountCents: 31_250,
        due: "on-date",
        dueDate: "2026-08-23",
        sortOrder: 4,
        group: "initial-deposit",
        notes: "Part of $1,250 initial 50% project deposit",
      },
      {
        id: "pfw-rem-1",
        label: "Project progress payment",
        amountCents: 62_500,
        due: "on-date",
        dueDate: "2026-09-01",
        sortOrder: 5,
        group: "remaining",
      },
      {
        id: "pfw-rem-2",
        label: "Project final payment",
        amountCents: 62_500,
        due: "on-date",
        dueDate: "2026-09-15",
        sortOrder: 6,
        group: "remaining",
      },
    ],
    recurringService: {
      title: "Website Care & Local Visibility",
      amountCents: 25_000,
      cadence: "monthly",
      includes: [...WEBSITE_CARE_LOCAL_VISIBILITY_INCLUDES],
      excludes: [...WEBSITE_CARE_LOCAL_VISIBILITY_EXCLUDES],
      rankingDisclaimer: WEBSITE_CARE_RANKING_DISCLAIMER,
      startTrigger: "website-launch",
      startBillingDate: null,
      startBillingDateStatus: "milestone-confirmed",
      commencementNotes: [
        "This $250/month service does not begin during the initial website build.",
        "It begins at website launch / production launch of the completed website.",
        "It is separate from the $2,500 website project price.",
        "Recurring billing continues according to the monthly-service termination and cancellation provisions in this Agreement.",
      ].join(" "),
    },
    ancillaryCharges: [
      {
        id: "pfw-domain-y1",
        kind: "domain-registration",
        title: ".com domain registration (first year)",
        amountCents: 1_019,
        cadence: "one-time",
        dueTrigger: "on-date",
        dueDate: "2026-08-20",
        termNotes:
          "Pass-through / additional annual service cost for a one-year .com domain registration term beginning August 20, 2026. Separate from the $2,500 website project total and from the $250/month Website Care & Local Visibility service.",
        renewalNotes:
          "Future domain renewal charges may reflect then-current registrar or provider pricing and are not guaranteed to remain $10.19.",
      },
      {
        id: "pfw-hosting-y1",
        kind: "managed-hosting",
        title: "KXD Managed Website Hosting",
        amountCents: 29_999,
        cadence: "annual",
        dueTrigger: "website-launch",
        dueDate: null,
        termNotes:
          "Annual hosting charge becomes due at website launch. The hosting term begins at website launch and covers one year. Separate from the $2,500 website build, the first-year domain registration, and the $250/month Website Care & Local Visibility service.",
        renewalNotes:
          "Future annual hosting renewals are subject to this Agreement’s renewal and billing terms.",
      },
    ],
    exclusionsClarification: PLATINUM_EXCLUSIONS_CLARIFICATION,
  };
}

/** Effective date of Platinum Growth supersession of Care (commercial authority). */
export const PLATINUM_GROWTH_EFFECTIVE_DATE = "2026-09-01";
export const PLATINUM_GROWTH_AMOUNT_CENTS = 32_500 as Cents;
export const PLATINUM_GROWTH_TITLE = "Website Growth & Management";
export const PLATINUM_CARE_TITLE = "Website Care & Local Visibility";
export const PLATINUM_CARE_AMOUNT_CENTS = 25_000 as Cents;

export const PLATINUM_GROWTH_EXCLUSIONS_CLARIFICATION = [
  "For clarity: ongoing SEO, website hosting fees, domain registration fees, and ongoing website maintenance are excluded from the $2,500 one-time website project scope except where separately selected and expressly included elsewhere in this Agreement.",
  "The Client previously selected Website Care & Local Visibility ($250/month beginning at website launch).",
  "Effective September 1, 2026, that recurring service is superseded by Website Growth & Management ($325/month), which remains separate from the $2,500 website project total.",
  "KXD Managed Website Hosting ($299.99/year) and first-year .com domain registration ($10.19) remain separately selected charges under this Agreement and are not contradicted by the project-level exclusions above.",
].join(" ");

export const WEBSITE_GROWTH_MANAGEMENT_INCLUDES = [
  ...WEBSITE_CARE_LOCAL_VISIBILITY_INCLUDES,
  "Management of Instagram and Facebook",
] as const;

export const WEBSITE_GROWTH_MANAGEMENT_EXCLUDES = WEBSITE_CARE_LOCAL_VISIBILITY_EXCLUDES.filter(
  (item) => item !== "Social media management",
);

export function isPlatinumGrowthRecurringAmendmentPresent(
  amendments: ContractCommercialAmendments | null | undefined,
): boolean {
  const recurring = amendments?.recurringService;
  if (!recurring) return false;
  return (
    recurring.title === PLATINUM_GROWTH_TITLE &&
    Number(recurring.amountCents) === Number(PLATINUM_GROWTH_AMOUNT_CENTS) &&
    recurring.cadence === "monthly" &&
    recurring.startBillingDate === PLATINUM_GROWTH_EFFECTIVE_DATE &&
    recurring.startBillingDateStatus === "confirmed"
  );
}

/** Authoritative Growth recurring term effective 2026-09-01 (supersedes Care $250). */
export function buildPlatinumGrowthRecurringServiceAmendment(): RecurringServiceAmendment {
  return {
    title: PLATINUM_GROWTH_TITLE,
    amountCents: PLATINUM_GROWTH_AMOUNT_CENTS,
    cadence: "monthly",
    includes: [...WEBSITE_GROWTH_MANAGEMENT_INCLUDES],
    excludes: [...WEBSITE_GROWTH_MANAGEMENT_EXCLUDES],
    rankingDisclaimer: WEBSITE_CARE_RANKING_DISCLAIMER,
    startTrigger: "on-date",
    startBillingDate: PLATINUM_GROWTH_EFFECTIVE_DATE,
    startBillingDateStatus: "confirmed",
    commencementNotes: [
      "Effective September 1, 2026, Website Growth & Management ($325/month) supersedes the prior Website Care & Local Visibility ($250/month) recurring term.",
      "The prior $250/month Care term remains historically recorded as previously agreed and is not erased.",
      "This $325/month service is separate from the $2,500 website project price.",
      "Recurring billing continues according to the monthly-service termination and cancellation provisions in this Agreement.",
    ].join(" "),
  };
}

/**
 * Patch an existing Platinum commercialAmendments record so Growth $325 becomes
 * the authoritative recurringService from 2026-09-01, without rebuilding schedule
 * or ancillaries and without touching acceptedSnapshot.
 */
export function supersedePlatinumRecurringWithGrowth(
  existing: ContractCommercialAmendments,
  input?: { recordedBy?: string | null; recordedAt?: string },
): {
  amendments: ContractCommercialAmendments;
  status: "applied" | "already-present";
  priorRecurringTitle: string | null;
  priorRecurringAmountCents: number | null;
} {
  if (isPlatinumGrowthRecurringAmendmentPresent(existing)) {
    return {
      amendments: existing,
      status: "already-present",
      priorRecurringTitle: existing.recurringService?.title ?? null,
      priorRecurringAmountCents: existing.recurringService?.amountCents ?? null,
    };
  }

  const prior = existing.recurringService ?? null;
  const growth = buildPlatinumGrowthRecurringServiceAmendment();
  const priorTitle = prior?.title ?? null;
  const priorAmount = prior?.amountCents ?? null;

  const reason = [
    existing.reason?.trim() || "Platinum commercial amendments.",
    `Supersession effective ${PLATINUM_GROWTH_EFFECTIVE_DATE}: ${PLATINUM_GROWTH_TITLE} ($${(Number(PLATINUM_GROWTH_AMOUNT_CENTS) / 100).toFixed(2)}/month) replaces prior recurring authority${
      priorTitle
        ? ` (${priorTitle}${priorAmount != null ? ` $${(Number(priorAmount) / 100).toFixed(2)}/month` : ""})`
        : ""
    }. Historical Care agreement preserved; accepted proposal snapshot unchanged.`,
  ].join(" ");

  return {
    amendments: {
      ...existing,
      recordedAt: input?.recordedAt ?? new Date().toISOString(),
      recordedBy: input?.recordedBy ?? existing.recordedBy ?? null,
      reason,
      recurringService: growth,
      exclusionsClarification: PLATINUM_GROWTH_EXCLUSIONS_CLARIFICATION,
    },
    status: "applied",
    priorRecurringTitle: priorTitle,
    priorRecurringAmountCents: priorAmount,
  };
}

export const DE_BOIS_PAYMENT_SCHEDULE_NARRATIVE = [
  "PRICING & PAYMENT SCHEDULE",
  "",
  "Total Project Investment: $9,500.00",
  "",
  "The Client agrees to the following payment schedule for the de Bois Entertainment website project:",
  "",
  "Initial Deposit — $2,500.00",
  "",
  "Due upon execution of this Agreement. The project will be scheduled and work may begin once the initial deposit has been received.",
  "",
  "Design Milestone Payment — $2,000.00",
  "",
  "Due upon approval of the primary creative direction, homepage direction, and overall visual system for the website.",
  "",
  "Development Milestone Payment — $2,000.00",
  "",
  "Due upon substantial completion of the primary website build, including the core site structure and primary band/artist page framework, and presentation of the build for final review.",
  "",
  "Final Payment — $3,000.00",
  "",
  "Due before production launch, final deployment, transfer, or release of the completed website.",
  "",
  "The initial $2,500.00 payment serves as the project deposit and reserves Kreate by Design’s production capacity for the engagement. The deposit is applied toward the total project investment and is non-refundable once project scheduling, planning, strategy, design, or production work has begun.",
  "",
  "Kreate by Design may pause design, development, revisions, deployment, or other project work if a scheduled payment becomes past due. Any pause resulting from nonpayment may affect the project timeline or originally anticipated launch window.",
  "",
  "The completed website will not be launched, transferred, released to production, or otherwise delivered for unrestricted production use until the full $9,500.00 project balance has been paid.",
  "",
  "This payment schedule replaces the payment schedule stated in Proposal KXD-P-2026-0001. All other approved scope, deliverables, exclusions, responsibilities, and commercial terms from the accepted proposal remain incorporated into this Agreement unless expressly modified herein.",
].join("\n");

export const DE_BOIS_PAYMENT_DEFAULT = [
  "Invoices are due according to the payment schedule stated in this Agreement.",
  "If any scheduled payment becomes past due, Kreate by Design may provide written notice and pause project work, revisions, meetings, deployment, launch activities, or delivery until the outstanding amount has been paid.",
  "A payment-related pause does not constitute a breach by Kreate by Design and does not entitle the Client to a refund, credit, reduction in the project price, or automatic extension of the original project schedule.",
  "Any timeline or launch date affected by delayed payment may be rescheduled based on Kreate by Design’s then-current production availability.",
  "All outstanding amounts required under this Agreement must be paid before final production launch, transfer, or release of the completed website.",
].join(" ");

export const DE_BOIS_ENTIRE_AGREEMENT = [
  "This Agreement, including its exhibits and accepted proposal KXD-P-2026-0001 (version 1) referenced for scope, deliverables, responsibilities, exclusions, and commercial intent, is the entire agreement between the parties and supersedes prior discussions and drafts on the same subject.",
  "Accepted proposal KXD-P-2026-0001 remains the source for the accepted $9,500.00 scope, deliverables, responsibilities, exclusions, and commercial intent, except that this signed Agreement intentionally replaces only the payment schedule stated in that proposal.",
  "The total project investment remains $9,500.00.",
  "Nothing else in the accepted proposal is superseded unless this Agreement expressly modifies it.",
  "If a conflict exists between this Agreement and a proposal narrative, this signed Agreement controls legal terms and the payment schedule stated herein; the accepted commercial snapshot controls accepted scope, deliverables, responsibilities, exclusions, selected options, and the $9,500.00 project total.",
].join(" ");

export const DE_BOIS_PROPOSAL_REFERENCE_NOTE = [
  "Proposal KXD-P-2026-0001, version 1, accepted snapshot remains the commercial source for accepted scope, deliverables, responsibilities, exclusions, and the $9,500.00 project total.",
  "This Agreement intentionally replaces only the payment schedule from that proposal. All other accepted commercial terms from the proposal remain incorporated unless expressly modified herein.",
].join(" ");

/** de Bois Entertainment post-acceptance payment-schedule accommodation (contract-only). */
export function buildDeBoisEntertainmentCommercialAmendments(input?: {
  recordedBy?: string | null;
  recordedAt?: string;
}): ContractCommercialAmendments {
  return {
    schemaVersion: 1,
    recordedAt: input?.recordedAt ?? new Date().toISOString(),
    recordedBy: input?.recordedBy ?? null,
    reason:
      "Post-acceptance payment schedule accommodation: replace proposal 50/25/25 schedule with Initial Deposit $2,500 + Design $2,000 + Development $2,000 + Final $3,000; total remains $9,500.",
    projectOneTimeTotalCents: 950_000,
    depositAccommodationNotes:
      "The initial $2,500.00 payment serves as the project deposit and reserves Kreate by Design’s production capacity for the engagement. The deposit is applied toward the total project investment and is non-refundable once project scheduling, planning, strategy, design, or production work has begun.",
    workMayBeginAfterFirstInstallment: true,
    paymentScheduleOverride: [
      {
        id: "deb-dep-1",
        label: "Initial Deposit",
        amountCents: 250_000,
        due: "at-contract",
        sortOrder: 1,
        group: "initial-deposit",
        notes: "Due upon execution of this Agreement",
      },
      {
        id: "deb-des-1",
        label: "Design Milestone Payment",
        amountCents: 200_000,
        due: "milestone",
        milestoneLabel:
          "Approval of primary creative direction, homepage direction, and overall visual system",
        sortOrder: 2,
        group: "remaining",
      },
      {
        id: "deb-dev-1",
        label: "Development Milestone Payment",
        amountCents: 200_000,
        due: "milestone",
        milestoneLabel:
          "Substantial completion of primary website build and presentation for final review",
        sortOrder: 3,
        group: "remaining",
      },
      {
        id: "deb-fin-1",
        label: "Final Payment",
        amountCents: 300_000,
        due: "remaining",
        milestoneLabel: "Before production launch, final deployment, transfer, or release",
        sortOrder: 4,
        group: "remaining",
      },
    ],
    paymentScheduleNarrative: DE_BOIS_PAYMENT_SCHEDULE_NARRATIVE,
    proposalReferenceNote: DE_BOIS_PROPOSAL_REFERENCE_NOTE,
    legalOverrides: {
      paymentDefault: DE_BOIS_PAYMENT_DEFAULT,
      entireAgreement: DE_BOIS_ENTIRE_AGREEMENT,
    },
  };
}
