import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { sha256Hex } from "@/lib/proposal-lifecycle/hash";
import type { StaffActor } from "@/lib/staff/types";
import { staffMayManageDocuments } from "./access.ts";
import { hashStaffDocumentBody } from "./hash.ts";
import {
  assertStaffTemplateMayApproveForUse,
  assertStaffTemplateMayEnterLegalReview,
  resolveStaffTemplateQaProvenance,
} from "./template-provenance.ts";
import {
  assertStaffTemplateStatusTransition,
  staffTemplateStatusIsEditable,
} from "./template-lifecycle.ts";
import type {
  StaffDocumentKind,
  StaffDocumentSigningMode,
  StaffDocumentTemplateOperatorDetail,
  StaffDocumentTemplateOperatorListItem,
  StaffDocumentTemplateStatus,
} from "./types.ts";
import { STAFF_DOCUMENT_DEFAULT_LEGAL_ENTITY } from "./types.ts";
import {
  parseStaffDocumentKind,
  parseTemplateStatus,
  resolveSigningModeForTemplate,
} from "./validate.ts";

const TEMPLATES = "staff-document-templates";

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

function parseSigningMode(doc: AnyDoc): StaffDocumentSigningMode {
  const mode = String(doc.signingMode ?? doc.signing_mode ?? "acknowledgment");
  return mode === "dual-signature" ? "dual-signature" : "acknowledgment";
}

function newFamilyKey(): string {
  return `fk-${sha256Hex(`${Date.now()}-${Math.random()}`).slice(0, 16)}`;
}

function templateFamilyKey(doc: AnyDoc): string {
  const raw = doc.familyKey ?? doc.family_key;
  if (raw && String(raw).trim()) return String(raw).trim();
  return `legacy-${Number(doc.id)}`;
}

function mapTemplateListItem(doc: AnyDoc): StaffDocumentTemplateOperatorListItem {
  const status = parseTemplateStatus(doc.status);
  const qaProvenance = resolveStaffTemplateQaProvenance({
    isSample: doc.isSample ?? doc.is_sample,
    title: doc.title,
    body: doc.body,
  });
  const assignable = status === "approved-for-use" && !qaProvenance;
  return {
    id: Number(doc.id),
    title: String(doc.title ?? ""),
    version: Number(doc.version ?? 1),
    kind: String(doc.kind) as StaffDocumentKind,
    signingMode: parseSigningMode(doc),
    status,
    contentHash: String(doc.contentHash ?? doc.content_hash ?? ""),
    isSample: Boolean(doc.isSample ?? doc.is_sample),
    familyKey: templateFamilyKey(doc),
    createdBy: doc.createdBy ?? doc.created_by ?? null,
    createdAt: String(doc.createdAt ?? doc.created_at ?? ""),
    updatedAt: String(doc.updatedAt ?? doc.updated_at ?? ""),
    approvedAt: doc.approvedAt ?? doc.approved_at ?? null,
    approvedBy: doc.approvedBy ?? doc.approved_by ?? null,
    assignable,
  };
}

function mapTemplateDetail(doc: AnyDoc): StaffDocumentTemplateOperatorDetail {
  const base = mapTemplateListItem(doc);
  const qaProvenance = resolveStaffTemplateQaProvenance({
    isSample: doc.isSample ?? doc.is_sample,
    title: doc.title,
    body: doc.body,
  });
  return {
    ...base,
    body: String(doc.body ?? ""),
    legalEntityName: String(
      doc.legalEntityName ?? doc.legal_entity_name ?? STAFF_DOCUMENT_DEFAULT_LEGAL_ENTITY,
    ),
    legalReviewSubmittedAt:
      doc.legalReviewSubmittedAt ?? doc.legal_review_submitted_at ?? null,
    legalReviewSubmittedBy:
      doc.legalReviewSubmittedBy ?? doc.legal_review_submitted_by ?? null,
    supersedesTemplateId: relId(doc.supersedesTemplate ?? doc.supersedes_template_id),
    editable: staffTemplateStatusIsEditable(base.status),
    qaProvenance,
  };
}

