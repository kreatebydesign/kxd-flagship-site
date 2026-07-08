/**
 * seed-primal-experience-profile.ts
 *
 * Stage 3 — Active CES Experience Profile for Primal Motorsports.
 * Run: npm run seed:primal-experience
 *
 * Idempotent — updates existing profile for primal-motorsports or creates one.
 * Requires client record (npm run seed:clients) and migration 20260718.
 */

import { getPayload } from "payload";
import config from "../payload.config";
import {
  PRIMAL_CLIENT_SLUG,
  PRIMAL_EXPERIENCE_PROFILE,
} from "../lib/ces/profile/primal";

const COLLECTION = "client-experience-profiles";

async function findClientId(payload: Awaited<ReturnType<typeof getPayload>>): Promise<number> {
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "clients" as any,
    where: { slug: { equals: PRIMAL_CLIENT_SLUG } },
    limit: 1,
  });

  if (result.docs.length === 0) {
    throw new Error(
      `Client "${PRIMAL_CLIENT_SLUG}" not found. Run npm run seed:clients first.`,
    );
  }

  return (result.docs[0] as { id: number }).id;
}

async function findBrandKitId(
  payload: Awaited<ReturnType<typeof getPayload>>,
  clientId: number,
): Promise<number | null> {
  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "brand-kits" as any,
      where: { client: { equals: clientId } },
      limit: 5,
      sort: "-updatedAt",
    });

    if (result.docs.length === 0) return null;

    const delivered = result.docs.find((doc) => (doc as { status?: string }).status === "delivered");
    const kit = delivered ?? result.docs[0];
    return (kit as { id: number }).id;
  } catch {
    return null;
  }
}

async function seedPrimalExperienceProfile() {
  const payload = await getPayload({ config });
  const clientId = await findClientId(payload);
  const brandKitId = await findBrandKitId(payload, clientId);

  const data = {
    profileName: PRIMAL_EXPERIENCE_PROFILE.profileName,
    client: clientId,
    status: PRIMAL_EXPERIENCE_PROFILE.status,
    ...(brandKitId ? { brandKit: brandKitId } : {}),
    primaryColor: PRIMAL_EXPERIENCE_PROFILE.primaryColor,
    secondaryColor: PRIMAL_EXPERIENCE_PROFILE.secondaryColor,
    accentColor: PRIMAL_EXPERIENCE_PROFILE.accentColor,
    surfaceTint: PRIMAL_EXPERIENCE_PROFILE.surfaceTint,
    borderRadiusPreset: PRIMAL_EXPERIENCE_PROFILE.borderRadiusPreset,
    motionPreset: PRIMAL_EXPERIENCE_PROFILE.motionPreset,
    welcomeEyebrow: PRIMAL_EXPERIENCE_PROFILE.welcomeEyebrow,
    reassuranceLine: PRIMAL_EXPERIENCE_PROFILE.reassuranceLine,
    supportTone: PRIMAL_EXPERIENCE_PROFILE.supportTone,
    portalSidebarLabel: PRIMAL_EXPERIENCE_PROFILE.portalSidebarLabel,
    enabledModules: [...PRIMAL_EXPERIENCE_PROFILE.enabledModules],
    terminology: PRIMAL_EXPERIENCE_PROFILE.terminology,
    showKxdPartnerMark: PRIMAL_EXPERIENCE_PROFILE.showKxdPartnerMark,
    partnerFooterLine: PRIMAL_EXPERIENCE_PROFILE.partnerFooterLine,
  };

  const existing = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: { client: { equals: clientId } },
    limit: 1,
  });

  if (existing.docs.length > 0) {
    const id = (existing.docs[0] as { id: number }).id;
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: data as any,
    });
    console.log(`\n  ✔ Updated Primal Experience Profile (id ${id})`);
  } else {
    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: data as any,
    });
    console.log(`\n  ✦ Created Primal Experience Profile (id ${(created as { id: number }).id})`);
  }

  console.log(`  Client: ${PRIMAL_CLIENT_SLUG} (id ${clientId})`);
  console.log(`  Brand kit: ${brandKitId ?? "none — using profile color overrides"}`);
  console.log(`  Modules: ${PRIMAL_EXPERIENCE_PROFILE.enabledModules.join(", ")}`);
  console.log("\nPrimal CES profile seed complete.\n");
  process.exit(0);
}

seedPrimalExperienceProfile().catch((err) => {
  console.error("Primal experience profile seed failed:", err);
  process.exit(1);
});
