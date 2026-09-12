/**
 * Render Platinum Film Workz Account Statement PDF preview for visual QA.
 *
 * Local preview only — does NOT file, send, or overwrite production statements.
 *
 *   npx tsx scripts/render-platinum-account-statement.ts
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  composePlatinumFilmWorkzStatement20260912,
  renderAccountStatementPdf,
  validateAccountStatement,
} from "../lib/commercial-documents/account-statement";

async function main() {
  const { document: doc, ledger } = composePlatinumFilmWorkzStatement20260912();
  console.log("Ledger totals (composer):", {
    totalCents: ledger.totalCents,
    paidCents: ledger.paidCents,
    remainingCents: ledger.remainingCents,
    openInvoiceAmountDueCents: ledger.openInvoiceAmountDueCents,
  });

  const issues = validateAccountStatement(doc);
  if (issues.length) {
    console.error("Arithmetic validation failed:");
    for (const issue of issues) console.error(`  - ${issue}`);
    process.exit(1);
  }

  const { buffer, filename } = await renderAccountStatementPdf(doc);
  const outDir = join(
    process.cwd(),
    "report-output",
    "preview-platinum-film-workz-account-statement-2026-09-12",
  );
  const pagesDir = join(outDir, "pages");
  mkdirSync(pagesDir, { recursive: true });

  const pdfPath = join(outDir, filename);
  writeFileSync(pdfPath, buffer);
  console.log(`PDF written: ${pdfPath} (${buffer.length} bytes)`);

  for (const name of readdirSync(pagesDir)) {
    if (name.endsWith(".png")) unlinkSync(join(pagesDir, name));
  }

  const pagePrefix = join(pagesDir, "page");
  let pagesOk = false;
  try {
    execFileSync(
      "pdftoppm",
      ["-png", "-r", "160", pdfPath, pagePrefix],
      { stdio: "inherit" },
    );
    pagesOk = true;
  } catch {
    try {
      execFileSync(
        "magick",
        ["-density", "160", pdfPath, join(pagesDir, "page-%02d.png")],
        { stdio: "inherit" },
      );
      pagesOk = true;
    } catch (error) {
      console.warn(
        "Page PNG render failed — PDF still written.",
        error instanceof Error ? error.message : error,
      );
    }
  }
  if (pagesOk) console.log(`Pages rendered under: ${pagesDir}`);

  try {
    const info = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
    console.log("\npdfinfo:\n" + info);
  } catch {
    try {
      const id = execFileSync("magick", ["identify", pdfPath], {
        encoding: "utf8",
      });
      console.log("\nidentify:\n" + id);
    } catch {
      /* optional */
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
