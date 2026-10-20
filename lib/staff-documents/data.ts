import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { sha256Hex } from "@/lib/proposal-lifecycle/hash";
import type { StaffActor } from "@/lib/staff/types";
import { buildStaffAcknowledgment } from "./acknowledgment.ts";
import {
  SAMPLE_NONBINDING_AGREEMENT_BODY,
  SAMPLE_NONBINDING_AGREEMENT_TITLE,
  SAMPLE_NONBINDING_POLICY_BODY,
  SAMPLE_NONBINDING_POLICY_TITLE,
} from "./constants.ts";
import {
  renderStaffAcknowledgmentRecordPdf,
  renderStaffPolicyPdf,
} from "./export-pdf.tsx";
import { hashStaffDocumentBody, hashStaffDocumentPdfBytes } from "./hash.ts";
import { verifyStaffDocumentIntegrity } from "./integrity.ts";
import { claimStaffDocumentAcknowledgment } from "./acknowledge-claim.ts";
import { getDefaultStaffDocumentStorageAdapter } from "./storage/resolve.ts";
import {
  assertTemplateApprovedForAssignment,
  assertStaffDocumentAcknowledgeable,
  parseStaffDocumentKind,
  parseTemplateStatus,
  resolveSigningModeForTemplate,
} from "./validate.ts";
import {
  staffDocumentStaffPath,
  staffDocumentsListPath,
  assertStaffDocumentRowAccess,
  staffMayCountersignDocuments,
  staffMayManageDocuments,
} from "./access.ts";
import { staffDocumentAttentionLabel } from "./display.ts";
import type {
  StaffAcknowledgmentEvidence,
  StaffDocumentAttentionItem,
  StaffDocumentAuditEvent,
  StaffDocumentDetail,
  StaffDocumentFileKind,
  StaffDocumentListItem,
  StaffDocumentKind,
  StaffDocumentSigningMode,
  StaffDocumentStatus,
  StaffDocumentTemplateStatus,
  StaffSignatureEvidence,
} from "./types.ts";
import { STAFF_DOCUMENT_DEFAULT_LEGAL_ENTITY } from "./types.ts";

const TEMPLATES = "staff-document-templates";
const DOCUMENTS = "staff-documents";
const FILES = "staff-document-files";

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

function newAuditId(): string {
  return `audit-${sha256Hex(`${Date.now()}-${Math.random()}`).slice(0, 12)}`;
}

function appendAudit(
  events: StaffDocumentAuditEvent[] | null | undefined,
  event: Omit<StaffDocumentAuditEvent, "id" | "at"> & { at?: string },
): StaffDocumentAuditEvent[] {
  const entry: StaffDocumentAuditEvent = {
    id: newAuditId(),
    at: event.at ?? new Date().toISOString(),
    actor: event.actor ?? null,
    action: event.action,
    reason: event.reason ?? null,
  };
  return [...(events ?? []), entry];
}

