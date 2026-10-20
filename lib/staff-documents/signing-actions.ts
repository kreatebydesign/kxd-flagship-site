import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { StaffActor } from "@/lib/staff/types";
import { claimStaffDocumentEmployeeSignature } from "./employee-sign-claim.ts";
import { claimStaffDocumentOperatorCountersignature } from "./operator-countersign-claim.ts";
import { claimStaffDocumentDecline, claimStaffDocumentRevoke } from "./decline-revoke-claim.ts";
import { finalizeStaffDocumentExecution } from "./execution-finalize.ts";
import { renderStaffExecutedAgreementPdf } from "./export-pdf.tsx";
import { buildStaffSignatureEvidence } from "./signature.ts";
import {
  assertStaffDocumentDeclinable,
  assertStaffDocumentEmployeeSignable,
  assertStaffDocumentRevocable,
} from "./validate.ts";
import {
  staffMayCountersignDocuments,
  staffMayManageDocuments,
} from "./access.ts";
import { sha256Hex } from "@/lib/proposal-lifecycle/hash";
import type { StaffDocumentAuditEvent, StaffSignatureEvidence } from "./types.ts";
import { STAFF_DOCUMENT_DEFAULT_LEGAL_ENTITY, STAFF_DOCUMENT_EMPLOYER_REPRESENTATIVE } from "./types.ts";

const DOCUMENTS = "staff-documents";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

function appendAudit(
  events: StaffDocumentAuditEvent[] | null | undefined,
  event: Omit<StaffDocumentAuditEvent, "id" | "at"> & { at?: string },
): StaffDocumentAuditEvent[] {
  const entry: StaffDocumentAuditEvent = {
    id: `audit-${sha256Hex(`${Date.now()}-${Math.random()}`).slice(0, 12)}`,
    at: event.at ?? new Date().toISOString(),
    actor: event.actor ?? null,
    action: event.action,
    reason: event.reason ?? null,
  };
  return [...(events ?? []), entry];
}

async function loadDetail(input: {
  actor: StaffActor;
  documentId: number;
  operatorView?: boolean;
}) {
  const { getStaffDocumentDetail } = await import("./data.ts");
  return getStaffDocumentDetail(input);
}

