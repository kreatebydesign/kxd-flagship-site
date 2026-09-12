/**
 * Shared Client Operating State + universal Executive Performance.
 *
 * Pure fixture verification — no database, no Production writes.
 *
 * Proves:
 * 1. Primal content pack → Growth & Optimization experience via shared resolve
 * 2. Generic non-Primal client receives EP without slug-specific compose
 * 3. Existing clients without operating state / entitlement stay unexposed
 * 4. FALLBACK LAW: entitlement ≠ Connected; authored ≠ live facts
 * 5. Primary lead law preserved
 *
 * Run: npx tsx scripts/verify-shared-client-operating-state.ts
 */

import assert from "node:assert/strict";
import {
  mergeOperatingStateConfig,
  parseOperatingStateConfig,
  resolveClientOperatingState,
  resolveOperatingStateConfigForClient,
  toPerformanceConnectionState,
} from "../lib/ces/operating-state";
import {
  getClientContentPackOperatingState,
  PRIMAL_POST_LAUNCH_OPERATING_CONFIG,
} from "../lib/ces/content-packs";
import {
  buildDefaultExecutivePresentation,
  isExecutivePerformanceEligible,
  resolveExecutivePresentationForProfile,
} from "../lib/ces/executive-performance/eligibility";
import { isExecutivePerformanceAvailable } from "../lib/ces/executive-performance/presentation";
import { isPortalModuleVisible } from "../lib/ces/modules/visibility";
import { resolvePrimaryLeadBreakdown } from "../lib/reporting/leads/primary-leads";
import type { ResolvedExperienceProfile } from "../lib/ces/types";
import type { PeriodWindow, ReportingFact } from "../lib/reporting/domain/types";

let passed = 0;
let failed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(error);
  }
}

function stubProfile(
  input: Partial<ResolvedExperienceProfile> & {
    clientSlug?: string | null;
    enabledModules?: ResolvedExperienceProfile["enabledModules"];
  },
): ResolvedExperienceProfile {
  const slug = input.clientSlug ?? input.identity?.clientSlug ?? "fixture-client";
  const name = input.identity?.clientName ?? "Fixture Client";
  return {
    profileId: 99,
    source: "profile",
    identity: {
      clientId: input.identity?.clientId ?? 99,
      clientName: name,
      clientSlug: slug,
      logoUrl: null,
      logoAlt: name,
      websiteUrl: null,
    },
    visual: {
      primaryColor: "#0B0B0B",
      secondaryColor: "#141414",
      accentColor: "#C9A962",
      surfaceTint: null,
      borderRadiusPreset: "default",
      motionPreset: "calm",
    },
    hospitality: {
      welcomeEyebrow: "Welcome",
      reassuranceLine: "You're in good hands.",
      supportTone: "warm-professional",
      portalSidebarLabel: name,
      partnerFooterLine: "Powered by Kreate by Design",
      showPartnerMark: true,
    },
    enabledModules: input.enabledModules ?? [],
    enabledPortalModules: input.enabledPortalModules,
    reportingCapabilities: input.reportingCapabilities ?? [],
    operatingState: input.operatingState ?? null,
    presentation: input.presentation ?? null,
    terminology: {},
    cssVars: {},
  };
}

console.log("\nShared Client Operating State + Universal Executive Performance\n");

check("parse rejects empty / invalid", () => {
  assert.equal(parseOperatingStateConfig(null), null);
  assert.equal(parseOperatingStateConfig([]), null);
  assert.equal(parseOperatingStateConfig({}), null);
});

check("parse accepts minimal post-launch config", () => {
  const parsed = parseOperatingStateConfig({
    mode: "post-launch",
    phase: "Growth & Optimization",
    currentPriority: "Increase qualified traffic",
    watching: "Search · Ads · Leads",
  });
  assert.ok(parsed);
  assert.equal(parsed!.mode, "post-launch");
  assert.equal(parsed!.phase, "Growth & Optimization");
});

check("Primal content pack is CONTENT-only (slug keyed)", () => {
  const pack = getClientContentPackOperatingState("primal-motorsports");
  assert.ok(pack);
  assert.equal(pack!.phase, "Growth & Optimization");
  assert.equal(pack!.mode, "post-launch");
  assert.equal(getClientContentPackOperatingState("productization-test-client"), null);
});

