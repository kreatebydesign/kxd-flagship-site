/**
 * Phase 6 Batch C0 — Connect audit events.
 *
 * Append-only. Fire-and-forget. Never stores message bodies or secrets.
 * Distinct from Activity Engine and portal-security-events.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@/payload.config";
import type { ConnectActorKind, ConnectAuditEventType } from "./types";

const SENSITIVE_KEY =
  /token|secret|password|credential|code|hash|private|ciphertext|message|body|filename|content/i;

function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEY.test(key)) continue;
    if (typeof value === "string") {
      out[key] = value.slice(0, 200);
      continue;
    }
    if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      out[key] = value;
    }
  }
  return out;
}

export async function appendConnectAuditEvent(input: {
  type: ConnectAuditEventType;
  organizationId?: number | null;
  actorKind: ConnectActorKind;
  actorOperatorUserId?: number | null;
  summary: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const payload = await getPayload({ config });
    await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "connect-audit-events" as any,
      data: {
        type: input.type,
        organization: input.organizationId ?? undefined,
        actorKind: input.actorKind,
        actorOperatorUserId: input.actorOperatorUserId ?? undefined,
        summary: input.summary.slice(0, 500),
        metadata: sanitizeMetadata(input.metadata),
      },
      overrideAccess: true,
    });
  } catch (err) {
    console.warn("[KXD Connect] audit event write failed:", err);
  }
}
