/**
 * Safe refile — Contract #4 finalized Direct Agreement sent PDF (presentation fix only).
 *
 * Dry-run:
 *   npx tsx scripts/refile-de-bois-contract-4-sent-pdf.ts
 *
 * Write:
 *   CONFIRM_REFILE_CONTRACT_4_SENT_PDF=de-bois-contract-4-refile \
 *   npx tsx scripts/refile-de-bois-contract-4-sent-pdf.ts
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readFileSync, existsSync } from "fs";

const CONFIRM = "de-bois-contract-4-refile";
const CONTRACT_ID = 4;
const EXPECTED_CLIENT_ID = 19;
const EXPECTED_TITLE = "KXD Digital Management & Growth Partnership";

function applyEnvFile(relativePath: string): void {
  const path = join(process.cwd(), relativePath);
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[line.slice(0, eq).trim()] = value;
  }
}

function loadProductionEnv(): void {
  applyEnvFile(".env.vercel.local");
  const vercelUri =
    process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim() || "";
  applyEnvFile(".env.production.local");
  const currentUri =
    process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim() || "";
  const parseable = (v: string) => {
    try {
      new URL(v.replace(/^["']|["']$/g, ""));
      return true;
    } catch {
      return false;
    }
  };
  if (!parseable(currentUri) && parseable(vercelUri)) {
    process.env.DATABASE_URI = vercelUri.replace(/^["']|["']$/g, "");
  }
  delete process.env.VERCEL;
  delete process.env.MEDIA_BLOB_READ_WRITE_TOKEN;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim() ?? "";
  if (blobToken && !/^vercel_blob_rw_[a-z0-9]+_[a-z0-9]+$/i.test(blobToken)) {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  }
}

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    const id = Number((value as { id: number }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

function extractPdfText(buffer: Buffer): string | null {
  const outPath = join(process.cwd(), "report-output", "contract-4-refile-verify.pdf");
  mkdirSync(join(process.cwd(), "report-output"), { recursive: true });
  writeFileSync(outPath, buffer);
  try {
    return execFileSync("pdftotext", ["-layout", outPath, "-"], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  } catch {
    return null;
  }
}

function estimatePdfPageCount(buffer: Buffer): number | null {
  const matches = buffer.toString("latin1").match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : null;
}

async function main() {
  loadProductionEnv();
  const dryRun = process.env.CONFIRM_REFILE_CONTRACT_4_SENT_PDF !== CONFIRM;

  const { getPayload } = await import("payload");
  const { default: config } = await import("@payload-config");
  const { normalizeLifecyclePackage } = await import("../lib/proposal-lifecycle/package.ts");
  const { parseStoredDirectAgreementTerms } = await import("../lib/direct-agreement/validate.ts");
  const { deriveStructuredPaymentTermsFromDirectAgreement } = await import(
    "../lib/direct-agreement/payment-terms.ts"
  );
  const { composeDirectAgreementDocumentBody, applyFinalizedDirectAgreementPresentationCopy } =
    await import("../lib/commercial-legal/compose-direct-agreement-document.ts");
  const { renderDirectAgreementSentPdf } = await import("../lib/proposal-lifecycle/documents/pdfs.tsx");
  const { generateAndFileDirectAgreementSentSnapshot } = await import(
    "../lib/proposal-lifecycle/documents/file.ts"
  );
  const { readCommercialDocumentBytes } = await import(
    "../lib/proposal-lifecycle/documents/file.ts"
  );

  const payload = await getPayload({ config });

  const contract = (await payload.findByID({
    collection: "contracts" as never,
    id: CONTRACT_ID,
    depth: 1,
    overrideAccess: true,
  })) as Record<string, unknown>;

  const clientId = relId(contract.client);
  const title = String(contract.title ?? "").trim();
  const agreementSource = String(contract.agreementSource ?? "");
  const pkg = normalizeLifecyclePackage(contract.lifecyclePackage);
  const commercialStatus = String(pkg.commercialStatus ?? "");
  const daTerms = parseStoredDirectAgreementTerms(contract.directAgreementTerms);

  if (clientId !== EXPECTED_CLIENT_ID) {
    throw new Error(`Safety stop: client ${clientId} !== ${EXPECTED_CLIENT_ID}`);
  }
  if (title !== EXPECTED_TITLE) {
    throw new Error(`Safety stop: title "${title}" !== "${EXPECTED_TITLE}"`);
  }
  if (agreementSource !== "direct-agreement") {
    throw new Error(`Safety stop: agreementSource "${agreementSource}" !== direct-agreement`);
  }
  if (commercialStatus !== "finalized") {
    throw new Error(`Safety stop: commercialStatus "${commercialStatus}" !== finalized`);
  }
  if (!daTerms) throw new Error("Safety stop: missing directAgreementTerms");
  if (daTerms.monthlyAmountCents !== 60000) {
    throw new Error(`Safety stop: monthlyAmountCents ${daTerms.monthlyAmountCents} !== 60000`);
  }

  const structured =
    pkg.structuredPaymentTerms ??
    deriveStructuredPaymentTermsFromDirectAgreement(daTerms, CONTRACT_ID);

  const documentBody = applyFinalizedDirectAgreementPresentationCopy(
    composeDirectAgreementDocumentBody({
      body: String(contract.body ?? ""),
      terms: daTerms,
    }),
    commercialStatus,
  );

  const clientName =
    contract.client && typeof contract.client === "object"
      ? String((contract.client as { name?: string }).name ?? "")
      : "";

  const rendered = await renderDirectAgreementSentPdf({
    title,
    body: documentBody,
    contractId: CONTRACT_ID,
    terms: structured,
    termsVersion: daTerms.termsVersion,
    statusLabel: "Finalized",
    commercialStatus,
    clientName,
    serviceStartDate: daTerms.serviceStartDate,
    serviceEndDate: daTerms.serviceEndDate,
  });

  const sentRefs = (pkg.documentRefs ?? []).filter((d) => d.kind === "direct-agreement");
  const latestRef = sentRefs.length ? sentRefs[sentRefs.length - 1]! : null;

  let previousDoc: Record<string, unknown> | null = null;
  if (latestRef?.id) {
    previousDoc = (await payload.findByID({
      collection: "commercial-documents" as never,
      id: latestRef.id,
      depth: 0,
      overrideAccess: true,
    })) as Record<string, unknown>;
  }

  const proposedVersion = sentRefs.length + 1;
  const hashChanged = latestRef?.contentHash !== rendered.contentHash;

  const preview = {
    dryRun,
    contractId: CONTRACT_ID,
    clientId,
    commercialStatus,
    monthlyAmountCents: daTerms.monthlyAmountCents,
    serviceStartDate: daTerms.serviceStartDate,
    previousDocument: previousDoc
      ? {
          id: previousDoc.id,
          version: previousDoc.version,
          contentHash: previousDoc.contentHash,
          storageKey: previousDoc.storageKey,
        }
      : null,
    proposedDocument: {
      version: proposedVersion,
      contentHash: rendered.contentHash,
      byteLength: rendered.buffer.byteLength,
      hashChanged,
      willSkipIfUnchanged: !hashChanged,
    },
    adminUrl: `/admin/operations/client-command/${EXPECTED_CLIENT_ID}/commercial/agreements/${CONTRACT_ID}#documents`,
  };

  if (dryRun) {
    console.log(JSON.stringify(preview, null, 2));
    console.log(
      `\nTo refile: CONFIRM_REFILE_CONTRACT_4_SENT_PDF=${CONFIRM} npx tsx scripts/refile-de-bois-contract-4-sent-pdf.ts`,
    );
    return;
  }

  if (!hashChanged) {
    console.log(JSON.stringify({ ...preview, skipped: true, reason: "content hash unchanged" }, null, 2));
    return;
  }

  const beforeFinalizeActivities = await payload.find({
    collection: "contract-activity" as never,
    where: {
      and: [
        { contract: { equals: CONTRACT_ID } },
        { eventType: { equals: "direct-agreement.finalized" } },
      ],
    },
    limit: 10,
    overrideAccess: true,
  });

  const nextPkg = await generateAndFileDirectAgreementSentSnapshot({
    contractId: CONTRACT_ID,
    clientId: EXPECTED_CLIENT_ID,
    contractTitle: title,
    contractBody: composeDirectAgreementDocumentBody({
      body: String(contract.body ?? ""),
      terms: daTerms,
    }),
    terms: structured,
    termsVersion: daTerms.termsVersion,
    pkg,
    actor: "operator-script:refile-contract-4-sent-pdf",
    clientName,
    serviceStartDate: daTerms.serviceStartDate,
    serviceEndDate: daTerms.serviceEndDate,
  });

  await payload.update({
    collection: "contracts" as never,
    id: CONTRACT_ID,
    data: {
      lifecyclePackage: nextPkg,
    } as never,
    overrideAccess: true,
  });

  const afterContract = (await payload.findByID({
    collection: "contracts" as never,
    id: CONTRACT_ID,
    depth: 0,
    overrideAccess: true,
  })) as Record<string, unknown>;
  const afterPkg = normalizeLifecyclePackage(afterContract.lifecyclePackage);
  const afterSent = (afterPkg.documentRefs ?? []).filter((d) => d.kind === "direct-agreement");
  const newRef = afterSent[afterSent.length - 1]!;

  const newDoc = (await payload.findByID({
    collection: "commercial-documents" as never,
    id: newRef.id,
    depth: 0,
    overrideAccess: true,
  })) as Record<string, unknown>;

  const pdfBuffer = await readCommercialDocumentBytes({
    storageKey: String(newDoc.storageKey ?? ""),
    storageProvider: String(newDoc.storageProvider ?? ""),
  });

  const pdfText = extractPdfText(pdfBuffer);
  const pageCount = estimatePdfPageCount(pdfBuffer);

  const afterFinalizeActivities = await payload.find({
    collection: "contract-activity" as never,
    where: {
      and: [
        { contract: { equals: CONTRACT_ID } },
        { eventType: { equals: "direct-agreement.finalized" } },
      ],
    },
    limit: 10,
    overrideAccess: true,
  });

  const createdActivities = await payload.find({
    collection: "contract-activity" as never,
    where: { contract: { equals: CONTRACT_ID } },
    sort: "-occurredAt",
    limit: 5,
    overrideAccess: true,
  });

  console.log(
    JSON.stringify(
      {
        refiled: true,
        commercialStatusAfter: afterPkg.commercialStatus,
        previousDocument: preview.previousDocument,
        newDocument: {
          id: newDoc.id,
          version: newDoc.version,
          contentHash: newDoc.contentHash,
          storageKey: newDoc.storageKey,
          downloadUrl: `/api/admin/commercial-documents/${newDoc.id}/download`,
          previewUrl: `/api/admin/commercial-documents/${newDoc.id}/download?disposition=inline`,
        },
        pageCountEstimate: pageCount,
        pdfChecks: pdfText
          ? {
              hasInvestment: /investment/i.test(pdfText),
              has600PerMonth: /\$600\.00 per month/i.test(pdfText),
              hasZeroDollar: /\$0\.00/.test(pdfText),
              hasDraftRecord: /draft record/i.test(pdfText),
              hasFriendsFamily: /friends\s*&\s*family/i.test(pdfText),
              has1250: /\$1,250/.test(pdfText),
              has7800: /7,800/.test(pdfText),
            }
          : { pdfTextExtraction: "pdftotext unavailable — inspect PDF manually" },
        finalizeActivityCountBefore: beforeFinalizeActivities.docs.length,
        finalizeActivityCountAfter: afterFinalizeActivities.docs.length,
        recentActivity: createdActivities.docs.map((d) => ({
          id: (d as { id: number }).id,
          eventType: (d as { eventType?: string }).eventType,
          summary: (d as { summary?: string }).summary,
        })),
        adminUrl: preview.adminUrl,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
