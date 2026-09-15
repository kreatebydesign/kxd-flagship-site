/**
 * Live Account Statement PDF — derived from authoritative ledger obligations.
 *
 * GET only. No payment allocation, Stripe, invoice, or obligation mutations.
 * Optionally files an idempotent commercial-document snapshot by content hash.
 */

import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { buildLiveAccountStatement } from "@/lib/client-command/commercial/build-account-statement";
import {
  renderAccountStatementPdf,
  validateAccountStatement,
} from "@/lib/commercial-documents/account-statement";
import { sha256Hex } from "@/lib/proposal-lifecycle/hash";
import {
  getDefaultCommercialDocumentStorageAdapter,
} from "@/lib/proposal-lifecycle/documents/storage";

export const dynamic = "force-dynamic";

type ClientRow = {
  id: number;
  name?: string | null;
  slug?: string | null;
  primaryContactName?: string | null;
};

type ContractRow = {
  id: number;
  title?: string | null;
  lifecyclePackage?: unknown;
  proposal?: number | { id?: number } | null;
};

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

async function fileStatementIfPossible(input: {
  clientId: number;
  contractId: number;
  proposalId: number | null;
  title: string;
  buffer: Buffer;
  contentHash: string;
  sourceSnapshotRef: string;
  partyNames: Record<string, string>;
}): Promise<number | null> {
  try {
    const payload = await getPayload({ config });
    const existing = await payload.find({
      collection: "commercial-documents" as never,
      where: {
        and: [
          { contract: { equals: input.contractId } },
          { kind: { equals: "account-statement" } },
          { contentHash: { equals: input.contentHash } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    });
    const found = existing.docs[0] as { id?: number } | undefined;
    if (found?.id) return Number(found.id);

    const adapter = getDefaultCommercialDocumentStorageAdapter();
    const storageKey = `${input.contractId}/account-statement-${input.contentHash.slice(0, 16)}.pdf`;
    const uploaded = await adapter.upload({
      key: storageKey,
      buffer: input.buffer,
      mimeType: "application/pdf",
    });

    const created = (await payload.create({
      collection: "commercial-documents" as never,
      data: {
        title: input.title,
        kind: "account-statement",
        contract: input.contractId,
        proposal: input.proposalId ?? undefined,
        client: input.clientId,
        version: 1,
        contentHash: input.contentHash,
        storageKey: uploaded.key,
        storageProvider: uploaded.provider,
        mimeType: "application/pdf",
        byteLength: input.buffer.byteLength,
        sourceSnapshotRef: input.sourceSnapshotRef,
        executionStatus: "accepted",
        generatedAt: new Date().toISOString(),
        partyNames: input.partyNames,
      } as never,
      overrideAccess: true,
    })) as { id: number };

    return Number(created.id);
  } catch (error) {
    console.warn("[account-statement] snapshot filing skipped:", error);
    return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const clientId = Number((await params).clientId);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid client." }, { status: 400 });
  }

  const payload = await getPayload({ config });

  let client: ClientRow | null = null;
  try {
    client = (await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    })) as unknown as ClientRow;
  } catch {
    return NextResponse.json({ ok: false, error: "Client not found." }, { status: 404 });
  }

  const contractsResult = await payload.find({
    collection: "contracts",
    where: { client: { equals: clientId } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
    sort: "-updatedAt",
  });

  const contracts = (contractsResult.docs as unknown as ContractRow[]).map((doc) => ({
    id: Number(doc.id),
    title: String(doc.title ?? `Agreement ${doc.id}`),
    lifecyclePackage: doc.lifecyclePackage,
    proposalId: relId(doc.proposal),
  }));

  if (!contracts.length) {
    return NextResponse.json(
      { ok: false, error: "No commercial agreements on file for this client." },
      { status: 404 },
    );
  }

  const statement = buildLiveAccountStatement({
    clientId,
    clientName: String(client.name ?? `Client ${clientId}`),
    clientSlug: client.slug ? String(client.slug) : null,
    contactName: client.primaryContactName ? String(client.primaryContactName) : null,
    contracts,
    primaryAgreementId: contracts[0]?.id ?? null,
  });

  const issues = validateAccountStatement(statement.document);
  if (issues.length) {
    return NextResponse.json(
      { ok: false, error: "Statement arithmetic invalid.", issues },
      { status: 409 },
    );
  }

  const { buffer, filename } = await renderAccountStatementPdf(statement.document);
  const contentHash = sha256Hex(buffer.toString("base64"));
  const primary = contracts[0]!;

  await fileStatementIfPossible({
    clientId,
    contractId: primary.id,
    proposalId: primary.proposalId,
    title: `${statement.document.title} — ${statement.document.clientName} — ${statement.statementDate}`,
    buffer,
    contentHash,
    sourceSnapshotRef: `ledger:${clientId}:${statement.statementDate}:${contentHash.slice(0, 16)}`,
    partyNames: {
      client: statement.document.clientName,
      contact: statement.document.contactName ?? "",
    },
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}
