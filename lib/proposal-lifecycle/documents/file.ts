/**
 * Idempotent filing of commercial PDFs into private storage + commercial-documents.
 * Storage: local (dev) | vercel-blob (production) via documents/storage adapter.
 */

import { getPayload } from "payload";
import config from "@payload-config";
import { renderProposalPdf } from "../../proposal-builder/export-pdf.tsx";
import type { CanonicalProposal } from "../../proposal-builder/types.ts";
import { appendAudit, normalizeLifecyclePackage } from "../package.ts";
import type {
  ContractLifecyclePackage,
  ExecutionCertificate,
  StructuredPaymentTerms,
  TypedSignatureEvidence,
} from "../types.ts";
import type { ExternalAcceptanceRecord } from "../../direct-agreement/types.ts";
import {
  acceptedProposalSourceHash,
  buildPackageManifest,
  renderBillingSummaryPdf,
  renderCertificatePdf,
  renderDirectAgreementSentPdf,
  renderExecutedContractPdf,
  renderExternalAcceptanceExecutedPdf,
} from "./pdfs.tsx";
import {
  getCommercialDocumentStorageAdapter,
  getDefaultCommercialDocumentStorageAdapter,
  type CommercialDocumentStorageProvider,
} from "./storage/index.ts";

export { verifyCommercialDocumentIntegrity } from "./integrity.ts";

const COLLECTION = "commercial-documents";

function asProvider(value: unknown): CommercialDocumentStorageProvider {
  return value === "vercel-blob" ? "vercel-blob" : "local";
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
  clientId: number;
  version: number;
  contentHash: string;
  buffer: Buffer;
  mimeType: string;
  sourceSnapshotRef: string;
  executionStatus: string;
  partyNames: Record<string, string>;
  lineageParentId?: number | null;
  sentAt?: string | null;
  acceptedAt?: string | null;
}): Promise<number> {
  if (!Number.isInteger(input.clientId) || input.clientId <= 0) {
    throw new Error("Commercial documents require an existing client relationship.");
  }

  const existing = await findExisting({
    contractId: input.contractId,
    kind: input.kind,
    contentHash: input.contentHash,
  });
  if (existing) return existing.id;

  const adapter = getDefaultCommercialDocumentStorageAdapter();
  const ext = input.mimeType === "application/json" ? "json" : "pdf";
  const storageKey = `${input.contractId}/${input.kind}-${input.contentHash.slice(0, 16)}.${ext}`;
  const uploaded = await adapter.upload({
    key: storageKey,
    buffer: input.buffer,
    mimeType: input.mimeType,
  });

  const payload = await getPayload({ config });
  const created = (await payload.create({
    collection: COLLECTION as never,
    data: {
      title: input.title,
      kind: input.kind,
      contract: input.contractId,
      proposal: input.proposalId ?? undefined,
      client: input.clientId,
      version: input.version,
      contentHash: input.contentHash,
      storageKey: uploaded.key,
      storageProvider: uploaded.provider,
      mimeType: input.mimeType,
      byteLength: input.buffer.byteLength,
      sourceSnapshotRef: input.sourceSnapshotRef,
      lineageParent: input.lineageParentId ?? undefined,
      executionStatus: input.executionStatus,
      generatedAt: new Date().toISOString(),
      sentAt: input.sentAt ?? undefined,
      acceptedAt: input.acceptedAt ?? undefined,
      partyNames: input.partyNames,
    } as never,
    overrideAccess: true,
  })) as { id: number };
  return Number(created.id);
}

function mergeDocumentRefs(
  pkg: ContractLifecyclePackage,
  refs: Array<{ id: number; kind: string; contentHash: string; version: number; generatedAt: string }>,
): ContractLifecyclePackage["documentRefs"] {
  const prior = pkg.documentRefs ?? [];
  const byKey = new Map(prior.map((r) => [`${r.kind}:${r.contentHash}`, r]));
  for (const ref of refs) {
    byKey.set(`${ref.kind}:${ref.contentHash}`, ref);
  }
  return [...byKey.values()];
}

