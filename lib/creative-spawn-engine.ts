/**
 * lib/creative-spawn-engine.ts
 *
 * Campaign Spawn Engine — manual trigger version.
 *
 * Given a campaign ID, reads generationConfig and creates the configured number
 * of creative work items (flyers, social posts, videos, brand kit) in Payload,
 * all linked back to the source campaign.
 *
 * IDEMPOTENCY GUARANTEE:
 *   Before creating any record type, the engine counts existing records already
 *   linked to the campaign. Only the deficit (requested − existing) is created.
 *   Running spawn twice on the same campaign with the same config is safe.
 *
 * SAFETY:
 *   All Payload operations are wrapped in try/catch. Individual failures are
 *   captured in the errors array without aborting the rest of the run.
 *   The caller always receives a SpawnResult regardless of partial failures.
 *
 * EXECUTION:
 *   Triggered exclusively via POST /api/admin/creative/campaigns/spawn.
 *   Nothing in this module runs automatically or on any Payload hook.
 */

import { getPayload } from "payload";
import config from "@payload-config";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SpawnResult {
  campaignId:    number;
  campaignTitle: string;
  clientId:      number | null;
  created: {
    brandKits:   number;
    flyers:      number;
    socialPosts: number;
    videos:      number;
  };
  skipped: {
    brandKits:   number;
    flyers:      number;
    socialPosts: number;
    videos:      number;
  };
  errors: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

/** Resolve a relationship field value to a numeric ID. */
function resolveId(rel: unknown): number | null {
  if (!rel) return null;
  if (typeof rel === "number") return rel;
  if (typeof rel === "object" && rel !== null && "id" in rel) return (rel as AnyRecord).id as number;
  return null;
}

/** Count existing records in a collection where a given field equals a value. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function countExisting(payload: any, collection: string, field: string, value: number): Promise<number> {
  try {
    const res = await payload.find({
      collection,
      depth: 0,
      limit: 0,
      where: { [field]: { equals: value } },
    });
    return res.totalDocs ?? 0;
  } catch {
    return 0;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Spawn creative work items for a campaign.
 *
 * @param campaignId  - The Payload numeric ID of the creative-campaigns record.
 * @returns SpawnResult summarising what was created, skipped, and any errors.
 */
export async function spawnCreativeFromCampaign(campaignId: number): Promise<SpawnResult> {
  const errors: string[] = [];

  const result: SpawnResult = {
    campaignId,
    campaignTitle: "",
    clientId: null,
    created: { brandKits: 0, flyers: 0, socialPosts: 0, videos: 0 },
    skipped: { brandKits: 0, flyers: 0, socialPosts: 0, videos: 0 },
    errors,
  };

  // ── 1. Initialize Payload and fetch the campaign ──────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any;
  try {
    payload = await getPayload({ config });
  } catch (err) {
    errors.push(`Failed to initialize Payload: ${String(err)}`);
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let campaign: AnyRecord;
  try {
    campaign = await payload.findByID({
      collection: "creative-campaigns",
      id: campaignId,
      depth: 1,
    });
  } catch (err) {
    errors.push(`Failed to fetch campaign #${campaignId}: ${String(err)}`);
    return result;
  }

  if (!campaign) {
    errors.push(`Campaign #${campaignId} not found.`);
    return result;
  }

  result.campaignTitle = (campaign.campaignTitle as string) ?? `Campaign #${campaignId}`;
  const clientId = resolveId(campaign.client);
  result.clientId = clientId;

  // ── 2. Read generation config ─────────────────────────────────────────────

  const cfg: AnyRecord = (campaign.generationConfig as AnyRecord) ?? {};
  const wantFlyers      = Math.max(0, Number(cfg.flyers      ?? 0));
  const wantSocial      = Math.max(0, Number(cfg.socialPosts ?? 0));
  const wantVideos      = Math.max(0, Number(cfg.videos      ?? 0));
  const wantBrandKit    = Boolean(cfg.createBrandKit);

  // Guard: nothing to do
  if (!wantBrandKit && wantFlyers === 0 && wantSocial === 0 && wantVideos === 0) {
    errors.push("generationConfig has no items configured — nothing to spawn.");
    return result;
  }

  // ── 3. Brand Kit ──────────────────────────────────────────────────────────

  if (wantBrandKit) {
    const existing = await countExisting(payload, "brand-kits", "campaign", campaignId);
    if (existing >= 1) {
      result.skipped.brandKits = 1;
    } else {
      try {
        const brandKitSlug = `${slugify(result.campaignTitle)}-brand-kit-${Date.now().toString(36)}`;
        await payload.create({
          collection: "brand-kits",
          data: {
            brandName:    `${result.campaignTitle} — Brand Kit`,
            slug:         brandKitSlug,
            status:       "draft",
            ...(clientId   ? { client: clientId }     : {}),
            campaign:     campaignId,
          },
        });
        result.created.brandKits++;
      } catch (err) {
        errors.push(`Brand kit creation failed: ${String(err)}`);
      }
    }
  }

  // ── 4. Flyer Requests ─────────────────────────────────────────────────────

  if (wantFlyers > 0) {
    const existing = await countExisting(payload, "flyer-requests", "relatedCampaign", campaignId);
    const deficit  = Math.max(0, wantFlyers - existing);
    result.skipped.flyers = wantFlyers - deficit;

    for (let i = 0; i < deficit; i++) {
      try {
        await payload.create({
          collection: "flyer-requests",
          data: {
            flyerTitle:      `${result.campaignTitle} — Flyer ${existing + i + 1}`,
            status:          "new",
            priority:        "normal",
            relatedCampaign: campaignId,
            ...(clientId ? { client: clientId } : {}),
          },
        });
        result.created.flyers++;
      } catch (err) {
        errors.push(`Flyer #${i + 1} creation failed: ${String(err)}`);
      }
    }
  }

  // ── 5. Social Post Requests ───────────────────────────────────────────────

  if (wantSocial > 0) {
    const existing = await countExisting(payload, "social-post-requests", "relatedCampaign", campaignId);
    const deficit  = Math.max(0, wantSocial - existing);
    result.skipped.socialPosts = wantSocial - deficit;

    for (let i = 0; i < deficit; i++) {
      try {
        await payload.create({
          collection: "social-post-requests",
          data: {
            postTitle:       `${result.campaignTitle} — Social Post ${existing + i + 1}`,
            status:          "new",
            priority:        "normal",
            relatedCampaign: campaignId,
            ...(clientId ? { client: clientId } : {}),
          },
        });
        result.created.socialPosts++;
      } catch (err) {
        errors.push(`Social post #${i + 1} creation failed: ${String(err)}`);
      }
    }
  }

  // ── 6. Promo Video Requests ───────────────────────────────────────────────

  if (wantVideos > 0) {
    const existing = await countExisting(payload, "promo-video-requests", "relatedCampaign", campaignId);
    const deficit  = Math.max(0, wantVideos - existing);
    result.skipped.videos = wantVideos - deficit;

    for (let i = 0; i < deficit; i++) {
      try {
        await payload.create({
          collection: "promo-video-requests",
          data: {
            videoTitle:      `${result.campaignTitle} — Video ${existing + i + 1}`,
            status:          "new",
            priority:        "normal",
            relatedCampaign: campaignId,
            ...(clientId ? { client: clientId } : {}),
          },
        });
        result.created.videos++;
      } catch (err) {
        errors.push(`Video #${i + 1} creation failed: ${String(err)}`);
      }
    }
  }

  // ── 7. Log summary ────────────────────────────────────────────────────────

  const totalCreated = Object.values(result.created).reduce((a, b) => a + b, 0);
  const totalSkipped = Object.values(result.skipped).reduce((a, b) => a + b, 0);
  console.info(
    `[KXD Spawn Engine] Campaign #${campaignId} "${result.campaignTitle}" — `
    + `created: ${totalCreated}, skipped: ${totalSkipped}, errors: ${errors.length}`
  );

  return result;
}
