import "server-only";

import { sql } from "@payloadcms/db-postgres";
import type { Payload } from "payload";
import { getConnectPostgresExecutor, asRowList } from "@/lib/connect/db";
import type { StaffDocumentAuditEvent, StaffSignatureEvidence } from "./types.ts";
import { resolveOperatorCountersignClaimAfterUpdate } from "./operator-countersign-claim-outcomes.ts";

export type OperatorCountersignClaimOutcome =
  | { kind: "claimed" }
  | { kind: "already_executing" }
  | { kind: "not_found" }
  | { kind: "not_claimable"; status: string };

export { resolveOperatorCountersignClaimAfterUpdate };

/**
 * Atomically transition awaiting-operator-signature → executing with operator signature.
 * Final `executed` status is set only after authoritative PDF is filed (see execution-finalize).
 */
export async function claimStaffDocumentOperatorCountersignature(input: {
  payload: Payload;
  documentId: number;
  operatorSignature: StaffSignatureEvidence;
  auditEvents: StaffDocumentAuditEvent[];
}): Promise<OperatorCountersignClaimOutcome> {
  const db = getConnectPostgresExecutor(input.payload);
  if (!db) {
    throw new Error("Staff document countersignature requires Postgres.");
  }

  const sigJson = JSON.stringify(input.operatorSignature);
  const auditJson = JSON.stringify(input.auditEvents);

  const updateResult = await db.execute(sql`
    UPDATE staff_documents
    SET
      status = 'executing',
      operator_signature = ${sigJson}::jsonb,
      audit_events = ${auditJson}::jsonb,
      updated_at = now()
    WHERE id = ${input.documentId}
      AND signing_mode = 'dual-signature'
      AND status = 'awaiting-operator-signature'
      AND employee_signature IS NOT NULL
    RETURNING id
  `);

  const updated = asRowList<{ id: number }>(updateResult as { rows?: { id: number }[] });
  if (updated.length > 0) {
    return { kind: "claimed" };
  }

  const readResult = await db.execute(sql`
    SELECT status, operator_signature
    FROM staff_documents
    WHERE id = ${input.documentId}
    LIMIT 1
  `);
  const row = asRowList<{ status?: string; operator_signature?: unknown }>(
    readResult as { rows?: { status?: string; operator_signature?: unknown }[] },
  )[0];

  const resolved = resolveOperatorCountersignClaimAfterUpdate({
    rowsUpdated: 0,
    statusAfter: row?.status ?? null,
    hasOperatorSignature: Boolean(row?.operator_signature),
  });
  if (resolved.kind === "not_claimable") {
    return { kind: "not_claimable", status: resolved.status ?? "unknown" };
  }
  if (resolved.kind === "claimed") return { kind: "claimed" };
  if (resolved.kind === "already_executing") return { kind: "already_executing" };
  return { kind: "not_found" };
}
