/**
 * Read-only inspect and QA export for Richard Rand proposal ID 4.
 *
 * Default path is read-only: exports, validation, and safety checks only.
 *
 *   CONFIRM_PRODUCTION_DRAFT=richard-rand-heritage-archive \
 *   npx tsx scripts/inspect-richard-rand-proposal.ts
 *
 * Optional share-link preparation (mutates proposal 4 only):
 *
 *   CONFIRM_PRODUCTION_DRAFT=richard-rand-heritage-archive \
 *   CONFIRM_PREPARE_SHARE_LINK=richard-rand-heritage-archive \
 *   npx tsx scripts/inspect-richard-rand-proposal.ts --prepare-share-link
 *
 * Does not accept, charge, invoice, contract-sign, email, or mutate de Bois proposal 1.
 */
import { execFileSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { assertNoInternalLeakage, buildCanonicalProposal } from "../lib/proposal-builder/canonicalize.ts";
import { normalizeProposalDocument } from "../lib/proposal-builder/document.ts";
import { renderProposalPreviewHtml } from "../lib/proposal-builder/export-html.ts";
import { renderProposalPdf } from "../lib/proposal-builder/export-pdf.tsx";
import { renderProposalPlainText } from "../lib/proposal-builder/export-plaintext.ts";
import { resolveKxdReportLogoAsset } from "../lib/kxd-report-engine/logos.ts";
import { calculateProposalTotals } from "../lib/proposal-builder/pricing.ts";
import { dollarsToCents, formatCents } from "../lib/proposal-builder/money.ts";
import { shouldShowRecurringInvestment } from "../lib/proposal-builder/presentation.ts";
import { toProposalCalendarDateString } from "../lib/proposal-builder/calendar-date.ts";
import { createShareLinkRecord } from "../lib/proposal-builder/share.ts";
import type { ShareLinkRecord } from "../lib/proposal-builder/types.ts";

const RICHARD_PROPOSAL_ID = 4;
const TITLE = "Personal Heritage & Digital Archive";
const CLIENT_NAME = "Richard Rand";
const CONFIRM = "richard-rand-heritage-archive";
const CONFIRM_PREPARE = "richard-rand-heritage-archive";
const DE_BOIS_PROPOSAL_ID = 1;
const PROJECT_CENTS = dollarsToCents("6450");
const ANNUAL_CENTS = dollarsToCents("314");
const HOSTING_CENTS = dollarsToCents("299");
const DOMAIN_CENTS = dollarsToCents("15");
const PRE_SHARING_STATUSES = new Set(["draft", "internal-review"]);

const REQUIRED_SNIPPETS = [
  "Personal Heritage & Digital Archive",
  "Richard Rand",
  "Beverly Hills",
  "Hawaii",
  "Australia",
  "California",
  "$6,450.00",
  "$3,225.00",
  "$1,612.50",
  "$299.00",
  "$15.00",
  "$314.00",
  "September 8, 2026",
  "September 22-25, 2026",
  "Direct Agreement",
  "does not replace the formal agreement",
  "defines the scope, investment, schedule, and responsibilities",
  "prepare the formal Direct Agreement",
  "Proposal acceptance authorizes Kreate by Design to prepare the formal Direct Agreement",
  "cannot be guaranteed",
  "Review the proposed scope, investment, schedule, and terms",
  "Discovery and archival-material collection will then be scheduled",
];

const CROSS_CONTAMINATION = [
  "de Bois",
  "debois",
  "Platinum Film",
  "Mattas",
  "$5,500",
  "5,500",
  "randy@deboisentertainment.com",
  "KXD-P-2026-0001",
];

const INTERNAL_LANGUAGE = [
  "kxd os",
  "operator",
  "agreement preparation",
  "internal review",
  "database",
  "record id",
  "admin/",
  "localhost",
  "client type:",
  "no company name or mailing address",
  "does not charge the client",
  "create or mark an invoice",
  "activate the project",
  "phase 1 inside the september",
  "phase 2 inside the september",
  "phases 2-3 inside the september",
  "phases 3-4 inside the september",
];

const FORBIDDEN_CLIENT_LABELS = [
  "Individual",
  "Client type",
  "Primary contact\nRichard Rand\nIndividual",
];

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

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
  delete process.env.MEDIA_BLOB_READ_WRITE_TOKEN;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim() ?? "";
  if (blobToken && !/^vercel_blob_rw_[a-z0-9]+_[a-z0-9]+$/i.test(blobToken)) {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  }
  const neonUri =
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";
  if (!process.env.PAYLOAD_SECRET || process.env.PAYLOAD_SECRET === "[SENSITIVE]") {
    applyEnvFile(".env.local");
    if (neonUri) {
      const cleaned = neonUri.replace(/^["']|["']$/g, "");
      process.env.DATABASE_URI = cleaned;
      process.env.DATABASE_URL = cleaned;
      process.env.POSTGRES_URL = cleaned;
    }
    if (!process.env.PAYLOAD_SECRET || process.env.PAYLOAD_SECRET === "[SENSITIVE]") {
      process.env.PAYLOAD_SECRET = "kxd-dev-secret-change-in-production";
    }
  }
}

function extractPdfText(pdfPath: string, buffer: Buffer): { text: string; pageCount: number; method: string } {
  try {
    const text = execFileSync("pdftotext", ["-layout", pdfPath, "-"], {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
    const pages = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
    const match = pages.match(/Pages:\s+(\d+)/i);
    return {
      text,
      pageCount: match ? Number(match[1]) : 0,
      method: "pdftotext",
    };
  } catch {
    const latin = buffer.toString("latin1");
    const pageCount = (latin.match(/\/Type\s*\/Page(?!s)/g) || []).length;
    return { text: latin, pageCount, method: "pdf-bytes" };
  }
}

function assertNoInternalLanguage(corpus: string): void {
  const lower = corpus.toLowerCase();
  const hits = INTERNAL_LANGUAGE.filter((term) => lower.includes(term));
  if (hits.length) {
    throw new Error(`Client-facing exports contain internal language: ${hits.join(" | ")}`);
  }
  const labelHits = FORBIDDEN_CLIENT_LABELS.filter((term) => corpus.includes(term));
  if (labelHits.length) {
    throw new Error(`Client-facing exports contain CRM labels: ${labelHits.join(" | ")}`);
  }
}

async function fetchBuilderApiResponse(token: string): Promise<Record<string, unknown>> {
  const base =
    process.env.KXD_PUBLIC_BASE_URL?.trim().replace(/\/$/, "") ||
    "https://www.kreatebydesign.com";
  const res = await fetch(`${base}/api/proposal/${encodeURIComponent(token)}/builder`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Builder API fetch failed: HTTP ${res.status}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

async function runInspectRichardRandProposal() {
  if (process.env.CONFIRM_PRODUCTION_DRAFT !== CONFIRM) {
    throw new Error(`Set CONFIRM_PRODUCTION_DRAFT=${CONFIRM}`);
  }
  const prepareShareLink = hasFlag("--prepare-share-link");
  if (prepareShareLink && process.env.CONFIRM_PREPARE_SHARE_LINK !== CONFIRM_PREPARE) {
    throw new Error(
      `Share-link preparation requires CONFIRM_PREPARE_SHARE_LINK=${CONFIRM_PREPARE} and --prepare-share-link`,
    );
  }

  loadProductionEnv();
  const uri = (
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    ""
  ).replace(/^["']|["']$/g, "");
  if (!/neon\.tech/i.test(uri)) throw new Error("Requires Neon DATABASE_URI");
  if (/ep-twilight-math/i.test(uri)) {
    throw new Error("Refusing production database — use isolated preview branch for polish QA");
  }
  process.env.DATABASE_URI = uri;
  process.env.DATABASE_URL = uri;
  process.env.POSTGRES_URL = uri;

  const { getPayload } = await import("payload");
  const { default: config } = await import("@payload-config");
  const payload = await getPayload({ config });

  const deBois = (await payload.findByID({
    collection: "proposals" as never,
    id: DE_BOIS_PROPOSAL_ID,
    depth: 0,
    overrideAccess: true,
  })) as { id: number; title?: string; status?: string; updatedAt?: string };
  if (String(deBois.title) !== "de Bois Entertainment Website Rebuild") {
    throw new Error("Safety: proposal 1 is not de Bois");
  }
  const deBoisUpdatedAt = String(deBois.updatedAt);

  const record = (await payload.findByID({
    collection: "proposals" as never,
    id: RICHARD_PROPOSAL_ID,
    depth: 0,
    overrideAccess: true,
  })) as Record<string, unknown>;

  if (Number(record.id) !== RICHARD_PROPOSAL_ID) {
    throw new Error(`Expected Richard proposal ID ${RICHARD_PROPOSAL_ID}`);
  }
  if (String(record.title) !== TITLE) {
    throw new Error(`Proposal title mismatch: ${String(record.title)}`);
  }

  const clientId =
    typeof record.client === "object" && record.client
      ? Number((record.client as { id: number }).id)
      : Number(record.client);
  const client = (await payload.findByID({
    collection: "clients" as never,
    id: clientId,
    depth: 0,
    overrideAccess: true,
  })) as {
    id: number;
    name?: string;
    slug?: string;
    status?: string;
    primaryContactEmail?: string;
  };
  if (client.name !== CLIENT_NAME) {
    throw new Error(`Client name mismatch: ${client.name}`);
  }

  const doc = normalizeProposalDocument(record.builderDocument);
  const totals = calculateProposalTotals(doc);
  if (totals.oneTimeTotalCents !== PROJECT_CENTS) {
    throw new Error(`One-time total expected $6,450, got ${formatCents(totals.oneTimeTotalCents)}`);
  }
  if (totals.annualTotalCents !== ANNUAL_CENTS) {
    throw new Error(`Annual total expected $314, got ${formatCents(totals.annualTotalCents)}`);
  }
  const hosting = doc.pricingLines.find((l) => l.title.includes("managed hosting"));
  const domain = doc.pricingLines.find((l) => l.title.includes(".com"));
  if (!hosting || hosting.unitPriceCents !== HOSTING_CENTS) {
    throw new Error("Hosting line missing or incorrect");
  }
  if (!domain || domain.unitPriceCents !== DOMAIN_CENTS) {
    throw new Error("Domain line missing or incorrect");
  }
  const scheduleSum = doc.paymentSchedule.reduce((sum, item) => sum + item.amountCents, 0);
  if (scheduleSum !== PROJECT_CENTS) {
    throw new Error("Payment schedule does not total $6,450");
  }

  const proposalDate = toProposalCalendarDateString(String(record.proposalDate ?? ""));
  const expiresAt = toProposalCalendarDateString(String(record.expiresAt ?? ""));
  if (proposalDate !== "2026-09-01") throw new Error(`Bad proposal date ${proposalDate}`);
  if (expiresAt !== "2026-09-08") throw new Error(`Bad expiration ${expiresAt}`);

  const canonical = buildCanonicalProposal({
    id: Number(record.id),
    proposalNumber: String(record.proposalNumber ?? ""),
    status: String(record.status ?? "draft"),
    title: String(record.title ?? ""),
    proposalDate: record.proposalDate as string,
    expiresAt: record.expiresAt as string,
    revisionNumber: Number(record.revisionNumber ?? 1),
    builderDocument: doc,
  });
  const leaks = assertNoInternalLeakage(canonical);
  if (leaks.length) throw new Error(`Leakage: ${leaks.join("; ")}`);

  const logo = resolveKxdReportLogoAsset();
  if (!logo.exists) {
    throw new Error(`Official KXD logo missing at ${logo.absolutePath}`);
  }

  const html = renderProposalPreviewHtml(canonical);
  const { buffer, filename } = await renderProposalPdf(canonical);
  const plain = renderProposalPlainText(canonical);

  const outDir = join(process.cwd(), "tmp", "richard-rand-proposal-qa");
  mkdirSync(outDir, { recursive: true });
  const htmlPath = join(outDir, "preview.html");
  const pdfPath = join(outDir, filename);
  const textPath = join(outDir, "client-facing-text.txt");
  writeFileSync(htmlPath, html);
  writeFileSync(pdfPath, buffer);
  writeFileSync(textPath, plain);

  const pdfText = extractPdfText(pdfPath, buffer);
  const corpus = `${plain}\n${html}\n${pdfText.text}`;
  const missing = REQUIRED_SNIPPETS.filter((s) => !corpus.includes(s));
  if (missing.length) {
    throw new Error(`Missing required snippets in exports: ${missing.join(" | ")}`);
  }
  const contaminated = CROSS_CONTAMINATION.filter((s) => corpus.toLowerCase().includes(s.toLowerCase()));
  if (contaminated.length) {
    throw new Error(`Contamination in exports: ${contaminated.join(" | ")}`);
  }
  assertNoInternalLanguage(corpus);

  let shareUrlPath: string | null = null;
  let sharePrepared = false;
  const statusBefore = String(record.status ?? "");

  if (prepareShareLink) {
    if (Number(record.id) !== RICHARD_PROPOSAL_ID) {
      throw new Error("Refusing share-link preparation for any proposal other than Richard proposal ID 4");
    }
    if (!PRE_SHARING_STATUSES.has(statusBefore)) {
      throw new Error(
        `Refusing share-link preparation from status "${statusBefore}". Allowed: draft, internal-review`,
      );
    }
    if (record.acceptedAt || record.relatedContract) {
      throw new Error("Refusing share-link preparation for accepted or contracted proposal");
    }

    console.warn(
      [
        "WARNING: --prepare-share-link will mutate proposal ID 4 (Richard Rand).",
        "This sets status to approved-for-sharing and refreshes the share snapshot.",
        "It will not accept, invoice, charge, contract, or activate the project.",
        "Existing public token hash is preserved when already present.",
      ].join("\n"),
    );

    const shareCanonical = buildCanonicalProposal({
      id: RICHARD_PROPOSAL_ID,
      proposalNumber: String(record.proposalNumber ?? ""),
      title: String(record.title ?? ""),
      status: "approved-for-sharing",
      acceptanceMode: String(record.acceptanceMode ?? "accept-and-proceed-to-contract"),
      proposalDate: record.proposalDate as string,
      expiresAt: record.expiresAt as string,
      revisionNumber: Number(record.revisionNumber ?? 1),
      builderDocument: doc,
    });
    const version = Number(record.revisionNumber ?? 1) || 1;
    const existingHistory = Array.isArray(record.versionHistory)
      ? (record.versionHistory as Array<Record<string, unknown>>)
      : [];
    const versionHistory = existingHistory.map((v) =>
      Number(v.version) === version
        ? {
            ...v,
            approvedForSharingAt: new Date().toISOString(),
            notes: "Approved for Richard Rand share-link verification.",
            snapshot: shareCanonical,
          }
        : v,
    );

    const hasExistingToken = Boolean(record.publicTokenHash);
    let rawToken: string | null = null;

    await payload.update({
      collection: "proposals" as never,
      id: RICHARD_PROPOSAL_ID,
      data: {
        status: "approved-for-sharing",
        shareSnapshot: shareCanonical,
        shareApprovedAt: new Date().toISOString(),
        shareApprovedBy: "Matt Lunger",
        versionHistory,
      } as never,
      overrideAccess: true,
    });

    if (!hasExistingToken) {
      const { record: shareLink, rawToken: token } = createShareLinkRecord({
        version,
        createdBy: "Matt Lunger",
        expiresAt: (record.expiresAt as string) ?? null,
      });
      const priorLinks = Array.isArray(record.shareLinks)
        ? (record.shareLinks as ShareLinkRecord[])
        : [];
      await payload.update({
        collection: "proposals" as never,
        id: RICHARD_PROPOSAL_ID,
        data: {
          shareLinks: [...priorLinks, shareLink],
          publicTokenHash: shareLink.tokenHash,
          publicTokenExpiresAt: shareLink.expiresAt,
          revoked: false,
        } as never,
        overrideAccess: true,
      });
      rawToken = token;
      shareUrlPath = `/proposal/${token}`;
    } else {
      shareUrlPath = "/proposal/[existing-token-preserved]";
    }

    sharePrepared = true;
    if (rawToken) {
      console.log(`Public share URL prepared: ${shareUrlPath}`);
    } else {
      console.log("Share snapshot refreshed. Existing public token preserved (URL not rotated).");
    }
  }

  const refreshed = (await payload.findByID({
    collection: "proposals" as never,
    id: RICHARD_PROPOSAL_ID,
    depth: 0,
    overrideAccess: true,
  })) as Record<string, unknown>;

  const deBoisAfter = (await payload.findByID({
    collection: "proposals" as never,
    id: DE_BOIS_PROPOSAL_ID,
    depth: 0,
    overrideAccess: true,
  })) as { updatedAt?: string; status?: string };
  if (String(deBoisAfter.updatedAt) !== deBoisUpdatedAt) {
    throw new Error("de Bois proposal changed during inspect. Stop.");
  }

  const qaToken = process.env.RICHARD_PROPOSAL_QA_TOKEN?.trim() ?? "";
  let apiResponsePath: string | null = null;
  let apiCorpus = "";
  if (qaToken) {
    const apiResponse = await fetchBuilderApiResponse(qaToken);
    apiResponsePath = join(outDir, "builder-api-response.json");
    writeFileSync(apiResponsePath, JSON.stringify(apiResponse, null, 2));
    apiCorpus = JSON.stringify(apiResponse);
    assertNoInternalLanguage(apiCorpus);
  } else {
    const localApiSnapshot = {
      source: "local-shareSnapshot",
      proposalId: refreshed.id,
      proposalNumber: refreshed.proposalNumber,
      status: refreshed.status,
      canonical: refreshed.shareSnapshot ?? canonical,
    };
    apiResponsePath = join(outDir, "builder-api-local-snapshot.json");
    writeFileSync(apiResponsePath, JSON.stringify(localApiSnapshot, null, 2));
    apiCorpus = JSON.stringify(localApiSnapshot);
    assertNoInternalLanguage(apiCorpus);
  }

  const tokenPrefix =
    Array.isArray(refreshed.shareLinks) && (refreshed.shareLinks as ShareLinkRecord[])[0]?.tokenPrefix
      ? (refreshed.shareLinks as ShareLinkRecord[])[0].tokenPrefix
      : null;

  console.log(
    JSON.stringify(
      {
        id: refreshed.id,
        status: refreshed.status,
        approvalStatus: refreshed.approvalStatus,
        proposalNumber: refreshed.proposalNumber,
        proposalDate,
        expiresAt,
        client: {
          id: client.id,
          name: client.name,
          slug: client.slug,
          status: client.status,
          email: client.primaryContactEmail,
        },
        oneTimeTotal: formatCents(totals.oneTimeTotalCents),
        annualTotal: formatCents(totals.annualTotalCents),
        showAnnual: shouldShowRecurringInvestment(totals.annualTotalCents),
        paymentSchedule: doc.paymentSchedule.map((p) => ({
          label: p.label,
          amount: formatCents(p.amountCents),
          due: p.due,
        })),
        scopeGroups: doc.scopeGroups.map((g) => g.title),
        exports: {
          htmlPath,
          pdfPath,
          textPath,
          apiResponsePath,
          pdfPages: pdfText.pageCount,
          pdfMethod: pdfText.method,
        },
        urls: {
          editUrl: `/admin/sales/proposals/${refreshed.id}`,
          previewUrl: `/admin/sales/proposals/${refreshed.id}/preview`,
          pdfUrl: `/api/admin/proposal-builder/${refreshed.id}/pdf`,
          publicShareUrl: shareUrlPath,
          tokenPrefixOnly: tokenPrefix,
          sharePrepared,
          readOnly: !prepareShareLink,
        },
        nextSteps: doc.terms.nextSteps,
        acceptanceDisclosure: doc.terms.acceptanceDisclosure,
        paymentStatus: refreshed.paymentStatus ?? null,
        relatedContract: refreshed.relatedContract ?? null,
        acceptedAt: refreshed.acceptedAt ?? null,
        deBoisUntouched: {
          id: deBois.id,
          status: deBoisAfter.status,
          updatedAt: deBoisAfter.updatedAt,
        },
      },
      null,
      2,
    ),
  );
}

runInspectRichardRandProposal().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
