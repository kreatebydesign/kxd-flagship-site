/**
 * Receive a managed-client inquiry into canonical client-inquiries.
 * Never writes to sales-leads. Never creates commission.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  getManagedClientLeadPolicy,
  isChannelAllowedForPolicy,
} from "@/lib/acquisition-operations/policy";
import "@/lib/acquisition-operations/policies/register";
import { resolveInquiryKeyFromSource } from "./identity";
import { resolveReconciliationState } from "./reconciliation";
import { publishClientInquiryReceivedActivity } from "./publish-activity";
import {
  type ClientInquiryRecord,
  type ReceiveClientInquiryInput,
} from "./types";
import { CLIENT_INQUIRIES_COLLECTION } from "./collection";
import { clientIdMatchesClientKey, ledgerScopeWhere } from "./isolation";
import { mapDocToRecord } from "./map";

export type ReceiveClientInquiryResult =
  | { ok: true; created: boolean; inquiry: ClientInquiryRecord }
  | {
      ok: false;
      code: "policy" | "channel" | "binding" | "conflict" | "error";
      message: string;
    };

export async function receiveManagedClientInquiry(
  input: ReceiveClientInquiryInput,
): Promise<ReceiveClientInquiryResult> {
  const clientKey = String(input.clientKey ?? "").trim();
  const policy = getManagedClientLeadPolicy(clientKey);
  if (!policy || !policy.enabled) {
    return {
      ok: false,
      code: "policy",
      message: `Managed Client Lead Operations is not enabled for clientKey "${clientKey}".`,
    };
  }
  if (!isChannelAllowedForPolicy(policy, input.channel)) {
    return {
      ok: false,
      code: "channel",
      message: `Channel "${input.channel}" is not allowed for this client policy.`,
    };
  }

  const payload = await getPayload({ config });

  try {
    const clientDoc = (await payload.findByID({
      collection: "clients",
      id: input.clientId,
      depth: 0,
      overrideAccess: true,
    })) as { slug?: string | null };
    if (
      !clientIdMatchesClientKey({
        clientSlug: clientDoc.slug,
        clientKey,
      })
    ) {
      return {
        ok: false,
        code: "binding",
        message: "clientId does not match clientKey — cross-client writes are rejected.",
      };
    }
  } catch {
    return {
      ok: false,
      code: "binding",
      message: "Client not found for clientId.",
    };
  }

  const receivedAt = input.receivedAt ?? new Date().toISOString();
  const inquiryKey =
    input.inquiryKey?.trim() ||
    resolveInquiryKeyFromSource({
      clientKey,
      sourceExternalId: input.sourceExternalId,
      receivedAt,
    });

  // Idempotency: reuse by inquiryKey or linked CSI event.
  const collection = CLIENT_INQUIRIES_COLLECTION;
  // Loader twin: ledger queries always AND client + clientKey (see ledgerScopeWhere).
  void ledgerScopeWhere(input.clientId, clientKey);

  const byKey = await payload.find({
    collection,
    limit: 1,
    depth: 0,
    where: { inquiryKey: { equals: inquiryKey } },
    overrideAccess: true,
  });
  if (byKey.docs[0]) {
    const inquiry = mapDocToRecord(byKey.docs[0] as unknown as Record<string, unknown>);
    if (inquiry.clientId !== input.clientId || inquiry.clientKey !== clientKey) {
      return {
        ok: false,
        code: "conflict",
        message: "Inquiry key already belongs to another client.",
      };
    }
    return {
      ok: true,
      created: false,
      inquiry,
    };
  }

  if (input.sourceClientSiteEventId) {
    const byCsi = await payload.find({
      collection,
      limit: 1,
      depth: 0,
      where: {
        sourceClientSiteEvent: { equals: input.sourceClientSiteEventId },
      },
      overrideAccess: true,
    });
    if (byCsi.docs[0]) {
      const inquiry = mapDocToRecord(
        byCsi.docs[0] as unknown as Record<string, unknown>,
      );
      if (inquiry.clientId !== input.clientId || inquiry.clientKey !== clientKey) {
        return {
          ok: false,
          code: "conflict",
          message: "CSI event already linked to another client's inquiry.",
        };
      }
      return {
        ok: true,
        created: false,
        inquiry,
      };
    }
  }

  if (input.sourceExternalId) {
    const byExternal = await payload.find({
      collection,
      limit: 1,
      depth: 0,
      where: {
        and: [
          { clientKey: { equals: clientKey } },
          { sourceExternalId: { equals: String(input.sourceExternalId) } },
        ],
      },
      overrideAccess: true,
    });
    if (byExternal.docs[0]) {
      const inquiry = mapDocToRecord(
        byExternal.docs[0] as unknown as Record<string, unknown>,
      );
      if (inquiry.clientId !== input.clientId) {
        return {
          ok: false,
          code: "conflict",
          message: "Source external id already bound to a different client id.",
        };
      }
      return {
        ok: true,
        created: false,
        inquiry,
      };
    }
  }

  const hasAttribution = Boolean(
    input.sourceClientSiteEventId || input.googleConversionObserved,
  );
  const reconciliationState = resolveReconciliationState({
    hasReceivedInquiry: true,
    hasAttributionEvidence: hasAttribution,
    reconciliationEnabled: policy.attributionReconciliationEnabled,
  });

  try {
    const doc = await payload.create({
      collection,
      data: {
        inquiryKey,
        client: input.clientId,
        clientKey,
        channel: input.channel,
        receivedAt,
        destinationInbox: input.destinationInbox ?? undefined,
        landingPage: input.landingPage ?? undefined,
        campaign: input.campaign ?? undefined,
        sourceMedium: input.sourceMedium ?? undefined,
        contactName: input.contactName ?? undefined,
        contactEmail: input.contactEmail ?? undefined,
        contactPhone: input.contactPhone ?? undefined,
        messageSummary: input.messageSummary ?? undefined,
        operationalStatus: policy.defaultOperationalStatus,
        verificationState: policy.defaultVerificationState,
        qualificationState: policy.defaultQualificationState,
        outcomeState: policy.defaultOutcomeState,
        disposition: "none",
        leadQuality: "unreviewed",
        sourceSystem: input.sourceSystem ?? undefined,
        sourceExternalId: input.sourceExternalId ?? undefined,
        sourceClientSiteEvent: input.sourceClientSiteEventId ?? undefined,
        reconciliationState,
        googleConversionObserved: Boolean(input.googleConversionObserved),
        operatorNotes: input.operatorNotes ?? undefined,
      },
      overrideAccess: true,
    });

    const inquiry = mapDocToRecord(doc as unknown as Record<string, unknown>);

    await publishClientInquiryReceivedActivity({
      inquiry,
      actorUserId: input.actorUserId ?? null,
    }).catch(() => {
      // Activity is best-effort — never fail receipt.
    });

    return { ok: true, created: true, inquiry };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to receive inquiry.";
    if (/unique|duplicate/i.test(message)) {
      return { ok: false, code: "conflict", message: "Inquiry already exists." };
    }
    return { ok: false, code: "error", message };
  }
}

export { mapDocToRecord } from "./map";