/** Finalized / sent Direct Agreement snapshot — pending acceptance. */
export async function generateAndFileDirectAgreementSentSnapshot(input: {
  contractId: number;
  clientId: number;
  contractTitle: string;
  contractBody: string;
  terms: StructuredPaymentTerms;
  termsVersion: number;
  pkg: ContractLifecyclePackage;
  actor?: string | null;
}): Promise<ContractLifecyclePackage> {
  const rendered = await renderDirectAgreementSentPdf({
    title: input.contractTitle,
    body: input.contractBody,
    contractId: input.contractId,
    terms: input.terms,
    termsVersion: input.termsVersion,
    statusLabel: "Finalized — pending acceptance",
  });

  const priorSent = (input.pkg.documentRefs ?? []).filter((d) => d.kind === "direct-agreement");
  const lineageParentId = priorSent.length ? priorSent[priorSent.length - 1]!.id : null;
  const version = priorSent.length + 1;
  const now = new Date().toISOString();

  const id = await fileBuffer({
    title: `Direct agreement DA-${input.contractId}-v${version}`,
    kind: "direct-agreement",
    contractId: input.contractId,
    proposalId: null,
    clientId: input.clientId,
    version,
    contentHash: rendered.contentHash,
    buffer: rendered.buffer,
    mimeType: "application/pdf",
    sourceSnapshotRef: `direct-agreement:${input.terms.derivedAt}:${input.termsVersion}`,
    executionStatus: "draft",
    partyNames: { client: String(input.clientId), kxd: "Kreate by Design" },
    lineageParentId,
    sentAt: now,
  });

  let next = normalizeLifecyclePackage(input.pkg);
  next = {
    ...next,
    documentRefs: mergeDocumentRefs(next, [
      {
        id,
        kind: "direct-agreement",
        contentHash: rendered.contentHash,
        version,
        generatedAt: now,
      },
    ]),
  };
  next = appendAudit(next, {
    actor: input.actor ?? "system",
    action: "documents.direct-agreement-sent-filed",
    reason: `Filed sent Direct Agreement snapshot v${version}`,
  });
  return next;
}

