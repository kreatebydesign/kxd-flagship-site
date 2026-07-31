/**
 * Approval-first branded client monthly reports — deterministic fixture verification.
 * No production. No network. No email. Optional local PDF write under tmp/ (gitignored).
 *
 * Run: npm run verify:branded-client-reports
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { composeBrandedReportSnapshot } from "../lib/reporting/branded-client/compose.ts";
import { buildBrandedReportHtml } from "../lib/reporting/branded-client/export-html.ts";
import { renderBrandedReportPdf } from "../lib/reporting/branded-client/export-pdf.tsx";
import { buildBrandedReportPdfFilename } from "../lib/reporting/branded-client/filename.ts";
import { buildBrandedMetric, safePercentChange } from "../lib/reporting/branded-client/metrics.ts";
import {
  comparisonPeriodFor,
  july2026ControlledPeriod,
} from "../lib/reporting/branded-client/period.ts";
import {
  assertNoSecretLeak,
  escapeHtml,
  sanitizeReportText,
  stripInternalNotesFromSnapshot,
} from "../lib/reporting/branded-client/sanitize.ts";
import {
  buildOutOfScopeOpportunities,
  resolveReportScope,
  scopeIncludes,
} from "../lib/reporting/branded-client/scope.ts";
import {
  assertSnapshotImmutable,
  fingerprintBrandedSnapshot,
} from "../lib/reporting/branded-client/snapshot.ts";
import type { BrandedReportSnapshot } from "../lib/reporting/branded-client/types.ts";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

function fixtureSnapshot(): BrandedReportSnapshot {
  const period = july2026ControlledPeriod("America/Los_Angeles");
  const comparison = comparisonPeriodFor(period);
  const scope = resolveReportScope({
    reportingEnabled: true,
    experienceCapabilities: [],
    operatorConfirmedCapabilities: ["base-website"],
    confirmedBy: "operator@example.com",
    confirmedAt: "2026-07-31T18:00:00.000Z",
  });

  return composeBrandedReportSnapshot({
    reportId: 9001,
    clientId: 42,
    clientName: "Fixture Motors QA",
    version: 1,
    period,
    scope,
    verifiedMetrics: [
      buildBrandedMetric({
        key: "ga4.users",
        label: "Website users",
        value: 1200,
        previousValue: 1000,
        unit: "count",
        periodStart: period.start,
        periodEnd: period.end,
        comparisonStart: comparison.start,
        comparisonEnd: comparison.end,
        source: "GA4",
        lastSuccessfulSyncAt: "2026-07-30T12:00:00.000Z",
        freshness: "fresh",
        completeness: "complete",
        provenance: "verified",
      }),
    ],
    dataSources: [
      {
        providerId: "ga4",
        label: "Google Analytics 4",
        connected: true,
        entitled: true,
        includedInReport: true,
        lastSuccessfulSyncAt: "2026-07-30T12:00:00.000Z",
        freshness: "fresh",
        statusNote: "Fixture verified metric.",
      },
      {
        providerId: "search-console",
        label: "Google Search Console",
        connected: false,
        entitled: false,
        includedInReport: false,
        lastSuccessfulSyncAt: null,
        freshness: "missing",
        statusNote: "Not included in report scope.",
      },
      {
        providerId: "google-ads",
        label: "Google Ads",
        connected: false,
        entitled: false,
        includedInReport: false,
        lastSuccessfulSyncAt: null,
        freshness: "missing",
        statusNote: "Not included in report scope.",
      },
      {
        providerId: "activity",
        label: "Completed work / activity",
        connected: true,
        entitled: true,
        includedInReport: true,
        lastSuccessfulSyncAt: null,
        freshness: "unknown",
        statusNote: "Fixture work items.",
      },
      {
        providerId: "operator",
        label: "Operator narrative",
        connected: true,
        entitled: true,
        includedInReport: true,
        lastSuccessfulSyncAt: null,
        freshness: "fresh",
        statusNote: "Operator-authored sections.",
      },
    ],
    workItems: [
      {
        id: "w1",
        title: "Homepage CTA clarity pass",
        summary: "Refined primary inquiry CTA copy on the homepage.",
        completedAt: "2026-07-12T00:00:00.000Z",
        source: "activity",
        clientVisible: true,
        included: true,
      },
      {
        id: "w-internal",
        title: "INTERNAL ops note",
        summary: "Should not appear when excluded.",
        completedAt: "2026-07-13T00:00:00.000Z",
        source: "activity",
        clientVisible: false,
        included: true,
      },
    ],
    narratives: {
      executiveSummary:
        "Fixture Motors QA made steady progress in July with verified website traffic and focused homepage improvements.",
      augustPriorities: "Continue conversion clarity on high-intent pages.",
    },
    internalNotes: "INTERNAL SECRET — never show in PDF",
  });
}

async function main() {
  console.log("\nBranded client monthly reports verification\n");

  console.log("Period");
  const period = july2026ControlledPeriod();
  assert(period.label === "July 1–30, 2026", "controlled July label");
  assert(period.start.startsWith("2026-07-01"), "starts July 1");
  assert(period.end.startsWith("2026-07-30"), "ends July 30");
  assert(Boolean(period.excludesFinalDayNote), "July 31 exclusion note present");
  assert(period.timezone === "America/Los_Angeles", "default timezone");

  console.log("Comparisons");
  const zero = safePercentChange(10, 0);
  assert(zero.percent === null, "zero baseline does not invent infinite growth");
  const ok = safePercentChange(120, 100);
  assert(ok.percent === 20, "normal percent change");
  assert(safePercentChange(0, 0).percent === 0, "both zero is zero change");

  console.log("Scope fail-closed");
  const failClosed = resolveReportScope({
    reportingEnabled: true,
    experienceCapabilities: [],
  });
  assert(
    failClosed.includedCapabilities.length === 1 &&
      failClosed.includedCapabilities[0] === "base-website",
    "ambiguous scope fails closed to base-website",
  );
  assert(!scopeIncludes(failClosed, "seo"), "SEO locked when not entitled");
  assert(!scopeIncludes(failClosed, "google-ads"), "Ads locked when not entitled");
  const oos = buildOutOfScopeOpportunities(failClosed);
  assert(oos.some((o) => o.capability === "seo"), "SEO listed as upgrade opportunity");
  assert(
    oos.every((o) => o.upgradeFraming.includes("Optional upgrade")),
    "upgrade framing present",
  );

  const disabled = resolveReportScope({
    reportingEnabled: false,
    experienceCapabilities: ["seo", "google-ads", "website-analytics"],
  });
  assert(disabled.includedCapabilities.length === 0, "disabled reporting yields empty scope");

  console.log("Compose + fingerprint");
  const snap = fixtureSnapshot();
  assert(snap.fingerprint.length === 64, "sha256 fingerprint length");
  assert(snap.period.isControlledJuly2026, "controlled period flag");
  assert(snap.internalNotes.includes("INTERNAL"), "internal notes retained on operator snapshot");
  const clientFacing = stripInternalNotesFromSnapshot(snap);
  assert(clientFacing.internalNotes === "", "internal notes stripped for client output");
  assertSnapshotImmutable(snap, snap.fingerprint);
  let mutatedOk = false;
  try {
    assertSnapshotImmutable({ ...snap, clientName: "Tampered" }, snap.fingerprint);
  } catch {
    mutatedOk = true;
  }
  assert(mutatedOk, "tampered snapshot fails integrity check");
  assert(
    fingerprintBrandedSnapshot(snap) === snap.fingerprint,
    "fingerprint stability",
  );

  console.log("Sanitization");
  assert(sanitizeReportText("=CMD()") === "'=CMD()", "formula injection neutralized");
  assert(escapeHtml("<script>") === "&lt;script&gt;", "html escaped");
  try {
    assertNoSecretLeak("hello sk_live_abc123xyz", "probe");
    assert(false, "secret leak detector");
  } catch {
    assert(true, "secret leak detector");
  }

  console.log("HTML preview");
  const html = buildBrandedReportHtml(snap, { includeInternalNotes: false });
  assert(html.includes("Monthly Performance Report"), "cover title present");
  assert(html.includes("Fixture Motors QA"), "client name present");
  assert(html.includes("July 1–30, 2026"), "period present");
  assert(html.includes("matt@kreatebydesign.com"), "support email present");
  assert(!html.includes("INTERNAL SECRET"), "internal notes excluded from client HTML");
  assert(!html.includes("w-internal"), "internal work excluded from list");
  assert(html.includes("Optional upgrades"), "out-of-scope upgrades section");

  console.log("PDF");
  const { buffer, filename } = await renderBrandedReportPdf(snap);
  assert(buffer.length > 1000, "PDF buffer non-trivial");
  assert(buffer.subarray(0, 4).toString() === "%PDF", "PDF magic header");
  assert(
    filename ===
      buildBrandedReportPdfFilename({
        clientName: snap.clientName,
        periodLabel: snap.period.label,
        version: snap.version,
      }),
    "filename matches helper",
  );
  const latin = buffer.toString("latin1");
  assert(!latin.includes("INTERNAL SECRET"), "internal notes absent from PDF bytes");
  assert(!latin.includes("sk_live_"), "no live secret pattern in PDF");

  const outDir = join(process.cwd(), "tmp", "branded-client-reports-qa");
  mkdirSync(outDir, { recursive: true });
  const pdfPath = join(outDir, filename);
  writeFileSync(pdfPath, buffer);
  writeFileSync(join(outDir, "preview.html"), html);
  console.log(`  · wrote local QA artifacts under tmp/branded-client-reports-qa/`);

  console.log(`\nResult: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
