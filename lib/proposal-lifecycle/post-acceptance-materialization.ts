/**
 * Post-acceptance / post-execution commercial materialization.
 *
 * ENSURE operation — creates missing operational projections from authoritative
 * commercial terms without rewriting legal truth, payments, or inventing Stripe.
 *
 * Authority:
 *   acceptedSnapshot + structuredPaymentTerms + commercialAmendments
 *   → lifecycle package projections (obligations, ancillary, recurring defs,
 *     onboarding requirements, portal readiness)
 */

import type {
  ContractLifecyclePackage,
  InvoiceObligation,
  ProposedBillingPlan,
  StructuredPaymentTerms,
} from "./types.ts";
import type { CanonicalProposal } from "../proposal-builder/types.ts";
import { deriveStructuredPaymentTerms } from "./structured-payment-terms.ts";
import { buildProposedBillingPlan } from "./billing-plan.ts";
import {
  ensureAncillaryObligationsOnPlan,
  upsertOperatorRecurringServiceDefinition,
  type OperatorRecurringServiceDefinition,
} from "./ensure-payable-surfaces.ts";
import { resolveRecurringAuthority } from "./recurring-authority.ts";
import { recomputeOnboardingEligibility, applyOnboardingEligibility } from "./onboarding-eligibility.ts";
import { newLifecycleId } from "./hash.ts";
import { obligationAmountPaidCents } from "./obligation-balances.ts";
import { normalizeLifecyclePackage, appendAudit } from "./package.ts";
import { getPayload } from "payload";
import config from "@payload-config";

export type MaterializationItemStatus =
  | "created"
  | "already-present"
  | "skipped"
  | "conflict"
  | "not-applicable";

export type MaterializationAreaResult = {
  area:
    | "client"
    | "structured-terms"
    | "one-time-obligations"
    | "ancillary-services"
    | "recurring-service-definition"
    | "recurring-periods"
    | "onboarding"
    | "portal-readiness";
  status: MaterializationItemStatus;
  summary: string;
  details?: string[];
};

export type OnboardingRequirement = {
  id: string;
  label: string;
  category:
    | "website-project"
    | "hosting"
    | "domain"
    | "recurring-service"
    | "access"
    | "analytics"
    | "portal";
  source: string;
  status: "required" | "optional" | "not-applicable";
};

export type CommercialMaterializationState = {
  schemaVersion: 1;
  lastEnsuredAt: string | null;
  lastEnsureActor: string | null;
  onboardingRequirements: OnboardingRequirement[];
  portalReadiness: {
    status: "not-eligible" | "eligible" | "provisioned-elsewhere";
    reason: string;
    /** V1 materialization never sends invitations. */
    invitationBlocked: true;
  };
  recurringDefinitionStatus: Array<{
    serviceKey: string;
    title: string;
    amountCents: number;
    activationStatus: string;
    status: MaterializationItemStatus;
    note: string;
  }>;
};

export type PostAcceptanceMaterializationResult = {
  areas: MaterializationAreaResult[];
  conflicts: Array<{ code: string; message: string; area: string }>;
  warnings: string[];
  createdCounts: {
    obligations: number;
    ancillaryObligations: number;
    recurringDefinitions: number;
    onboardingRequirements: number;
  };
  pkg: ContractLifecyclePackage;
  materialization: CommercialMaterializationState;
};

export type EnsurePostAcceptanceMaterializationInput = {
  pkg: ContractLifecyclePackage;
  /** Contract status string (draft / executed / …). */
  contractStatus: string | null | undefined;
  contractId: number;
  proposalId?: number | null;
  proposalNumber?: string | null;
  /** Existing client id on the contract — never invent a duplicate here. */
  clientId?: number | null;
  clientName?: string | null;
  canonical?: CanonicalProposal | null;
  actor?: string | null;
  now?: string;
};

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function findObligationBySource(
  plan: ProposedBillingPlan,
  sourceKey: string,
  id?: string | null,
): InvoiceObligation | undefined {
  return plan.obligations.find(
    (o) =>
      o.sourceKey === sourceKey ||
      o.id === sourceKey ||
      (id != null && o.id === id) ||
      (id != null && o.sourceKey === `installment:${id}`),
  );
}