async function findFileByKind(input: {
  staffDocumentId: number;
  kind: StaffDocumentFileKind;
}): Promise<number | null> {
  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: FILES as never,
    where: {
      and: [
        { staffDocument: { equals: input.staffDocumentId } },
        { kind: { equals: input.kind } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  });
  const doc = found.docs[0] as { id?: number } | undefined;
  return doc?.id != null ? Number(doc.id) : null;
}

async function findFileByHash(input: {
  staffDocumentId: number;
  kind: StaffDocumentFileKind;
  contentHash: string;
}): Promise<number | null> {
  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: FILES as never,
    where: {
      and: [
        { staffDocument: { equals: input.staffDocumentId } },
        { kind: { equals: input.kind } },
        { contentHash: { equals: input.contentHash } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  });
  const doc = found.docs[0] as { id?: number } | undefined;
  return doc?.id != null ? Number(doc.id) : null;
}

async function fileStaffDocumentPdf(input: {
  staffDocumentId: number;
  staffUserId: number;
  kind: StaffDocumentFileKind;
  title: string;
  buffer: Buffer;
}): Promise<number> {
  if (input.kind === "acknowledgment-record" || input.kind === "executed-agreement") {
    const existingByKind = await findFileByKind({
      staffDocumentId: input.staffDocumentId,
      kind: input.kind,
    });
    if (existingByKind) return existingByKind;
  }

  const contentHash = hashStaffDocumentPdfBytes(input.buffer);
  const existing = await findFileByHash({
    staffDocumentId: input.staffDocumentId,
    kind: input.kind,
    contentHash,
  });
  if (existing) return existing;

  const adapter = getDefaultStaffDocumentStorageAdapter();
  const storageKey = `${input.staffDocumentId}/${input.kind}-${contentHash.slice(0, 16)}.pdf`;
  const uploaded = await adapter.upload({
    key: storageKey,
    buffer: input.buffer,
    mimeType: "application/pdf",
  });

  const payload = await getPayload({ config });
  const created = (await payload.create({
    collection: FILES as never,
    data: {
      title: input.title,
      kind: input.kind,
      staffDocument: input.staffDocumentId,
      staffUser: input.staffUserId,
      contentHash,
      storageKey: uploaded.key,
      storageProvider: uploaded.provider,
      mimeType: "application/pdf",
      byteLength: input.buffer.byteLength,
    } as never,
    overrideAccess: true,
  })) as { id: number };
  return Number(created.id);
}

function parseSigningMode(doc: AnyDoc): StaffDocumentSigningMode {
  const raw = String(doc.signingMode ?? "acknowledgment");
  return raw === "dual-signature" ? "dual-signature" : "acknowledgment";
}

function mapListItem(doc: AnyDoc): StaffDocumentListItem {
  const id = Number(doc.id);
  return {
    id,
    title: String(doc.title ?? "Policy"),
    kind: String(doc.kind) as StaffDocumentKind,
    signingMode: parseSigningMode(doc),
    status: String(doc.status) as StaffDocumentStatus,
    templateVersion: Number(doc.templateVersion ?? 1),
    templateContentHash: String(doc.templateContentHash ?? ""),
    assignedAt: String(doc.createdAt ?? new Date().toISOString()),
    acknowledgedAt: doc.acknowledgedAt ? String(doc.acknowledgedAt) : null,
    executedAt: doc.executedAt ? String(doc.executedAt) : null,
    href: staffDocumentStaffPath(id),
  };
}

export async function listStaffDocumentsForUser(
  staffUserId: number,
): Promise<StaffDocumentListItem[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: DOCUMENTS as never,
    where: {
      and: [
        { staffUser: { equals: staffUserId } },
        { status: { not_equals: "revoked" } },
      ],
    },
    sort: "-createdAt",
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });
  return (result.docs as AnyDoc[]).map(mapListItem);
}

export async function listPendingStaffDocumentAttention(
  staffUserId: number,
): Promise<StaffDocumentAttentionItem[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: DOCUMENTS as never,
    where: {
      and: [
        { staffUser: { equals: staffUserId } },
        { status: { equals: "assigned" } },
      ],
    },
    sort: "-createdAt",
    limit: 10,
    depth: 0,
    overrideAccess: true,
  });
  return (result.docs as AnyDoc[]).map((doc) => {
    const signingMode = parseSigningMode(doc);
    const kind = String(doc.kind) as StaffDocumentKind;
    return {
      id: Number(doc.id),
      title: String(doc.title ?? "Policy"),
      href: staffDocumentStaffPath(Number(doc.id)),
      assignedAt: String(doc.createdAt ?? new Date().toISOString()),
      kind,
      signingMode,
      actionLabel: staffDocumentAttentionLabel({ signingMode }),
    };
  });
}

