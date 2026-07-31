/**
 * LOCAL ONLY — disposable branded July report lifecycle on kxd_audit_report_review.
 * Does not email. Does not touch Proposal ID 1. Does not target Neon/production.
 *
 *   npx tsx --env-file=.env.local --import ./scripts/shims/register-server-only.mjs \
 *     scripts/run-local-branded-july-report-qa.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  approveBrandedReport,
  generateBrandedClientReport,
  generateBrandedReportPdf,
} from "../lib/reporting/branded-client/lifecycle.ts";
import { BrandedReportError } from "../lib/reporting/branded-client/lifecycle.ts";

function assertLocalReviewDb(): void {
  const uri =
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    "";
  if (!uri) throw new Error("DATABASE_URI/DATABASE_URL missing");
  const parsed = new URL(uri);
  const host = parsed.hostname;
  const database = parsed.pathname.replace(/^\//, "").split("?")[0] || "";
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(`Refusing: non-localhost host (${host})`);
  }
  if (/neon\.tech|amazonaws\.com|vercel-storage/i.test(uri)) {
    throw new Error("Refusing: remote/Neon markers in connection string");
  }
  if (database !== "kxd_audit_report_review") {
    throw new Error(
      `Refusing: expected database kxd_audit_report_review, got ${database || "(empty)"}`,
    );
  }
}

async function main() {
  assertLocalReviewDb();
  const clientId = 1;

  const generated = await generateBrandedClientReport({
    clientId,
    year: 2026,
    month: 7,
    startDay: 1,
    endDay: 30,
    operatorCapabilities: ["base-website"],
    confirmedBy: "qa@local.test",
    preparedBy: "qa@local.test",
  });

  console.log("generated", {
    reportId: generated.report.id,
    status: generated.report.approvalStatus,
    period: generated.snapshot.period.label,
    fingerprint: generated.snapshot.fingerprint.slice(0, 12),
  });

  const approved = await approveBrandedReport(
    Number(generated.report.id),
    clientId,
    "qa@local.test",
  );
  console.log("approved", {
    status: approved.report.approvalStatus,
    fingerprint: approved.snapshot.fingerprint.slice(0, 12),
  });

  const pdf = await generateBrandedReportPdf(
    Number(generated.report.id),
    clientId,
    "qa@local.test",
  );
  const outDir = join(process.cwd(), "tmp", "branded-client-reports-qa");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `local-db-${pdf.filename}`);
  writeFileSync(outPath, pdf.buffer);
  console.log("pdf", {
    bytes: pdf.buffer.length,
    filename: pdf.filename,
    localPath: outPath,
    delivery: "manual-download-only",
  });

  try {
    await generateBrandedReportPdf(Number(generated.report.id), 99999, "qa@local.test");
    console.error("FAIL: cross-client PDF access was allowed");
    process.exit(1);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const ok =
      err instanceof BrandedReportError ||
      msg.toLowerCase().includes("cross-client") ||
      msg.toLowerCase().includes("denied");
    console.log(ok ? "cross-client-denied" : "unexpected-error", msg);
    if (!ok) process.exit(1);
  }

  console.log("LOCAL branded July report QA complete (no email).");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}).then(() => {
  process.exit(0);
});