function professionalLineLabel(raw: string, index: number, total: number): string {
  const lower = raw.toLowerCase();
  if (lower.includes("deposit") || lower.includes("initiation") || lower.includes("initial")) {
    return raw;
  }
  if (index === 0) return raw || "Initial payment";
  if (index === total - 1) return raw || "Final payment";
  return raw || `Milestone ${index}`;
}

function ensureInstallmentObligations(
  plan: ProposedBillingPlan,
  terms: StructuredPaymentTerms,
): {
  plan: ProposedBillingPlan;
  created: number;
  alreadyPresent: number;
  conflicts: Array<{ code: string; message: string; area: string }>;
} {
  const conflicts: Array<{ code: string; message: string; area: string }> = [];
  let created = 0;
  let alreadyPresent = 0;
  const additions: InvoiceObligation[] = [];
  const installments = terms.installments ?? [];

  for (let index = 0; index < installments.length; index++) {
    const item = installments[index]!;
    const sourceKey = item.id ? `installment:${item.id}` : `installment-index:${index}`;
    const existing = findObligationBySource(plan, sourceKey, item.id);
    if (existing) {
      if (existing.amountCents !== item.amountCents) {
        const paid = obligationAmountPaidCents(existing);
        conflicts.push({
          code: "obligation-amount-mismatch",
          message: `Obligation ${existing.id} amount $${(existing.amountCents / 100).toFixed(2)} disagrees with installment $${(item.amountCents / 100).toFixed(2)}${paid > 0 ? " (payment history preserved — not overwritten)" : ""}.`,
          area: "one-time-obligations",
        });
      } else {
        alreadyPresent += 1;
      }
      continue;
    }

    const kind =
      index === 0
        ? "initial"
        : index === installments.length - 1
          ? "final"
          : "milestone";
    additions.push({
      id: item.id || newLifecycleId("obl"),
      kind,
      label: professionalLineLabel(item.label, index, installments.length),
      amountCents: item.amountCents,
      currency: terms.currency,
      trigger: item.trigger,
      dueTerms: item.dueTerms,
      dueDate: item.dueDate ?? null,
      status: "pending-trigger",
      stripeDraftInvoiceId: null,
      amountPaidCents: 0,
      paymentEvents: [],
      collectionChannel: null,
      paymentReceipt: null,
      sourceKey,
    });
    created += 1;
  }

  if (!additions.length) {
    return { plan, created, alreadyPresent, conflicts };
  }

  return {
    plan: {
      ...plan,
      obligations: [...plan.obligations, ...additions],
      updatedAt: new Date().toISOString(),
    },
    created,
    alreadyPresent,
    conflicts,
  };
}

function deriveOnboardingRequirements(
  pkg: ContractLifecyclePackage,
): OnboardingRequirement[] {
  const terms = pkg.structuredPaymentTerms;
  const reqs: OnboardingRequirement[] = [];
  const oneTime = terms?.oneTimeTotalCents ?? pkg.billingPlan?.oneTimeTotalCents ?? 0;
  if (oneTime > 0) {
    reqs.push(
      {
        id: "onb-website-project",
        label: "Website project kickoff & scope confirmation",
        category: "website-project",
        source: "structuredPaymentTerms.oneTimeTotalCents",
        status: "required",
      },
      {
        id: "onb-brand-assets",
        label: "Brand assets & content intake",
        category: "website-project",
        source: "structuredPaymentTerms.oneTimeTotalCents",
        status: "required",
      },
    );
  }

  const ancillaries = terms?.ancillaryCharges ?? [];
  for (const charge of ancillaries) {
    if (/host/i.test(charge.kind) || /host/i.test(charge.title)) {
      reqs.push({
        id: `onb-hosting:${charge.id}`,
        label: `Hosting setup — ${charge.title}`,
        category: "hosting",
        source: `ancillary:${charge.id}`,
        status: "required",
      });
    }
    if (/domain/i.test(charge.kind) || /domain/i.test(charge.title)) {
      reqs.push({
        id: `onb-domain:${charge.id}`,
        label: `Domain / DNS — ${charge.title}`,
        category: "domain",
        source: `ancillary:${charge.id}`,
        status: "required",
      });
    }
  }

  const recurring = terms?.recurring;
  if (recurring && recurring.amountCents > 0 && recurring.cadence !== "none") {
    reqs.push(
      {
        id: "onb-recurring-access",
        label: `${recurring.serviceTitle || "Recurring service"} — access & credentials`,
        category: "recurring-service",
        source: "structuredPaymentTerms.recurring",
        status: "required",
      },
      {
        id: "onb-analytics",
        label: "Analytics / Search Console access (when in scope)",
        category: "analytics",
        source: "structuredPaymentTerms.recurring",
        status: "optional",
      },
    );
  }

  reqs.push({
    id: "onb-portal",
    label: "Client portal access (operator-approved invitation)",
    category: "portal",
    source: "portal-policy",
    status: "optional",
  });

  return reqs;
}

