/**
 * Focused verification for reusable Campaign HQ + Active Engagement safety fixes.
 * No database writes.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  buildCampaignHqProfileConfig,
  CAMPAIGN_HQ_AUTHORITATIVE_TERMINOLOGY_KEYS,
  CAMPAIGN_HQ_EXPERIENCE_KIND,
  CAMPAIGN_HQ_KIND_TERMINOLOGY_KEY,
  CAMPAIGN_HQ_RECOMMENDED_MODULES,
  isCampaignHqExperience,
  mergeCampaignHqTerminology,
} from "../lib/ces/profile/campaign-hq";
import { isRobinColeClient } from "../lib/ces/profile/robin-cole";
import {
  resolveEngagementCapacityHours,
  resolveEngagementPaymentStatus,
} from "../lib/portal/active-engagement/helpers";
import {
  getBrandKitPortalResourceCategories,
  getGenericPortalResourceCategories,
  getPortalResourceCategories,
} from "../lib/portal/resource-categories";
import {
  assertRobinPortalUserIdentity,
  ROBIN_CLIENT_ID,
} from "../lib/ces/profile/campaign-hq-robin-identity";

const ROOT = process.cwd();
let checks = 0;

function check(label: string, fn: () => void) {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
}

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function main() {
  console.log("\nverify-campaign-hq-phase1\n");

  check("Campaign HQ preset marks reusable experience kind", () => {
    const cfg = buildCampaignHqProfileConfig({
      profileName: "Example Campaign HQ",
      primaryColor: "#00008E",
      accentColor: "#C5EE9C",
    });
    assert.equal(cfg.terminology[CAMPAIGN_HQ_KIND_TERMINOLOGY_KEY], CAMPAIGN_HQ_EXPERIENCE_KIND);
    assert.equal(isCampaignHqExperience(cfg), true);
    assert.ok(cfg.enabledModules.includes("resources"));
    assert.ok(cfg.enabledModules.includes("website-review"));
    assert.deepEqual(
      [...CAMPAIGN_HQ_RECOMMENDED_MODULES].sort(),
      [...cfg.enabledModules].sort(),
    );
    assert.equal(cfg.partnerFooterLine, "Powered by KXD OS");
    assert.equal(cfg.showKxdPartnerMark, true);
  });

  check("Campaign HQ preset does not hardcode Robin identity", () => {
    const src = read("lib/ces/profile/campaign-hq.ts");
    assert.equal(src.includes("robin-cole"), false);
    assert.equal(src.includes("Robin Cole"), false);
    assert.equal(src.includes("#C9A962"), false);
  });

  check("Campaign HQ authoritative terminology wins over conflicting existing keys", () => {
    const merged = mergeCampaignHqTerminology({
      "nav.resources": "Old Resources Label",
      "portal.home.eyebrow": "Private Partnership Workspace",
      "website-review.landing.lead": "Robin-specific rich website review lead",
      "custom.campaign.note": "Keep me",
    });
    assert.equal(merged["nav.resources"], "Brand Kit & Resources");
    assert.equal(merged["portal.home.eyebrow"], "Campaign HQ");
    assert.equal(
      merged["website-review.landing.lead"],
      "Robin-specific rich website review lead",
    );
    assert.equal(merged["custom.campaign.note"], "Keep me");
    assert.equal(merged[CAMPAIGN_HQ_KIND_TERMINOLOGY_KEY], CAMPAIGN_HQ_EXPERIENCE_KIND);
    for (const key of CAMPAIGN_HQ_AUTHORITATIVE_TERMINOLOGY_KEYS) {
      assert.ok(merged[key], `missing authoritative key ${key}`);
    }
  });

  check("Active Engagement capacity fallback uses structured operational credits", () => {
    assert.equal(
      resolveEngagementCapacityHours({
        agreementCapacityHours: 3,
        monthlyServiceCredits: 7,
      }),
      3,
    );
    assert.equal(
      resolveEngagementCapacityHours({
        agreementCapacityHours: null,
        monthlyServiceCredits: 3,
      }),
      3,
    );
    assert.equal(
      resolveEngagementCapacityHours({
        agreementCapacityHours: null,
        monthlyServiceCredits: null,
      }),
      null,
    );
    const load = read("lib/portal/active-engagement/load.ts");
    assert.ok(load.includes("monthlyServiceCredits"));
    assert.ok(load.includes("resolveEngagementCapacityHours"));
    assert.equal(load.includes("stripe"), false);
    assert.equal(load.includes("Stripe"), false);
    assert.equal(load.includes("paymentIntent"), false);
  });

  check("Active status alone never resolves to Paid", () => {
    assert.equal(resolveEngagementPaymentStatus(null), null);
    assert.equal(resolveEngagementPaymentStatus(undefined), null);
    assert.equal(resolveEngagementPaymentStatus(""), null);
    assert.equal(resolveEngagementPaymentStatus("paid"), "paid");
    assert.equal(resolveEngagementPaymentStatus("payment-pending"), "payment-pending");
    const load = read("lib/portal/active-engagement/load.ts");
    assert.equal(load.includes('commercial === "active" ? "paid"'), false);
    assert.ok(load.includes("resolveEngagementPaymentStatus"));
  });

  check("Active Engagement card omits operator fields", () => {
    const src = read("components/ces/portal/ActiveEngagementCard.tsx");
    assert.ok(src.includes("ActiveEngagementSnapshot"));
    assert.equal(src.includes("stripe"), false);
    assert.equal(src.includes("lifecyclePackage"), false);
    assert.equal(src.includes("internalNotes"), false);
  });

  check("Portal home wires shared engagement surface", () => {
    const page = read("app/(portal)/portal/(app)/page.tsx");
    assert.ok(page.includes("loadActiveEngagementForClient"));
    assert.ok(page.includes("engagement={engagement}"));
  });

  check("Generic Resources defaults remain classic Client HQ behavior", () => {
    const generic = getGenericPortalResourceCategories();
    const viaDefault = getPortalResourceCategories();
    assert.deepEqual(
      generic.map((c) => c.id),
      ["guides", "training", "videos", "support", "brand-standards"],
    );
    assert.deepEqual(generic, viaDefault);
    assert.ok(generic.some((c) => c.items.some((i) => i.href === "/portal/requests")));
    assert.ok(generic.some((c) => c.items.some((i) => i.href === "/portal/assets")));
    assert.equal(
      generic.some((c) => c.items.some((i) => i.href === "/portal/website-review")),
      false,
    );
  });

  check("Brand Kit Resources surface is capability-driven and non-leaking", () => {
    const categories = getBrandKitPortalResourceCategories(
      {
        brandName: "Example Campaign",
        primaryColor: "#00008E",
        accentColor: "#C5EE9C",
        secondaryColor: "#000000",
        neutralColor: "#FFFFFF",
        assets: [
          {
            title: "Campaign mark",
            href: "/migrated-assets/example/icon.png",
            description: "Approved mark",
          },
        ],
      },
      {
        supportHref: "/portal/website-review",
        supportTitle: "Submit a website update",
      },
    );
    assert.equal(categories[0]?.id, "brand-kit");
    assert.ok(categories.some((c) => c.items.some((i) => i.href === "/portal/website-review")));
    assert.equal(
      getGenericPortalResourceCategories().some((c) =>
        c.items.some((i) => i.href === "/portal/website-review"),
      ),
      false,
    );
  });

  check("Robin detection remains scoped (no marketing/login leak helpers)", () => {
    assert.equal(isRobinColeClient({ clientSlug: "robin-cole" }), true);
    assert.equal(isRobinColeClient({ clientSlug: "primal-motorsports" }), false);
    const login = read("app/(portal)/portal/(auth)/login/page.tsx");
    assert.equal(login.includes("ROBIN_COLE_FAVICON"), false);
    assert.equal(login.includes("robin-cole"), false);
  });

  check("Configure script never mutates locked agreement capacity", () => {
    const script = read("scripts/configure-campaign-hq-robin.ts");
    const identity = read("lib/ces/profile/campaign-hq-robin-identity.ts");
    assert.ok(identity.includes("ROBIN_CLIENT_ID = 17"));
    assert.ok(identity.includes('ROBIN_CLIENT_SLUG = "robin-cole"'));
    assert.ok(script.includes("ROBIN_CLIENT_ID"));
    assert.ok(script.includes("ROBIN_CLIENT_SLUG"));
    assert.ok(script.includes("ensurePortalMembership"));
    assert.ok(script.includes("assertRobinPortalUserIdentity"));
    assert.ok(script.includes("Preflight"));
    assert.ok(script.includes('process.env.APPLY === "1"'));
    assert.equal(script.includes("capacityHoursPerMonth: 3"), false);
    assert.equal(/directAgreementTerms:\s*\{[\s\S]*capacityHoursPerMonth/.test(script), false);
    assert.equal(script.includes("termsLockedHash:"), false);
    assert.ok(script.includes("Never mutates executed Direct Agreement"));
    assert.ok(script.includes("NOT mutated"));
    assert.equal(script.includes("welcomeCompletedAt"), false);
    assert.equal(script.includes("securityEnrollmentCompletedAt"), false);
    assert.ok(existsSync(path.join(ROOT, "scripts/configure-campaign-hq-robin.ts")));
  });

  check("Portal membership identity checks fail closed on mismatch", () => {
    const ok = assertRobinPortalUserIdentity({
      expectedUserId: 10,
      expectedClientId: ROBIN_CLIENT_ID,
      displayNamePattern: /robin\s*cole/i,
      expectedEmail: "robin@example.com",
      user: {
        id: 10,
        email: "robin@example.com",
        displayName: "Robin Cole",
        active: true,
        client: 17,
      },
    });
    assert.equal(ok.ok, true);

    const wrongClient = assertRobinPortalUserIdentity({
      expectedUserId: 10,
      expectedClientId: ROBIN_CLIENT_ID,
      displayNamePattern: /robin\s*cole/i,
      user: {
        id: 10,
        email: "robin@example.com",
        displayName: "Robin Cole",
        active: true,
        client: 99,
      },
    });
    assert.equal(wrongClient.ok, false);

    const wrongName = assertRobinPortalUserIdentity({
      expectedUserId: 11,
      expectedClientId: ROBIN_CLIENT_ID,
      displayNamePattern: /barbara\s*sasso/i,
      user: {
        id: 11,
        email: "other@example.com",
        displayName: "Someone Else",
        active: true,
        client: 17,
      },
    });
    assert.equal(wrongName.ok, false);

    const missing = assertRobinPortalUserIdentity({
      expectedUserId: 10,
      expectedClientId: ROBIN_CLIENT_ID,
      displayNamePattern: /robin\s*cole/i,
      user: null,
    });
    assert.equal(missing.ok, false);
  });

  check("Presentation accents use canonical campaign colors", () => {
    const src = read("lib/ces/executive-performance/presentation.ts");
    assert.ok(src.includes('actionAccent: "#C5EE9C"'));
    assert.ok(src.includes('intelligenceAccent: "#00008E"'));
    assert.ok(src.includes('workspaceEyebrow: "Campaign HQ"'));
    assert.equal(src.includes("#C9A962"), false);
  });

  check("BrandKits Payload model has no creative-campaigns relationship", () => {
    const src = read("payload/collections/BrandKits.ts");
    assert.equal(/name:\s*[\"']campaign[\"']/.test(src), false);
    assert.equal(src.includes("creative-campaigns"), false);
    assert.equal(src.includes("campaign_id"), false);
    assert.ok(src.includes('relationTo: "clients"'));
  });

  check("Creative spawn does not write or filter Brand Kits by campaign", () => {
    const src = read("lib/creative-spawn-engine.ts");
    assert.equal(src.includes('countExisting(payload, "brand-kits", "campaign"'), false);
    assert.equal(/campaign:\s*campaignId/.test(src), false);
    assert.ok(src.includes("Brand kit spawn deferred"));
    assert.ok(src.includes("client-owned"));
  });

  check("Robin Campaign HQ configure queries Brand Kits by client ownership only", () => {
    const script = read("scripts/configure-campaign-hq-robin.ts");
    assert.ok(script.includes('collection: "brand-kits"'));
    assert.ok(script.includes("client: { equals:"));
    assert.equal(script.includes("campaign_id"), false);
    assert.equal(/brand-kits[\s\S]{0,400}campaign:\s*\{/.test(script), false);
    assert.equal(script.includes("creative-campaigns"), false);
  });

  check("Campaign HQ remains independent from creative-campaigns", () => {
    const hq = read("lib/ces/profile/campaign-hq.ts");
    assert.equal(hq.includes("creative-campaigns"), false);
    assert.equal(hq.includes("brand_kits.campaign"), false);
  });

  console.log(`\n${checks} checks passed.\n`);
}

main();