async function loadTemplateRow(templateId: number): Promise<AnyDoc> {
  const payload = await getPayload({ config });
  return (await payload.findByID({
    collection: TEMPLATES as never,
    id: templateId,
    depth: 0,
    overrideAccess: true,
  })) as AnyDoc;
}

async function retireOtherApprovedInFamily(input: {
  familyKey: string;
  exceptTemplateId: number;
}): Promise<void> {
  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: TEMPLATES as never,
    where: {
      and: [
        { familyKey: { equals: input.familyKey } },
        { status: { equals: "approved-for-use" } },
        { id: { not_equals: input.exceptTemplateId } },
      ],
    },
    limit: 20,
    overrideAccess: true,
  });
  for (const row of found.docs as AnyDoc[]) {
    await payload.update({
      collection: TEMPLATES as never,
      id: Number(row.id),
      data: { status: "retired" } as never,
      overrideAccess: true,
    });
  }
}

export async function getStaffDocumentTemplateForOperator(
  templateId: number,
): Promise<StaffDocumentTemplateOperatorDetail | null> {
  try {
    const doc = await loadTemplateRow(templateId);
    return mapTemplateDetail(doc);
  } catch {
    return null;
  }
}

export async function listStaffDocumentTemplatesForOperator(): Promise<
  StaffDocumentTemplateOperatorListItem[]
> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: TEMPLATES as never,
    sort: "-updatedAt",
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });
  return (result.docs as AnyDoc[]).map(mapTemplateListItem);
}

export function listAssignableStaffDocumentTemplates(
  templates: StaffDocumentTemplateOperatorListItem[],
): StaffDocumentTemplateOperatorListItem[] {
  return templates.filter((t) => t.assignable);
}

export async function updateStaffDocumentTemplateDraft(input: {
  actor: StaffActor;
  templateId: number;
  title?: string;
  body?: string;
  kind?: string;
  legalEntityName?: string;
}): Promise<void> {
  if (!staffMayManageDocuments(input.actor)) {
    throw new Error("Operator permission required.");
  }
  const doc = await loadTemplateRow(input.templateId);
  const status = parseTemplateStatus(doc.status);
  if (!staffTemplateStatusIsEditable(status)) {
    throw new Error("Only draft templates can be edited.");
  }

  const title = input.title !== undefined ? String(input.title).trim() : String(doc.title ?? "");
  const body = input.body !== undefined ? String(input.body).trim() : String(doc.body ?? "");
  if (!title || !body) throw new Error("Title and body are required.");

  const kind = input.kind !== undefined
    ? parseStaffDocumentKind(input.kind)
    : parseStaffDocumentKind(String(doc.kind ?? "policy-acknowledgment"));
  const signingMode = resolveSigningModeForTemplate({
    kind,
    signingMode: doc.signingMode ?? null,
  });

  const payload = await getPayload({ config });
  await payload.update({
    collection: TEMPLATES as never,
    id: input.templateId,
    data: {
      title,
      body,
      kind,
      signingMode,
      legalEntityName:
        input.legalEntityName?.trim() ||
        String(doc.legalEntityName ?? STAFF_DOCUMENT_DEFAULT_LEGAL_ENTITY),
      contentHash: hashStaffDocumentBody(body),
    } as never,
    overrideAccess: true,
  });
}

