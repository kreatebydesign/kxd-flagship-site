/**
 * Client Site Intelligence ingest orchestrator (csi-v1-a).
 *
 * Order: authenticate → validate/normalize → bind client/source →
 * persist (idempotent) → Activity publish (best-effort, deduped).
 */

import type { Payload } from "payload";
import { bindClientSiteSource } from "./binding";
import {
  buildClientSiteIdempotencyKey,
  CSI_MAX_BODY_BYTES,
  CSI_SIGNATURE_HEADER,
  CSI_TIMESTAMP_HEADER,
  DEFAULT_OTP_COMMISSION_AMOUNT_CENTS,
  type CsiSourceCredentialBinding,
} from "./constants";
import { resolveCsiIngestSecret } from "./credentials";
import {
  normalizeWebsiteLeadPayload,
  readEnvelopeClientKey,
  readEnvelopeSourceSystem,
  readEventClass,
} from "./normalize-website-lead";
import {
  createPayloadClientSiteEventStore,
  persistClientSiteEventIdempotent,
  type ClientSiteEventStore,
} from "./persist";
import type { PublishCsiActivityResult } from "./publish-activity";
import { verifyCsiIngestSignature } from "./signature";
import type { ClientSiteEventRecord } from "./types";
import {
  CLIENT_SITE_EVENT_CLASSES,
  type ClientSiteEventClass,
  type ClientSiteIngestHttpResult,
} from "./types";

export interface ClientSiteIngestDeps {
  resolveSecret: (
    clientKey: string,
  ) =>
    | { ok: true; binding: CsiSourceCredentialBinding; secret: string }
    | { ok: false; reason: "unknown_client_key" | "secret_not_configured" };
  getPayload: () => Promise<Payload>;
  createStore: (payload: Payload) => ClientSiteEventStore;
  publishActivityForRecord: (input: {
    record: ClientSiteEventRecord;
    payloadInstance?: Payload;
  }) => Promise<PublishCsiActivityResult>;
  nowMs: () => number;
}

async function defaultGetPayload(): Promise<Payload> {
  const { getPayload } = await import("payload");
  const { default: config } = await import("@payload-config");
  return getPayload({ config });
}

async function defaultPublishActivity(input: {
  record: ClientSiteEventRecord;
  payloadInstance?: Payload;
}): Promise<PublishCsiActivityResult> {
  const { publishWebsiteLeadActivity } = await import("./publish-activity");
  return publishWebsiteLeadActivity(input);
}

const defaultDeps: ClientSiteIngestDeps = {
  resolveSecret: (clientKey) => resolveCsiIngestSecret(clientKey),
  getPayload: defaultGetPayload,
  createStore: (payload) => createPayloadClientSiteEventStore(payload),
  publishActivityForRecord: defaultPublishActivity,
  nowMs: () => Date.now(),
};

function http(
  status: number,
  body: ClientSiteIngestHttpResult["body"],
): ClientSiteIngestHttpResult {
  return { status, body };
}

function isSupportedEventClass(value: string): value is ClientSiteEventClass {
  return (CLIENT_SITE_EVENT_CLASSES as readonly string[]).includes(value);
}

function bodyByteLength(rawBody: string): number {
  return Buffer.byteLength(rawBody, "utf8");
}

/**
 * Ingest a signed Client Site Intelligence webhook for a path-bound clientKey.
 * `rawBody` must be the exact request body bytes used for HMAC (never reserialized).
 */
