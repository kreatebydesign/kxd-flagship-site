/**
 * Read-only visual QA — Platinum Account Statement as of 2026-10-10.
 * Does NOT mutate the ledger.
 *
 *   npx tsx scripts/qa-platinum-statement-oct10.ts
 */

import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildLiveAccountStatement } from "../lib/client-command/commercial/build-account-statement";
import {
  renderAccountStatementPdf,
  validateAccountStatement,
} from "../lib/commercial-documents/account-statement";
import { normalizeObligationPaymentHistory } from "../lib/commercial-documents/account-statement/normalize-payment-history";
import { normalizeAccountCreditHistory } from "../lib/proposal-lifecycle/account-credit";
import type { InvoiceObligation } from "../lib/proposal-lifecycle/types";

function neonUri(): string {
  const result = spawnSync(
    "npx",
    [
      "neonctl",
      "connection-string",
      "--project-id",
      "mute-violet-81514071",
      "--org-id",
      "org-odd-haze-95704840",
      "--database-name",
      "neondb",
    ],
    { encoding: "utf8" },
  );
  const line = result.stdout.trim().split("\n").filter(Boolean).at(-1);
  if (!line) throw new Error("no neon uri");
  return line;
}

async function main() {
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString: neonUri(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const { rows } = await client.query<{
    id: number;
    title: string;
    lifecycle_package: {
      billingPlan?: { obligations?: InvoiceObligation[] };
    };
  }>(`select id, title, lifecycle_package from contracts where client_id = 18`);
  await client.end();

  const statement = buildLiveAccountStatement({
    clientId: 18,
    clientName: "Platinum Film Workz",
    clientSlug: "platinum-film-workz-20c65f",
    contracts: rows.map((r) => ({
      id: r.id,
      title: r.title,
      lifecyclePackage: r.lifecycle_package,
    })),
    statementDate: "2026-10-10",
  });

  const obligations = rows.flatMap(
    (r) => r.lifecycle_package.billingPlan?.obligations ?? [],
  );
  const payments = normalizeObligationPaymentHistory(obligations);
  const credits = normalizeAccountCreditHistory(obligations);
  const issues = validateAccountStatement(statement.document);
  const pdf = await renderAccountStatementPdf(statement.document);

  const outDir = path.join(
    process.cwd(),
    ".tmp",
    "platinum-account-reconciliation",
  );
  await mkdir(outDir, { recursive: true });
  const pdfPath = path.join(outDir, "platinum-account-statement-2026-10-10.pdf");
  await writeFile(pdfPath, pdf.buffer);

  const pagePrefix = path.join(outDir, "qa-page");
  spawnSync("magick", ["-density", "160", pdfPath, `${pagePrefix}.png`], {
    encoding: "utf8",
  });

  const sept27 = payments.filter((p) => p.paidOn === "2026-09-27");
  const oct10Cash = payments.filter(
    (p) => p.paidOn === "2026-10-10" && p.amountCents === 15_000,
  );
  const overage = credits.find((c) => c.sourceType === "project-overage");
  const referral = credits.find(
    (c) => c.sourceType === "referral-credit" && c.label.includes("Cody Thompson"),
  );

  const pageFiles = spawnSync("bash", ["-lc", `ls -1 "${outDir}"/qa-page*.png 2>/dev/null | wc -l`], {
    encoding: "utf8",
  });
  const pageCount = Number(String(pageFiles.stdout || "0").trim()) || null;

  const checks = {
    outstanding61018: statement.document.summary.totalOutstandingCents === 61_018,
    validationClean: issues.length === 0,
    oneLetterPage: pageCount === 1,
    projectOveragePresent: Boolean(overage && overage.amountCents === 10_000),
    referralPresent: Boolean(referral && referral.amountCents === 10_000),
    singleSept27Payment: sept27.length === 1 && sept27[0]!.amountCents === 40_000,
    singleOct10CashApp150: oct10Cash.length === 1,
  };

  console.log(
    JSON.stringify(
      {
        pdfPath,
        pdfBytes: pdf.buffer.byteLength,
        pageCount,
        outstandingCents: statement.document.summary.totalOutstandingCents,
        outstandingLabel: `$${(statement.document.summary.totalOutstandingCents / 100).toFixed(2)}`,
        validation: issues,
        payments: payments.map((p) => ({
          paidOn: p.paidOn,
          amountCents: p.amountCents,
          label: p.label,
          reference: p.reference,
        })),
        credits: credits.map((c) => ({
          creditedOn: c.creditedOn,
          amountCents: c.amountCents,
          label: c.label,
          sourceType: c.sourceType,
        })),
        sept27Count: sept27.length,
        checks,
        allPassed: Object.values(checks).every(Boolean),
      },
      null,
      2,
    ),
  );

  if (!Object.values(checks).every(Boolean)) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
