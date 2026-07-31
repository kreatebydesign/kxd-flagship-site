/**
 * Idempotent filing of commercial PDFs into private storage + commercial-documents.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { getPayload } from "payload";
import config from "@payload-config";
import { renderProposalPdf } from "../../proposal-builder/export-pdf.tsx";
import type { CanonicalProposal } from "../../proposal-builder/types.ts";
import { appendAudit, normalizeLifecyclePackage } from "../package.ts";
import type { ContractLifecyclePackage, ExecutionCertificate, StructuredPaymentTerms, TypedSignatureEvidence } from "../types.ts";
import {
  acceptedProposalSourceHash,
  buildPackageManifest,
  renderBillingSummaryPdf,
  renderCertificatePdf,
  renderExecutedContractPdf,
} from "./pdfs.tsx";
import { resolveStoragePath } from "./storage-path.ts";

export { verifyCommercialDocumentIntegrity } from "./integrity.ts";

const COLLECTION = "commercial-documents";
const STORAGE_ROOT = join(process.cwd(), "storage", "commercial-documents");

function ensureStorage(): void {
  mkdirSync(STORAGE_ROOT, { recursive: true });
}

async function findExisting(input: {
  contractId: number;
  kind: string;
  contentHash: string;
}): Promise<{ id: number } | null> {
  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: COLLECTION as never,
    where: {
      and: [
        { contract: { equals: input.contractId } },
        { kind: { equals: input.kind } },
        { contentHash: { equals: input.contentHash } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  });
  const doc = found.docs[0] as { id: number } | undefined;
  return doc ? { id: doc.id } : null;
}

async function fileBuffer(input: {
  title: string;
  kind: string;
  contractId: number;
  proposalId?: number | null;
  clientId?: number | null;
  version: number;
  contentHash: string;
  buffer: Buffer;
  mimeType: string;
  sourceSnapshotRef: string;
  executionStatus: string;
  partyNames: Record<string, string>;
}): Promise<number> {
  const existing = await findExisting({
    contractId: input.contractId,
    kind: input.kind,
    contentHash: input.contentHash,
  });
  if (existing) return existing.id;

  ensureStorage();
  const storageKey = `${input.contractId}/${input.kind}-${input.contentHash.slice(0, 16)}.${
    input.mimeType === "application/json" ? "json" : "pdf"
  }`;
  const abs = join(STORAGE_ROOT, storageKey);
  mkdirSync(join(STORAGE_ROOT, String(input.contractId)), { recursive: true });
  if (!existsSync(abs)) {
    writeFileSync(abs, input.buffer);
  }

  const payload = await getPayload({ config });
  const created = (await payload.create({
    collection: COLLECTION as never,
    data: {
      title: input.title,
      kind: input.kind,
      contract: input.contractId,
      proposal: input.proposalId ?? undefined,
      client: input.clientId ?? undefined,
      version: input.version,
      contentHash: input.contentHash,
      storageKey,
      mimeType: input.mimeType,
      byteLength: input.buffer.byteLength,
      sourceSnapshotRef: input.sourceSnapshotRef,
      executionStatus: input.executionStatus,
      generatedAt: new Date().toISOString(),
      partyNames: input.partyNames,
    } as never,
    overrideAccess: true,
  })) as { id: number };
  return Number(created.id);
}

export async function generateAndFileExecutedPackage(input: {
  contractId: number;
  proposalId: number;
  clientId?: number | null;
  proposalNumber: string;
  contractTitle: string;
  contractBody: string;
  canonical: CanonicalProposal;
  certificate: ExecutionCertificate;
  operator: TypedSignatureEvidence;
  client: TypedSignatureEvidence;
  terms: StructuredPaymentTerms;
  pkg: ContractLifecyclePackage;
}): Promise<ContractLifecyclePackage> {
  const partyNames = {
    kxd: input.operator.entityName,
    client: input.client.entityName,
    kxdSigner: input.operator.legalName,
    clientSigner: input.client.legalName,
  };

  const accepted = await renderProposalPdf(input.canonical);
  const acceptedHash = acceptedProposalSourceHash(input.canonical);
  // Use PDF content hash for filing identity when available
  const acceptedId = await fileBuffer({
    title: `Accepted proposal ${input.proposalNumber}`,
    kind: "accepted-proposal",
    contractId: input.contractId,
    proposalId: input.proposalId,
    clientId: input.clientId,
    version: input.canonical.version,
    contentHash: acceptedHash,
    buffer: accepted.buffer,
    mimeType: "application/pdf",
    sourceSnapshotRef: `acceptedSnapshot:${acceptedHash}`,
    executionStatus: "accepted",
    partyNames,
  });

  const executed = await renderExecutedContractPdf({
    title: input.contractTitle,
    body: input.contractBody,
    proposalNumber: input.proposalNumber,
    contractId: input.contractId,
    documentHash: input.certificate.documentHash,
    operator: input.operator,
    client: input.client,
    sealedAt: input.certificate.sealedAt,
  });
  const executedId = await fileBuffer({
    title: `Executed agreement AGR-${input.contractId}-1`,
    kind: "executed-contract",
    contractId: input.contractId,
    proposalId: input.proposalId,
    clientId: input.clientId,
    version: 1,
    contentHash: executed.contentHash,
    buffer: executed.buffer,
    mimeType: "application/pdf",
    sourceSnapshotRef: `documentHash:${input.certificate.documentHash}`,
    executionStatus: "executed",
    partyNames,
  });

  const certPdf = await renderCertificatePdf(input.certificate);
  const certId = await fileBuffer({
    title: `Certificate ${input.certificate.verificationId}`,
    kind: "certificate",
    contractId: input.contractId,
    proposalId: input.proposalId,
    clientId: input.clientId,
    version: 1,
    contentHash: certPdf.contentHash,
    buffer: certPdf.buffer,
    mimeType: "application/pdf",
    sourceSnapshotRef: `verification:${input.certificate.verificationId}`,
    executionStatus: "executed",
    partyNames,
  });

  const billing = await renderBillingSummaryPdf({
    proposalNumber: input.proposalNumber,
    contractId: input.contractId,
    terms: input.terms,
    contractHash: input.certificate.documentHash,
  });
  const billingId = await fileBuffer({
    title: `Billing summary ${input.proposalNumber}`,
    kind: "billing-summary",
    contractId: input.contractId,
    proposalId: input.proposalId,
    clientId: input.clientId,
    version: 1,
    contentHash: billing.contentHash,
    buffer: billing.buffer,
    mimeType: "application/pdf",
    sourceSnapshotRef: `terms:${input.certificate.documentHash}`,
    executionStatus: "executed",
    partyNames,
  });

  const docs = [
    { kind: "accepted-proposal", contentHash: acceptedHash, id: acceptedId },
    { kind: "executed-contract", contentHash: executed.contentHash, id: executedId },
    { kind: "certificate", contentHash: certPdf.contentHash, id: certId },
    { kind: "billing-summary", contentHash: billing.contentHash, id: billingId },
  ];
  const manifest = buildPackageManifest({
    contractId: input.contractId,
    proposalId: input.proposalId,
    proposalNumber: input.proposalNumber,
    documents: docs,
    certificate: input.certificate,
  });
  const manifestId = await fileBuffer({
    title: `Package manifest AGR-${input.contractId}-1`,
    kind: "package-manifest",
    contractId: input.contractId,
    proposalId: input.proposalId,
    clientId: input.clientId,
    version: 1,
    contentHash: manifest.contentHash,
    buffer: Buffer.from(manifest.json, "utf8"),
    mimeType: "application/json",
    sourceSnapshotRef: `manifest:${manifest.contentHash}`,
    executionStatus: "executed",
    partyNames,
  });

  const now = new Date().toISOString();
  const documentRefs = [
    ...docs,
    { kind: "package-manifest", contentHash: manifest.contentHash, id: manifestId },
  ].map((d) => ({
    id: d.id,
    kind: d.kind,
    contentHash: d.contentHash,
    version: 1,
    generatedAt: now,
  }));

  let next = normalizeLifecyclePackage(input.pkg);
  next = {
    ...next,
    documentRefs,
  };
  next = appendAudit(next, {
    actor: "system",
    action: "documents.filed",
    reason: `Filed ${documentRefs.length} artifacts`,
  });
  return next;
}

export function readCommercialDocumentFile(storageKey: string): Buffer {
  const abs = resolveStoragePath(STORAGE_ROOT, storageKey);
  if (!existsSync(abs)) throw new Error("Document not found.");
  return readFileSync(abs);
}
