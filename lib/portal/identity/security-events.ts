/**
 * Phase 4 Batch I — append-only security audit events (no secrets).
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";

export type PortalSecurityActorKind = "portal-user" | "operator" | "system";

export type PortalSecurityEventType =
  | "invitation.created"
  | "invitation.sent"
  | "invitation.resent"
  | "invitation.revoked"
  | "invitation.opened"
  | "invitation.accepted"
  | "invitation.failed"
  | "passkey.registered"
  | "passkey.removed"
  | "passkey.auth"
  | "totp.enabled"
  | "totp.disabled"
  | "recovery.generated"
  | "recovery.used"
  | "login.password"
  | "login.passkey"
  | "login.mfa_required"
  | "login.failed"
  | "step_up.satisfied"
  | "membership.role_changed"
  | "membership.disabled"
  | "user.disabled"
  | "security.enrollment_completed";

export async function appendPortalSecurityEvent(input: {
  type: PortalSecurityEventType;
  actorKind: PortalSecurityActorKind;
  actorPortalUserId?: number | null;
  actorOperatorUserId?: number | null;
  summary: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const payload = await getPayload({ config });
    const meta = sanitizeMetadata(input.metadata);
    await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-security-events" as any,
      data: {
        type: input.type,
        actorKind: input.actorKind,
        actorPortalUserId: input.actorPortalUserId ?? undefined,
        actorOperatorUserId: input.actorOperatorUserId ?? undefined,
        summary: input.summary.slice(0, 500),
        metadata: meta,
      },
      overrideAccess: true,
    });
  } catch (err) {
    // Audit must never break primary auth flows.
    console.warn("[KXD Portal] security event write failed:", err);
  }
}

const SECRET_KEYS = /token|secret|password|credential|code|hash|private|ciphertext/i;

function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (SECRET_KEYS.test(k)) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v == null) {
      out[k] = v;
    } else if (Array.isArray(v) && v.every((x) => typeof x === "number" || typeof x === "string")) {
      out[k] = v.slice(0, 40);
    }
  }
  return out;
}