export async function generateAndFileExecutedPackage(input: {
  contractId: number;
  proposalId?: number | null;
  clientId: number;
  proposalNumber?: string | null;
  contractTitle: string;
  contractBody: string;
  canonical?: CanonicalProposal | null;
  certificate: ExecutionCertificate;
  operator: TypedSignatureEvidence;
  client: TypedSignatureEvidence;
  terms: StructuredPaymentTerms;
  pkg: ContractLifecyclePackage;
  externalAcceptance?: ExternalAcceptanceRecord | null;
}): Promise<ContractLifecyclePackage> {
  if (!Number.isInteger(input.clientId) || input.clientId <= 0) {
    throw new Error("Executed package filing requires an existing client.");
  }

  const proposalId = input.proposalId ?? null;
  const proposalNumber =
    input.proposalNumber ||
    input.terms.sourceProposalNumber ||
    `DIRECT-${input.contractId}`;
  const partyNames = {
    kxd: input.operator.entityName,
    client: input.client.entityName,
    kxdSigner: input.operator.legalName,
    clientSigner: input.client.legalName,
  };

  const docs: Array<{ kind: string; contentHash: string; id: number }> = [];
  const now = new Date().toISOString();

  if (input.canonical && proposalId) {
    const accepted = await renderProposalPdf(input.canonical);
    const acceptedHash = acceptedProposalSourceHash(input.canonical);
    const acceptedId = await fileBuffer({
      title: `Accepted proposal ${proposalNumber}`,
      kind: "accepted-proposal",
      contractId: input.contractId,
      proposalId,
      clientId: input.clientId,
      version: input.canonical.version,
      contentHash: acceptedHash,
      buffer: accepted.buffer,
      mimeType: "application/pdf",
      sourceSnapshotRef: `acceptedSnapshot:${acceptedHash}`,
      executionStatus: "accepted",
      partyNames,
      acceptedAt: input.certificate.clientSignedAt,
    });
    docs.push({ kind: "accepted-proposal", contentHash: acceptedHash, id: acceptedId });
  }

  let executedId: number;
  let executedHash: string;
  if (input.externalAcceptance) {
    const executed = await renderExternalAcceptanceExecutedPdf({
      title: input.contractTitle,
      body: input.contractBody,
      contractId: input.contractId,
      documentHash: input.certificate.documentHash,
      terms: input.terms,
      externalAcceptance: input.externalAcceptance,
      operator: input.operator,
      sealedAt: input.certificate.sealedAt,
    });
    executedHash = executed.contentHash;
    executedId = await fileBuffer({
      title: `Executed agreement AGR-${input.contractId}-external`,
      kind: "executed-contract",
      contractId: input.contractId,
      proposalId,
      clientId: input.clientId,
      version: 1,
      contentHash: executed.contentHash,
      buffer: executed.buffer,
      mimeType: "application/pdf",
      sourceSnapshotRef: `documentHash:${input.certificate.documentHash}:external`,
      executionStatus: "executed",
      partyNames,
      acceptedAt: input.externalAcceptance.acceptedAt,
    });
  } else {
    const executed = await renderExecutedContractPdf({
      title: input.contractTitle,
      body: input.contractBody,
      proposalNumber,
      contractId: input.contractId,
      documentHash: input.certificate.documentHash,
      operator: input.operator,
      client: input.client,
      sealedAt: input.certificate.sealedAt,
      omitProposalLabel: !proposalId,
    });
    executedHash = executed.contentHash;
    executedId = await fileBuffer({
      title: `Executed agreement AGR-${input.contractId}-1`,
      kind: "executed-contract",
      contractId: input.contractId,
      proposalId,
      clientId: input.clientId,
      version: 1,
      contentHash: executed.contentHash,
      buffer: executed.buffer,
      mimeType: "application/pdf",
      sourceSnapshotRef: `documentHash:${input.certificate.documentHash}`,
      executionStatus: "executed",
      partyNames,
      acceptedAt: input.certificate.clientSignedAt,
    });
  }
  docs.push({ kind: "executed-contract", contentHash: executedHash, id: executedId });

  const certPdf = await renderCertificatePdf(input.certificate);
  const certId = await fileBuffer({
    title: `Certificate ${input.certificate.verificationId}`,
    kind: "certificate",
    contractId: input.contractId,
    proposalId,
    clientId: input.clientId,
    version: 1,
    contentHash: certPdf.contentHash,
    buffer: certPdf.buffer,
    mimeType: "application/pdf",
    sourceSnapshotRef: `verification:${input.certificate.verificationId}`,
    executionStatus: "executed",
    partyNames,
  });
  docs.push({ kind: "certificate", contentHash: certPdf.contentHash, id: certId });

  const billing = await renderBillingSummaryPdf({
    proposalNumber,
    contractId: input.contractId,
    terms: input.terms,
    contractHash: input.certificate.documentHash,
  });
  const billingId = await fileBuffer({
    title: `Billing summary ${proposalNumber}`,
    kind: "billing-summary",
    contractId: input.contractId,
    proposalId,
    clientId: input.clientId,
    version: 1,
    contentHash: billing.contentHash,
    buffer: billing.buffer,
    mimeType: "application/pdf",
    sourceSnapshotRef: `terms:${input.certificate.documentHash}`,
    executionStatus: "executed",
    partyNames,
  });
  docs.push({ kind: "billing-summary", contentHash: billing.contentHash, id: billingId });

  const manifest = buildPackageManifest({
    contractId: input.contractId,
    proposalId: proposalId ?? 0,
    proposalNumber,
    documents: docs,
    certificate: input.certificate,
  });
  const manifestId = await fileBuffer({
    title: `Package manifest AGR-${input.contractId}-1`,
    kind: "package-manifest",
    contractId: input.contractId,
    proposalId,
    clientId: input.clientId,
    version: 1,
    contentHash: manifest.contentHash,
    buffer: Buffer.from(manifest.json, "utf8"),
    mimeType: "application/json",
    sourceSnapshotRef: `manifest:${manifest.contentHash}`,
    executionStatus: "executed",
    partyNames,
  });
  docs.push({ kind: "package-manifest", contentHash: manifest.contentHash, id: manifestId });

  const documentRefs = docs.map((d) => ({
    id: d.id,
    kind: d.kind,
    contentHash: d.contentHash,
    version: 1,
    generatedAt: now,
  }));

  let next = normalizeLifecyclePackage(input.pkg);
  next = {
    ...next,
    documentRefs: mergeDocumentRefs(next, documentRefs),
  };
  next = appendAudit(next, {
    actor: "system",
    action: "documents.filed",
    reason: `Filed ${documentRefs.length} artifacts`,
  });
  return next;
}

/** Read commercial document bytes — provider-aware; local keys remain supported. */
export async function readCommercialDocumentBytes(input: {
  storageKey: string;
  storageProvider?: CommercialDocumentStorageProvider | string | null;
}): Promise<Buffer> {
  const provider = asProvider(input.storageProvider);
  // Legacy rows without storageProvider used local disk with relative keys.
  if (provider === "local" || !input.storageProvider) {
    try {
      const opened = await getCommercialDocumentStorageAdapter("local").open(input.storageKey);
      return opened.body;
    } catch (err) {
      if (provider === "vercel-blob" || input.storageProvider === "vercel-blob") {
        const opened = await getCommercialDocumentStorageAdapter("vercel-blob").open(
          input.storageKey,
        );
        return opened.body;
      }
      throw err;
    }
  }
  const opened = await getCommercialDocumentStorageAdapter(provider).open(input.storageKey);
  return opened.body;
}
