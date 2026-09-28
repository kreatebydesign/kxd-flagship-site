/**
 * Cusick September 2026 report approval + official PDF generation.
 *
 * Approves EXISTING drafts #5/#6/#7/#8 via lifecycle, freezes snapshots,
 * generates official PDFs. Does NOT publish, email, invite Don, or provision Billy.
 *
 * Usage:
 *   KXD_CONFIRM_CUSICK_SEPT_REPORT_APPROVAL=1 APPLY=1 \
 *     KXD_SERVER_ONLY_SHIM=1 node --import ./scripts/shims/register-server-only.mjs --import tsx \
 *     scripts/batch-cusick-sept-2026-report-approval.ts
 */

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getPayload } from "payload";
import config from "@payload-config";
import {
  approveBrandedReport,
  generateBrandedReportPdf,
} from "../lib/reporting/branded-client/lifecycle";
import { assertSnapshotImmutable } from "../lib/reporting/branded-client/snapshot";
import type { BrandedReportSnapshot } from "../lib/reporting/branded-client/types";
import {
  formatDbTarget,
  loadPayloadEnv,
  resolveDbTarget,
} from "./lib/payload-db-target";

const CONFIRMED = process.env.KXD_CONFIRM_CUSICK_SEPT_REPORT_APPROVAL === "1";
const APPLY = process.env.APPLY === "1";
const APPROVED_BY = "operator@kreatebydesign.com";
const DON_EMAIL = "don.cusick@deezco.com";
const OUT_DIR = join(process.cwd(), ".qa-cusick-sept-reports", "approved-pdfs");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

const TARGETS = [
  { reportId: 5, clientId: 5, slug: "cmm", nameIncludes: "Morgan" },
  { reportId: 6, clientId: 9, slug: "otp", nameIncludes: "Track" },
  { reportId: 7, clientId: 14, slug: "otp-carts", nameIncludes: "Carts" },
  { reportId: 8, clientId: 10, slug: "2475-townsgate", nameIncludes: "Townsgate" },
] as const;

