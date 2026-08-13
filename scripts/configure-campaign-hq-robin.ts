/**
 * Configure Campaign HQ for Robin Cole (client 17 / robin-cole).
 *
 * Idempotent. Default: dry-run. Apply with APPLY=1.
 *
 * Safety:
 * - Full identity preflight before any APPLY writes
 * - Never mutates executed Direct Agreement terms / termsLockedHash
 * - Never touches MFA / welcome fields
 *
 * Run:
 *   KXD_SERVER_ONLY_SHIM=1 tsx --import ./scripts/shims/register-server-only.mjs scripts/configure-campaign-hq-robin.ts
 *   KXD_SERVER_ONLY_SHIM=1 APPLY=1 tsx --import ./scripts/shims/register-server-only.mjs scripts/configure-campaign-hq-robin.ts
 */

import { getPayload } from "payload";
import config from "../payload.config";
import { buildCampaignHqProfileConfig } from "../lib/ces/profile/campaign-hq";
import {
  asClientId,
  assertRobinPortalUserIdentity,
  ROBIN_CLIENT_ID,
  ROBIN_CLIENT_SLUG,
  ROBIN_CONTRACT_ID,
  ROBIN_PORTAL_USER_TARGETS,
  type PortalUserIdentityInput,
} from "../lib/ces/profile/campaign-hq-robin-identity";
import {
  ROBIN_COLE_APPLE_ICON_SRC,
  ROBIN_COLE_FAVICON_SRC,
  ROBIN_COLE_LOGO_SRC,
} from "../lib/ces/profile/robin-cole";
import { parseStoredDirectAgreementTerms } from "../lib/direct-agreement/validate";
import { ensurePortalMembership } from "../lib/portal/memberships";

export {
  ROBIN_CLIENT_ID,
  ROBIN_CLIENT_SLUG,
  ROBIN_CONTRACT_ID,
  ROBIN_PORTAL_USER_TARGETS,
  assertRobinPortalUserIdentity,
} from "../lib/ces/profile/campaign-hq-robin-identity";

/**
 * Expected portal identities. Emails may be supplied via env for stronger checks:
 *   CAMPAIGN_HQ_ROBIN_PORTAL_EMAIL
 *   CAMPAIGN_HQ_BARBARA_PORTAL_EMAIL
 */

export const ROBIN_BRAND_KIT = {
  brandName: "Robin Cole for Tracy",
  slug: "robin-cole-campaign",
  industry: "Political campaign",
  primaryColor: "#00008E",
  secondaryColor: "#000000",
  accentColor: "#C5EE9C",
  neutralColor: "#FFFFFF",
  status: "approved" as const,
  logoNotes:
    "Canonical Brand Kit lives in the campaign website repository. KXD OS holds the operational representation for Campaign HQ.",
  voiceTone:
    "Clear, confident, community-focused. Civic and approachable — never partisan flash.",
  doRules: "Use approved navy (#00008E), green (#C5EE9C), white, and black only.",
  dontRules: "Do not substitute gold/KXD accents or approximate campaign colors.",
  primaryCTA: "Join Robin",
  websiteIntroCopy: "Robin Cole for Tracy City Council",
};

const BRAND_ASSETS: Array<{
  title: string;
  assetType: string;
  externalUrl: string;
  usageContext: string;
  notes: string;
}> = [
  {
    title: "Campaign mark (icon)",
    assetType: "logo",
    externalUrl: ROBIN_COLE_LOGO_SRC,
    usageContext: "digital",
    notes: "Approved campaign icon for portal chrome and digital use.",
  },
  {
    title: "Campaign logo",
    assetType: "logo",
    externalUrl: "/migrated-assets/logos/robin-cole/logo.png",
    usageContext: "all",
    notes: "Primary logo lockup for workspace Brand Kit reference.",
  },
  {
    title: "Favicon",
    assetType: "logo",
    externalUrl: ROBIN_COLE_FAVICON_SRC,
    usageContext: "digital",
    notes: "Authenticated portal favicon (login remains KXD-owned).",
  },
  {
    title: "Apple touch icon",
    assetType: "logo",
    externalUrl: ROBIN_COLE_APPLE_ICON_SRC,
    usageContext: "digital",
    notes: "Home-screen / touch icon reference.",
  },
];

