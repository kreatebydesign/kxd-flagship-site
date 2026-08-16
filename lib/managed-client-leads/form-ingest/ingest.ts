/**
 * Orchestrate signed managed-client website form ingest → client-inquiries.
 * Never writes KXD sales opportunities. Never creates commission. Never trusts caller clientId.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  getManagedClientLeadPolicy,
} from "@/lib/acquisition-operations/policy";
import "@/lib/acquisition-operations/policies/register";
import { resolveClientByExactSlug } from "@/lib/client-site-intelligence/binding";
import { receiveManagedClientInquiry } from "../receive";
import type { ClientInquiryRecord } from "../types";
import {
  MCI_FORM_INGEST_MAX_BODY_BYTES,
} from "./constants";
import {
  resolveMciFormIngestCredential,
  resolveMciFormIngestSecret,
} from "./credentials";
import { normalizeMciFormIngestPayload } from "./normalize";
import {
  readMciFormSignatureHeaders,
  verifyMciFormIngestSignature,
} from "./signature";

export type MciFormIngestHttpResult = {
  status: number;
  body: Record<string, unknown>;
};

export async function ingestManagedClientFormWebhook(input: {
  pathClientKey: string;
  rawBody: string;
  timestampHeader: string | null | undefined;
  signatureHeader: string | null | undefined;
  contentTypeHeader?: string | null;
}): Promise<MciFormIngestHttpResult> {
  const pathClientKey = String(input.pathClientKey ?? "").trim();
  if (!pathClientKey) {
    return {
      status: 404,
      body: { ok: false, error: "Unknown client.", code: "unknown_client" },
    };
  }

  if (Buffer.byteLength(input.rawBody, "utf8") > MCI_FORM_INGEST_MAX_BODY_BYTES) {
    return {
      status: 413,
      body: {
        ok: false,
        error: "Request body too large.",
        code: "payload_too_large",
      },
    };
  }

  const credential = resolveMciFormIngestCredential(pathClientKey);
  if (!credential) {
    return {
      status: 404,
      body: { ok: false, error: "Unknown client.", code: "unknown_client" },
    };
  }

  const policy = getManagedClientLeadPolicy(pathClientKey);
  if (!policy || !policy.enabled) {
    return {
      status: 403,
      body: {
        ok: false,
        error: "Managed Client Lead Operations is not enabled for this client.",
        code: "policy_disabled",
      },
    };
  }
  if (!policy.autoIngestFromWebsiteForm) {
    return {
      status: 403,
      body: {
        ok: false,
        error: "Website form auto-ingest is disabled for this client.",
        code: "auto_ingest_disabled",
      },
    };
  }

  const secret = resolveMciFormIngestSecret(credential);
  if (!secret) {
    return {
      status: 503,
      body: {
        ok: false,
        error: "Ingest credential is not configured.",
        code: "secret_missing",
      },
    };
  }

  const sig = verifyMciFormIngestSignature({
    secret,
    rawBody: input.rawBody,
    timestampHeader: input.timestampHeader,
    signatureHeader: input.signatureHeader,
  });
  if (!sig.ok) {
    const status =
      sig.reason === "missing_headers"
        ? 400
        : sig.reason === "stale_timestamp"
          ? 401
          : 401;
    return {
      status,
      body: {
        ok: false,
        error:
          sig.reason === "missing_headers"
            ? "Missing ingest signature headers."
            : sig.reason === "stale_timestamp"
              ? "Stale or invalid timestamp."
              : "Invalid ingest signature.",
        code:
          sig.reason === "missing_headers"
            ? "missing_signature_headers"
            : sig.reason === "stale_timestamp"
              ? "stale_timestamp"
              : "invalid_signature",
      },
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input.rawBody) as unknown;
  } catch {
    return {
      status: 400,
      body: { ok: false, error: "Invalid JSON body.", code: "malformed" },
    };
  }

  const normalized = normalizeMciFormIngestPayload({
    body: parsed,
    expectedClientKey: credential.clientKey,
    expectedSourceSystem: credential.sourceSystem,
    sourceExternalIdPattern: credential.sourceExternalIdPattern,
  });
  if (!normalized.ok) {
    return {
      status: 400,
      body: {
        ok: false,
        error: normalized.message,
        code: normalized.code,
      },
    };
  }

  const payload = await getPayload({ config });
  const client = await resolveClientByExactSlug(payload, credential.clientKey);
  if (!client.ok) {
    return {
      status: 404,
      body: {
        ok: false,
        error: "Client binding could not be resolved.",
        code: client.reason,
      },
    };
  }

  const result = await receiveManagedClientInquiry({
    clientId: client.clientId,
    clientKey: credential.clientKey,
    channel: normalized.data.channel,
    receivedAt: normalized.data.receivedAt,
    sourceSystem: normalized.data.sourceSystem,
    sourceExternalId: normalized.data.sourceExternalId,
    // Never accept CSI linkage or Google evidence from form ingest.
    sourceClientSiteEventId: null,
    googleConversionObserved: false,
    contactName: normalized.data.contactName,
    contactEmail: normalized.data.contactEmail,
    contactPhone: normalized.data.contactPhone,
    messageSummary: normalized.data.messageSummary,
    landingPage: normalized.data.landingPage,
    destinationInbox: normalized.data.destinationInbox,
    campaign: normalized.data.campaign,
    sourceMedium: normalized.data.sourceMedium,
  });

  if (!result.ok) {
    const status =
      result.code === "conflict"
        ? 409
        : result.code === "binding" || result.code === "policy" || result.code === "channel"
          ? 403
          : 500;
    return {
      status,
      body: {
        ok: false,
        error: result.message,
        code: result.code,
      },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      created: result.created,
      inquiry: summarizeInquiry(result.inquiry),
    },
  };
}

function summarizeInquiry(inquiry: ClientInquiryRecord) {
  return {
    id: inquiry.id,
    inquiryKey: inquiry.inquiryKey,
    clientKey: inquiry.clientKey,
    sourceExternalId: inquiry.sourceExternalId,
    reconciliationState: inquiry.reconciliationState,
    operationalStatus: inquiry.operationalStatus,
  };
}

export { readMciFormSignatureHeaders };