function clientIdOf(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

function renderPdfPages(pdfPath: string, pagePrefix: string): number {
  const py = existsSync("/tmp/pdfvenv/bin/python")
    ? "/tmp/pdfvenv/bin/python"
    : "python3";
  const out = execFileSync(
    py,
    [
      "-c",
      `
import fitz
doc = fitz.open(${JSON.stringify(pdfPath)})
for i, page in enumerate(doc):
    pix = page.get_pixmap(matrix=fitz.Matrix(1.7, 1.7), alpha=False)
    pix.save(${JSON.stringify(pagePrefix)} + f"{i+1:02d}.png")
print(len(doc))
`,
    ],
    { encoding: "utf8" },
  );
  return Number(out.trim().split("\n").at(-1) || 0);
}

function extractPdfText(pdfPath: string): string {
  const py = existsSync("/tmp/pdfvenv/bin/python")
    ? "/tmp/pdfvenv/bin/python"
    : "python3";
  return execFileSync(
    py,
    [
      "-c",
      `
import fitz
doc = fitz.open(${JSON.stringify(pdfPath)})
parts = []
for page in doc:
    parts.append(page.get_text("text"))
print("\\n".join(parts))
`,
    ],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
  );
}

async function main() {
  loadPayloadEnv();
  const target = resolveDbTarget();
  console.log("\n=== CUSICK SEPT 2026 REPORT APPROVAL + PDF ===\n");
  console.log(`DB target: ${formatDbTarget(target)}`);
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);

  if (!target.isRemote || target.kind !== "remote-postgres") {
    throw new Error("Refusing against a non-remote Postgres target.");
  }
  if (!CONFIRMED) {
    throw new Error(
      "Set KXD_CONFIRM_CUSICK_SEPT_REPORT_APPROVAL=1 to acknowledge production scope.",
    );
  }

  const payload = await getPayload({ config });
  mkdirSync(OUT_DIR, { recursive: true });
  const results: Array<Record<string, unknown>> = [];

  for (const t of TARGETS) {
    const doc = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "monthly-reports" as any,
      id: t.reportId,
      depth: 1,
      overrideAccess: true,
    })) as AnyDoc;

    const owner = clientIdOf(doc.client);
    if (owner !== t.clientId) {
      throw new Error(`Report #${t.reportId} client mismatch: ${owner} vs ${t.clientId}`);
    }
    if (Number(doc.reportingMonth) !== 9 || Number(doc.reportingYear) !== 2026) {
      throw new Error(`Report #${t.reportId} is not September 2026`);
    }
    if (doc.publishedAt) {
      throw new Error(`Report #${t.reportId} already has publishedAt — aborting`);
    }

    const clientName = String(
      doc.client && typeof doc.client === "object" ? doc.client.name : "",
    );
    if (!clientName.toLowerCase().includes(t.nameIncludes.toLowerCase())) {
      throw new Error(`Client name mismatch for #${t.reportId}: ${clientName}`);
    }

    const statusBefore = String(doc.approvalStatus ?? "draft");
    console.log(`\n--- #${t.reportId} ${clientName} status=${statusBefore} ---`);

    if (!APPLY) {
      results.push({
        reportId: t.reportId,
        clientId: t.clientId,
        clientName,
        mode: "dry-run",
        approvalStatus: statusBefore,
        publishedAt: doc.publishedAt ?? null,
      });
      continue;
    }

    let approvedDoc = doc;
    let snapshot: BrandedReportSnapshot | null =
      doc.approvedSnapshot && typeof doc.approvedSnapshot === "object"
        ? (doc.approvedSnapshot as BrandedReportSnapshot)
        : null;

    if (statusBefore === "draft" || statusBefore === "in-review") {
      const approved = await approveBrandedReport(t.reportId, t.clientId, APPROVED_BY);
      approvedDoc = approved.report;
      snapshot = approved.snapshot;
    } else if (
      statusBefore === "approved" ||
      statusBefore === "ready-for-manual-delivery"
    ) {
      if (!snapshot || !doc.approvedFingerprint) {
        throw new Error(`Report #${t.reportId} approved without frozen snapshot`);
      }
      assertSnapshotImmutable(snapshot, String(doc.approvedFingerprint));
    } else {
      throw new Error(`Report #${t.reportId} unexpected status ${statusBefore}`);
    }

    if (!snapshot) throw new Error(`No snapshot for #${t.reportId}`);
    if (snapshot.clientId !== t.clientId || Number(snapshot.reportId) !== t.reportId) {
      throw new Error(`Snapshot cross-client failure for #${t.reportId}`);
    }
    assertSnapshotImmutable(snapshot, snapshot.fingerprint);

    // Ensure publication fields remain unset
    if (approvedDoc.publishedAt) {
      throw new Error(`Approval unexpectedly set publishedAt on #${t.reportId}`);
    }

    // If a prior PDF exists for this fingerprint, remove it so the current exporter
    // re-renders from the frozen snapshot (no snapshot mutation).
    const existingPdfKey = approvedDoc.pdfStorageKey
      ? String(approvedDoc.pdfStorageKey)
      : null;
    if (existingPdfKey) {
      const existingPdfPath = join(process.cwd(), existingPdfKey);
      if (existsSync(existingPdfPath)) {
        unlinkSync(existingPdfPath);
        console.log(`  cleared prior PDF for re-render: ${existingPdfKey}`);
      }
    }

    const pdf = await generateBrandedReportPdf(t.reportId, t.clientId, APPROVED_BY);

    // Re-load to confirm lifecycle state + publishedAt still null
    const after = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "monthly-reports" as any,
      id: t.reportId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;

    if (after.publishedAt) {
      throw new Error(`PDF generation set publishedAt on #${t.reportId}`);
    }
    if (
      after.approvalStatus !== "ready-for-manual-delivery" &&
      after.approvalStatus !== "approved"
    ) {
      throw new Error(
        `Unexpected post-PDF status for #${t.reportId}: ${after.approvalStatus}`,
      );
    }
    if (!after.approvedSnapshot || !after.approvedFingerprint) {
      throw new Error(`Frozen snapshot missing after PDF for #${t.reportId}`);
    }
    assertSnapshotImmutable(
      after.approvedSnapshot as BrandedReportSnapshot,
      String(after.approvedFingerprint),
    );

    // Copy PDF into QA folder
    const qaPdf = join(OUT_DIR, `${t.slug}-sept-2026.pdf`);
    // Prefer lifecycle storage path when present
    const storageKey = after.pdfStorageKey ? String(after.pdfStorageKey) : null;
    const storagePath = storageKey ? join(process.cwd(), storageKey) : null;
    if (storagePath && existsSync(storagePath)) {
      copyFileSync(storagePath, qaPdf);
    } else {
      writeFileSync(qaPdf, pdf.buffer);
    }

    const pagePrefix = join(OUT_DIR, `${t.slug}-pdf-page-`);
    const pageCount = renderPdfPages(qaPdf, pagePrefix);
    const text = extractPdfText(qaPdf);

    // Content assertions (PDF text extraction may space letterspaced cover lines)
    const fails: string[] = [];
    const compact = text.replace(/\s+/g, " ");
    if (!/September\s*2026/i.test(text)) fails.push("missing September 2026");
    if (!/August\s*2026/i.test(text)) fails.push("missing August 2026");
    if (!/M\s*O\s*N\s*T\s*H\s*L\s*Y\s*R\s*E\s*P\s*O\s*R\s*T|Monthly Report/i.test(text)) {
      fails.push("missing Monthly Report");
    }
    if (!compact.toLowerCase().includes(clientName.split(" ")[0]!.toLowerCase())) {
      fails.push("missing client name fragment");
    }
    if (/Configured;\s*last successful sync/i.test(text)) {
      fails.push("sync jargon");
    }
    if (/Operator-authored sections require review/i.test(text)) {
      fails.push("operator review jargon");
    }
    if (/support case|do not describe|not asserted|monthly-deliverables/i.test(text)) {
      fails.push("internal language");
    }
    if (/generate_lead/i.test(text) && t.clientId === 14) {
      fails.push("generate_lead present");
    }
    if (t.clientId === 5) {
      for (const needle of ["496", "457", "409", "159", "2,820"]) {
        if (!text.includes(needle) && !text.includes(needle.replace(",", ""))) {
          fails.push(`missing CMM metric ${needle}`);
        }
      }
    }
    if (t.clientId === 9) {
      if (!/Not available for August/i.test(text)) fails.push("OTP missing GA4 wording");
      if (/Waiting on you:\s|work-group-label">Waiting on you|WAITING ON YOU/i.test(text) &&
          !/nothing is currently waiting on you/i.test(text)) {
        fails.push("OTP unexpectedly has waiting on you");
      }
      // Explicit: the phrase "nothing is currently waiting on you" is allowed.
      if (/\nWaiting on you\n/i.test(text)) {
        fails.push("OTP has Waiting on you work group");
      }
    }
    if (t.clientId === 14) {
      if (!/Waiting on you/i.test(text)) fails.push("OTP Carts missing Waiting on you");
      if (!/Westlake/i.test(text)) fails.push("OTP Carts missing Westlake");
      if (!/Nicole/i.test(text)) fails.push("OTP Carts missing Nicole");
      if (/cart sales/i.test(text) && /conversion/i.test(text)) {
        // ok if clarifying not cart sales
      }
    }
    if (t.clientId === 10) {
      if (!/Tracking began September 28/i.test(text)) {
        fails.push("2475 missing tracking began Sept 28");
      }
      if (!/2026-09-28|September 28/i.test(text)) {
        fails.push("2475 missing Sept 28 completion");
      }
    }
    if (fails.length) {
      throw new Error(`PDF QA failed for #${t.reportId}: ${fails.join("; ")}`);
    }

    results.push({
      reportId: t.reportId,
      clientId: t.clientId,
      clientName,
      approvalStatus: after.approvalStatus,
      publishedAt: after.publishedAt ?? null,
      reportApprovedAt: after.reportApprovedAt ?? null,
      reportApprovedBy: after.reportApprovedBy ?? null,
      approvedFingerprint: String(after.approvedFingerprint).slice(0, 16),
      snapshotFrozen: true,
      pdfStorageKey: after.pdfStorageKey ?? null,
      pdfGeneratedAt: after.pdfGeneratedAt ?? null,
      qaPdf,
      pageCount,
      filename: pdf.filename,
      fingerprint: pdf.fingerprint.slice(0, 16),
      snapshotPeriodLabel: (after.approvedSnapshot as BrandedReportSnapshot).period.label,
      reportMonthLabel:
        (after.approvedSnapshot as BrandedReportSnapshot).presentation?.reportMonthLabel ??
        null,
      googlePerformancePeriodLabel:
        (after.approvedSnapshot as BrandedReportSnapshot).presentation
          ?.googlePerformancePeriodLabel ?? null,
    });

    console.log(
      JSON.stringify(
        {
          reportId: t.reportId,
          approvalStatus: after.approvalStatus,
          publishedAt: after.publishedAt ?? null,
          pageCount,
          qaPdf,
          fingerprint: pdf.fingerprint.slice(0, 16),
        },
        null,
        2,
      ),
    );
  }

  // Exactly four Sept reports, IDs 5-8
  const sept = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "monthly-reports" as any,
    where: {
      and: [
        { client: { in: [5, 9, 14, 10] } },
        { reportingYear: { equals: 2026 } },
        { reportingMonth: { equals: 9 } },
      ],
    },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  });
  const ids = (sept.docs as AnyDoc[]).map((d) => Number(d.id)).sort((a, b) => a - b);
  if (ids.join(",") !== "5,6,7,8") {
    throw new Error(`Unexpected Sept report IDs: ${ids.join(",")}`);
  }
  for (const d of sept.docs as AnyDoc[]) {
    if (d.publishedAt) throw new Error(`Report #${d.id} is published`);
  }

  const don = (
    await payload.find({
      collection: "portal-users",
      where: { email: { equals: DON_EMAIL } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0] as AnyDoc | undefined;
  const invite = (
    await payload.find({
      collection: "portal-invitations",
      where: { id: { equals: 3 } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0] as AnyDoc | undefined;
  const billy = await payload.find({
    collection: "portal-users",
    where: { email: { contains: "billy" } },
    limit: 10,
    depth: 0,
    overrideAccess: true,
  });

  writeFileSync(join(OUT_DIR, "qa-report.json"), JSON.stringify(results, null, 2));

  console.log("\n=== RESULTS ===");
  console.log(JSON.stringify(results, null, 2));
  console.log("SEPT IDS", ids);
  console.log("DON", JSON.stringify({ id: don?.id, active: don?.active ?? null }));
  console.log(
    "INVITE#3",
    JSON.stringify({
      id: invite?.id,
      status: invite?.status,
      sendCount: invite?.sendCount ?? 0,
      sentAt: invite?.sentAt ?? null,
    }),
  );
  console.log("BILLY", billy.docs.length);

  if (!APPLY) console.log("\nDry-run only. Re-run with APPLY=1.");
  console.log("\nDone.\n");
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
