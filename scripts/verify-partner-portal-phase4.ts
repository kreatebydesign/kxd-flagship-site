/**
 * Partner Portal Phase 4 — Network directory privacy + visibility contracts.
 * Pure rules + file contracts. No DB writes. No fake production data.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  buildNetworkDirectoryRecognitions,
  directoryPayloadContainsRestrictedKeys,
  selectPublishedDirectoryMembers,
  selectPublishedShowcaseItems,
  type NetworkDirectoryMemberSource,
  type NetworkDirectoryShowcaseSource,
} from "../lib/portal/partner/network-directory-rules";

let checks = 0;

async function check(label: string, fn: () => void | Promise<void>) {
  await fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
}

function read(rel: string): string {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

function assertFileContains(rel: string, needle: string) {
  assert.ok(existsSync(path.join(process.cwd(), rel)), `missing ${rel}`);
  assert.ok(
    read(rel).includes(needle),
    `${rel} should contain ${JSON.stringify(needle)}`,
  );
}

function assertFileDoesNotContain(rel: string, needle: string) {
  assert.ok(existsSync(path.join(process.cwd(), rel)), `missing ${rel}`);
  assert.ok(
    !read(rel).includes(needle),
    `${rel} must not contain ${JSON.stringify(needle)}`,
  );
}

function member(partial: Partial<NetworkDirectoryMemberSource> & { id: number; displayName: string }): NetworkDirectoryMemberSource {
  return {
    status: "active",
    directoryVisibility: "published",
    cityMarket: null,
    companyOrRole: null,
    connectionLanes: [],
    profileLine: null,
    markUrl: null,
    trustedPartner: false,
    hasFirstIntroduction: false,
    hasClientWon: false,
    hasPaidRecord: false,
    ...partial,
  };
}

function work(
  partial: Partial<NetworkDirectoryShowcaseSource> & {
    id: number;
    companyName: string;
  },
): NetworkDirectoryShowcaseSource {
  return {
    directoryVisibility: "published",
    ownerApprovedForNetwork: true,
    categoryMarket: null,
    workDescription: null,
    markUrl: null,
    websiteUrl: null,
    creditAttribution: false,
    creditedMemberName: null,
    sortOrder: 0,
    ...partial,
  };
}

async function main() {
  console.log("\nverify-partner-portal-phase4\n");

  await check("phase 4 migration + collections registered", () => {
    assertFileContains(
      "migrations/20261008_partner_portal_phase4_network_directory.ts",
      'CREATE TABLE IF NOT EXISTS "kxd_network_showcase"',
    );
    assertFileContains(
      "migrations/20261008_partner_portal_phase4_network_directory.ts",
      "directory_visibility",
    );
    assertFileContains(
      "migrations/index.ts",
      "20261008_partner_portal_phase4_network_directory",
    );
    assertFileContains(
      "payload/collections/KxdPartnerProfiles.ts",
      'name: "directoryVisibility"',
    );
    assertFileContains(
      "payload/collections/KxdNetworkShowcase.ts",
      'slug: "kxd-network-showcase"',
    );
    assertFileContains("payload.config.ts", "KxdNetworkShowcase");
    assertFileDoesNotContain(
      "lib/internal/partner-portal-production-migrate-policy.ts",
      "20261008_partner_portal_phase4_network_directory",
    );
  });

  await check("partner Network route + nav exist", () => {
    assertFileContains(
      "app/(portal)/portal/(partner)/partner/network/page.tsx",
      "loadNetworkDirectoryForActivePartner",
    );
    assertFileContains(
      "app/(portal)/portal/(partner)/partner/network/page.tsx",
      "getPartnerSession",
    );
    assertFileContains(
      "components/partner/PartnerAppShell.tsx",
      'label: "The Network"',
    );
    assertFileContains(
      "components/partner/PartnerAppShell.tsx",
      'href: "/portal/partner/network"',
    );
  });

  await check("owner curation APIs stay admin-gated", () => {
    assertFileContains(
      "app/api/admin/partner/network-profile/route.ts",
      "requirePayloadAdminApi",
    );
    assertFileContains(
      "app/api/admin/partner/network-showcase/route.ts",
      "requirePayloadAdminApi",
    );
    assertFileContains(
      "components/admin/sales/NetworkDirectoryOwnerPanel.tsx",
      "Network profile",
    );
    assertFileContains(
      "components/admin/sales/NetworkDirectoryOwnerPanel.tsx",
      "Published profiles are visible only to active KXD Network",
    );
    assertFileContains(
      "app/(portal)/portal/(partner)/partner/network/page.tsx",
      "A private registry of people and work KXD is proud to stand behind.",
    );
    assertFileContains(
      "app/(portal)/portal/(partner)/partner/network/page.tsx",
      "Quiet for now. Profiles appear when KXD publishes them.",
    );
    assertFileDoesNotContain(
      "app/(portal)/portal/(partner)/partner/network/page.tsx",
      "Profiles are published by KXD.",
    );
    assertFileDoesNotContain(
      "app/(portal)/portal/(partner)/partner/network/page.tsx",
      "LOCAL NETWORK DIRECTORY QA",
    );
  });

  await check("active published member is visible; private is omitted", () => {
    const published = member({
      id: 1,
      displayName: "Ada Partner",
      directoryVisibility: "published",
      status: "active",
      cityMarket: "Los Angeles",
      hasFirstIntroduction: true,
    });
    const privateMember = member({
      id: 2,
      displayName: "Private Member",
      directoryVisibility: "private",
      status: "active",
      hasPaidRecord: true,
    });
    const visible = selectPublishedDirectoryMembers([published, privateMember]);
    assert.equal(visible.length, 1);
    assert.equal(visible[0]?.displayName, "Ada Partner");
    assert.deepEqual(visible[0]?.recognitions, ["First introduction"]);
  });

  await check("invited / inactive / revoked-status members are not visible", () => {
    const rows = selectPublishedDirectoryMembers([
      member({
        id: 1,
        displayName: "Invited",
        status: "invited",
        directoryVisibility: "published",
      }),
      member({
        id: 2,
        displayName: "Inactive",
        status: "inactive",
        directoryVisibility: "published",
      }),
      member({
        id: 3,
        displayName: "Active Published",
        status: "active",
        directoryVisibility: "published",
      }),
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.displayName, "Active Published");
  });

  await check("partner directory payload omits restricted fields", () => {
    const page = {
      members: selectPublishedDirectoryMembers([
        member({
          id: 9,
          displayName: "Kyle Example",
          companyOrRole: "Advisor",
          profileLine: "Trusted introductions only.",
          hasClientWon: true,
          hasPaidRecord: true,
          trustedPartner: true,
        }),
      ]),
      selectedWork: selectPublishedShowcaseItems([
        work({
          id: 3,
          companyName: "Example Studio",
          workDescription: "Brand system and site.",
          creditAttribution: true,
          creditedMemberName: "Kyle Example",
        }),
      ]),
    };
    const leaks = directoryPayloadContainsRestrictedKeys(page);
    assert.deepEqual(leaks, []);
    assert.ok(!JSON.stringify(page).includes("email"));
    assert.ok(!JSON.stringify(page).includes("amountCents"));
    assert.ok(!JSON.stringify(page).includes("paidEarningsCents"));
    assert.equal(page.members[0]?.recognitions.includes("Paid record"), true);
    assert.equal(page.members[0]?.recognitions.includes("Trusted Partner"), true);
  });

  await check("selected work requires published + owner approval", () => {
    const rows = selectPublishedShowcaseItems([
      work({
        id: 1,
        companyName: "Hidden Draft",
        directoryVisibility: "private",
        ownerApprovedForNetwork: true,
      }),
      work({
        id: 2,
        companyName: "Published Unapproved",
        directoryVisibility: "published",
        ownerApprovedForNetwork: false,
      }),
      work({
        id: 3,
        companyName: "Ready Work",
        directoryVisibility: "published",
        ownerApprovedForNetwork: true,
        creditAttribution: false,
        creditedMemberName: "Should Hide",
      }),
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.companyName, "Ready Work");
    assert.equal(rows[0]?.creditedMemberName, null);
  });

  await check("attribution appears only when explicitly enabled", () => {
    const withCredit = selectPublishedShowcaseItems([
      work({
        id: 1,
        companyName: "Attributed Co",
        creditAttribution: true,
        creditedMemberName: "Martin Partner",
      }),
    ]);
    const withoutCredit = selectPublishedShowcaseItems([
      work({
        id: 2,
        companyName: "No Credit Co",
        creditAttribution: false,
        creditedMemberName: "Martin Partner",
      }),
    ]);
    assert.equal(withCredit[0]?.creditedMemberName, "Martin Partner");
    assert.equal(withoutCredit[0]?.creditedMemberName, null);
  });

  await check("trusted partner recognition is never automatic", () => {
    const auto = buildNetworkDirectoryRecognitions({
      hasFirstIntroduction: true,
      hasClientWon: true,
      hasPaidRecord: true,
      trustedPartner: false,
    });
    assert.ok(!auto.includes("Trusted Partner"));
    const awarded = buildNetworkDirectoryRecognitions({
      hasFirstIntroduction: false,
      hasClientWon: false,
      hasPaidRecord: false,
      trustedPartner: true,
    });
    assert.deepEqual(awarded, ["Trusted Partner"]);
  });

  await check("no member self-serve upload or public social features", () => {
    assertFileDoesNotContain(
      "app/(portal)/portal/(partner)/partner/network/page.tsx",
      "follower",
    );
    assertFileDoesNotContain(
      "app/(portal)/portal/(partner)/partner/network/page.tsx",
      "leaderboard",
    );
    assertFileDoesNotContain(
      "lib/portal/partner/network-directory.ts",
      "upload(",
    );
    assertFileContains(
      "payload/collections/KxdPartnerProfiles.ts",
      "Never member-uploaded in Phase 4",
    );
  });

  console.log(`\n${checks} checks passed.\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
