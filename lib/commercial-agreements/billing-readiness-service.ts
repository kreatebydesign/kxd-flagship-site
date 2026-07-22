/**
 * Phase 37F — Operator-only billing readiness service.
 * Loads authoritative client, agreement, plan, and billing-profile state.
 * Performs no persistence, Stripe requests, activity events, or mutations.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { assignmentFromClientDoc } from "@/lib/client-plans/data";
import { isClientPlanKey } from "@/lib/client-plans/catalog";
import type { ClientPlanStatus } from "@/lib/client-plans/types";
import { isCommercialAgreementId } from "./definitions";
import { CommercialOpsError } from "./ops-service";
import {
  buildBillingReadinessSnapshot,
  type BillingProfileReadState,
  type BillingReadinessClientState,
} from "./billing-readiness-logic";
import type { BillingReadinessSnapshot } from "./billing-readiness-types";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

async function loadBillingProfileState(
  clientId: number,
): Promise<BillingProfileReadState> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "billing-profiles" as any,
    where: { client: { equals: clientId } },
    limit: 5,
    depth: 0,
    overrideAccess: true,
  });

  const docs = result.docs as Array<Record<string, unknown>>;
  if (docs.length === 0) {
    return {
      profilePresent: false,
      billingContact: null,
      billingEmail: null,
      invoiceCadence: null,
      paymentTerms: null,
      billingStatus: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      quickbooksCustomerId: null,
      waveCustomerId: null,
      currencyCode: null,
      collectionMethod: null,
      taxPosture: null,
      duplicateProfiles: false,
    };
  }

  const doc = docs[0];
  return {
    profilePresent: true,
    billingContact: asString(doc.billingContact),
    billingEmail: asString(doc.billingEmail),
    invoiceCadence: asString(doc.invoiceCadence),
    paymentTerms: asString(doc.paymentTerms),
    billingStatus: asString(doc.billingStatus),
    stripeCustomerId: asString(doc.stripeCustomerId),
    stripeSubscriptionId: asString(doc.stripeSubscriptionId),
    quickbooksCustomerId: asString(doc.quickbooksCustomerId),
    waveCustomerId: asString(doc.waveCustomerId),
    currencyCode: asString(doc.currencyCode),
    collectionMethod: asString(doc.collectionMethod),
    taxPosture: asString(doc.taxPosture),
    duplicateProfiles: docs.length > 1,
  };
}

async function loadBillingReadinessClientState(
  clientId: number,
): Promise<BillingReadinessClientState> {
  const payload = await getPayload({ config });
  let doc: Record<string, unknown>;
  try {
    doc = (await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    })) as unknown as Record<string, unknown>;
  } catch {
    throw new CommercialOpsError("Client not found.", 404, "client_not_found");
  }

  const assignment = assignmentFromClientDoc(
    doc as Parameters<typeof assignmentFromClientDoc>[0],
  );
  const rawAgreement = asString(doc.commercialAgreementId);
  const planKey =
    assignment.planKey && isClientPlanKey(assignment.planKey)
      ? assignment.planKey
      : null;
  const planStatus = (assignment.planStatus ??
    asString(doc.planStatus)) as ClientPlanStatus | null;

  return {
    clientId: Number(doc.id),
    clientName: asString(doc.name) ?? `Client ${doc.id}`,
    clientSlug: asString(doc.slug),
    updatedAt: asString(doc.updatedAt),
    commercialAgreementId: isCommercialAgreementId(rawAgreement)
      ? rawAgreement
      : rawAgreement,
    monthlyRetainerAmount: asNumber(doc.monthlyRetainerAmount),
    setupFee: asNumber(doc.setupFee),
    monthlyServiceCredits: asNumber(doc.monthlyServiceCredits),
    commercialAddOns: asStringArray(doc.commercialAddOns),
    commercialNotes: asString(doc.commercialNotes),
    planKey,
    planStatus,
  };
}

/**
 * Read-only billing readiness assessment.
 * Does not write, emit activity, call Stripe, or mutate any domain state.
 */
export async function getBillingReadiness(
  clientId: number,
): Promise<BillingReadinessSnapshot> {
  const [state, profile] = await Promise.all([
    loadBillingReadinessClientState(clientId),
    loadBillingProfileState(clientId),
  ]);
  return buildBillingReadinessSnapshot(state, profile);
}
