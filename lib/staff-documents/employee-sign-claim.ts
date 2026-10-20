import "server-only";

import { sql } from "@payloadcms/db-postgres";
import type { Payload } from "payload";
import { getConnectPostgresExecutor, asRowList } from "@/lib/connect/db";
import type { StaffDocumentAuditEvent, StaffSignatureEvidence } from "./types.ts";
import { documentExpiredAtSigningTime } from "./state-machine.ts";
import { resolveEmployeeSignClaimAfterUpdate } from "./employee-sign-claim-outcomes.ts";

export type EmployeeSignClaimOutcome =
  | { kind: "claimed" }
  | { kind: "already_signed" }
  | { kind: "not_found" }
  | { kind: "not_claimable"; status: string }
  | { kind: "expired" };

export { resolveEmployeeSignClaimAfterUpdate };

/**
 * Atomically transition assigned → awaiting-operator-signature with employee signature.
 */
export async function claimStaffDocumentEmployeeSignature(input: {
  payload: Payload;
  documentId: number;
  staffUserId: number;
  employeeSignature: StaffSignatureEvidence;
  auditEvents: StaffDocumentAuditEvent[];
  expiresAt?: string | null;
}): Promise<EmployeeSignClaimOutcome> {
  if (documentExpiredAtSigningTime(input.expiresAt)) {
    return { kind: "expired" };
  }

  const db = getConnectPostgresExecutor(input.payload);
  if (!db) {
    throw new Error("Staff document employee signature requires Postgres.");
  }

  const sigJson = JSON.stringify(input.employeeSignature);
  const auditJson = JSON.stringify(input.auditEvents);

  const updateResult = await db.execute(sql`
    UPDATE staff_documents
    SET
      status = 'awaiting-operator-signature',
      employee_signature = ${sigJson}::jsonb,
      audit_events = ${auditJson}::jsonb,
      updated_at = now()
    WHERE id = ${input.documentId}
      AND staff_user_id = ${input.staffUserId}
      AND signing_mode = 'dual-signature'
      AND status = 'assigned'
      AND (expires_at IS NULL OR expires_at > now())
    RETURNING id
  `);

  const updated = asRowList<{ id: number }>(updateResult as { rows?: { id: number }[] });
  if (updated.length > 0) {
    return { kind: "claimed" };
  }

  if (documentExpiredAtSigningTime(input.expiresAt)) {
    await db.execute(sql`
      UPDATE staff_documents
      SET status = 'expired', updated_at = now()
      WHERE id = ${input.documentId}
        AND staff_user_id = ${input.staffUserId}
        AND status = 'assigned'
        AND expires_at IS NOT NULL
        AND expires_at <= now()
    `);
    return { kind: "expired" };
  }

  const readResult = await db.execute(sql`
    SELECT status, employee_signature
    FROM staff_documents
    WHERE id = ${input.documentId}
      AND staff_user_id = ${input.staffUserId}
    LIMIT 1
  `);
  const row = asRowList<{ status?: string; employee_signature?: unknown }>(
    readResult as { rows?: { status?: string; employee_signature?: unknown }[] },
  )[0];

  const resolved = resolveEmployeeSignClaimAfterUpdate({
    rowsUpdated: 0,
    statusAfter: row?.status ?? null,
    hasEmployeeSignature: Boolean(row?.employee_signature),
  });
  if (resolved.kind === "not_claimable") {
    return { kind: "not_claimable", status: resolved.status ?? "unknown" };
  }
  if (resolved.kind === "claimed") return { kind: "claimed" };
  if (resolved.kind === "already_signed") return { kind: "already_signed" };
  return { kind: "not_found" };
}
