import "server-only";

import { sql } from "@payloadcms/db-postgres";
import type { Payload } from "payload";
import { getConnectPostgresExecutor, asRowList } from "@/lib/connect/db";
import type { StaffDocumentAuditEvent } from "./types.ts";

export type DeclineClaimOutcome =
  | { kind: "declined" }
  | { kind: "already_declined" }
  | { kind: "not_found" }
  | { kind: "not_claimable"; status: string };

export async function claimStaffDocumentDecline(input: {
  payload: Payload;
  documentId: number;
  staffUserId: number;
  declinedAt: string;
  declineReason?: string | null;
  auditEvents: StaffDocumentAuditEvent[];
}): Promise<DeclineClaimOutcome> {
  const db = getConnectPostgresExecutor(input.payload);
  if (!db) throw new Error("Staff document decline requires Postgres.");

  const auditJson = JSON.stringify(input.auditEvents);
  const reason = input.declineReason?.trim() || null;

  const updateResult = await db.execute(sql`
    UPDATE staff_documents
    SET
      status = 'declined',
      declined_at = ${input.declinedAt}::timestamptz,
      decline_reason = ${reason},
      audit_events = ${auditJson}::jsonb,
      updated_at = now()
    WHERE id = ${input.documentId}
      AND staff_user_id = ${input.staffUserId}
      AND signing_mode = 'dual-signature'
      AND status = 'assigned'
    RETURNING id
  `);

  const updated = asRowList<{ id: number }>(updateResult as { rows?: { id: number }[] });
  if (updated.length > 0) return { kind: "declined" };

  const readResult = await db.execute(sql`
    SELECT status FROM staff_documents
    WHERE id = ${input.documentId} AND staff_user_id = ${input.staffUserId}
    LIMIT 1
  `);
  const row = asRowList<{ status?: string }>(
    readResult as { rows?: { status?: string }[] },
  )[0];
  if (!row?.status) return { kind: "not_found" };
  if (row.status === "declined") return { kind: "already_declined" };
  return { kind: "not_claimable", status: String(row.status) };
}

export type RevokeClaimOutcome =
  | { kind: "revoked" }
  | { kind: "already_revoked" }
  | { kind: "not_found" }
  | { kind: "not_claimable"; status: string };

export async function claimStaffDocumentRevoke(input: {
  payload: Payload;
  documentId: number;
  auditEvents: StaffDocumentAuditEvent[];
}): Promise<RevokeClaimOutcome> {
  const db = getConnectPostgresExecutor(input.payload);
  if (!db) throw new Error("Staff document revoke requires Postgres.");

  const auditJson = JSON.stringify(input.auditEvents);

  const updateResult = await db.execute(sql`
    UPDATE staff_documents
    SET
      status = 'revoked',
      audit_events = ${auditJson}::jsonb,
      updated_at = now()
    WHERE id = ${input.documentId}
      AND status IN ('assigned', 'awaiting-operator-signature', 'executing')
    RETURNING id
  `);

  const updated = asRowList<{ id: number }>(updateResult as { rows?: { id: number }[] });
  if (updated.length > 0) return { kind: "revoked" };

  const readResult = await db.execute(sql`
    SELECT status FROM staff_documents WHERE id = ${input.documentId} LIMIT 1
  `);
  const row = asRowList<{ status?: string }>(
    readResult as { rows?: { status?: string }[] },
  )[0];
  if (!row?.status) return { kind: "not_found" };
  if (row.status === "revoked") return { kind: "already_revoked" };
  return { kind: "not_claimable", status: String(row.status) };
}