/**
 * Pure ENSURE — no DB, no Stripe, no invitations, no payment writes.
 * Partial-safe: conflicts in one area do not block unrelated safe projections.
 */
export function ensurePostAcceptanceMaterializationOnPackage(
  input: EnsurePostAcceptanceMaterializationInput,
): PostAcceptanceMaterializationResult {
  const now = input.now ?? new Date().toISOString();
  const areas: MaterializationAreaResult[] = [];
  const conflicts: Array<{ code: string; message: string; area: string }> = [];
  const warnings: string[] = [];
  let pkg = input.pkg;
  const createdCounts = {
    obligations: 0,
    ancillaryObligations: 0,
    recurringDefinitions: 0,
    onboardingRequirements: 0,
  };

  // —— Client relationship (report only; never invent duplicate) ——
  if (input.clientId) {
    areas.push({
      area: "client",
      status: "already-present",
      summary: `Existing client #${input.clientId}${input.clientName ? ` (${input.clientName})` : ""}`,
    });
  } else {
    areas.push({
      area: "client",
      status: "skipped",
      summary: "No client linked on contract — link an existing client before launch/portal.",
    });
    warnings.push("Contract has no client id; materialization will not create a client.");
  }

  // —— Structured terms ——
  if (!pkg.structuredPaymentTerms && input.canonical) {
    pkg = {
      ...pkg,
      structuredPaymentTerms: deriveStructuredPaymentTerms(
        input.canonical,
        undefined,
        pkg.commercialAmendments ?? null,
      ),
      commercialSource: pkg.commercialSource ?? "proposal",
    };
    areas.push({
      area: "structured-terms",
      status: "created",
      summary: "Derived structuredPaymentTerms from accepted snapshot + amendments.",
    });
  } else if (pkg.structuredPaymentTerms) {
    areas.push({
      area: "structured-terms",
      status: "already-present",
      summary: "structuredPaymentTerms already present.",
    });
  } else {
    areas.push({
      area: "structured-terms",
      status: "skipped",
      summary: "No canonical proposal available to derive structured terms.",
    });
  }

  const terms = pkg.structuredPaymentTerms;

  // —— Billing plan + one-time obligations ——
  if (!terms) {
    areas.push({
      area: "one-time-obligations",
      status: "skipped",
      summary: "No structured payment terms — cannot ensure installment obligations.",
    });
  } else {
    let plan = pkg.billingPlan;
    if (!plan) {
      plan = buildProposedBillingPlan({
        contractId: input.contractId,
        proposalId: input.proposalId ?? 0,
        proposalNumber: input.proposalNumber ?? terms.sourceProposalNumber ?? "UNKNOWN",
        contractVersion: 1,
        contractHash: pkg.executedCertificate?.documentHash ?? `contract:${input.contractId}`,
        terms,
        issues: pkg.billingReadinessIssues ?? [],
      });
      // buildProposedBillingPlan already projects ancillaries — count net new vs empty
      createdCounts.obligations = plan.obligations.filter(
        (o) => o.kind === "initial" || o.kind === "milestone" || o.kind === "final",
      ).length;
      createdCounts.ancillaryObligations = plan.obligations.filter(
        (o) => o.kind === "addon",
      ).length;
      pkg = { ...pkg, billingPlan: plan };
      areas.push({
        area: "one-time-obligations",
        status: "created",
        summary: `Created billing plan with ${createdCounts.obligations} one-time obligation(s).`,
      });
      areas.push({
        area: "ancillary-services",
        status:
          createdCounts.ancillaryObligations > 0 ? "created" : "not-applicable",
        summary:
          createdCounts.ancillaryObligations > 0
            ? `Projected ${createdCounts.ancillaryObligations} ancillary payable(s).`
            : "No ancillary charges on terms.",
      });
    } else {
      const before = plan.obligations.length;
      const installmentResult = ensureInstallmentObligations(plan, terms);
      plan = installmentResult.plan;
      createdCounts.obligations = installmentResult.created;
      conflicts.push(...installmentResult.conflicts);

      const beforeAncillary = plan.obligations.length;
      plan = ensureAncillaryObligationsOnPlan(plan, terms);
      createdCounts.ancillaryObligations = plan.obligations.length - beforeAncillary;

      pkg = { ...pkg, billingPlan: plan };

      if (installmentResult.conflicts.length) {
        areas.push({
          area: "one-time-obligations",
          status: "conflict",
          summary: `Preserved existing obligations; ${installmentResult.conflicts.length} amount conflict(s).`,
          details: installmentResult.conflicts.map((c) => c.message),
        });
      } else if (installmentResult.created > 0) {
        areas.push({
          area: "one-time-obligations",
          status: "created",
          summary: `Created ${installmentResult.created} missing installment obligation(s); ${installmentResult.alreadyPresent} already present.`,
        });
      } else {
        areas.push({
          area: "one-time-obligations",
          status: "already-present",
          summary: `${installmentResult.alreadyPresent} installment obligation(s) already present.`,
        });
      }

      if (createdCounts.ancillaryObligations > 0) {
        areas.push({
          area: "ancillary-services",
          status: "created",
          summary: `Created ${createdCounts.ancillaryObligations} missing ancillary payable(s).`,
        });
      } else if ((terms.ancillaryCharges?.length ?? 0) > 0) {
        areas.push({
          area: "ancillary-services",
          status: "already-present",
          summary: "Ancillary payables already projected.",
        });
      } else {
        areas.push({
          area: "ancillary-services",
          status: "not-applicable",
          summary: "No ancillary charges on terms.",
        });
      }

      void before;
    }
  }

  // —— Recurring SERVICE DEFINITION (Batch C authority) — no periods ——
  const authority = resolveRecurringAuthority(pkg);
  const recurringStatuses: CommercialMaterializationState["recurringDefinitionStatus"] = [];

  if (authority.conflicts.length > 0) {
    for (const c of authority.conflicts) {
      conflicts.push({
        code: c.code,
        message: c.message,
        area: "recurring-service-definition",
      });
    }
    for (const service of authority.services) {
      recurringStatuses.push({
        serviceKey: service.serviceKey,
        title: service.title,
        amountCents: service.amountCents,
        activationStatus: service.activationStatus,
        status: "conflict",
        note: "Blocked — resolve legal vs operator conflict before caching definition.",
      });
    }
    areas.push({
      area: "recurring-service-definition",
      status: "conflict",
      summary: "Recurring authority conflict — definition not overwritten.",
      details: authority.conflicts.map((c) => c.message),
    });
  } else if (authority.services.length === 0) {
    areas.push({
      area: "recurring-service-definition",
      status: "not-applicable",
      summary: "No recurring service on commercial terms.",
    });
  } else {
    let defs = [...(pkg.operatorRecurringServices ?? [])];
    for (const service of authority.services) {
      // Only cache legal/structured sources as operator projection.
      if (service.source === "operator-definition") {
        recurringStatuses.push({
          serviceKey: service.serviceKey,
          title: service.title,
          amountCents: service.amountCents,
          activationStatus: service.activationStatus,
          status: "already-present",
          note: "Operator-only definition already present (no legal amendment).",
        });
        continue;
      }

      const existing = defs.find((d) => d.serviceKey === service.serviceKey);
      if (
        existing &&
        existing.amountCents === service.amountCents &&
        existing.title === service.title
      ) {
        recurringStatuses.push({
          serviceKey: service.serviceKey,
          title: service.title,
          amountCents: service.amountCents,
          activationStatus: service.activationStatus,
          status: "already-present",
          note: existing.effectiveDate
            ? `Cached definition present (effective ${existing.effectiveDate}).`
            : "Cached definition present — pending activation trigger.",
        });
        continue;
      }

      if (existing && existing.amountCents !== service.amountCents) {
        conflicts.push({
          code: "recurring-cache-amount-mismatch",
          message: `Operator cache ${service.serviceKey} is $${(existing.amountCents / 100).toFixed(2)} vs legal $${(service.amountCents / 100).toFixed(2)}.`,
          area: "recurring-service-definition",
        });
        recurringStatuses.push({
          serviceKey: service.serviceKey,
          title: service.title,
          amountCents: service.amountCents,
          activationStatus: "conflict",
          status: "conflict",
          note: "Cache amount mismatch — not overwritten.",
        });
        continue;
      }

      const nextDef: OperatorRecurringServiceDefinition = {
        serviceKey: service.serviceKey,
        title: service.title,
        description: service.description,
        amountCents: service.amountCents,
        currency: service.currency,
        cadence: service.cadence,
        billDay: service.billDay,
        // Pending triggers stay without effectiveDate so Batch C will not bill early.
        effectiveDate:
          service.activationStatus === "active" ? service.effectiveDate : null,
        active: true,
        updatedAt: now,
        internalNotes: `Materialized from ${service.source}. ${service.activationReason}`,
      };
      defs = upsertOperatorRecurringServiceDefinition(defs, nextDef);
      createdCounts.recurringDefinitions += 1;
      recurringStatuses.push({
        serviceKey: service.serviceKey,
        title: service.title,
        amountCents: service.amountCents,
        activationStatus: service.activationStatus,
        status: "created",
        note:
          service.activationStatus === "pending-trigger"
            ? "Definition cached pending trigger — no recurring periods created."
            : "Definition cached.",
      });
    }
    pkg = { ...pkg, operatorRecurringServices: defs };
    areas.push({
      area: "recurring-service-definition",
      status: createdCounts.recurringDefinitions > 0 ? "created" : "already-present",
      summary:
        createdCounts.recurringDefinitions > 0
          ? `Cached ${createdCounts.recurringDefinitions} recurring service definition(s) from legal terms.`
          : "Recurring service definition(s) already aligned.",
    });
  }

  // Explicit: never create recurring periods in Batch D
  areas.push({
    area: "recurring-periods",
    status: "not-applicable",
    summary:
      "Recurring periods are Batch C ensure-through-date only — not created here.",
  });

  // —— Onboarding requirements ——
  const priorReqs = pkg.commercialMaterialization?.onboardingRequirements ?? [];
  const nextReqs = deriveOnboardingRequirements(pkg);
  if (priorReqs.length === 0 && nextReqs.length > 0) {
    createdCounts.onboardingRequirements = nextReqs.length;
    areas.push({
      area: "onboarding",
      status: "created",
      summary: `Initialized ${nextReqs.length} onboarding requirement(s) from commercial scope.`,
    });
  } else if (priorReqs.length > 0) {
    // Merge by id — additive only
    const byId = new Map(priorReqs.map((r) => [r.id, r]));
    let added = 0;
    for (const req of nextReqs) {
      if (!byId.has(req.id)) {
        byId.set(req.id, req);
        added += 1;
      }
    }
    createdCounts.onboardingRequirements = added;
    areas.push({
      area: "onboarding",
      status: added > 0 ? "created" : "already-present",
      summary:
        added > 0
          ? `Added ${added} missing onboarding requirement(s).`
          : "Onboarding requirements already initialized.",
    });
  } else {
    areas.push({
      area: "onboarding",
      status: "not-applicable",
      summary: "No commercial scope to derive onboarding requirements.",
    });
  }

  const mergedReqs =
    priorReqs.length === 0
      ? nextReqs
      : (() => {
          const byId = new Map(priorReqs.map((r) => [r.id, r]));
          for (const req of nextReqs) {
            if (!byId.has(req.id)) byId.set(req.id, req);
          }
          return [...byId.values()];
        })();

  // —— Portal readiness (never invite) ——
  const eligibility = recomputeOnboardingEligibility({
    contractStatus: input.contractStatus,
    pkg,
  });
  const portalReadiness: CommercialMaterializationState["portalReadiness"] = {
    status: eligibility.eligible ? "eligible" : "not-eligible",
    reason: `${eligibility.reason} Invitation remains operator-controlled.`,
    invitationBlocked: true,
  };
  areas.push({
    area: "portal-readiness",
    status: eligibility.eligible ? "already-present" : "skipped",
    summary: portalReadiness.reason,
  });

  const materialization: CommercialMaterializationState = {
    schemaVersion: 1,
    lastEnsuredAt: now,
    lastEnsureActor: trimOrNull(input.actor),
    onboardingRequirements: mergedReqs,
    portalReadiness,
    recurringDefinitionStatus: recurringStatuses,
  };

  pkg = {
    ...pkg,
    commercialMaterialization: materialization,
  };

  pkg = applyOnboardingEligibility(pkg, input.contractStatus, now);

  return {
    areas,
    conflicts,
    warnings,
    createdCounts,
    pkg,
    materialization,
  };
}

