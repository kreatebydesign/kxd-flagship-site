/**
 * Normalize signed website form payloads for managed-client inquiry receipt.
 * Forces evidence flags off — form success is receipt truth only.
 */

import type { ManagedClientLeadChannel } from "@/lib/acquisition-operations/policy";

export type NormalizedMciFormIngest = {
  sourceExternalId: string;
  sourceSystem: string;
  channel: "form";
  receivedAt: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  messageSummary: string | null;
  landingPage: string | null;
  destinationInbox: string | null;
  campaign: string | null;
  sourceMedium: string | null;
};

export type NormalizeMciFormIngestResult =
  | { ok: true; data: NormalizedMciFormIngest }
  | {
      ok: false;
      code:
        | "malformed"
        | "missing_source_external_id"
        | "invalid_source_external_id"
        | "invalid_channel"
        | "client_key_mismatch";
      message: string;
    };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function boundText(value: unknown, max: number): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.length > max ? text.slice(0, max) : text;
}

function parseReceivedAt(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value.trim());
    if (Number.isFinite(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

/**
 * Pure normalize. Caller supplies expected clientKey + sourceSystem from credential.
 * Ignores clientId / googleConversionObserved / CSI linkage from the body.
 */
export function normalizeMciFormIngestPayload(input: {
  body: unknown;
  expectedClientKey: string;
  expectedSourceSystem: string;
  sourceExternalIdPattern?: RegExp;
}): NormalizeMciFormIngestResult {
  const root = asRecord(input.body);
  if (!root) {
    return { ok: false, code: "malformed", message: "Body must be a JSON object." };
  }

  const bodyClientKey = boundText(root.clientKey, 120);
  if (bodyClientKey && bodyClientKey !== input.expectedClientKey) {
    return {
      ok: false,
      code: "client_key_mismatch",
      message: "clientKey does not match path binding.",
    };
  }

  const sourceExternalId = boundText(
    root.sourceExternalId ?? root.submissionId ?? root.leadId,
    120,
  );
  if (!sourceExternalId) {
    return {
      ok: false,
      code: "missing_source_external_id",
      message: "sourceExternalId is required.",
    };
  }
  if (
    input.sourceExternalIdPattern &&
    !input.sourceExternalIdPattern.test(sourceExternalId)
  ) {
    return {
      ok: false,
      code: "invalid_source_external_id",
      message: "sourceExternalId does not match the configured client pattern.",
    };
  }

  const channelRaw = boundText(root.channel, 40) ?? "form";
  if (channelRaw !== "form") {
    return {
      ok: false,
      code: "invalid_channel",
      message: "Website form ingest accepts channel=form only.",
    };
  }

  const sourceSystem =
    boundText(root.sourceSystem, 120) ?? input.expectedSourceSystem;
  if (sourceSystem !== input.expectedSourceSystem) {
    return {
      ok: false,
      code: "client_key_mismatch",
      message: "sourceSystem does not match credential binding.",
    };
  }

  void (root.clientId as unknown);
  void (root.googleConversionObserved as unknown);
  void (root.sourceClientSiteEventId as unknown);

  return {
    ok: true,
    data: {
      sourceExternalId,
      sourceSystem,
      channel: "form" satisfies ManagedClientLeadChannel,
      receivedAt: parseReceivedAt(root.receivedAt ?? root.submittedAt),
      contactName: boundText(root.contactName ?? root.name, 200),
      contactEmail: boundText(root.contactEmail ?? root.email, 200),
      contactPhone: boundText(root.contactPhone ?? root.phone, 80),
      messageSummary: boundText(root.messageSummary ?? root.message, 500),
      landingPage: boundText(root.landingPage, 300),
      destinationInbox: boundText(root.destinationInbox, 200),
      campaign: boundText(root.campaign, 200),
      sourceMedium: boundText(root.sourceMedium, 120),
    },
  };
}
