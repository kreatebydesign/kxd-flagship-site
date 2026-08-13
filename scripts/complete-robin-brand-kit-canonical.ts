/**
 * Robin-only Brand Kit id=1 canonical field completion.
 *
 * Safety:
 * - Updates brand-kits id=1 only when client=17 and slug=robin-cole-campaign
 * - Does not touch CES, memberships, contracts, reporting, assets, or other clients
 *
 * Default: dry-run. Apply with APPLY=1.
 *
 * Run:
 *   KXD_SERVER_ONLY_SHIM=1 tsx --import ./scripts/shims/register-server-only.mjs scripts/complete-robin-brand-kit-canonical.ts
 *   KXD_SERVER_ONLY_SHIM=1 APPLY=1 tsx --import ./scripts/shims/register-server-only.mjs scripts/complete-robin-brand-kit-canonical.ts
 */

import { getPayload } from "payload";
import config from "../payload.config";
import {
  ROBIN_BRAND_KIT,
  ROBIN_CLIENT_ID,
} from "./configure-campaign-hq-robin";

const BRAND_KIT_ID = 1;
const EXPECTED_SLUG = "robin-cole-campaign";

async function main() {
  const apply = process.env.APPLY === "1";
  const payload = await getPayload({ config });

  const kit = (await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "brand-kits" as any,
    id: BRAND_KIT_ID,
    depth: 0,
    overrideAccess: true,
  })) as Record<string, unknown>;

  const clientRaw = kit.client;
  const clientId =
    typeof clientRaw === "object" && clientRaw && "id" in clientRaw
      ? Number((clientRaw as { id: number }).id)
      : Number(clientRaw);

  if (clientId !== ROBIN_CLIENT_ID) {
    throw new Error(
      `Safety abort: Brand Kit ${BRAND_KIT_ID} client=${clientId}, expected ${ROBIN_CLIENT_ID}`,
    );
  }
  if (String(kit.slug ?? "") !== EXPECTED_SLUG) {
    throw new Error(
      `Safety abort: Brand Kit ${BRAND_KIT_ID} slug=${String(kit.slug)}, expected ${EXPECTED_SLUG}`,
    );
  }

  const data = {
    taglineOptions: ROBIN_BRAND_KIT.taglineOptions,
    typographyDirection: ROBIN_BRAND_KIT.typographyDirection,
    brandPersonality: ROBIN_BRAND_KIT.brandPersonality,
    positioningStatement: ROBIN_BRAND_KIT.positioningStatement,
    voiceTone: ROBIN_BRAND_KIT.voiceTone,
    doRules: ROBIN_BRAND_KIT.doRules,
    dontRules: ROBIN_BRAND_KIT.dontRules,
    logoNotes: ROBIN_BRAND_KIT.logoNotes,
    socialBio: ROBIN_BRAND_KIT.socialBio,
    brandKeywords: ROBIN_BRAND_KIT.brandKeywords,
    websiteIntroCopy: ROBIN_BRAND_KIT.websiteIntroCopy,
    primaryCTA: ROBIN_BRAND_KIT.primaryCTA,
    secondaryCTA: ROBIN_BRAND_KIT.secondaryCTA,
    nextAction: "Canonical Brand Kit fields synced for Campaign HQ",
  };

  const before = {
    taglineOptions: kit.taglineOptions ?? null,
    typographyDirection: kit.typographyDirection ?? null,
    brandPersonality: kit.brandPersonality ?? null,
    positioningStatement: kit.positioningStatement ?? null,
    voiceTone: kit.voiceTone ?? null,
    doRules: kit.doRules ?? null,
    dontRules: kit.dontRules ?? null,
    logoNotes: kit.logoNotes ?? null,
    socialBio: kit.socialBio ?? null,
    brandKeywords: kit.brandKeywords ?? null,
    websiteIntroCopy: kit.websiteIntroCopy ?? null,
    primaryCTA: kit.primaryCTA ?? null,
    secondaryCTA: kit.secondaryCTA ?? null,
    brandName: kit.brandName,
    slug: kit.slug,
    industry: kit.industry,
    status: kit.status,
    primaryColor: kit.primaryColor,
    secondaryColor: kit.secondaryColor,
    accentColor: kit.accentColor,
    neutralColor: kit.neutralColor,
    audience: kit.audience ?? null,
    canvaDirection: kit.canvaDirection ?? null,
  };

  console.log(
    JSON.stringify(
      {
        mode: apply ? "APPLY" : "DRY-RUN",
        brandKitId: BRAND_KIT_ID,
        clientId,
        before,
        after: data,
        preserved: {
          brandName: ROBIN_BRAND_KIT.brandName,
          slug: ROBIN_BRAND_KIT.slug,
          industry: ROBIN_BRAND_KIT.industry,
          status: ROBIN_BRAND_KIT.status,
          colors: [
            ROBIN_BRAND_KIT.primaryColor,
            ROBIN_BRAND_KIT.secondaryColor,
            ROBIN_BRAND_KIT.accentColor,
            ROBIN_BRAND_KIT.neutralColor,
          ],
        },
      },
      null,
      2,
    ),
  );

  if (!apply) {
    console.log("\nDry-run only. Re-run with APPLY=1 to write Brand Kit id=1.\n");
    return;
  }

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "brand-kits" as any,
    id: BRAND_KIT_ID,
    data,
    overrideAccess: true,
  });

  console.log(`\n✓ Updated Brand Kit id=${BRAND_KIT_ID} (client ${clientId}) only.\n`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
