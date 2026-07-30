/**
 * Website Audit Report Generator — deterministic fixture verification.
 * No database. No production. No network.
 *
 * Run: npm run verify:website-audit-report
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildCanonicalAuditReport,
  resolveClientFacingReport,
  stripInternalForClient,
} from "../lib/website-audit-report/canonicalize.ts";
import { generateAuditNarrative } from "../lib/website-audit-report/narrative.ts";
import { deriveAutomatedFindings } from "../lib/website-audit-report/findings.ts";
import { buildDefaultActionPlan } from "../lib/website-audit-report/plan.ts";
import { dedupeClientActionPlan } from "../lib/website-audit-report/dedupe-actions.ts";
import {
  actionPlanHasUniqueGroupMembership,
  composeClientActionPlan,
  isObservationStyleAction,
} from "../lib/website-audit-report/compose-client-actions.ts";
import { buildAuditReportHtml } from "../lib/website-audit-report/export-html.ts";
import { buildAuditReportPdfFilename } from "../lib/website-audit-report/filename.ts";
import { renderAuditReportPdf } from "../lib/website-audit-report/export-pdf.tsx";
import { resolveKxdReportLogoAsset } from "../lib/kxd-report-engine/logos.ts";
import { validateSafePublicWebsiteUrl, UnsafeAuditUrlError } from "../lib/website-audit/url-safety.ts";
import type {
  ActionPlanItem,
  AuditReportSource,
  FindingOverride,
  ManualFinding,
} from "../lib/website-audit-report/types.ts";

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

function fixtureSource(overrides: Partial<AuditReportSource> = {}): AuditReportSource {
  return {
    id: 42,
    name: "Alex Prospect",
    email: "alex@example.com",
    company: "Northwind Studio",
    website: "https://northwind.example",
    overallScore: 74,
    grade: "C",
    performanceScore: 78,
    seoScore: 62,
    mobileScore: 80,
    conversionScore: 58,
    brandScore: 71,
    strengths:
      "Viewport meta tag configured for mobile rendering.\nPage title is present and within a strong SEO length range.",
    opportunities:
      "No form detected — missed opportunity for direct lead capture.\nMeta description could be refined for stronger search click-through.\nPage response time is slow — visitors may abandon before content loads.",
    recommendations:
      "Introduce a focused inquiry or booking form on high-intent pages.\nAdd a compelling meta description aligned to your primary service.\nOptimize hosting, caching, and image delivery to improve load speed.",
    completedAt: "2026-07-28T16:00:00.000Z",
    createdAt: "2026-07-28T16:00:00.000Z",
    reportStatus: "draft",
    internalNotes: "INTERNAL SECRET — never show in PDF",
    ...overrides,
  };
}

async function main() {
  console.log("\nWebsite Audit Report Generator verification\n");

  // ── Identity ────────────────────────────────────────────────────────────
  console.log("Identity");
  const prospect = fixtureSource();
  const prospectCanonical = buildCanonicalAuditReport(prospect);
  assert(prospectCanonical.companyName === "Northwind Studio", "prospect company name");
  assert(prospectCanonical.contactName === "Alex Prospect", "prospect contact name");
  assert(prospectCanonical.clientId == null, "prospect has no client id");

  const clientLinked = fixtureSource({
    client: { id: 7, name: "Acme Client", companyWebsite: "https://acme.example" },
    canonicalWebsiteUrl: "https://acme.example",
    website: "https://campaign.acme.example/landing",
  });
  const clientCanonical = buildCanonicalAuditReport(clientLinked);
  assert(clientCanonical.clientId === 7, "existing-client association");
  assert(clientCanonical.canonicalClientUrl === "https://acme.example", "canonical URL from client");
  assert(
    clientCanonical.auditedUrl === "https://campaign.acme.example/landing",
    "intentional URL override preserved",
  );

  // ── SSRF / URL safety (reuse auditor guard) ─────────────────────────────
  console.log("URL safety");
  try {
    await validateSafePublicWebsiteUrl("http://127.0.0.1/");
    assert(false, "loopback URL rejected");
  } catch (err) {
    assert(err instanceof UnsafeAuditUrlError, "loopback URL rejected");
  }
  try {
    await validateSafePublicWebsiteUrl("file:///etc/passwd");
    assert(false, "file protocol rejected");
  } catch (err) {
    assert(err instanceof UnsafeAuditUrlError, "file protocol rejected");
  }

  // ── Findings & narrative ────────────────────────────────────────────────
  console.log("Findings & narrative");
  const findings = deriveAutomatedFindings(prospect);
  assert(findings.some((f) => f.sourceKind === "strength"), "strength findings derived");
  assert(findings.some((f) => f.sourceKind === "opportunity"), "opportunity findings derived");
  assert(findings.every((f) => f.provenance === "automated"), "automated provenance");

  const narrative = generateAuditNarrative(prospect);
  assert(narrative.executiveSummary.includes("Northwind Studio"), "narrative grounded in company");
  assert(narrative.executiveSummary.includes("74"), "narrative includes overall score");
  assert(!narrative.executiveSummary.includes("INTERNAL"), "narrative excludes internal notes");

  // ── Curated content separation ──────────────────────────────────────────
  console.log("Curated content");
  const overrides: FindingOverride[] = [
    { id: "opportunity-0", hidden: true },
    { id: "opportunity-1", explanation: "Refined client-facing SEO explanation." },
  ];
  const manuals: ManualFinding[] = [
    {
      id: "manual-1",
      title: "Trust signals weak above the fold",
      category: "brand",
      severity: "attention",
      observed: "No testimonials visible on the landing page.",
      whyItMatters: "Buyers look for proof before contacting a premium studio.",
      recommendation: "Add 2–3 concise proof points near the primary CTA.",
      createdAt: "2026-07-28T17:00:00.000Z",
    },
  ];
  const plan: ActionPlanItem[] = buildDefaultActionPlan(prospect, manuals);
  plan[0] = { ...plan[0]!, group: "growth", order: 0 };
  for (let i = 0; i < plan.length; i++) {
    const item = plan[i]!;
    if (item.text.includes("No form detected") || i === 1) {
      plan[i] = { ...item, hidden: true };
    }
  }

  const curated = buildCanonicalAuditReport(
    fixtureSource({
      executiveSummary: narrative.executiveSummary,
      workingWell: narrative.workingWell,
      losingOpportunity:
        "Conversion path clarity and search snippet quality are the primary gaps for this business.",
      recommendedNextSteps: narrative.recommendedNextSteps,
      closingNote: narrative.closingNote,
      reportTitle: narrative.reportTitle,
      findingOverrides: overrides,
      manualFindings: manuals,
      recommendationPlan: plan,
      internalNotes: "INTERNAL SECRET — never show in PDF",
    }),
  );

  assert(
    curated.findings.find((f) => f.id === "opportunity-0")?.included === false,
    "hidden finding excluded from included flag",
  );
  assert(
    curated.findings.find((f) => f.id === "opportunity-1")?.detected ===
      "Refined client-facing SEO explanation.",
    "edited finding explanation applied",
  );
  assert(
    curated.findings.some((f) => f.id === "manual-1" && f.provenance === "manual"),
    "manual finding provenance",
  );
  assert(Boolean(curated.actionPlan.some((a) => a.hidden === true)), "recommendation exclusion");
  assert(curated.actionPlan[0]?.group === "growth", "recommendation regrouping");
  assert(Boolean(curated.internalNotes?.includes("INTERNAL")), "internal notes kept on draft model");

  const clientFacing = stripInternalForClient(curated);
  assert(clientFacing.internalNotes === null, "internal notes stripped for client surface");
  assert(
    !clientFacing.findings.some((f) => f.id === "opportunity-0"),
    "hidden findings removed from client surface",
  );
  assert(
    clientFacing.findings.some((f) => f.id === "manual-1"),
    "manual findings included when not hidden",
  );

  // ── Approval stability ──────────────────────────────────────────────────
  console.log("Approval stability");
  const approvedLive = stripInternalForClient(curated);
  const approvedSource = fixtureSource({
    reportStatus: "approved",
    executiveSummary: "LIVE DRAFT SHOULD NOT APPEAR",
    approvedSnapshot: {
      ...approvedLive,
      reportStatus: "approved",
      executiveSummary: approvedLive.executiveSummary,
    },
    findingOverrides: [],
    manualFindings: [],
  });
  const fromSnapshot = resolveClientFacingReport(approvedSource);
  assert(
    fromSnapshot.executiveSummary === approvedLive.executiveSummary,
    "approved report uses snapshot, not live draft",
  );
  assert(
    !fromSnapshot.executiveSummary.includes("LIVE DRAFT"),
    "approved snapshot ignores later draft edits",
  );

  // ── Action plan deduplication ───────────────────────────────────────────
  console.log("Action plan deduplication");
  const exactDupes = dedupeClientActionPlan([
    {
      id: "a",
      sourceId: "recommendation-0",
      sourceKind: "recommendation",
      group: "fix-first",
      text: "Add a compelling meta description aligned to your primary service.",
      order: 0,
      included: true,
    },
    {
      id: "b",
      sourceId: "recommendation-0-copy",
      sourceKind: "recommendation",
      group: "improve-next",
      text: "Add a compelling meta description aligned to your primary service.",
      order: 1,
      included: true,
    },
  ]);
  assert(exactDupes.length === 1, "exact duplicate recommendations merge");

  const closeDupes = dedupeClientActionPlan([
    {
      id: "r1",
      sourceId: "recommendation-1",
      sourceKind: "recommendation",
      group: "fix-first",
      text: "Add a compelling meta description aligned to your primary service.",
      order: 0,
      included: true,
    },
    {
      id: "o1",
      sourceId: "opportunity-1",
      sourceKind: "opportunity",
      group: "improve-next",
      text: "Meta description could be refined for stronger search click-through.",
      order: 1,
      included: true,
    },
  ]);
  assert(closeDupes.length === 1, "close meta-description rec+opp merge");
  assert(
    closeDupes[0].sourceKind === "recommendation",
    "merged meta item prefers recommendation wording",
  );

  const distinctKept = composeClientActionPlan([
    {
      id: "c1",
      sourceId: "recommendation-2",
      sourceKind: "recommendation",
      group: "growth",
      text: "Clarify one primary conversion path — book, apply, or contact — across hero and footer.",
      order: 0,
      included: true,
    },
    {
      id: "c2",
      sourceId: "opportunity-2",
      sourceKind: "opportunity",
      group: "growth",
      text: "Conversion language is present but could be stronger and more focused.",
      order: 1,
      included: true,
    },
    {
      id: "c3",
      sourceId: "recommendation-3",
      sourceKind: "recommendation",
      group: "growth",
      text: "Strengthen primary CTA verbs on the hero without changing the offer.",
      order: 2,
      included: true,
    },
  ]);
  assert(
    !distinctKept.some((a) => /conversion language is present/i.test(a.text)),
    "pure observation excluded from action plan",
  );
  assert(
    distinctKept.some((a) => /conversion path/i.test(a.text)),
    "related executable conversion-path action remains",
  );
  assert(
    distinctKept.filter((a) => /conversion path|cta verbs/i.test(a.text)).length === 2,
    "similar-but-distinct executable actions remain separate",
  );

  const preferredOverObservation = composeClientActionPlan([
    {
      id: "o-meta",
      sourceId: "opportunity-meta",
      sourceKind: "opportunity",
      group: "improve-next",
      text: "Meta description could be refined for stronger search click-through.",
      order: 0,
      included: true,
    },
    {
      id: "r-meta",
      sourceId: "recommendation-meta",
      sourceKind: "recommendation",
      group: "fix-first",
      text: "Add a compelling meta description aligned to your primary service.",
      order: 1,
      included: true,
    },
  ]);
  assert(preferredOverObservation.length === 1, "observation+recommendation collapses to one action");
  assert(
    /Add a compelling meta description/i.test(preferredOverObservation[0].text),
    "stored actionable recommendation preferred over related observation",
  );

  const manualKept = composeClientActionPlan([
    {
      id: "m1",
      sourceId: "manual-1",
      sourceKind: "manual",
      group: "improve-next",
      text: "Document the approved voice guidelines for homepage CTAs.",
      order: 0,
      included: true,
    },
  ]);
  assert(manualKept.length === 1, "valid manual action preserved");

  assert(
    isObservationStyleAction({
      id: "obs",
      sourceId: "opportunity-x",
      sourceKind: "opportunity",
      group: "growth",
      text: "Conversion language is present but could be stronger and more focused.",
      order: 0,
      included: true,
    }),
    "conversion-language wording classified as observation",
  );

  console.log("Action plan grouping");
  const grouped = composeClientActionPlan([
    {
      id: "fix",
      sourceId: "recommendation-0",
      sourceKind: "recommendation",
      group: "fix-first",
      text: "Introduce a focused inquiry or booking form on high-intent pages.",
      order: 0,
      included: true,
    },
    {
      id: "a11y",
      sourceId: "recommendation-a11y",
      sourceKind: "recommendation",
      group: "monitor",
      text: "Raise secondary navigation contrast and verify keyboard focus states.",
      order: 1,
      included: true,
    },
    {
      id: "https",
      sourceId: "recommendation-https",
      sourceKind: "recommendation",
      group: "monitor",
      text: "Serve all assets over HTTPS and remove mixed-content references.",
      order: 2,
      included: true,
    },
    {
      id: "mon",
      sourceId: "recommendation-mon",
      sourceKind: "recommendation",
      group: "monitor",
      text: "Continue to monitor Core Web Vitals after the hosting changes land.",
      order: 3,
      included: true,
    },
    {
      id: "manual-group",
      sourceId: "manual-keep",
      sourceKind: "manual",
      group: "monitor",
      text: "Continue to monitor form completion rates after CTA rewrite.",
      order: 4,
      included: true,
    },
  ]);
  assert(
    grouped.find((a) => a.id === "fix")?.group === "fix-first",
    "high-priority deterministic issue remains in Address First (Fix first)",
  );
  assert(
    grouped.find((a) => a.id === "a11y")?.group === "improve-next",
    "accessibility correction grouped under Improve Next",
  );
  assert(
    grouped.find((a) => a.id === "https")?.group === "improve-next",
    "mixed-content/HTTPS correction grouped under Improve Next",
  );
  assert(
    grouped.find((a) => a.id === "mon")?.group === "monitor",
    "genuine monitoring item stays under Continue Monitoring",
  );
  assert(
    grouped.find((a) => a.id === "manual-group")?.group === "monitor",
    "explicit valid operator grouping preserved for manual action",
  );
  assert(actionPlanHasUniqueGroupMembership(grouped), "no action appears in multiple groups");

  const editorPlanIntact = buildDefaultActionPlan(
    fixtureSource({
      recommendations:
        "Add a compelling meta description aligned to your primary service.\nOptimize hosting, caching, and image delivery to improve load speed.",
      opportunities:
        "Meta description could be refined for stronger search click-through.\nPage response time is slow — visitors may abandon before content loads.\nConversion language is present but could be stronger and more focused.",
    }),
  );
  assert(editorPlanIntact.length >= 3, "stored/default plan retains pre-dedupe items for editor");
  const clientFacingPlan = resolveClientFacingReport(
    fixtureSource({
      recommendationPlan: editorPlanIntact,
    }),
  ).actionPlan;
  assert(
    clientFacingPlan.length < editorPlanIntact.length,
    "client-facing resolve applies composition without deleting editor plan source",
  );
  assert(
    !clientFacingPlan.some((a) => /conversion language is present/i.test(a.text)),
    "client-facing resolve excludes conversion-language observation",
  );

  // Fixture label not hardcoded in shared presentation
  const presentationSrc = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../lib/website-audit-report/presentation.ts"),
    "utf8",
  );
  const engineTokens = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../lib/kxd-report-engine/tokens.ts"),
    "utf8",
  );
  assert(!presentationSrc.includes("[LOCAL DEMO]"), "[LOCAL DEMO] not in presentation helpers");
  assert(!engineTokens.includes("[LOCAL DEMO]"), "[LOCAL DEMO] not in shared report-engine tokens");

  // Professional assessment remains on the editable canonical model
  assert(
    typeof clientFacing.workingWell === "string" && clientFacing.workingWell.length > 0,
    "professional assessment narrative remains present/editable on model",
  );

  // ── Preview / PDF parity ────────────────────────────────────────────────
  console.log("Preview & PDF");
  const logoAsset = resolveKxdReportLogoAsset();
  assert(logoAsset.exists, "official KXD logo asset resolves on disk");
  assert(
    logoAsset.publicPath.includes("kxd-logo-transparent.png"),
    "logo public path points at official monogram PNG",
  );

  const html = buildAuditReportHtml(clientFacing);
  assert(html.includes("Website Audit Report"), "HTML includes Website Audit Report cover type");
  assert(html.includes("Northwind Studio"), "HTML includes company");
  assert(html.includes("northwind.example"), "HTML includes audited domain");
  assert(!html.includes("INTERNAL SECRET"), "HTML excludes internal notes");
  assert(!html.includes("No form detected"), "HTML excludes hidden finding text");
  assert(html.includes("Trust signals weak"), "HTML includes manual finding");
  assert(html.includes("Kreate by Design"), "HTML includes KXD branding");
  assert(html.includes("matt@kreatebydesign.com"), "HTML uses correct KXD contact email");
  assert(!html.includes("hello@kreatebydesign.com"), "HTML excludes incorrect contact email");
  assert(!html.includes("Measured / detected by Website Auditor"), "HTML avoids robotic auditor label");
  assert(html.includes("Audit evidence") || html.includes("Professional review"), "HTML uses natural provenance label");
  assert(!html.includes('class="lead"'), "HTML cover does not use redundant lead company line");
  assert(html.includes("<h1>Northwind Studio</h1>"), "HTML cover uses company as primary headline");
  assert((html.match(/<h1>Northwind Studio<\/h1>/g) || []).length === 1, "client name appears once on cover");
  assert(html.includes("cover-page"), "HTML has dedicated cover treatment");
  assert(html.includes(logoAsset.publicPath), "HTML references official logo asset");
  assert(html.includes("74 / 100"), "HTML shows explicit score scale");
  assert(html.includes("Grade C"), "HTML includes grade with context");
  assert(html.includes("Serviceable with clear gaps") || html.includes("serviceable with clear gaps"), "HTML includes score condition");

  const sectionOrder = [
    "Executive summary",
    "Overall score",
    "Findings",
    "Priority action plan",
    "KXD professional assessment",
    "Appendix",
  ];
  let lastIdx = -1;
  let orderOk = true;
  for (const label of sectionOrder) {
    const idx = html.indexOf(label);
    if (idx === -1 || idx < lastIdx) orderOk = false;
    lastIdx = idx;
  }
  assert(orderOk, "HTML section order matches report hierarchy");

  const filename = buildAuditReportPdfFilename(clientFacing);
  assert(filename.startsWith("kxd-website-audit-"), "PDF filename prefix");
  assert(filename.endsWith(".pdf"), "PDF filename extension");
  assert(filename.includes("northwind"), "PDF filename includes company slug");
  assert(filename.includes("2026-07-28"), "PDF filename includes audit date");

  const { buffer, filename: renderedName } = await renderAuditReportPdf(clientFacing);
  assert(buffer.length > 1000, "PDF buffer produced");
  assert(buffer.subarray(0, 4).toString() === "%PDF", "PDF magic header");
  assert(renderedName === filename, "PDF render uses same filename helper");

  const outDir = join(dirname(fileURLToPath(import.meta.url)), "../tmp");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "fixture-website-audit-report.pdf");
  writeFileSync(outPath, buffer);
  console.log(`  → Wrote fixture PDF: ${outPath}`);

  // Re-read to confirm file integrity
  const disk = readFileSync(outPath);
  assert(disk.subarray(0, 4).toString() === "%PDF", "fixture PDF on disk is valid");

  // Regeneration does not touch raw evidence fields conceptually
  console.log("Raw evidence preservation");
  const afterNarrative = fixtureSource({
    ...prospect,
    ...generateAuditNarrative(prospect),
    strengths: prospect.strengths,
    opportunities: prospect.opportunities,
    recommendations: prospect.recommendations,
    overallScore: prospect.overallScore,
  });
  assert(afterNarrative.strengths === prospect.strengths, "raw strengths unchanged by narrative");
  assert(
    afterNarrative.overallScore === prospect.overallScore,
    "raw overall score unchanged by narrative",
  );

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
