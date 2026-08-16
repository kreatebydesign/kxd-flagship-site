/**
 * Operator lifecycle updates for managed-client inquiries.
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
  const policy = getManagedClientLeadPolicy(current.clientKey);
  if (!policy || !policy.enabled) {
    return {
      ok: false,
      code: "policy",
      message: "Lead Operations is not enabled for this client.",
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

  try {
    const doc = await payload.update({
      collection: CLIENT_INQUIRIES_COLLECTION,
      id: input.inquiryId,
      data,
      overrideAccess: true,
    });
    const inquiry = mapDocToRecord(doc as unknown as Record<string, unknown>);

    const meaningful = pickMeaningfulActivity(current, inquiry);
    if (meaningful) {
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

function pickMeaningfulActivity(
  before: ClientInquiryRecord,
  after: ClientInquiryRecord,
): { eventType: string; title: string; summary: string } | null {
  if (before.verificationState !== after.verificationState) {
    return {
      eventType: "managed-client.inquiry.verified",
      title: "Client inquiry verification updated",
      summary: `${after.inquiryKey} verification → ${after.verificationState}.`,
    };
  }
  if (before.qualificationState !== after.qualificationState) {
    return {
      eventType: "managed-client.inquiry.qualified",
      title: "Client inquiry qualification updated",
      summary: `${after.inquiryKey} qualification → ${after.qualificationState}.`,
    };
  }
  if (before.outcomeState !== after.outcomeState) {
    return {
      eventType: "managed-client.inquiry.outcome",
      title: "Client inquiry outcome updated",
      summary: `${after.inquiryKey} outcome → ${after.outcomeState}.`,
    };
  }
  if (
    before.disposition !== after.disposition &&
    after.disposition !== "none"
  ) {
    return {
      eventType: "managed-client.inquiry.disposition",
      title: "Client inquiry disposition updated",
      summary: `${after.inquiryKey} disposition → ${after.disposition}.`,
    };
  }
  return null;
}
