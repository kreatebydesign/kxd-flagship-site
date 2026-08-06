import type { ContractLifecyclePackage, LifecycleAuditEvent } from "./types.ts";
import { newLifecycleId } from "./hash.ts";

export function emptyLifecyclePackage(): ContractLifecyclePackage {
  return {
    schemaVersion: 1,
    structuredPaymentTerms: null,
    billingReadinessIssues: [],
    clientBillingIdentity: null,
    operatorSignature: null,
    clientSignature: null,
    signingTokenHash: null,
    signingTokenPrefix: null,
    signingTokenExpiresAt: null,
    signingTokenRevokedAt: null,
    completionTokenHash: null,
    completionTokenPrefix: null,
    completionTokenExpiresAt: null,
    sentForSignatureAt: null,
    sentForSignatureBy: null,
    clientViewedAt: null,
    executedCertificate: null,
    billingPlan: null,
    stripeTest: null,
    deliveryPreviews: [],
    auditEvents: [],
    onboardingEligible: false,
    onboardingEligibleAt: null,
    documentRefs: [],
    processedWebhookEventIds: [],
    voidReason: null,
    supersededByContractId: null,
    lineageParentContractId: null,
    commercialStatus: null,
    commercialSource: null,
    termsFinalizedAt: null,
    termsLockedHash: null,
    externalAcceptance: null,
    paymentAuthorization: null,
    paymentReferences: null,
  };
}

export function normalizeLifecyclePackage(raw: unknown): ContractLifecyclePackage {
  const base = emptyLifecyclePackage();
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as Partial<ContractLifecyclePackage>;
  return {
    ...base,
    ...obj,
    schemaVersion: 1,
    deliveryPreviews: Array.isArray(obj.deliveryPreviews) ? obj.deliveryPreviews : [],
    auditEvents: Array.isArray(obj.auditEvents) ? obj.auditEvents : [],
    billingReadinessIssues: Array.isArray(obj.billingReadinessIssues)
      ? obj.billingReadinessIssues
      : [],
    documentRefs: Array.isArray(obj.documentRefs) ? obj.documentRefs : [],
    processedWebhookEventIds: Array.isArray(obj.processedWebhookEventIds)
      ? obj.processedWebhookEventIds
      : [],
  };
}

export function appendAudit(
  pkg: ContractLifecyclePackage,
  event: Omit<LifecycleAuditEvent, "id" | "at"> & { at?: string },
): ContractLifecyclePackage {
  const entry: LifecycleAuditEvent = {
    id: newLifecycleId("audit"),
    at: event.at ?? new Date().toISOString(),
    actor: event.actor ?? null,
    action: event.action,
    fromStatus: event.fromStatus ?? null,
    toStatus: event.toStatus ?? null,
    reason: event.reason ?? null,
    sourceVersion: event.sourceVersion ?? null,
    correlationId: event.correlationId ?? null,
  };
  return {
    ...pkg,
    auditEvents: [...(pkg.auditEvents ?? []), entry],
  };
}