export async function ingestClientSiteWebhook(input: {
  pathClientKey: string;
  rawBody: string;
  timestampHeader: string | null;
  signatureHeader: string | null;
  contentTypeHeader?: string | null;
  deps?: Partial<ClientSiteIngestDeps>;
}): Promise<ClientSiteIngestHttpResult> {
  const deps: ClientSiteIngestDeps = { ...defaultDeps, ...input.deps };
  const pathClientKey = input.pathClientKey.trim().toLowerCase();

  if (bodyByteLength(input.rawBody) > CSI_MAX_BODY_BYTES) {
    return http(413, {
      ok: false,
      error: "Request body too large.",
      code: "payload_too_large",
    });
  }

  const contentType = (input.contentTypeHeader ?? "").toLowerCase();
  if (contentType && !contentType.includes("application/json")) {
    return http(415, {
      ok: false,
      error: "Unsupported content type.",
      code: "unsupported_content_type",
    });
  }

  const credential = deps.resolveSecret(pathClientKey);
  if (!credential.ok) {
    if (credential.reason === "secret_not_configured") {
      return http(503, {
        ok: false,
        error: "Client site ingest is not configured.",
        code: "not_configured",
      });
    }
    return http(404, {
      ok: false,
      error: "Unknown client site ingest target.",
      code: "unknown_client",
    });
  }

  const signature = verifyCsiIngestSignature({
    secret: credential.secret,
    rawBody: input.rawBody,
    timestampHeader: input.timestampHeader,
    signatureHeader: input.signatureHeader,
    nowMs: deps.nowMs(),
  });

  if (!signature.ok) {
    if (signature.reason === "missing_headers") {
      return http(400, {
        ok: false,
        error: "Missing ingest signature headers.",
        code: "missing_signature_headers",
      });
    }
    if (signature.reason === "stale_timestamp") {
      return http(400, {
        ok: false,
        error: "Stale ingest timestamp.",
        code: "stale_timestamp",
      });
    }
    return http(401, {
      ok: false,
      error: "Invalid ingest signature.",
      code: "invalid_signature",
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input.rawBody) as unknown;
  } catch {
    return http(400, {
      ok: false,
      error: "Invalid JSON body.",
      code: "malformed_payload",
    });
  }

  const eventClassRaw = readEventClass(parsed);
  if (!eventClassRaw) {
    return http(400, {
      ok: false,
      error: "Malformed event payload.",
      code: "malformed_payload",
    });
  }
  if (!isSupportedEventClass(eventClassRaw)) {
    return http(400, {
      ok: false,
      error: "Unsupported event class.",
      code: "unsupported_event_class",
    });
  }
  if (!credential.binding.allowedEventClasses.includes(eventClassRaw)) {
    return http(400, {
      ok: false,
      error: "Unsupported event class.",
      code: "unsupported_event_class",
    });
  }

  // csi-v1-a: website_lead only for OTP credential.
  if (eventClassRaw !== "website_lead") {
    return http(400, {
      ok: false,
      error: "Unsupported event class.",
      code: "unsupported_event_class",
    });
  }

  const normalized = normalizeWebsiteLeadPayload(parsed);
  if (!normalized.ok) {
    return http(400, {
      ok: false,
      error: "Malformed event payload.",
      code: "malformed_payload",
    });
  }

  // Never create commission obligations from ingest.
  if (
    normalized.payload.commissionAmountCents !==
      DEFAULT_OTP_COMMISSION_AMOUNT_CENTS ||
    normalized.payload.commissionStatus !== "not_due" ||
    normalized.payload.soldAt !== null ||
    normalized.payload.saleReference !== null
  ) {
    return http(500, {
      ok: false,
      error: "Ingest normalization failed.",
      code: "persistence_failure",
    });
  }

  let payload: Payload;
  try {
    payload = await deps.getPayload();
  } catch {
    return http(500, {
      ok: false,
      error: "Ingest temporarily unavailable.",
      code: "persistence_failure",
    });
  }

  const bound = await bindClientSiteSource({
    pathClientKey,
    envelopeClientKey: readEnvelopeClientKey(parsed),
    envelopeSourceSystem: readEnvelopeSourceSystem(parsed),
    binding: credential.binding,
    payload,
  });

  if (!bound.ok) {
    return http(403, {
      ok: false,
      error: "Invalid client or source binding.",
      code: "invalid_binding",
    });
  }

  const receivedAt = new Date(deps.nowMs()).toISOString();
  const idempotencyKey = buildClientSiteIdempotencyKey({
    sourceSystem: bound.sourceSystem,
    externalEventId: normalized.externalEventId,
    eventClass: eventClassRaw,
  });

  const store = deps.createStore(payload);
  let persistResult;
  try {
    persistResult = await persistClientSiteEventIdempotent(store, {
      clientId: bound.clientId,
      clientKey: bound.clientKey,
      eventClass: eventClassRaw,
      externalEventId: normalized.externalEventId,
      sourceSystem: bound.sourceSystem,
      occurredAt: normalized.occurredAt,
      receivedAt,
      sensitivity: "sensitive_contact",
      visibilityState: "internal_only",
      payload: normalized.payload,
      idempotencyKey,
      ingestMeta: {
        signatureTimestamp: signature.timestampSeconds,
        // Field names only — never store untrusted raw authority values.
        rejectedAuthorityFields: normalized.rejectedAuthorityFields,
        authorityAttemptRejected: normalized.rejectedAuthorityFields.length > 0,
        pathClientKey,
        resolvedSlug: bound.resolvedSlug,
        headersPresent: {
          signature: Boolean(input.signatureHeader),
          timestamp: Boolean(input.timestampHeader),
        },
        // Explicit: ingest never creates commission obligations.
        commissionObligationCreated: false,
      },
    });
  } catch {
    return http(500, {
      ok: false,
      error: "Ingest temporarily unavailable.",
      code: "persistence_failure",
    });
  }

  const record = persistResult.record;

  // Already linked — do not re-enter Activity publish (avoids retry storms).
  if (record.activityTimelineEventId != null) {
    return http(200, {
      ok: true,
      duplicate: persistResult.kind === "duplicate",
      eventId: record.id,
      externalEventId: record.externalEventId,
      eventClass: record.eventClass,
      activityPublished: true,
    });
  }

  let activityPublished = false;

  // Publish Activity for new events, or complete Activity after persist-success /
  // prior Activity failure. Deterministic sourceId + Activity Engine dedupe prevent spam.
  try {
    const activity = await deps.publishActivityForRecord({
      record,
      payloadInstance: payload,
    });
    if (activity.activityId != null) {
      activityPublished = true;
      await store.markActivityPublished(record.id, activity.activityId);
    } else if (activity.skipped) {
      // Dedupe hit without id — treat as published to avoid endless retries.
      activityPublished = true;
    }
  } catch {
    // Persistence already succeeded; Activity is best-effort and completed on replay.
    activityPublished = false;
  }

  return http(200, {
    ok: true,
    duplicate: persistResult.kind === "duplicate",
    eventId: record.id,
    externalEventId: record.externalEventId,
    eventClass: record.eventClass,
    activityPublished,
  });
}

export function readCsiSignatureHeaders(headers: Headers): {
  timestampHeader: string | null;
  signatureHeader: string | null;
} {
  return {
    timestampHeader: headers.get(CSI_TIMESTAMP_HEADER),
    signatureHeader: headers.get(CSI_SIGNATURE_HEADER),
  };
}