async function loadDocumentRow(documentId: number): Promise<AnyDoc> {
  const payload = await getPayload({ config });
  return (await payload.findByID({
    collection: DOCUMENTS as never,
    id: documentId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;
}

async function runExecutionFinalize(input: {
  documentId: number;
  doc: AnyDoc;
  auditEvents: StaffDocumentAuditEvent[];
  executedAt?: string;
}): Promise<void> {
  const payload = await getPayload({ config });
  const employeeSignature = input.doc.employeeSignature as StaffSignatureEvidence;
  const operatorSignature = input.doc.operatorSignature as StaffSignatureEvidence;
  if (!employeeSignature || !operatorSignature) {
    throw new Error("Signatures missing for execution finalize.");
  }

  const executedAt = input.executedAt ?? new Date().toISOString();
  const staffUserId = relId(input.doc.staffUser);
  if (staffUserId == null) throw new Error("Not found.");

  const result = await finalizeStaffDocumentExecution({
    payload,
    documentId: input.documentId,
    auditEvents: input.auditEvents,
    executedAt,
    generateExecutedPdf: async () =>
      renderStaffExecutedAgreementPdf({
        title: String(input.doc.title ?? ""),
        body: String(input.doc.bodySnapshot ?? ""),
        legalEntityName: String(input.doc.legalEntityName ?? STAFF_DOCUMENT_DEFAULT_LEGAL_ENTITY),
        templateVersion: Number(input.doc.templateVersion ?? 1),
        contentHash: String(input.doc.templateContentHash ?? ""),
        kind: String(input.doc.kind ?? "agreement"),
        employeeSignature,
        operatorSignature,
        executedAt,
        auditEvents: input.auditEvents,
      }),
    storeExecutedPdf: async (buffer) => {
      const { fileStaffDocumentPdf } = await import("./data.ts");
      return fileStaffDocumentPdf({
        staffDocumentId: input.documentId,
        staffUserId,
        kind: "executed-agreement",
        title: `${String(input.doc.title ?? "Agreement")} — executed`,
        buffer,
      });
    },
  });

  if (!result.ok) {
    throw new Error(
      result.stage === "pdf"
        ? `Execution PDF failed: ${result.error}`
        : `Execution finalize failed: ${result.error}`,
    );
  }
}

export async function signStaffDocumentAsEmployee(input: {
  actor: StaffActor;
  documentId: number;
  legalName: string;
  title: string;
  entityName: string;
  typedAcknowledgment: string;
  authorityConfirmed: boolean;
  electronicRecordsConsent: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ detail: import("./types.ts").StaffDocumentDetail; alreadySigned: boolean }> {
  const doc = await loadDocumentRow(input.documentId);
  const staffUserId = relId(doc.staffUser);
  if (staffUserId == null) throw new Error("Not found.");
  if (staffUserId !== input.actor.userId) {
    throw new Error("Only the assigned employee may sign this document.");
  }

  const signingMode =
    String(doc.signingMode ?? "") === "dual-signature" ? "dual-signature" : "acknowledgment";
  const status = String(doc.status ?? "");
  const expiresAt = doc.expiresAt ? String(doc.expiresAt) : null;

  if (status === "awaiting-operator-signature" && doc.employeeSignature) {
    const detail = await loadDetail({
      actor: input.actor,
      documentId: input.documentId,
    });
    if (!detail) throw new Error("Not found.");
    return { detail, alreadySigned: true };
  }

  assertStaffDocumentEmployeeSignable({ status, signingMode, expiresAt });

  const contentHash = String(doc.templateContentHash ?? "");
  const employeeSignature = buildStaffSignatureEvidence({
    legalName: input.legalName,
    title: input.title,
    entityName: input.entityName,
    email: input.actor.email,
    typedAcknowledgment: input.typedAcknowledgment,
    authorityConfirmed: input.authorityConfirmed,
    electronicRecordsConsent: input.electronicRecordsConsent,
    actorRole: "staff-employee",
    documentContentHash: contentHash,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  const auditEvents = appendAudit(doc.auditEvents as StaffDocumentAuditEvent[] | undefined, {
    actor: input.actor.email,
    action: "staff.signed",
    reason: "employee-electronic-signature",
  });

  const payload = await getPayload({ config });
  const claim = await claimStaffDocumentEmployeeSignature({
    payload,
    documentId: input.documentId,
    staffUserId,
    employeeSignature,
    auditEvents,
    expiresAt,
  });

  if (claim.kind === "already_signed") {
    const detail = await loadDetail({
      actor: input.actor,
      documentId: input.documentId,
    });
    if (!detail) throw new Error("Not found.");
    return { detail, alreadySigned: true };
  }
  if (claim.kind === "expired") {
    throw new Error("This document assignment has expired.");
  }
  if (claim.kind === "not_found") throw new Error("Not found.");
  if (claim.kind === "not_claimable") {
    throw new Error("This document is not available for signature.");
  }

  const detail = await loadDetail({
    actor: input.actor,
    documentId: input.documentId,
  });
  if (!detail) throw new Error("Not found.");
  return { detail, alreadySigned: false };
}

export async function declineStaffDocumentAsEmployee(input: {
  actor: StaffActor;
  documentId: number;
  declineReason?: string | null;
}): Promise<{ detail: import("./types.ts").StaffDocumentDetail }> {
  const doc = await loadDocumentRow(input.documentId);
  const staffUserId = relId(doc.staffUser);
  if (staffUserId == null) throw new Error("Not found.");
  if (staffUserId !== input.actor.userId) {
    throw new Error("Only the assigned employee may decline this document.");
  }

  assertStaffDocumentDeclinable({
    status: String(doc.status ?? ""),
    signingMode: String(doc.signingMode ?? "") === "dual-signature" ? "dual-signature" : "acknowledgment",
  });

  const auditEvents = appendAudit(doc.auditEvents as StaffDocumentAuditEvent[] | undefined, {
    actor: input.actor.email,
    action: "staff.declined",
    reason: input.declineReason?.trim() || null,
  });

  const payload = await getPayload({ config });
  const claim = await claimStaffDocumentDecline({
    payload,
    documentId: input.documentId,
    staffUserId,
    declinedAt: new Date().toISOString(),
    declineReason: input.declineReason,
    auditEvents,
  });

  if (claim.kind === "already_declined") {
    const detail = await loadDetail({
      actor: input.actor,
      documentId: input.documentId,
    });
    if (!detail) throw new Error("Not found.");
    return { detail };
  }
  if (claim.kind === "not_found") throw new Error("Not found.");
  if (claim.kind === "not_claimable") {
    throw new Error("This document cannot be declined in its current state.");
  }

  const detail = await loadDetail({
    actor: input.actor,
    documentId: input.documentId,
  });
  if (!detail) throw new Error("Not found.");
  return { detail };
}

export async function countersignStaffDocumentAsOperator(input: {
  actor: StaffActor;
  documentId: number;
  legalName: string;
  title: string;
  entityName: string;
  typedAcknowledgment: string;
  authorityConfirmed: boolean;
  electronicRecordsConsent: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ detail: import("./types.ts").StaffDocumentDetail }> {
  if (!staffMayCountersignDocuments(input.actor)) {
    throw new Error("Operator countersignature permission denied.");
  }

  let doc = await loadDocumentRow(input.documentId);
  const status = String(doc.status ?? "");

  if (status === "executed") {
    const detail = await loadDetail({
      actor: input.actor,
      documentId: input.documentId,
      operatorView: true,
    });
    if (!detail) throw new Error("Not found.");
    return { detail };
  }

  if (status === "executing") {
    await retryStaffDocumentExecution({ actor: input.actor, documentId: input.documentId });
    const detail = await loadDetail({
      actor: input.actor,
      documentId: input.documentId,
      operatorView: true,
    });
    if (!detail) throw new Error("Not found.");
    return { detail };
  }

  if (status !== "awaiting-operator-signature") {
    throw new Error("This document is not awaiting countersignature.");
  }

  const employeeSignature = doc.employeeSignature as StaffSignatureEvidence | null;
  if (!employeeSignature?.signatureHash) {
    throw new Error("Employee signature is required before countersignature.");
  }

  const contentHash = String(doc.templateContentHash ?? "");
  const operatorSignature = buildStaffSignatureEvidence({
    legalName: input.legalName,
    title: input.title || "Authorized representative",
    entityName: input.entityName || STAFF_DOCUMENT_DEFAULT_LEGAL_ENTITY,
    email: input.actor.email,
    typedAcknowledgment: input.typedAcknowledgment,
    authorityConfirmed: input.authorityConfirmed,
    electronicRecordsConsent: input.electronicRecordsConsent,
    actorRole: "kxd-employer-representative",
    documentContentHash: contentHash,
    priorSignatureHash: employeeSignature.signatureHash,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  const auditEvents = appendAudit(doc.auditEvents as StaffDocumentAuditEvent[] | undefined, {
    actor: input.actor.email,
    action: "operator.signed",
    reason: STAFF_DOCUMENT_EMPLOYER_REPRESENTATIVE,
  });

  const payload = await getPayload({ config });
  const claim = await claimStaffDocumentOperatorCountersignature({
    payload,
    documentId: input.documentId,
    operatorSignature,
    auditEvents,
  });

  if (claim.kind === "already_executing") {
    doc = await loadDocumentRow(input.documentId);
  } else if (claim.kind === "not_found") {
    throw new Error("Not found.");
  } else if (claim.kind === "not_claimable") {
    throw new Error("This document cannot be countersigned in its current state.");
  } else if (claim.kind !== "claimed") {
    throw new Error("Countersignature failed.");
  }

  doc = await loadDocumentRow(input.documentId);
  const finalizeAudit = appendAudit(doc.auditEvents as StaffDocumentAuditEvent[] | undefined, {
    actor: input.actor.email,
    action: "execution.finalize",
    reason: "executed-agreement-pdf",
  });

  await runExecutionFinalize({
    documentId: input.documentId,
    doc,
    auditEvents: finalizeAudit,
  });

  const detail = await loadDetail({
    actor: input.actor,
    documentId: input.documentId,
    operatorView: true,
  });
  if (!detail) throw new Error("Not found.");
  return { detail };
}

export async function retryStaffDocumentExecution(input: {
  actor: StaffActor;
  documentId: number;
}): Promise<{ detail: import("./types.ts").StaffDocumentDetail }> {
  if (!staffMayManageDocuments(input.actor)) {
    throw new Error("Operator permission required.");
  }

  const doc = await loadDocumentRow(input.documentId);
  const status = String(doc.status ?? "");
  if (status !== "executing") {
    throw new Error("Only documents in executing status may be retried.");
  }

  const auditEvents = appendAudit(doc.auditEvents as StaffDocumentAuditEvent[] | undefined, {
    actor: input.actor.email,
    action: "execution.retry",
    reason: "authorized-recovery",
  });

  await runExecutionFinalize({
    documentId: input.documentId,
    doc,
    auditEvents,
  });

  const detail = await loadDetail({
    actor: input.actor,
    documentId: input.documentId,
    operatorView: true,
  });
  if (!detail) throw new Error("Not found.");
  return { detail };
}

export async function revokeStaffDocumentAsOperator(input: {
  actor: StaffActor;
  documentId: number;
  reason?: string | null;
}): Promise<{ detail: import("./types.ts").StaffDocumentDetail }> {
  if (!staffMayManageDocuments(input.actor)) {
    throw new Error("Operator permission required.");
  }

  const doc = await loadDocumentRow(input.documentId);
  assertStaffDocumentRevocable({
    status: String(doc.status ?? ""),
    signingMode:
      String(doc.signingMode ?? "") === "dual-signature" ? "dual-signature" : "acknowledgment",
  });

  const auditEvents = appendAudit(doc.auditEvents as StaffDocumentAuditEvent[] | undefined, {
    actor: input.actor.email,
    action: "operator.revoked",
    reason: input.reason?.trim() || "authorized-revocation",
  });

  const payload = await getPayload({ config });
  const claim = await claimStaffDocumentRevoke({
    payload,
    documentId: input.documentId,
    auditEvents,
  });

  if (claim.kind === "already_revoked") {
    const detail = await loadDetail({
      actor: input.actor,
      documentId: input.documentId,
      operatorView: true,
    });
    if (!detail) throw new Error("Not found.");
    return { detail };
  }
  if (claim.kind === "not_found") throw new Error("Not found.");
  if (claim.kind === "not_claimable") {
    throw new Error("This document cannot be revoked in its current state.");
  }

  const detail = await loadDetail({
    actor: input.actor,
    documentId: input.documentId,
    operatorView: true,
  });
  if (!detail) throw new Error("Not found.");
  return { detail };
}

export async function listStaffDocumentsAwaitingCountersignature(): Promise<
  Array<import("./types.ts").StaffDocumentListItem & { staffUserId: number; staffLabel: string }>
> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: DOCUMENTS as never,
    where: {
      and: [
        { signingMode: { equals: "dual-signature" } },
        { status: { equals: "awaiting-operator-signature" } },
      ],
    },
    sort: "-updatedAt",
    limit: 50,
    depth: 1,
    overrideAccess: true,
  });

  const { listStaffDocumentsForOperator } = await import("./data.ts");
  const all = await listStaffDocumentsForOperator();
  const ids = new Set((result.docs as AnyDoc[]).map((d) => Number(d.id)));
  return all.filter((row) => ids.has(row.id));
}
