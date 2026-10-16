/**
 * Read-only production dry-run for Rethwill contract #6 agreement correction.
 *
 *   npx tsx scripts/dry-run-rethwill-agreement-correction.ts
 *
 * Does not call confirmed correction or mutate contracts.
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { mapAcceptedProposalToContractDraft } from "../lib/proposal-builder/contract-draft.ts";
import type { CanonicalProposal } from "../lib/proposal-builder/types.ts";
import { toClientFacingContractBody } from "../lib/proposal-lifecycle/client-facing-contract.ts";
import { correctContractAgreementFromAccepted } from "../lib/proposal-lifecycle/regenerate-contract-draft.ts";
import { getPayload } from "payload";
import config from "@payload-config";

const CONTRACT_ID = 6;
const PROPOSAL_NUMBER = "KXD-P-2026-0008";
const CLIENT_PIN = "Rethwill";

function applyEnvFile(relativePath: string): boolean {
  const full = resolve(process.cwd(), relativePath);
  if (!existsSync(full)) return false;
  const text = readFileSync(full, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
  return true;
}

function loadProductionEnv(): void {
  applyEnvFile(".env.preview.local");
  const previewUri =
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";
  applyEnvFile(".env.vercel.local");
  applyEnvFile(".env.production.local");
  if (previewUri && /ep-mute-king/i.test(previewUri)) {
    process.env.DATABASE_URI = previewUri;
    process.env.DATABASE_URL = previewUri;
    process.env.POSTGRES_URL = previewUri;
  }
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
  if (!process.env.PAYLOAD_SECRET || process.env.PAYLOAD_SECRET === "[SENSITIVE]") {
    applyEnvFile(".env.local");
    if (previewUri) {
      const cleaned = previewUri.replace(/^["']|["']$/g, "");
      process.env.DATABASE_URI = cleaned;
      process.env.DATABASE_URL = cleaned;
      process.env.POSTGRES_URL = cleaned;
    }
    if (!process.env.PAYLOAD_SECRET || process.env.PAYLOAD_SECRET === "[SENSITIVE]") {
      process.env.PAYLOAD_SECRET = "kxd-dev-secret-change-in-production";
    }
  }
}

async function readContractSnapshot() {
  const payload = await getPayload({ config });
  const doc = (await payload.findByID({
    collection: "contracts" as never,
    id: CONTRACT_ID,
    depth: 0,
    overrideAccess: true,
  })) as Record<string, unknown>;
  const pkg = doc.lifecyclePackage as Record<string, unknown> | null;
  return {
    status: String(doc.status ?? ""),
    updatedAt: String(doc.updatedAt ?? ""),
    signedAt: doc.signedAt ? String(doc.signedAt) : null,
    sentAt: doc.sentAt ? String(doc.sentAt) : null,
    bodyLength: String(doc.body ?? "").length,
    operatorDocumentHash:
      pkg && pkg.operatorSignature && typeof pkg.operatorSignature === "object"
        ? String((pkg.operatorSignature as { documentHash?: string }).documentHash ?? "")
        : null,
  };
}

async function main() {
  loadProductionEnv();
  const before = await readContractSnapshot();
  const result = await correctContractAgreementFromAccepted({
    contractId: CONTRACT_ID,
    actor: "dry-run-rethwill-agreement-correction",
    dryRun: true,
    requireProposalNumber: PROPOSAL_NUMBER,
    requireClientNameIncludes: CLIENT_PIN,
  });
  const after = await readContractSnapshot();

  const payload = await getPayload({ config });
  const proposal = (await payload.find({
    collection: "proposals" as never,
    where: { proposalNumber: { equals: PROPOSAL_NUMBER } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })) as { docs: Array<Record<string, unknown>> };
  const accepted = proposal.docs[0]?.acceptedSnapshot as CanonicalProposal | undefined;
  const fullClientFacing = accepted
    ? toClientFacingContractBody(mapAcceptedProposalToContractDraft(accepted).body)
    : toClientFacingContractBody(result.bodyPreview);
  const clientFacing = fullClientFacing;

  const unchanged =
    before.updatedAt === after.updatedAt &&
    before.status === after.status &&
    before.bodyLength === after.bodyLength &&
    before.signedAt === after.signedAt &&
    before.operatorDocumentHash === after.operatorDocumentHash;

  const report = {
    contractId: CONTRACT_ID,
    dryRun: result.dryRun,
    productionDataUnchanged: unchanged,
    before,
    after,
    acceptedOneTimeTotalCents: result.acceptedOneTimeTotalCents,
    scheduleOk: result.scheduleOk,
    scheduleSumCents: result.scheduleSumCents,
    previousOperatorDocumentHash: result.previousOperatorDocumentHash,
    newClientFacingDocumentHash: result.newClientFacingDocumentHash,
    hashWouldChange:
      Boolean(result.previousOperatorDocumentHash) &&
      result.previousOperatorDocumentHash !== result.newClientFacingDocumentHash,
    signatureReadinessBlockers: result.signatureReadiness.blockers.map((b) => b.code),
    clientFacingChecks: {
      initialPayment3500: clientFacing.includes(
        "Initial payment due upon execution of this Agreement: $3,500.00",
      ),
      noDepositZero: !clientFacing.includes("Deposit: $0.00"),
      courtesyCredit: clientFacing.includes("5,500.00"),
      projectTotal7000: clientFacing.includes("$7,000.00"),
      timelineAssumptions: clientFacing.includes("6-8 week") || clientFacing.includes("6–8 week"),
      humanLegalHeadings: clientFacing.includes("TERM AND TERMINATION"),
      noCamelCaseLegal: !clientFacing.includes("termAndTermination:"),
      taxesSection: clientFacing.includes("TAXES"),
      clientAddressPlaceholder: clientFacing.includes("Client mailing address: To be confirmed"),
      providerAddressPlaceholder: clientFacing.includes("To be confirmed on invoices"),
    },
    bodyPreviewLength: clientFacing.length,
    bodyPreviewExcerpt: clientFacing.slice(0, 3200),
  };

  console.log(JSON.stringify(report, null, 2));
  if (!unchanged) {
    console.error("\nERROR: Production contract row changed during dry-run.\n");
    process.exit(2);
  }
  if (!result.dryRun) {
    console.error("\nERROR: dryRun was not true.\n");
    process.exit(3);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