function asModules(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function uniqueModules(modules: string[]): string[] {
  return [...new Set(modules.map((m) => m.trim()).filter(Boolean))];
}

function campaignHqRecommended(): string[] {
  return ["website-review", "website-analytics", "seo", "resources"];
}

async function main() {
  const apply = process.env.APPLY === "1";
  const payload = await getPayload({ config });

  console.log(`\nCampaign HQ — Robin Cole ${apply ? "APPLY" : "DRY-RUN"}`);
  console.log("Preflight identity checks (fail closed before any writes)…");

  // ── Preflight: client ────────────────────────────────────────────────────
  const clients = await payload.find({
    collection: "clients",
    where: {
      and: [
        { id: { equals: ROBIN_CLIENT_ID } },
        { slug: { equals: ROBIN_CLIENT_SLUG } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (clients.docs.length === 0) {
    console.error(
      `PREFLIGHT FAIL: Client not found for id=${ROBIN_CLIENT_ID} slug=${ROBIN_CLIENT_SLUG}. Aborting.`,
    );
    process.exit(1);
  }

  const client = clients.docs[0] as {
    id: number;
    name: string;
    slug: string;
    monthlyServiceCredits?: number | null;
  };
  if (client.id !== ROBIN_CLIENT_ID || client.slug !== ROBIN_CLIENT_SLUG) {
    console.error("PREFLIGHT FAIL: Client identity mismatch after load. Aborting.");
    process.exit(1);
  }
  console.log(`  ✓ Client ${client.name} (id=${client.id}, slug=${client.slug})`);
  console.log(
    `  · monthlyServiceCredits=${client.monthlyServiceCredits ?? "null"} (operational capacity fallback; agreement terms not mutated)`,
  );

  // ── Preflight: CES profile ───────────────────────────────────────────────
  const profiles = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-experience-profiles" as any,
    where: {
      and: [
        { client: { equals: client.id } },
        { status: { equals: "active" } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (profiles.docs.length === 0) {
    console.error("PREFLIGHT FAIL: Active CES profile not found for Robin. Aborting.");
    process.exit(1);
  }

  const profile = profiles.docs[0] as {
    id: number;
    client?: unknown;
    enabledModules?: unknown;
    terminology?: unknown;
  };
  const profileClientId = asClientId(profile.client);
  if (profileClientId !== client.id) {
    console.error(
      `PREFLIGHT FAIL: CES profile id=${profile.id} client=${profileClientId} ≠ ${client.id}. Aborting.`,
    );
    process.exit(1);
  }
  console.log(`  ✓ Active CES profile id=${profile.id} owned by client ${client.id}`);

  // ── Preflight: Brand Kit scope (read) ────────────────────────────────────
  const existingKits = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "brand-kits" as any,
    where: {
      and: [
        { client: { equals: client.id } },
        { slug: { equals: ROBIN_BRAND_KIT.slug } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  let brandKitId =
    existingKits.docs.length > 0
      ? Number((existingKits.docs[0] as { id: number }).id)
      : null;
  if (brandKitId) {
    const kitClient = asClientId((existingKits.docs[0] as { client?: unknown }).client);
    if (kitClient != null && kitClient !== client.id) {
      console.error(
        `PREFLIGHT FAIL: Brand Kit id=${brandKitId} client=${kitClient} ≠ ${client.id}. Aborting.`,
      );
      process.exit(1);
    }
  }
  console.log(
    `  ✓ Brand Kit ${ROBIN_BRAND_KIT.slug}: ${brandKitId ? `existing id=${brandKitId}` : "will create"}`,
  );

  // ── Preflight: portal users (mandatory identity) ─────────────────────────
  for (const target of ROBIN_PORTAL_USER_TARGETS) {
    let userDoc: PortalUserIdentityInput | null = null;
    try {
      userDoc = (await payload.findByID({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "portal-users" as any,
        id: target.portalUserId,
        depth: 0,
        overrideAccess: true,
      })) as PortalUserIdentityInput;
    } catch {
      userDoc = null;
    }

    const expectedEmail = process.env[target.emailEnvKey]?.trim() || null;
    const check = assertRobinPortalUserIdentity({
      expectedUserId: target.portalUserId,
      expectedClientId: client.id,
      displayNamePattern: target.displayNamePattern,
      expectedEmail,
      user: userDoc,
    });
    if (!check.ok) {
      console.error(`PREFLIGHT FAIL (${target.label}): ${check.reason}`);
      console.error("Aborting before any writes (including Brand Kit / CES / memberships).");
      process.exit(1);
    }
    console.log(
      `  ✓ Portal user ${target.portalUserId} (${target.label}) → ${target.role}` +
        (expectedEmail ? " [email verified]" : " [email present; env pin optional]"),
    );
  }

  // ── Preflight: contract ownership (read-only; no mutation) ───────────────
  try {
    const contract = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "contracts" as any,
      id: ROBIN_CONTRACT_ID,
      depth: 0,
      overrideAccess: true,
    })) as {
      id: number;
      client?: unknown;
      title?: string;
      directAgreementTerms?: unknown;
    };
    const contractClientId = asClientId(contract.client);
    if (contractClientId !== client.id) {
      console.error(
        `PREFLIGHT FAIL: Contract ${ROBIN_CONTRACT_ID} client=${contractClientId} ≠ ${client.id}. Aborting.`,
      );
      process.exit(1);
    }
    const terms = parseStoredDirectAgreementTerms(contract.directAgreementTerms);
    console.log(
      `  ✓ Contract id=${contract.id} owned by client ${client.id} (read-only)`,
    );
    console.log(
      `  · capacityHoursPerMonth=${terms?.capacityHoursPerMonth ?? "null"} (locked terms — NOT mutated)`,
    );
  } catch (err) {
    console.error(
      `PREFLIGHT FAIL: Could not load contract ${ROBIN_CONTRACT_ID} for ownership check:`,
      err,
    );
    process.exit(1);
  }

  console.log("\nPreflight passed. No executed agreement terms will be written.");

  if (!apply) {
    console.log("\nDRY-RUN planned writes (zero executed):");
    console.log(
      `  · Brand Kit ${brandKitId ? `update id=${brandKitId}` : "create"} colors ${ROBIN_BRAND_KIT.primaryColor}/${ROBIN_BRAND_KIT.accentColor}`,
    );
    console.log(`  · Brand Kit assets upsert × ${BRAND_ASSETS.length}`);
    console.log(
      `  · CES profile id=${profile.id} → Campaign HQ modules + terminology merge`,
    );
    console.log(
      `  · Memberships: user 10 owner, user 11 admin on client ${client.id}`,
    );
    console.log("  · Contract capacity: skipped (locked executed agreement)\n");
    console.log("Re-run with APPLY=1 to write Robin-only configuration.\n");
    return;
  }

  // ── APPLY writes (only after full preflight) ─────────────────────────────
  console.log("\nAPPLY — writing Robin-only configuration…");

  const kitData = {
    brandName: ROBIN_BRAND_KIT.brandName,
    slug: ROBIN_BRAND_KIT.slug,
    client: client.id,
    industry: ROBIN_BRAND_KIT.industry,
    primaryColor: ROBIN_BRAND_KIT.primaryColor,
    secondaryColor: ROBIN_BRAND_KIT.secondaryColor,
    accentColor: ROBIN_BRAND_KIT.accentColor,
    neutralColor: ROBIN_BRAND_KIT.neutralColor,
    logoNotes: ROBIN_BRAND_KIT.logoNotes,
    voiceTone: ROBIN_BRAND_KIT.voiceTone,
    doRules: ROBIN_BRAND_KIT.doRules,
    dontRules: ROBIN_BRAND_KIT.dontRules,
    primaryCTA: ROBIN_BRAND_KIT.primaryCTA,
    websiteIntroCopy: ROBIN_BRAND_KIT.websiteIntroCopy,
    status: ROBIN_BRAND_KIT.status,
    nextAction: "Operational Brand Kit synced for Campaign HQ",
  };

  if (brandKitId) {
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "brand-kits" as any,
      id: brandKitId,
      data: kitData,
      overrideAccess: true,
    });
  } else {
    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "brand-kits" as any,
      data: kitData,
      overrideAccess: true,
    });
    brandKitId = Number((created as { id: number }).id);
  }
  console.log(`  ✓ Brand Kit id=${brandKitId}`);

  for (const asset of BRAND_ASSETS) {
    const existingAssets = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "brand-kit-assets" as any,
      where: {
        and: [
          { brandKit: { equals: brandKitId } },
          { title: { equals: asset.title } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const existingId =
      existingAssets.docs.length > 0
        ? Number((existingAssets.docs[0] as { id: number }).id)
        : null;
    const assetData = {
      title: asset.title,
      brandKit: brandKitId,
      client: client.id,
      assetType: asset.assetType,
      externalUrl: asset.externalUrl,
      usageContext: asset.usageContext,
      notes: asset.notes,
      isApproved: true,
      status: "approved",
    };
    if (existingId) {
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "brand-kit-assets" as any,
        id: existingId,
        data: assetData,
        overrideAccess: true,
      });
      console.log(`  ✓ Asset update id=${existingId} (${asset.title})`);
    } else {
      const created = await payload.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "brand-kit-assets" as any,
        data: assetData,
        overrideAccess: true,
      });
      console.log(
        `  ✓ Asset create id=${(created as { id: number }).id} (${asset.title})`,
      );
    }
  }

  const existingTerminology =
    profile.terminology &&
    typeof profile.terminology === "object" &&
    !Array.isArray(profile.terminology)
      ? Object.fromEntries(
          Object.entries(profile.terminology as Record<string, unknown>).filter(
            (entry): entry is [string, string] =>
              typeof entry[0] === "string" &&
              typeof entry[1] === "string" &&
              entry[1].trim().length > 0,
          ),
        )
      : {};

  const campaignHq = buildCampaignHqProfileConfig({
    profileName: "Robin Cole Campaign HQ",
    portalSidebarLabel: "Campaign HQ",
    primaryColor: ROBIN_BRAND_KIT.primaryColor,
    secondaryColor: ROBIN_BRAND_KIT.secondaryColor,
    accentColor: ROBIN_BRAND_KIT.accentColor,
    surfaceTint: "rgba(197, 238, 156, 0.10)",
    enabledModules: uniqueModules([
      ...asModules(profile.enabledModules),
      ...campaignHqRecommended(),
    ]),
    terminology: existingTerminology,
  });

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-experience-profiles" as any,
    id: profile.id,
    data: {
      profileName: campaignHq.profileName,
      status: campaignHq.status,
      brandKit: brandKitId,
      primaryColor: campaignHq.primaryColor,
      secondaryColor: campaignHq.secondaryColor,
      accentColor: campaignHq.accentColor,
      surfaceTint: campaignHq.surfaceTint,
      borderRadiusPreset: campaignHq.borderRadiusPreset,
      motionPreset: campaignHq.motionPreset,
      welcomeEyebrow: campaignHq.welcomeEyebrow,
      reassuranceLine: campaignHq.reassuranceLine,
      supportTone: campaignHq.supportTone,
      portalSidebarLabel: campaignHq.portalSidebarLabel,
      enabledModules: campaignHq.enabledModules,
      terminology: campaignHq.terminology,
      showKxdPartnerMark: campaignHq.showKxdPartnerMark,
      partnerFooterLine: campaignHq.partnerFooterLine,
    },
    overrideAccess: true,
  });
  console.log(`  ✓ CES profile id=${profile.id} Campaign HQ configured`);

  for (const target of ROBIN_PORTAL_USER_TARGETS) {
    await ensurePortalMembership({
      portalUserId: target.portalUserId,
      clientId: client.id,
      isDefault: true,
      role: target.role,
      notes: "Campaign HQ Phase 1 membership backfill",
      payload,
    });
    console.log(
      `  ✓ Membership ensured: user ${target.portalUserId} (${target.label}) ${target.role}`,
    );
  }

  console.log(
    "\nApplied. Executed agreement terms untouched. MFA/welcome untouched. No schema migration.\n",
  );
}

const isDirectRun =
  typeof process.argv[1] === "string" &&
  /configure-campaign-hq-robin\.(ts|js|mjs)$/.test(process.argv[1]);

if (isDirectRun) {
  main().catch((err) => {
    console.error("configure-campaign-hq-robin failed:", err);
    process.exit(1);
  });
}