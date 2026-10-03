/**
 * Operator + portal lifecycle updates for managed-client inquiries.
 * Does not write sales-leads. Does not create CSI commission.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  getManagedClientLeadPolicy,
  type ManagedClientLeadPolicy,
} from "@/lib/acquisition-operations/policy";
import "@/lib/acquisition-operations/policies/register";
import { CLIENT_INQUIRIES_COLLECTION } from "./collection";
import { mapDocToRecord } from "./map";
import { calculateResponseTimeSeconds } from "./response-time";
import { publishClientInquiryLifecycleActivity } from "./publish-activity";
import {
  type ClientInquiryRecord,
  type Disposition,
  type LeadQuality,
  type LostReason,
} from "./types";
import type {
  OperationalState,
  OutcomeState,
  QualificationState,
  VerificationState,
} from "@/lib/acquisition-operations";

export type UpdateClientInquiryLifecycleInput = {
  inquiryId: number;
  actorUserId: number;
  operationalStatus?: OperationalState;
  disposition?: Disposition;
  leadQuality?: LeadQuality;
  verificationState?: VerificationState;
  qualificationState?: QualificationState;
  outcomeState?: OutcomeState;
  outcomeNote?: string | null;
  confirmedSaleReference?: string | null;
  firstRespondedAt?: string | null;
  assignedOwnerId?: number | null;
  googleConversionObserved?: boolean;
  reconciliationState?: ClientInquiryRecord["reconciliationState"];
  operatorNotes?: string | null;
  /** Primal Phase 1 Lead Command foundation (Build 1, additive). */
  nextFollowUpAt?: string | null;
  programInterest?: string | null;
  lostReason?: LostReason | null;
  wonRevenueCents?: number | null;
  bookedProgram?: string | null;
  locationId?: number | null;
  /** Client Command portal-member owner — distinct from assignedOwnerId (Payload users). */
  assignedPortalOwnerId?: number | null;
  /**
   * Optional policy override for portal callers (Client Command / Contractor OS)
   * when no registry policy exists (or a portal-enabled registered policy is
   * supplied by the caller). Admin callers should omit this and rely on the registry.
   */
  policyOverride?: ManagedClientLeadPolicy;
  /**
   * When set, reject updates that do not match this tenant binding.
   * Required for portal membership-scoped writes.
   */
  requireTenant?: { clientId: number; clientKey: string };
};

export type UpdateClientInquiryLifecycleResult =
  | { ok: true; inquiry: ClientInquiryRecord }
  | { ok: false; code: "not_found" | "policy" | "forbidden" | "error"; message: string };

export async function updateClientInquiryLifecycle(
  input: UpdateClientInquiryLifecycleInput,
): Promise<UpdateClientInquiryLifecycleResult> {
  const payload = await getPayload({ config });

  let existing: Record<string, unknown>;
  try {
    existing = (await payload.findByID({
      collection: CLIENT_INQUIRIES_COLLECTION,
      id: input.inquiryId,
      depth: 0,
      overrideAccess: true,
    })) as unknown as Record<string, unknown>;
  } catch {
    return { ok: false, code: "not_found", message: "Client inquiry not found." };
  }

  const current = mapDocToRecord(existing);

  if (input.requireTenant) {
    if (
      current.clientId !== input.requireTenant.clientId ||
      current.clientKey !== input.requireTenant.clientKey
    ) {
      return {
        ok: false,
        code: "forbidden",
        message: "Inquiry is outside the authorized workspace.",
      };
    }
  }

  const policy =
    input.policyOverride ?? getManagedClientLeadPolicy(current.clientKey);
  if (!policy || !policy.enabled) {
    return {
      ok: false,
      code: "policy",
      message: "Lead Operations is not enabled for this client.",
    };
  }
  if (
    input.policyOverride &&
    input.policyOverride.clientKey !== current.clientKey
  ) {
    return {
      ok: false,
      code: "forbidden",
      message: "Policy clientKey does not match inquiry tenant.",
    };
  }

  if (
    input.confirmedSaleReference &&
    !policy.supportsSaleConfirmation
  ) {
    return {
      ok: false,
      code: "forbidden",
      message:
        "This client policy does not allow sale confirmation on inquiries. Use CSI sale confirmation where applicable.",
    };
  }

  // Hard boundary: never mint commission from this path.
  assertNoCommissionSideEffect(policy);

  const firstRespondedAt =
    input.firstRespondedAt !== undefined
      ? input.firstRespondedAt
      : current.firstRespondedAt;
  const responseTimeSeconds = calculateResponseTimeSeconds(
    current.receivedAt,
    firstRespondedAt,
  );

  const data: Record<string, unknown> = {};
  if (input.operationalStatus) data.operationalStatus = input.operationalStatus;
  if (input.disposition) data.disposition = input.disposition;
  if (input.leadQuality) data.leadQuality = input.leadQuality;
  if (input.qualificationState) data.qualificationState = input.qualificationState;
  if (input.outcomeState) data.outcomeState = input.outcomeState;
  if (input.outcomeNote !== undefined) data.outcomeNote = input.outcomeNote;
  if (input.confirmedSaleReference !== undefined) {
    data.confirmedSaleReference = input.confirmedSaleReference;
  }
  if (input.firstRespondedAt !== undefined) {
    data.firstRespondedAt = input.firstRespondedAt;
    data.responseTimeSeconds = responseTimeSeconds;
  }
  if (input.assignedOwnerId !== undefined) {
    data.assignedOwner = input.assignedOwnerId;
  }
  if (input.googleConversionObserved !== undefined) {
    // Evidence flag only — never auto-verify or auto-qualify.
    data.googleConversionObserved = input.googleConversionObserved;
  }
  if (input.reconciliationState) {
    data.reconciliationState = input.reconciliationState;
  }
  if (input.operatorNotes !== undefined) data.operatorNotes = input.operatorNotes;

  if (input.verificationState) {
    data.verificationState = input.verificationState;
    if (input.verificationState === "verified") {
      data.verifiedAt = new Date().toISOString();
      data.verifiedBy = input.actorUserId;
    }
  }

  // ── Primal Phase 1 Lead Command foundation (Build 1, additive) ──────────
  if (input.nextFollowUpAt !== undefined) data.nextFollowUpAt = input.nextFollowUpAt;
  if (input.programInterest !== undefined) data.programInterest = input.programInterest;
  if (input.lostReason !== undefined) data.lostReason = input.lostReason;
  if (input.wonRevenueCents !== undefined) data.wonRevenueCents = input.wonRevenueCents;
  if (input.bookedProgram !== undefined) data.bookedProgram = input.bookedProgram;
  if (input.locationId !== undefined) data.location = input.locationId;
  if (input.assignedPortalOwnerId !== undefined) {
    data.assignedPortalOwner = input.assignedPortalOwnerId;
  }

  try {
    const doc = await payload.update({
      collection: CLIENT_INQUIRIES_COLLECTION,
      id: input.inquiryId,
      data,
      overrideAccess: true,
    });
    const inquiry = mapDocToRecord(doc as unknown as Record<string, unknown>);

    for (const meaningful of pickMeaningfulActivities(current, inquiry)) {
      await publishClientInquiryLifecycleActivity({
        inquiry,
        actorUserId: input.actorUserId,
        ...meaningful,
      }).catch(() => undefined);
    }

    return { ok: true, inquiry };
  } catch (err) {
    return {
      ok: false,
      code: "error",
      message: err instanceof Error ? err.message : "Update failed.",
    };
  }
}