export async function createStaffDocumentTemplateNewVersion(input: {
  actor: StaffActor;
  templateId: number;
}): Promise<{ id: number }> {
  if (!staffMayManageDocuments(input.actor)) {
    throw new Error("Operator permission required.");
  }
  const parent = await loadTemplateRow(input.templateId);
  const parentStatus = parseTemplateStatus(parent.status);
  if (parentStatus !== "approved-for-use" && parentStatus !== "retired") {
    throw new Error("New versions can only be created from approved or retired templates.");
  }

  const familyKey = templateFamilyKey(parent);
  const version = Number(parent.version ?? 1) + 1;
  const body = String(parent.body ?? "");
  const payload = await getPayload({ config });
  const kind = parseStaffDocumentKind(String(parent.kind ?? "policy-acknowledgment"));
  const signingMode = resolveSigningModeForTemplate({
    kind,
    signingMode: parent.signingMode ?? null,
  });

  const created = (await payload.create({
    collection: TEMPLATES as never,
    data: {
      title: String(parent.title ?? ""),
      slug: `${familyKey}-v${version}`,
      version,
      kind,
      signingMode,
      status: "draft",
      body,
      legalEntityName: String(
        parent.legalEntityName ?? STAFF_DOCUMENT_DEFAULT_LEGAL_ENTITY,
      ),
      contentHash: hashStaffDocumentBody(body),
      familyKey,
      createdBy: input.actor.email,
      isSample: false,
      supersedesTemplate: input.templateId,
    } as never,
    overrideAccess: true,
  })) as { id: number };

  return { id: Number(created.id) };
}

export async function transitionStaffDocumentTemplateStatus(input: {
  actor: StaffActor;
  templateId: number;
  status: StaffDocumentTemplateStatus;
}): Promise<void> {
  if (!staffMayManageDocuments(input.actor)) {
    throw new Error("Operator permission required.");
  }
  const doc = await loadTemplateRow(input.templateId);
  const from = parseTemplateStatus(doc.status);
  const to = input.status;

  assertStaffTemplateStatusTransition({ from, to });

  const provenance = {
    isSample: doc.isSample ?? doc.is_sample,
    title: doc.title,
    body: doc.body,
  };

  if (to === "legal-review") {
    assertStaffTemplateMayEnterLegalReview(provenance);
  }

  if (to === "approved-for-use") {
    assertStaffTemplateMayApproveForUse(provenance);
  }

  const payload = await getPayload({ config });
  const data: AnyDoc = { status: to };

  if (to === "legal-review") {
    data.legalReviewSubmittedAt = new Date().toISOString();
    data.legalReviewSubmittedBy = input.actor.email;
  }

  if (to === "approved-for-use") {
    const body = String(doc.body ?? "");
    data.approvedAt = new Date().toISOString();
    data.approvedBy = input.actor.email;
    data.contentHash = hashStaffDocumentBody(body);
    await payload.update({
      collection: TEMPLATES as never,
      id: input.templateId,
      data: data as never,
      overrideAccess: true,
    });
    await retireOtherApprovedInFamily({
      familyKey: templateFamilyKey(doc),
      exceptTemplateId: input.templateId,
    });
    return;
  }

  await payload.update({
    collection: TEMPLATES as never,
    id: input.templateId,
    data: data as never,
    overrideAccess: true,
  });
}

export async function createRealStaffDocumentTemplate(input: {
  actor: StaffActor;
  title: string;
  body: string;
  kind: string;
  legalEntityName?: string;
}): Promise<{ id: number }> {
  if (!staffMayManageDocuments(input.actor)) {
    throw new Error("Operator permission required to manage staff document templates.");
  }
  const kind = parseStaffDocumentKind(input.kind);
  const signingMode = resolveSigningModeForTemplate({ kind, signingMode: null });
  const title = String(input.title ?? "").trim();
  const body = String(input.body ?? "").trim();
  if (!title || !body) throw new Error("Title and body are required.");

  if (resolveStaffTemplateQaProvenance({ title, body })) {
    throw new Error(
      "Real templates cannot contain SAMPLE, TEST ONLY, NONBINDING, or other QA markers.",
    );
  }

  const familyKey = newFamilyKey();
  const payload = await getPayload({ config });
  const created = (await payload.create({
    collection: TEMPLATES as never,
    data: {
      title,
      slug: `${familyKey}-v1`,
      version: 1,
      kind,
      signingMode,
      status: "draft",
      body,
      legalEntityName: input.legalEntityName?.trim() || STAFF_DOCUMENT_DEFAULT_LEGAL_ENTITY,
      contentHash: hashStaffDocumentBody(body),
      familyKey,
      createdBy: input.actor.email,
      isSample: false,
    } as never,
    overrideAccess: true,
  })) as { id: number };
  return { id: Number(created.id) };
}