export async function getStaffDocumentDetail(input: {
  actor: StaffActor;
  documentId: number;
  operatorView?: boolean;
}): Promise<StaffDocumentDetail | null> {
  const payload = await getPayload({ config });
  let doc: AnyDoc;
  try {
    doc = (await payload.findByID({
      collection: DOCUMENTS as never,
      id: input.documentId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    return null;
  }

  const staffUserId = relId(doc.staffUser);
  if (staffUserId == null) return null;
  const operatorView = Boolean(input.operatorView);
  if (operatorView) {
    if (!staffMayManageDocuments(input.actor)) {
      throw new Error("Staff permission denied: operator document view.");
    }
  } else {
    assertStaffDocumentRowAccess(input.actor, staffUserId);
  }

  const files = await payload.find({
    collection: FILES as never,
    where: { staffDocument: { equals: input.documentId } },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  });

  let policyFileId: number | null = null;
  let acknowledgmentFileId: number | null = null;
  let executedAgreementFileId: number | null = null;
  for (const f of files.docs as AnyDoc[]) {
    if (f.kind === "policy-pdf") policyFileId = Number(f.id);
    if (f.kind === "acknowledgment-record") acknowledgmentFileId = Number(f.id);
    if (f.kind === "executed-agreement") executedAgreementFileId = Number(f.id);
  }

  const status = String(doc.status) as StaffDocumentStatus;
  const signingMode = parseSigningMode(doc);

  return {
    id: Number(doc.id),
    title: String(doc.title ?? ""),
    kind: String(doc.kind) as StaffDocumentKind,
    signingMode,
    status,
    bodySnapshot: String(doc.bodySnapshot ?? ""),
    templateVersion: Number(doc.templateVersion ?? 1),
    templateContentHash: String(doc.templateContentHash ?? ""),
    legalEntityName: String(doc.legalEntityName ?? STAFF_DOCUMENT_DEFAULT_LEGAL_ENTITY),
    assignedAt: String(doc.createdAt ?? new Date().toISOString()),
    acknowledgedAt: doc.acknowledgedAt ? String(doc.acknowledgedAt) : null,
    executedAt: doc.executedAt ? String(doc.executedAt) : null,
    expiresAt: doc.expiresAt ? String(doc.expiresAt) : null,
    acknowledgment: (doc.acknowledgment as StaffAcknowledgmentEvidence | null) ?? null,
    employeeSignature: (doc.employeeSignature as StaffSignatureEvidence | null) ?? null,
    operatorSignature: (doc.operatorSignature as StaffSignatureEvidence | null) ?? null,
    policyFileId,
    acknowledgmentFileId,
    executedAgreementFileId,
    staffUserId,
    canAcknowledge:
      !operatorView &&
      signingMode === "acknowledgment" &&
      status === "assigned" &&
      staffUserId === input.actor.userId,
    canSign:
      !operatorView &&
      signingMode === "dual-signature" &&
      status === "assigned" &&
      staffUserId === input.actor.userId,
    canDecline:
      !operatorView &&
      signingMode === "dual-signature" &&
      status === "assigned" &&
      staffUserId === input.actor.userId,
    canCountersign:
      operatorView &&
      staffMayCountersignDocuments(input.actor) &&
      status === "awaiting-operator-signature",
    canRevoke:
      operatorView &&
      staffMayManageDocuments(input.actor) &&
      (status === "assigned" ||
        status === "awaiting-operator-signature" ||
        status === "executing"),
    canRetryExecution:
      operatorView &&
      staffMayManageDocuments(input.actor) &&
      status === "executing",
  };
}

export async function readStaffDocumentFileBytes(input: {
  actor: StaffActor;
  fileId: number;
  staffDocumentId?: number;
}): Promise<{ buffer: Buffer; mimeType: string; title: string }> {
  const payload = await getPayload({ config });
  const file = (await payload.findByID({
    collection: FILES as never,
    id: input.fileId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  const staffUserId = relId(file.staffUser);
  if (staffUserId == null) throw new Error("Not found.");
  if (
    input.staffDocumentId != null &&
    relId(file.staffDocument) !== input.staffDocumentId
  ) {
    throw new Error("Not found.");
  }
  assertStaffDocumentRowAccess(input.actor, staffUserId);

  const adapter = getDefaultStaffDocumentStorageAdapter();
  const opened = await adapter.open(String(file.storageKey));
  const integrity = verifyStaffDocumentIntegrity({
    buffer: opened.body,
    contentHash: file.contentHash ? String(file.contentHash) : null,
    mimeType: file.mimeType ? String(file.mimeType) : opened.mimeType,
  });
  if (!integrity.ok) {
    throw new Error("Document integrity check failed.");
  }

  return {
    buffer: opened.body,
    mimeType: String(file.mimeType ?? opened.mimeType),
    title: String(file.title ?? "document"),
  };
}

export async function acknowledgeStaffDocument(input: {
  actor: StaffActor;
  documentId: number;
  legalName: string;
  typedAcknowledgment: string;
  electronicRecordsConsent: boolean;
  reviewedConfirmed: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ detail: StaffDocumentDetail; alreadyAcknowledged: boolean }> {
  const payload = await getPayload({ config });
  const doc = (await payload.findByID({
    collection: DOCUMENTS as never,
    id: input.documentId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  const staffUserId = relId(doc.staffUser);
  if (staffUserId == null) throw new Error("Not found.");
  assertStaffDocumentRowAccess(input.actor, staffUserId);
  if (staffUserId !== input.actor.userId) {
    throw new Error("Only the assigned employee may acknowledge this document.");
  }
  const status = String(doc.status);
  const contentHash = String(doc.templateContentHash ?? "");
  const existingAck = doc.acknowledgment as StaffAcknowledgmentEvidence | null | undefined;
  if (status === "acknowledged" && existingAck) {
    const detail = await getStaffDocumentDetail({
      actor: input.actor,
      documentId: input.documentId,
    });
    if (!detail) throw new Error("Not found.");
    return { detail, alreadyAcknowledged: true };
  }
  assertStaffDocumentAcknowledgeable(status);

  const acknowledgment = buildStaffAcknowledgment({
    legalName: input.legalName,
    email: input.actor.email,
    typedAcknowledgment: input.typedAcknowledgment,
    electronicRecordsConsent: input.electronicRecordsConsent,
    reviewedConfirmed: input.reviewedConfirmed,
    documentContentHash: contentHash,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  const auditEventsForClaim = appendAudit(
    doc.auditEvents as StaffDocumentAuditEvent[] | undefined,
    {
      actor: input.actor.email,
      action: "staff.acknowledged",
      reason: "electronic-policy-acknowledgment",
    },
  );

  const claim = await claimStaffDocumentAcknowledgment({
    payload,
    documentId: input.documentId,
    staffUserId,
    acknowledgment,
    auditEvents: auditEventsForClaim,
  });

  if (claim.kind === "already_acknowledged") {
    const detail = await getStaffDocumentDetail({
      actor: input.actor,
      documentId: input.documentId,
    });
    if (!detail) throw new Error("Not found.");
    return { detail, alreadyAcknowledged: true };
  }
  if (claim.kind === "not_found") {
    throw new Error("Not found.");
  }
  if (claim.kind === "not_claimable") {
    throw new Error("This document is not available for acknowledgment.");
  }

  const ackPdf = await renderStaffAcknowledgmentRecordPdf({
    title: String(doc.title ?? ""),
    legalEntityName: String(doc.legalEntityName ?? STAFF_DOCUMENT_DEFAULT_LEGAL_ENTITY),
    templateVersion: Number(doc.templateVersion ?? 1),
    contentHash,
    acknowledgment,
  });

  await fileStaffDocumentPdf({
    staffDocumentId: input.documentId,
    staffUserId,
    kind: "acknowledgment-record",
    title: `${String(doc.title ?? "Policy")} — acknowledgment`,
    buffer: ackPdf,
  });

  const detail = await getStaffDocumentDetail({
    actor: input.actor,
    documentId: input.documentId,
  });
  if (!detail) throw new Error("Not found.");
  return { detail, alreadyAcknowledged: false };
}

export async function createStaffDocumentTemplate(input: {
  actor: StaffActor;
  title: string;
  body: string;
  kind?: string;
  signingMode?: string;
  legalEntityName?: string;
  useSample?: boolean;
}): Promise<{ id: number }> {
  if (!staffMayManageDocuments(input.actor)) {
    throw new Error("Operator permission required to manage staff document templates.");
  }
  const kind = parseStaffDocumentKind(input.kind ?? "policy-acknowledgment");
  const signingMode = resolveSigningModeForTemplate({
    kind,
    signingMode: input.signingMode ?? null,
  });
  const useSamplePolicy =
    Boolean(input.useSample) &&
    (kind === "policy-acknowledgment" || kind === "staff-policy");
  const useSampleAgreement = Boolean(input.useSample) && !useSamplePolicy;
  const title = useSamplePolicy
    ? SAMPLE_NONBINDING_POLICY_TITLE
    : useSampleAgreement
      ? SAMPLE_NONBINDING_AGREEMENT_TITLE
      : String(input.title ?? "").trim();
  const body = useSamplePolicy
    ? SAMPLE_NONBINDING_POLICY_BODY
    : useSampleAgreement
      ? SAMPLE_NONBINDING_AGREEMENT_BODY
      : String(input.body ?? "").trim();
  if (!title || !body) throw new Error("Title and body are required.");

  const payload = await getPayload({ config });
  const created = (await payload.create({
    collection: TEMPLATES as never,
    data: {
      title,
      slug: `policy-${Date.now()}`,
      version: 1,
      kind,
      signingMode,
      status: "draft",
      body,
      legalEntityName: input.legalEntityName?.trim() || STAFF_DOCUMENT_DEFAULT_LEGAL_ENTITY,
      contentHash: hashStaffDocumentBody(body),
    } as never,
    overrideAccess: true,
  })) as { id: number };
  return { id: Number(created.id) };
}

export async function updateStaffDocumentTemplateStatus(input: {
  actor: StaffActor;
  templateId: number;
  status: StaffDocumentTemplateStatus;
}): Promise<void> {
  if (!staffMayManageDocuments(input.actor)) {
    throw new Error("Operator permission required.");
  }
  const payload = await getPayload({ config });
  const doc = (await payload.findByID({
    collection: TEMPLATES as never,
    id: input.templateId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  const nextStatus = input.status;
  const data: AnyDoc = { status: nextStatus };
  if (nextStatus === "approved-for-use") {
    data.approvedAt = new Date().toISOString();
    data.approvedBy = input.actor.email;
    data.contentHash = hashStaffDocumentBody(String(doc.body ?? ""));
  }

  await payload.update({
    collection: TEMPLATES as never,
    id: input.templateId,
    data: data as never,
    overrideAccess: true,
  });
}

export async function assignStaffDocumentFromTemplate(input: {
  actor: StaffActor;
  templateId: number;
  staffUserId: number;
  expiresAt?: string | null;
}): Promise<{ documentId: number }> {
  if (!staffMayManageDocuments(input.actor)) {
    throw new Error("Operator permission required to assign staff documents.");
  }
  if (!Number.isInteger(input.staffUserId) || input.staffUserId <= 0) {
    throw new Error("Valid staff user is required.");
  }

  const payload = await getPayload({ config });
  const template = (await payload.findByID({
    collection: TEMPLATES as never,
    id: input.templateId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;

  const status = parseTemplateStatus(template.status);
  assertTemplateApprovedForAssignment(status);
  const kind = parseStaffDocumentKind(String(template.kind ?? "policy-acknowledgment"));
  const signingMode = resolveSigningModeForTemplate({
    kind,
    signingMode: template.signingMode ?? null,
  });
  const body = String(template.body ?? "").trim();
  const contentHash = hashStaffDocumentBody(body);
  const legalEntityName = String(template.legalEntityName ?? STAFF_DOCUMENT_DEFAULT_LEGAL_ENTITY);

  const created = (await payload.create({
    collection: DOCUMENTS as never,
    data: {
      staffUser: input.staffUserId,
      template: input.templateId,
      templateVersion: Number(template.version ?? 1),
      templateContentHash: contentHash,
      title: String(template.title ?? "Policy"),
      kind,
      signingMode,
      status: "assigned",
      bodySnapshot: body,
      legalEntityName,
      expiresAt: input.expiresAt ?? null,
      auditEvents: appendAudit(undefined, {
        actor: input.actor.email,
        action: "operator.assigned",
      }),
    } as never,
    overrideAccess: true,
  })) as { id: number };

  const documentId = Number(created.id);

  const policyPdf = await renderStaffPolicyPdf({
    title: String(template.title ?? "Policy"),
    body,
    legalEntityName,
    templateVersion: Number(template.version ?? 1),
    contentHash,
  });

  await fileStaffDocumentPdf({
    staffDocumentId: documentId,
    staffUserId: input.staffUserId,
    kind: "policy-pdf",
    title: String(template.title ?? "Policy"),
    buffer: policyPdf,
  });

  return { documentId };
}

export async function listStaffDocumentsForOperator(): Promise<
  Array<StaffDocumentListItem & { staffUserId: number; staffLabel: string }>
> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: DOCUMENTS as never,
    sort: "-createdAt",
    limit: 100,
    depth: 1,
    overrideAccess: true,
  });

  return (result.docs as AnyDoc[]).map((doc) => {
    const staffUser = doc.staffUser as AnyDoc | number;
    const staffUserId = relId(staffUser) ?? 0;
    const staffLabel =
      staffUser && typeof staffUser === "object"
        ? String(staffUser.displayName ?? staffUser.email ?? `User ${staffUserId}`)
        : `User ${staffUserId}`;
    return {
      ...mapListItem(doc),
      staffUserId,
      staffLabel,
    };
  });
}

export async function listStaffDocumentTemplatesForOperator(): Promise<
  Array<{
    id: number;
    title: string;
    version: number;
    kind: StaffDocumentKind;
    signingMode: StaffDocumentSigningMode;
    status: StaffDocumentTemplateStatus;
    contentHash: string;
  }>
> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: TEMPLATES as never,
    sort: "-updatedAt",
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });
  return (result.docs as AnyDoc[]).map((doc) => ({
    id: Number(doc.id),
    title: String(doc.title ?? ""),
    version: Number(doc.version ?? 1),
    kind: String(doc.kind) as StaffDocumentKind,
    signingMode: parseSigningMode(doc),
    status: parseTemplateStatus(doc.status),
    contentHash: String(doc.contentHash ?? ""),
  }));
}

export { fileStaffDocumentPdf };

export { staffDocumentsListPath };

export {
  signStaffDocumentAsEmployee,
  declineStaffDocumentAsEmployee,
  countersignStaffDocumentAsOperator,
  retryStaffDocumentExecution,
  revokeStaffDocumentAsOperator,
  listStaffDocumentsAwaitingCountersignature,
} from "./signing-actions.ts";
