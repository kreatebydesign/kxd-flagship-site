/**
 * Verify portal pre-launch polish — presentation, launch-stage copy, architecture wiring.
 * Run: npx tsx scripts/verify-portal-prelaunch-polish.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  formatPortalEngagementStatus,
  formatPortalPaymentLabel,
} from "../lib/portal/active-engagement/presentation";
import { composePerformanceStory } from "../lib/portal/client-value/performance-story";
import { resolvePortalEngagementLifecycle } from "../lib/portal/client-value/lifecycle";
import { defaultWorkPerformancePeriod } from "../lib/portal/work-performance/period";

const root = process.cwd();

function check(label: string, ok: boolean) {
  if (!ok) {
    console.error(`FAIL: ${label}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${label}`);
  }
}

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

check(
  "executed + paid maps to Active engagement status",
  formatPortalEngagementStatus({
    commercialStatus: "accepted",
    contractStatus: "executed",
    paymentStatus: "paid",
  }) === "Active",
);

check(
  "payment label stays Paid",
  formatPortalPaymentLabel("paid") === "Paid",
);

const launchStory = composePerformanceStory({
  reportingFacts: [],
  reportingEntitled: false,
  reportingPeriod: defaultWorkPerformancePeriod(),
  ga4Mapped: false,
  gscMapped: false,
  websiteReviewEntitled: true,
  engagementLifecycle: "website-build",
});

check(
  "website-build uses launch-stage availability",
  launchStory.availability === "launch-stage" &&
    !launchStory.whatMovedForward.includes("not enabled"),
);

check(
  "rebuild title resolves website-build lifecycle",
  resolvePortalEngagementLifecycle({
    engagement: {
      available: true,
      title: "Agreement — de Bois Entertainment Website Rebuild",
      statusLabel: "Active",
      periodLabel: null,
      paymentLabel: "Paid",
      capacityLabel: null,
      includedSummary: null,
    },
    monthlyRetainerAmount: 0,
    serviceScope: null,
  }) === "website-build",
);

const resolveSrc = read("lib/ces/profile/resolve.ts");
check(
  "resolve.ts infers modules when no active CES profile",
  resolveSrc.includes("inferPortalModulesForClient"),
);

const homeSrc = read("components/ces/portal/CesClientCommandHome.tsx");
check(
  "home hides reporting-not-enabled for launch-stage",
  homeSrc.includes("launch-stage") && homeSrc.includes("Website project"),
);

const css = read("design-system/ces/styles/kxd-ces.css");
check(
  "sidebar logo max dimensions increased",
  css.includes("13.5rem") && css.includes("4.25rem"),
);

console.log("\nPortal pre-launch polish checks finished.\n");
