/**
 * LOCAL ONLY — integrity + cross-client denial against disposable July report.
 *   npx tsx --env-file=.env.local --import ./scripts/shims/register-server-only.mjs \
 *     scripts/verify-local-branded-report-auth.ts
 */
import { getPayload } from "payload";
import config from "@payload-config";
import {
  BrandedReportError,
  generateBrandedReportPdf,
  listBrandedReportArchive,
  verifyApprovedSnapshotIntegrity,
} from "../lib/reporting/branded-client/lifecycle.ts";

function assertLocal(): void {
  const uri =
    process.env.DATABASE_URI?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "";
  const host = new URL(uri).hostname;
  const database = new URL(uri).pathname.replace(/^\//, "").split("?")[0] || "";
  if (host !== "127.0.0.1" && host !== "localhost") throw new Error("non-local host");
  if (database !== "kxd_audit_report_review") throw new Error("wrong database");
}

async function main() {
  assertLocal();
  const payload = await getPayload({ config });
  const doc = await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "monthly-reports" as any,
    id: 1,
    depth: 0,
    overrideAccess: true,
  });
  const integrity = verifyApprovedSnapshotIntegrity(
    doc as Record<string, unknown>,
  );
  console.log("integrity", integrity);
  if (!integrity) process.exit(1);

  const archive = await listBrandedReportArchive(1);
  console.log(
    "archive",
    archive.map((a) => ({
      id: a.reportId,
      status: a.approvalStatus,
      pdf: a.pdfAvailable,
      fp: a.fingerprint?.slice(0, 8) ?? null,
    })),
  );

  const pdf = await generateBrandedReportPdf(1, 1, "qa@local.test");
  console.log("idempotent-pdf", pdf.buffer.length, pdf.filename);

  try {
    await generateBrandedReportPdf(1, 2, "qa@local.test");
    console.error("FAIL: cross-client allowed");
    process.exit(1);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const ok = err instanceof BrandedReportError || /cross-client|denied/i.test(msg);
    console.log(ok ? "cross-client-denied" : "unexpected", msg);
    if (!ok) process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}).then(() => {
  process.exit(0);
});
