/**
 * Render native proposal preview HTML + PDF from the production de Bois record.
 * Does not send, share, or change status.
 *
 *   CONFIRM_PRODUCTION_DRAFT=de-bois-website-rebuild \
 *   DATABASE_URI="..." \
 *   npx tsx scripts/inspect-de-bois-website-rebuild-proposal.ts
 */
import { execFileSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { getPayload } from "payload";
import config from "@payload-config";
import { assertNoInternalLeakage, buildCanonicalProposal } from "../lib/proposal-builder/canonicalize.ts";
import { normalizeProposalDocument } from "../lib/proposal-builder/document.ts";
import { renderProposalPreviewHtml } from "../lib/proposal-builder/export-html.ts";
import { renderProposalPdf } from "../lib/proposal-builder/export-pdf.tsx";
import { renderProposalPlainText } from "../lib/proposal-builder/export-plaintext.ts";
import { resolveKxdReportLogoAsset } from "../lib/kxd-report-engine/logos.ts";
import { calculateProposalTotals } from "../lib/proposal-builder/pricing.ts";
import { formatCents } from "../lib/proposal-builder/money.ts";
import { shouldShowRecurringInvestment } from "../lib/proposal-builder/presentation.ts";

const TITLE = "de Bois Entertainment Website Rebuild";
const CONFIRM = "de-bois-website-rebuild";

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

async function main() {
  if (process.env.CONFIRM_PRODUCTION_DRAFT !== CONFIRM) {
    throw new Error(`Set CONFIRM_PRODUCTION_DRAFT=${CONFIRM}`);
  }
  const uri = process.env.DATABASE_URI?.trim() || process.env.DATABASE_URL?.trim() || "";
  if (!/neon\.tech/i.test(uri)) throw new Error("Requires Neon production DATABASE_URI");
  if (!process.env.PAYLOAD_SECRET) {
    process.env.PAYLOAD_SECRET = "kxd-dev-secret-change-in-production";
  }

  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: "proposals" as never,
    where: { title: { equals: TITLE } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const record = found.docs[0] as Record<string, unknown> | undefined;
  if (!record) throw new Error("Proposal not found");

  const doc = normalizeProposalDocument(record.builderDocument);
  const totals = calculateProposalTotals(doc);
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

  const outDir = join(process.cwd(), "tmp", "de-bois-proposal-qa");
  mkdirSync(outDir, { recursive: true });
  const htmlPath = join(outDir, "preview.html");
  const pdfPath = join(outDir, filename);
  const textPath = join(outDir, "client-facing-text.txt");
  writeFileSync(htmlPath, html);
  writeFileSync(pdfPath, buffer);
  writeFileSync(textPath, plain);

  const pdfExtract = extractPdfText(pdfPath, buffer);
  writeFileSync(join(outDir, "pdf-extracted-text.txt"), pdfExtract.text);

  try {
    execFileSync("pdftoppm", ["-png", "-r", "120", pdfPath, join(outDir, "page")], {
      stdio: "inherit",
    });
  } catch {
    // Visual page dumps are best-effort when poppler is available.
  }

  const surfaces = {
    html,
    plain,
    pdf: pdfExtract.text,
  };
  const forbidden = [
    "Monthly investment",
    "$0.00/month",
    "binding-proposal",
    "Payment assumptions",
    "Timeline assumptions",
    "Expiration language",
    "Change-request language",
    "There is no monthly retainer",
    "No monthly retainer",
    "No recurring Kreate by Design services",
    "Scope 01",
    "Scope 02",
    "Scope 03",
    "Client-specific context",
    "Client-Specific Context",
  ];
  const hits: Record<string, string[]> = { html: [], plain: [], pdf: [] };
  for (const [name, text] of Object.entries(surfaces)) {
    for (const phrase of forbidden) {
      if (text.includes(phrase)) hits[name].push(phrase);
    }
  }
  const allHits = Object.entries(hits).flatMap(([surface, phrases]) =>
    phrases.map((phrase) => `${surface}:${phrase}`),
  );
  if (allHits.length) {
    throw new Error(`Forbidden client-facing language still present: ${allHits.join("; ")}`);
  }

  if (!html.includes("kxd-logo-transparent.png")) {
    throw new Error("HTML preview is missing the official KXD gold logo");
  }
  if (shouldShowRecurringInvestment(totals.monthlyTotalCents)) {
    throw new Error("Recurring investment should be hidden when monthly total is $0");
  }
  if (plain.includes("Client-Specific Context") || html.includes("Client-specific context")) {
    throw new Error("Client-specific context heading should not appear when the section is empty");
  }

  console.log(
    JSON.stringify(
      {
        id: record.id,
        status: record.status,
        proposalNumber: record.proposalNumber,
        sentAt: record.sentAt ?? null,
        shareApprovedAt: record.shareApprovedAt ?? null,
        oneTime: formatCents(totals.oneTimeTotalCents),
        monthly: formatCents(totals.monthlyTotalCents),
        htmlPath,
        pdfPath,
        textPath,
        pdfBytes: buffer.length,
        pageCount: pdfExtract.pageCount,
        pdfTextMethod: pdfExtract.method,
        logo: {
          publicPath: logo.publicPath,
          relativePath: "public/migrated-assets/brand/kxd-logo-transparent.png",
          exists: logo.exists,
          htmlIncludesLogo: html.includes("kxd-logo-transparent.png"),
        },
        htmlHasOverflowClass: html.includes("overflow"),
        monthlyIsZero: totals.monthlyTotalCents === 0,
        scopeGroups: canonical.scopeGroups.map((g) => ({
          title: g.title,
          deliverableCount: g.deliverables.length,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
