import "server-only";

import { sql } from "@payloadcms/db-postgres";
import type { Payload } from "payload";
import { getConnectPostgresExecutor, asRowList } from "@/lib/connect/db";
import type { StaffAcknowledgmentEvidence, StaffDocumentAuditEvent } from "./types.ts";
import { resolveAcknowledgmentClaimAfterUpdate } from "./acknowledge-claim-outcomes.ts";

export type AcknowledgmentClaimOutcome =
  | { kind: "claimed" }
  | { kind: "already_acknowledged" }
  | { kind: "not_found" }
  | { kind: "not_claimable"; status: string };

/**
 * Atomically transition assigned → acknowledged.
 * Exactly one concurrent caller receives claimed; others see already_acknowledged.
 */
export async function claimStaffDocumentAcknowledgment(input: {
  payload: Payload;
  documentId: number;
  staffUserId: number;
  acknowledgment: StaffAcknowledgmentEvidence;
  auditEvents: StaffDocumentAuditEvent[];
}): Promise<AcknowledgmentClaimOutcome> {
  const db = getConnectPostgresExecutor(input.payload);
  if (!db) {
    throw new Error("Staff document acknowledgment requires Postgres.");
  }

  const ackJson = JSON.stringify(input.acknowledgment);
  const auditJson = JSON.stringify(input.auditEvents);

  const updateResult = await db.execute(sql`
    UPDATE staff_documents
    SET
      status = 'acknowledged',
      acknowledgment = ${ackJson}::jsonb,
      acknowledged_at = ${input.acknowledgment.acknowledgedAt}::timestamptz,
      audit_events = ${auditJson}::jsonb,
      updated_at = now()
    WHERE id = ${input.documentId}
      AND staff_user_id = ${input.staffUserId}
      AND status = 'assigned'
    RETURNING id
  `);

  const updated = asRowList<{ id: number }>(updateResult as { rows?: { id: number }[] });
  if (updated.length > 0) {
    return { kind: "claimed" };
  }

  const readResult = await db.execute(sql`
    SELECT status, acknowledgment
    FROM staff_documents
    WHERE id = ${input.documentId}
      AND staff_user_id = ${input.staffUserId}
    LIMIT 1
  `);
  const row = asRowList<{ status?: string; acknowledgment?: unknown }>(
    readResult as { rows?: { status?: string; acknowledgment?: unknown }[] },
  )[0];

  const kind = resolveAcknowledgmentClaimAfterUpdate({
    rowsUpdated: 0,
    statusAfter: row?.status ?? null,
    hasAcknowledgment: Boolean(row?.acknowledgment),
  });

  if (kind === "already_acknowledged") return { kind: "already_acknowledged" };
  if (kind === "not_found") return { kind: "not_found" };
  return { kind: "not_claimable", status: String(row?.status ?? "unknown") };
}