check("Primal resolve: Growth & Optimization + live/verified + watching", () => {
  const config = resolveOperatingStateConfigForClient({
    clientSlug: "primal-motorsports",
    persisted: null,
  });
  const resolved = resolveClientOperatingState({
    config,
    infrastructure: {
      deploymentStatus: "live",
      ga4PropertyId: "549908814",
      searchConsoleSiteUrl: "sc-domain:primalmotorsports.com",
      googleAdsCustomerId: "1234567890",
    },
    evidence: {
      seoEntitled: true,
      websiteAnalyticsEntitled: false,
      googleAdsEntitled: false,
      searchFactsPresent: true,
      websiteFactsPresent: false,
      adsFactsPresent: false,
    },
  });
  assert.equal(resolved.postLaunchMode, true);
  assert.equal(resolved.phase, "Growth & Optimization");
  assert.equal(
    resolved.currentPriority,
    "Increase qualified traffic and lead performance",
  );
  assert.ok(resolved.watching?.includes("Organic search"));
  assert.equal(resolved.website.websiteStatusLabel, "Live");
  assert.equal(resolved.website.productionStatusLabel, "Verified");
  assert.equal(resolved.capabilities.search.state, "connected");
  assert.equal(resolved.capabilities.website.state, "active");
  assert.equal(resolved.capabilities.website.summary, "Measurement active");
  assert.equal(resolved.capabilities.ads.state, "reviewed");
  assert.equal(resolved.capabilities.ads.summary, "Performance reviewed");
  // Search facts present → momentum Connected (not authored baseline overlay).
  assert.equal(resolved.capabilities.momentum.state, "connected");
  assert.equal(toPerformanceConnectionState("connected"), "connected");
  assert.equal(toPerformanceConnectionState("active"), "not-connected");
  assert.equal(toPerformanceConnectionState("reviewed"), "not-connected");
});

check("Primal momentum baseline when no live facts yet", () => {
  const resolved = resolveClientOperatingState({
    config: resolveOperatingStateConfigForClient({
      clientSlug: "primal-motorsports",
      persisted: null,
    }),
    infrastructure: { deploymentStatus: "live", ga4PropertyId: "549908814" },
    evidence: {
      seoEntitled: true,
      websiteAnalyticsEntitled: false,
      googleAdsEntitled: false,
      searchFactsPresent: false,
      websiteFactsPresent: false,
      adsFactsPresent: false,
    },
  });
  assert.equal(resolved.capabilities.search.summary, "Baseline established");
  assert.equal(resolved.capabilities.momentum.summary, "Baseline established");
});

check("persisted operating state wins over content pack fields", () => {
  const merged = mergeOperatingStateConfig(PRIMAL_POST_LAUNCH_OPERATING_CONFIG, {
    phase: "Custom Phase",
    currentPriority: "Custom priority",
  });
  assert.equal(merged!.phase, "Custom Phase");
  assert.equal(merged!.currentPriority, "Custom priority");
  assert.equal(merged!.mode, "post-launch");
  assert.equal(
    merged!.watching,
    PRIMAL_POST_LAUNCH_OPERATING_CONFIG.watching,
  );
});

check("generic productization-test-client: EP eligible without registry", () => {
  const profile = stubProfile({
    clientSlug: "productization-test-client",
    identity: {
      clientId: 501,
      clientName: "Productization Test Client",
      clientSlug: "productization-test-client",
      logoUrl: null,
      logoAlt: "Productization Test Client",
      websiteUrl: "https://example.test",
    },
    enabledModules: ["executive-performance"],
    reportingCapabilities: ["seo", "website-analytics"],
    operatingState: {
      mode: "post-launch",
      phase: "Growth & Optimization",
      currentPriority: "Grow qualified demand",
      watching: "Search visibility · Website leads",
      productionVerified: true,
      baseline: { established: true, date: "2026-09-01", label: "Baseline set" },
    },
  });

  assert.equal(isExecutivePerformanceAvailable("productization-test-client"), false);
  assert.equal(isExecutivePerformanceEligible(profile), true);
  const presentation = resolveExecutivePresentationForProfile(profile);
  assert.ok(presentation?.enabled);
  assert.equal(presentation!.workspaceTitle, "Executive Performance");

  assert.equal(
    isPortalModuleVisible("executive-performance", { profile }),
    true,
  );

  const resolved = resolveClientOperatingState({
    config: resolveOperatingStateConfigForClient({
      clientSlug: "productization-test-client",
      persisted: profile.operatingState,
    }),
    infrastructure: {
      deploymentStatus: "live",
      searchConsoleSiteUrl: "sc-domain:example.test",
      ga4PropertyId: null,
      googleAdsCustomerId: null,
    },
    evidence: {
      seoEntitled: true,
      websiteAnalyticsEntitled: true,
      googleAdsEntitled: false,
      searchFactsPresent: true,
      websiteFactsPresent: false,
      adsFactsPresent: false,
    },
  });

  assert.equal(resolved.phase, "Growth & Optimization");
  assert.equal(resolved.capabilities.search.state, "connected");
  assert.equal(resolved.capabilities.website.state, "awaiting-signal");
  assert.equal(resolved.capabilities.ads.state, "not-connected");
  assert.equal(resolved.capabilities.ads.summary, "");
  // No Primal content pack invoked for this slug.
  assert.equal(getClientContentPackOperatingState("productization-test-client"), null);
});