type AnyDoc = Record<string, unknown> & { id: number };

/**
 * Persist post-acceptance materialization. No Stripe, payments, invoices, or invitations.
 */
export async function ensurePostAcceptanceMaterializationOnContract(input: {
  contractId: number;
  actor: string;
  dryRun?: boolean;
}): Promise<
  PostAcceptanceMaterializationResult & {
    persisted: boolean;
    contractStatus: string;
    clientId: number | null;
  }
> {
  const payload = await getPayload({ config });
  const contract = (await payload.findByID({
    collection: "contracts" as never,
    id: input.contractId,
    depth: 1,
    overrideAccess: true,
  })) as AnyDoc;

  const pkg = normalizeLifecyclePackage(contract.lifecyclePackage);
  const clientRel = contract.client;
  const clientId =
    typeof clientRel === "object" && clientRel && "id" in clientRel
      ? Number((clientRel as { id: number }).id)
      : clientRel != null
        ? Number(clientRel)
        : null;
  const clientName =
    typeof clientRel === "object" && clientRel && "name" in clientRel
      ? String((clientRel as { name?: string }).name ?? "")
      : null;

  const proposalRel = contract.proposal;
  const proposalId =
    typeof proposalRel === "object" && proposalRel && "id" in proposalRel
      ? Number((proposalRel as { id: number }).id)
      : proposalRel != null
        ? Number(proposalRel)
        : null;

  let canonical = null as import("../proposal-builder/types.ts").CanonicalProposal | null;
  if (proposalId) {
    const proposal = (await payload.findByID({
      collection: "proposals" as never,
      id: proposalId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
    if (proposal.acceptedSnapshot) {
      canonical = proposal.acceptedSnapshot as import("../proposal-builder/types.ts").CanonicalProposal;
    }
  }

  const result = ensurePostAcceptanceMaterializationOnPackage({
    pkg,
    contractStatus: String(contract.status ?? ""),
    contractId: input.contractId,
    proposalId,
    proposalNumber:
      typeof proposalRel === "object" && proposalRel && "proposalNumber" in proposalRel
        ? String((proposalRel as { proposalNumber?: string }).proposalNumber ?? "")
        : null,
    clientId,
    clientName,
    canonical,
    actor: input.actor,
  });

  const changed =
    JSON.stringify(result.pkg.billingPlan?.obligations ?? []) !==
      JSON.stringify(pkg.billingPlan?.obligations ?? []) ||
    JSON.stringify(result.pkg.operatorRecurringServices ?? []) !==
      JSON.stringify(pkg.operatorRecurringServices ?? []) ||
    JSON.stringify(result.pkg.commercialMaterialization ?? null) !==
      JSON.stringify(pkg.commercialMaterialization ?? null) ||
    Boolean(result.pkg.structuredPaymentTerms) !== Boolean(pkg.structuredPaymentTerms) ||
    result.pkg.onboardingEligible !== pkg.onboardingEligible;

  if (input.dryRun || !changed) {
    return {
      ...result,
      persisted: false,
      contractStatus: String(contract.status ?? ""),
      clientId,
    };
  }

  let next = appendAudit(result.pkg, {
    actor: input.actor,
    action: "commercial.post-acceptance-materialized",
    reason: `Materialized commercial relationship: obligations +${result.createdCounts.obligations}, ancillary +${result.createdCounts.ancillaryObligations}, recurring defs +${result.createdCounts.recurringDefinitions}, conflicts ${result.conflicts.length}.`,
  });

  await payload.update({
    collection: "contracts" as never,
    id: input.contractId,
    data: { lifecyclePackage: next } as never,
    overrideAccess: true,
  });

  return {
    ...result,
    pkg: next,
    persisted: true,
    contractStatus: String(contract.status ?? ""),
    clientId,
  };
}