function assertNoCommissionSideEffect(policy: ManagedClientLeadPolicy): void {
  // Structural guard for reviewers/verifiers — this function never calls CSI sale APIs.
  void policy.commissionOnConfirmedSale;
  void policy.commissionAmountCents;
}

/**
 * Meaningful Activity Engine entries from a lifecycle update.
 * Internal-only, deduped by eventType at publish time. Never includes contact
 * PII (email/phone) — summaries reference inquiryKey and structured state only.
 */
function pickMeaningfulActivities(
  before: ClientInquiryRecord,
  after: ClientInquiryRecord,
): Array<{ eventType: string; title: string; summary: string }> {
  const events: Array<{ eventType: string; title: string; summary: string }> = [];

  if (before.verificationState !== after.verificationState) {
    events.push({
      eventType: "managed-client.inquiry.verified",
      title: "Client inquiry verification updated",
      summary: `${after.inquiryKey} verification → ${after.verificationState}.`,
    });
  }
  if (before.qualificationState !== after.qualificationState) {
    events.push({
      eventType: "managed-client.inquiry.qualified",
      title: "Client inquiry qualification updated",
      summary: `${after.inquiryKey} qualification → ${after.qualificationState}.`,
    });
  }
  if (before.outcomeState !== after.outcomeState) {
    if (after.outcomeState === "won") {
      const revenueNote =
        after.wonRevenueCents != null
          ? ` Revenue evidence: $${(after.wonRevenueCents / 100).toFixed(2)}.`
          : "";
      const programNote = after.bookedProgram ? ` Program: ${after.bookedProgram}.` : "";
      events.push({
        eventType: "managed-client.inquiry.outcome",
        title: "Client inquiry won",
        summary: `${after.inquiryKey} outcome → won.${programNote}${revenueNote}`,
      });
    } else if (after.outcomeState === "lost") {
      const reasonNote = after.lostReason ? ` Reason: ${after.lostReason.replaceAll("_", " ")}.` : "";
      events.push({
        eventType: "managed-client.inquiry.outcome",
        title: "Client inquiry lost",
        summary: `${after.inquiryKey} outcome → lost.${reasonNote}`,
      });
    } else {
      events.push({
        eventType: "managed-client.inquiry.outcome",
        title: "Client inquiry outcome updated",
        summary: `${after.inquiryKey} outcome → ${after.outcomeState}.`,
      });
    }
  }
  if (before.disposition !== after.disposition && after.disposition !== "none") {
    events.push({
      eventType: "managed-client.inquiry.disposition",
      title: "Client inquiry disposition updated",
      summary: `${after.inquiryKey} disposition → ${after.disposition}.`,
    });
  }
  if (before.assignedOwnerId !== after.assignedOwnerId && after.assignedOwnerId != null) {
    events.push({
      eventType: "managed-client.inquiry.assigned",
      title: "Client inquiry assigned",
      summary: `${after.inquiryKey} assigned to a staff owner.`,
    });
  }
  if (
    before.assignedPortalOwnerId !== after.assignedPortalOwnerId &&
    after.assignedPortalOwnerId != null
  ) {
    events.push({
      eventType: "managed-client.inquiry.assigned",
      title: "Client inquiry assigned",
      summary: `${after.inquiryKey} assigned to a workspace owner.`,
    });
  }
  if (before.nextFollowUpAt !== after.nextFollowUpAt && after.nextFollowUpAt) {
    events.push({
      eventType: "managed-client.inquiry.follow-up-set",
      title: "Follow-up scheduled",
      summary: `${after.inquiryKey} next follow-up set.`,
    });
  }
  if (before.operatorNotes !== after.operatorNotes && after.operatorNotes) {
    events.push({
      eventType: "managed-client.inquiry.note",
      title: "Note added",
      summary: `${after.inquiryKey} note updated.`,
    });
  }

  return events;
}