check("existing client without entitlement stays unexposed", () => {
  const otp = stubProfile({
    clientSlug: "otp-carts",
    enabledModules: ["website-review"],
    reportingCapabilities: [],
  });
  assert.equal(isExecutivePerformanceEligible(otp), false);
  assert.equal(resolveExecutivePresentationForProfile(otp), null);
  assert.equal(
    isPortalModuleVisible("executive-performance", { profile: otp }),
    false,
  );
});

check("FALLBACK LAW: entitlement alone never becomes Connected", () => {
  const resolved = resolveClientOperatingState({
    config: { mode: "post-launch", baseline: { established: true } },
    infrastructure: { ga4PropertyId: "123", searchConsoleSiteUrl: "sc-domain:x.com" },
    evidence: {
      seoEntitled: true,
      websiteAnalyticsEntitled: true,
      googleAdsEntitled: true,
      searchFactsPresent: false,
      websiteFactsPresent: false,
      adsFactsPresent: false,
    },
  });
  assert.notEqual(resolved.capabilities.search.state, "connected");
  assert.notEqual(resolved.capabilities.website.state, "connected");
  assert.notEqual(resolved.capabilities.ads.state, "connected");
});

check("Primary lead law: inquiry override preferred; GA4 generate_lead excluded", () => {
  const period: PeriodWindow = {
    start: "2026-08-01",
    end: "2026-08-31",
    grain: "month",
    label: "August 2026",
  };
  const facts: ReportingFact[] = [
    {
      id: "1",
      clientId: 1,
      period,
      domain: "website",
      metricKey: "generate_lead",
      value: 99,
      unit: "count",
      source: {
        providerId: "google-analytics-4",
        clientId: 1,
        fetchedAt: "2026-09-01T00:00:00.000Z",
        freshness: "fresh",
        confidence: "high",
      },
      evidenceRefs: [],
    },
    {
      id: "2",
      clientId: 1,
      period,
      domain: "marketing",
      metricKey: "conversions",
      value: 40,
      unit: "count",
      source: {
        providerId: "google-ads",
        clientId: 1,
        fetchedAt: "2026-09-01T00:00:00.000Z",
        freshness: "fresh",
        confidence: "high",
      },
      evidenceRefs: [],
    },
  ];
  const breakdown = resolvePrimaryLeadBreakdown({
    facts,
    period,
    websiteFormInquiries: {
      available: true,
      count: 6,
      previousCount: null,
      delta: null,
      definition: "client-inquiries with channel=form for August 2026",
    },
  });
  assert.equal(breakdown.websiteFormLeads.value, 6);
  assert.equal(breakdown.websiteFormLeads.available, true);
  assert.equal(breakdown.paidQualifiedCallLeads.available, false);
  assert.equal(breakdown.totalPrimaryLeads.value, 6);
  assert.ok(
    breakdown.excludedFromPrimary.some((x) =>
      x.toLowerCase().includes("generate_lead"),
    ),
  );
});

check("default presentation builder does not invent brand registry", () => {
  const profile = stubProfile({
    clientSlug: "productization-test-client",
    enabledModules: ["executive-performance"],
  });
  const defaults = buildDefaultExecutivePresentation(profile);
  assert.equal(defaults.enabled, true);
  assert.equal(defaults.briefingEnabled, false);
  assert.equal(defaults.heroImageSrc, "");
});

check("Primal registry path still available (CONTENT brand assets)", () => {
  assert.equal(isExecutivePerformanceAvailable("primal-motorsports"), true);
  const primal = stubProfile({
    clientSlug: "primal-motorsports",
    enabledModules: ["executive-performance", "website-review"],
    reportingCapabilities: ["seo"],
  });
  assert.equal(isExecutivePerformanceEligible(primal), true);
  const presentation = resolveExecutivePresentationForProfile(primal);
  assert.ok(presentation?.enabled);
  assert.ok(presentation!.heroImageSrc.includes("primal"));
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
