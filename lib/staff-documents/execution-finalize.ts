import "server-only";

import { sql } from "@payloadcms/db-postgres";
import type { Payload } from "payload";
import { getConnectPostgresExecutor, asRowList } from "@/lib/connect/db";
import type { StaffDocumentAuditEvent } from "./types.ts";
import { resolveExecutionFinalizeAfterUpdate } from "./execution-finalize-outcomes.ts";

export type ExecutionFinalizeOutcome =
  | { kind: "finalized" }
  | { kind: "already_executed" }
  | { kind: "not_found" }
  | { kind: "not_ready"; status: string };

export { resolveExecutionFinalizeAfterUpdate };

/**
 * Mark fully executed only after the authoritative executed-agreement PDF is stored.
 * On PDF/storage failure, document remains in `executing` for safe retry.
 */
export async function claimStaffDocumentExecuted(input: {
  payload: Payload;
  documentId: number;
  executedAt: string;
  auditEvents: StaffDocumentAuditEvent[];
}): Promise<ExecutionFinalizeOutcome> {
  const db = getConnectPostgresExecutor(input.payload);
  if (!db) {
    throw new Error("Staff document execution finalize requires Postgres.");
  }

  const auditJson = JSON.stringify(input.auditEvents);

  const updateResult = await db.execute(sql`
    UPDATE staff_documents
    SET
      status = 'executed',
      executed_at = ${input.executedAt}::timestamptz,
      audit_events = ${auditJson}::jsonb,
      updated_at = now()
    WHERE id = ${input.documentId}
      AND signing_mode = 'dual-signature'
      AND status = 'executing'
      AND employee_signature IS NOT NULL
      AND operator_signature IS NOT NULL
    RETURNING id
  `);

  const updated = asRowList<{ id: number }>(updateResult as { rows?: { id: number }[] });
  if (updated.length > 0) {
    return { kind: "finalized" };
  }

  const readResult = await db.execute(sql`
    SELECT status FROM staff_documents WHERE id = ${input.documentId} LIMIT 1
  `);
  const row = asRowList<{ status?: string }>(
    readResult as { rows?: { status?: string }[] },
  )[0];

  const resolved = resolveExecutionFinalizeAfterUpdate({
    rowsUpdated: 0,
    statusAfter: row?.status ?? null,
  });
  if (resolved.kind === "not_ready") {
    return { kind: "not_ready", status: resolved.status ?? "unknown" };
  }
  if (resolved.kind === "finalized") return { kind: "finalized" };
  if (resolved.kind === "already_executed") return { kind: "already_executed" };
  return { kind: "not_found" };
}

export type FinalizeStaffDocumentExecutionResult =
  | { ok: true; alreadyExecuted: boolean; executedFileId: number }
  | { ok: false; stage: "countersign" | "pdf" | "finalize"; error: string };

/**
 * Orchestrates PDF generation + storage, then atomic executed transition.
 * Does not swallow PDF failures as success.
 */
export async function finalizeStaffDocumentExecution(input: {
  payload: Payload;
  documentId: number;
  auditEvents: StaffDocumentAuditEvent[];
  generateExecutedPdf: () => Promise<Buffer>;
  storeExecutedPdf: (buffer: Buffer) => Promise<number>;
  executedAt?: string;
}): Promise<FinalizeStaffDocumentExecutionResult> {
  const executedAt = input.executedAt ?? new Date().toISOString();

  let buffer: Buffer;
  try {
    buffer = await input.generateExecutedPdf();
  } catch (err) {
    return {
      ok: false,
      stage: "pdf",
      error: err instanceof Error ? err.message : "PDF generation failed.",
    };
  }

  let executedFileId: number;
  try {
    executedFileId = await input.storeExecutedPdf(buffer);
  } catch (err) {
    return {
      ok: false,
      stage: "pdf",
      error: err instanceof Error ? err.message : "PDF storage failed.",
    };
  }

  const claim = await claimStaffDocumentExecuted({
    payload: input.payload,
    documentId: input.documentId,
    executedAt,
    auditEvents: input.auditEvents,
  });

  if (claim.kind === "finalized") {
    return { ok: true, alreadyExecuted: false, executedFileId };
  }
  if (claim.kind === "already_executed") {
    return { ok: true, alreadyExecuted: true, executedFileId };
  }

  return {
    ok: false,
    stage: "finalize",
    error:
      claim.kind === "not_found"
        ? "Document not found."
        : `Document not ready for finalize (${claim.kind === "not_ready" ? claim.status : "unknown"}).`,
  };
}
