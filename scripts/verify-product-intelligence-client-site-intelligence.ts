/**
 * Product Intelligence — Client Site Intelligence V1 Human Decision gate.
 *   npm run verify:product-intelligence-client-site-intelligence
 *
 * Decision institutionalization + CSI pack attach on clean main.
 * Does not require KXD Sign or Continuous Intelligence PI packs.
 * No ingest runtime exercise here (see verify:client-site-intelligence-csi-v1-a).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CLIENT_SITE_INTELLIGENCE_IMPLEMENTATION_BATCHES,
  CLIENT_SITE_INTELLIGENCE_PI_VERDICT,
  CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE,
  CLIENT_SITE_INTELLIGENCE_V1_SCOPE,
  CSI_IDS,
  EDITION_1_PRODUCT_DNA,
  MAJOR_CAPABILITY_PI_GATE,
  OTP_CARTS_LEAD_ATTRIBUTION_SHA,
  attachClientSiteIntelligenceMemory,
  attachDecisionArchive,
  createProductIntelligenceIndex,
  loadClientSiteIntelligenceMemory,
  loadDecisionArchive,
  verifyProductIntelligenceConsistency,
} from "../lib/product-intelligence/index.ts";

const root = process.cwd();
let passed = 0;
function ok(label: string) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

console.log("\nverify:product-intelligence-client-site-intelligence\n");

{
  assert.equal(CLIENT_SITE_INTELLIGENCE_PI_VERDICT.verdict, "PROCEED_WITH_CHANGES");
  assert.equal(CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.implemented, false);
  assert.equal(CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.shipped, false);
  assert.equal(CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.productionProven, false);
  assert.equal(
    CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.capabilityState,
    "IN_IMPLEMENTATION",
  );
  assert.equal(CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.referenceClientKey, "otp-carts");
  assert.equal(CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.foundationBatch, "csi-v1-a");
  assert.equal(CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.foundationImplementedLocally, true);
  assert.equal(CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.foundationProductionProven, true);
  assert.equal(CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.nextImplementationBatch, "csi-v1-c");
  assert.equal(CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.ingestApiImplemented, true);
  assert.equal(CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.hmacImplemented, true);
  assert.equal(CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.collectionsImplemented, true);
  assert.equal(CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.saleConfirmationUiImplemented, true);
  assert.equal(CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.commissionUiImplemented, true);
  assert.equal(CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.continuousIntelligenceUnchanged, true);
  assert.equal(CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE.productDnaUnchanged, true);
  assert.ok(CLIENT_SITE_INTELLIGENCE_V1_SCOPE.inScope.length >= 8);
  assert.ok(CLIENT_SITE_INTELLIGENCE_V1_SCOPE.outOfScopeV1.length >= 8);
  assert.ok(
    CLIENT_SITE_INTELLIGENCE_V1_SCOPE.outOfScopeV1.some((x) => /CRM/i.test(x)),
  );
  assert.ok(
    CLIENT_SITE_INTELLIGENCE_V1_SCOPE.outOfScopeV1.some((x) =>
      /auto-commission|Automatic commission/i.test(x),
    ),
  );
  assert.ok(
    CLIENT_SITE_INTELLIGENCE_V1_SCOPE.outOfScopeV1.some((x) =>
      /Product Intelligence|Continuous Intelligence/i.test(x),
    ),
  );
  assert.ok(
    CLIENT_SITE_INTELLIGENCE_V1_SCOPE.inScope.some((x) => /Activity Engine/i.test(x)),
  );
  assert.equal(CLIENT_SITE_INTELLIGENCE_IMPLEMENTATION_BATCHES[0]?.id, "csi-v1-a");
  assert.equal(
    OTP_CARTS_LEAD_ATTRIBUTION_SHA,
    "88da435f647e5d24be7a5f49ff739f2dcb552a2d",
  );
  ok("PI verdict PROCEED_WITH_CHANGES with explicit scope, exclusions, batches");
}

{
  assert.ok(MAJOR_CAPABILITY_PI_GATE.flow.includes("PRODUCT_INTELLIGENCE_REVIEW"));
  assert.ok(MAJOR_CAPABILITY_PI_GATE.flow.includes("HUMAN_DECISION"));
  ok("MAJOR_CAPABILITY_PI_GATE still required for this capability class");
}

{
  const archive = loadDecisionArchive();
  assert.ok(archive.integrity.ok, archive.integrity.unresolvedLinks.join("; "));
  const decision = archive.decisions.find(
    (d) => d.id === "decision:client-site-intelligence-v1",
  );
  assert.ok(decision);
  assert.equal(decision!.updateChannel, "manual_approval");
  assert.equal(decision!.detail.outcome, "validated");
  assert.ok(/PROCEED WITH CHANGES/i.test(decision!.summary));
  assert.ok(/NOT implemented/i.test(decision!.summary));
  assert.ok(decision!.detail.relatedRoadmapIds.includes(CSI_IDS.roadmapV1));
  assert.ok(decision!.detail.relatedRoadmapIds.includes(CSI_IDS.roadmapOtpSeo));
  assert.ok(
    decision!.detail.relatedInventoryIds.includes(CSI_IDS.inventoryCapability),
  );
  assert.ok(
    decision!.detail.relatedArchitectureIds.includes(CSI_IDS.architecture),
  );
  assert.ok(/\$300|300/.test(decision!.detail.statement));
  assert.ok(/not a CRM|leads≠CRM|not CRM/i.test(decision!.summary + decision!.detail.statement));

  const doctrine = archive.doctrine[0];
  const laws = [
    ...doctrine.detail.productLaws,
    ...doctrine.detail.architectureLaws,
    ...doctrine.detail.buildAuthorizationRules,
  ].map((l) => l.id);
  assert.ok(laws.includes("law-client-site-events-not-crm"));
  assert.ok(laws.includes("law-lead-sale-commission-orthogonal"));
  assert.ok(laws.includes("law-activity-engine-client-work-memory"));
  assert.ok(laws.includes("law-client-visible-activity-business-value"));
  assert.ok(laws.includes("law-client-site-intelligence-scoped-v1"));
  assert.equal(doctrine.version, "1.1.0");
  ok("Decision Archive + doctrine laws record Client Site Intelligence V1");
}

{
  const pack = loadClientSiteIntelligenceMemory();
  assert.equal(pack.hallOfFame.length, 0);
  assert.equal(pack.futureBets.length, 0);
  assert.ok(pack.evidence.length >= 7);
  assert.ok(pack.evidence.some((e) => e.id === CSI_IDS.evidenceOtpLeadAttribution));
  assert.ok(pack.evidence.some((e) => e.id === CSI_IDS.evidenceOtpSeoBatch1));
  assert.ok(pack.evidence.some((e) => e.id === CSI_IDS.evidenceOtpGscSiteConfig));
  assert.ok(pack.evidence.some((e) => e.id === CSI_IDS.evidenceActivityEngine));
  assert.ok(pack.evidence.some((e) => e.id === CSI_IDS.evidenceCsiV1a));
  assert.ok(
    pack.architecture[0]?.detail.prohibitedParallelSystems.some((p) => /CRM/i.test(p)),
  );
  assert.ok(pack.roadmapItems.some((r) => r.id === CSI_IDS.roadmapV1));
  assert.ok(pack.roadmapItems.some((r) => r.id === CSI_IDS.roadmapOtpSeo));
  assert.ok(pack.roadmapItems.every((r) => r.detail.lifecycle === "authorized"));
  assert.ok(pack.roadmapItems.every((r) => !/shipped/i.test(r.status)));
  assert.equal(pack.productKillList.length, 3);
  assert.ok(pack.productKillList.some((k) => k.id === CSI_IDS.killWebsiteLeadCrm));
  assert.ok(pack.productKillList.some((k) => k.id === CSI_IDS.killAutoCommission));
  assert.ok(pack.productKillList.some((k) => k.id === CSI_IDS.killPortalNoiseFeed));
  assert.ok(
    pack.technicalDebt.some((d) => d.id === CSI_IDS.debtTimelineUnification),
  );
  assert.ok(
    pack.productInventory.some(
      (i) =>
        i.id === CSI_IDS.inventoryCapability &&
        i.detail.inventoryStatus === "planned" &&
        i.status === "in_flight",
    ),
  );
  const packJson = JSON.stringify(pack);
  assert.ok(!/Usage Reality complete|Continuous Intelligence complete/i.test(packJson));
  assert.ok(!/Client Site Intelligence V1 complete/i.test(packJson));
  assert.ok(
    pack.evidence
      .find((e) => e.id === CSI_IDS.evidenceOtpGscSiteConfig)
      ?.detail.assertion.includes("does not evidence Google indexing"),
  );
  ok("CSI memory pack: architecture, roadmaps, kills, debt, csi-v1-a evidence, no HoF");
}

{
  const dnaPath = join(root, "lib/product-intelligence/archive/product-dna-seed.ts");
  const dnaSrc = readFileSync(dnaPath, "utf8");
  assert.ok(dnaSrc.includes(EDITION_1_PRODUCT_DNA.id));
  assert.ok(!/Client Site Intelligence|ClientSiteEvent/i.test(dnaSrc));
  ok("protected Product DNA unchanged (no Client Site Intelligence rewrite)");
}

{
  assert.ok(
    !existsSync(join(root, "lib/product-intelligence/continuous-intelligence/index.ts")),
  );
  assert.ok(!existsSync(join(root, "lib/product-intelligence/kxd-sign/index.ts")));
  ok("release branch does not import Sign / Continuous Intelligence PI packs");
}

{
  let index = attachDecisionArchive(createProductIntelligenceIndex(), loadDecisionArchive());
  index = attachClientSiteIntelligenceMemory(index, loadClientSiteIntelligenceMemory());
  assert.ok(
    index.stores.decisions.some((d) => d.id === "decision:client-site-intelligence-v1"),
  );
  assert.ok(
    index.stores.roadmapItems.some((r) => r.id === CSI_IDS.roadmapV1),
  );
  assert.ok(
    index.stores.productKillList.some((k) => k.id === CSI_IDS.killWebsiteLeadCrm),
  );
  const consistency = verifyProductIntelligenceConsistency();
  assert.ok(consistency.ok, consistency.issues.map((i) => i.message).join("; "));
  assert.ok(loadDecisionArchive().integrity.ok);
  ok("attach merges CSI pack; consistency + Decision Archive integrity hold");
}

{
  assert.ok(
    existsSync(join(root, "lib/product-intelligence/client-site-intelligence/architecture.ts")),
  );
  assert.ok(existsSync(join(root, "lib/activity-engine")));
  assert.ok(existsSync(join(root, "lib/client-launch/otp-carts-readiness.ts")));
  assert.ok(existsSync(join(root, "lib/client-site-intelligence/ingest.ts")));
  assert.ok(existsSync(join(root, "payload/collections/ClientSiteEvents.ts")));
  assert.ok(
    existsSync(join(root, "app/api/webhooks/client-site/[clientKey]/route.ts")),
  );
  ok("PI pack + csi-v1-a Shared Core ingest surfaces present");
}

console.log(`\n${passed} checks passed — Client Site Intelligence V1 Decision institutionalized.\n`);
