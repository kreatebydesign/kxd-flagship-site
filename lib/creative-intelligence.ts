/**
 * lib/creative-intelligence.ts
 *
 * KXD Creative Intelligence Engine.
 *
 * Computes system-wide awareness across all Creative Engine collections:
 *   creative-campaigns, flyer-requests, social-post-requests,
 *   promo-video-requests, creative-assets, brand-kits.
 *
 * DESIGN PRINCIPLES:
 *   - Read-only. No mutations, no side effects.
 *   - Safe. Every query is individually try/caught. Partial failures degrade
 *     gracefully to zero counts rather than throwing.
 *   - Performant. Counts use limit:0 + totalDocs. Per-campaign queries are
 *     parallel via Promise.allSettled. Campaign scoring is capped at 30 records
 *     to keep sub-query fan-out bounded.
 *   - Server-side only. No client imports.
 */

import { getPayload } from "payload";
import config from "@payload-config";

// ── Shared types ──────────────────────────────────────────────────────────────

/** Statuses considered "active work in progress" across request types. */
const ACTIVE_STATUSES   = ["new", "drafting", "designing", "scripting", "assets-needed", "editing", "in-review", "review"];

/** Statuses considered "stalled" — work received but not progressed. */
const STALLED_STATUSES  = ["new", "drafting"];

/** Statuses considered successfully completed. */
const COMPLETE_STATUSES = ["approved", "delivered", "published"];

/** Campaign statuses that represent live work. */
const LIVE_CAMPAIGN_STATUSES = ["planning", "active", "in-review", "approved", "scheduled"];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Safely resolve a relationship field to a numeric ID or null. */
function resolveId(rel: unknown): number | null {
  if (!rel) return null;
  if (typeof rel === "number") return rel;
  if (typeof rel === "object" && rel !== null && "id" in rel)
    return (rel as Record<string, unknown>).id as number;
  return null;
}

/** Clamp a value between min and max inclusive. */
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Safely execute a Payload query, returning 0 totalDocs and [] docs on error. */
async function safeFind(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any,
  collection: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opts: Record<string, any>
): Promise<{ totalDocs: number; docs: Array<Record<string, unknown>> }> {
  try {
    const res = await payload.find({ collection, depth: 0, ...opts });
    return { totalDocs: res.totalDocs ?? 0, docs: (res.docs ?? []) as Array<Record<string, unknown>> };
  } catch {
    return { totalDocs: 0, docs: [] };
  }
}

/** Count records in a collection matching a where clause. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function countWhere(payload: any, collection: string, where: Record<string, unknown>): Promise<number> {
  const { totalDocs } = await safeFind(payload, collection, { limit: 0, where });
  return totalDocs;
}

// ── 1. System Health ─────────────────────────────────────────────────────────

export interface CreativeSystemHealth {
  activeCampaigns:   number;
  totalRequests:     number;
  stalledItems:      number;
  completedItems:    number;
  orphanedAssets:    number;
  missingBrandKits:  number;
}

/**
 * Compute system-wide health metrics across all Creative Engine collections.
 * All values are computed in parallel for performance.
 */
export async function getCreativeSystemHealth(): Promise<CreativeSystemHealth> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any;
  try {
    payload = await getPayload({ config });
  } catch {
    return {
      activeCampaigns: 0, totalRequests: 0, stalledItems: 0,
      completedItems: 0, orphanedAssets: 0, missingBrandKits: 0,
    };
  }

  const [
    activeCampaignsR,
    totalFlyersR,    stalledFlyersR,    completedFlyersR,
    totalSocialR,    stalledSocialR,    completedSocialR,
    totalVideosR,    stalledVideosR,    completedVideosR,
    orphanedAssetsR,
    missingBrandKitsR,
  ] = await Promise.allSettled([
    // Active campaigns
    countWhere(payload, "creative-campaigns", { status: { in: LIVE_CAMPAIGN_STATUSES } }),

    // Flyers — total / stalled / completed
    countWhere(payload, "flyer-requests",       { status: { not_in: ["archived"] } }),
    countWhere(payload, "flyer-requests",       { status: { in: STALLED_STATUSES } }),
    countWhere(payload, "flyer-requests",       { status: { in: COMPLETE_STATUSES } }),

    // Social posts — total / stalled / completed
    countWhere(payload, "social-post-requests", { status: { not_in: ["archived"] } }),
    countWhere(payload, "social-post-requests", { status: { in: STALLED_STATUSES } }),
    countWhere(payload, "social-post-requests", { status: { in: COMPLETE_STATUSES } }),

    // Videos — total / stalled / completed
    countWhere(payload, "promo-video-requests", { status: { not_in: ["archived"] } }),
    countWhere(payload, "promo-video-requests", { status: { in: STALLED_STATUSES } }),
    countWhere(payload, "promo-video-requests", { status: { in: COMPLETE_STATUSES } }),

    // Assets with no campaign relationship
    countWhere(payload, "creative-assets", { relatedCampaign: { equals: null } }),

    // Active/planning campaigns with no brand kit linked
    (async () => {
      const { docs } = await safeFind(payload, "creative-campaigns", {
        limit: 200,
        where: {
          and: [
            { status: { in: LIVE_CAMPAIGN_STATUSES } },
            { brandKit: { equals: null } },
          ],
        },
      });
      return docs.length;
    })(),
  ]);

  const resolve = (r: PromiseSettledResult<number>) =>
    r.status === "fulfilled" ? r.value : 0;

  return {
    activeCampaigns:  resolve(activeCampaignsR),
    totalRequests:    resolve(totalFlyersR)   + resolve(totalSocialR)   + resolve(totalVideosR),
    stalledItems:     resolve(stalledFlyersR) + resolve(stalledSocialR) + resolve(stalledVideosR),
    completedItems:   resolve(completedFlyersR) + resolve(completedSocialR) + resolve(completedVideosR),
    orphanedAssets:   resolve(orphanedAssetsR),
    missingBrandKits: resolve(missingBrandKitsR),
  };
}

// ── 2. Campaign Health Scores ─────────────────────────────────────────────────

export interface CampaignHealthBreakdown {
  completionRate:       number;   // 0–1  ratio of completed / total items
  stalenessPenalty:     number;   // 0–30 points deducted
  missingAssetsPenalty: number;   // 0–10 points deducted
  brandKitPenalty:      number;   // 0–20 points deducted
}

export interface CampaignHealthScore {
  campaignId:  number;
  title:       string;
  score:       number;            // 0–100
  breakdown:   CampaignHealthBreakdown;
}

/**
 * Compute a 0–100 health score for each active campaign.
 * Capped at the 30 most-recently-updated campaigns to bound sub-query fan-out.
 *
 * Score composition:
 *   Base:                    100 pts
 *   Brand kit present:       +0 pts penalty avoided   (−20 if missing)
 *   Staleness:               up to −30 pts            (proportional to stalled / total)
 *   Missing creative assets: −10 pts                  (if 0 assets linked)
 *   Completion bonus:        completionRate × +20     (restores lost score as work finishes)
 */
export async function getCampaignHealthScores(): Promise<CampaignHealthScore[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any;
  try {
    payload = await getPayload({ config });
  } catch {
    return [];
  }

  // Fetch active campaigns (most recently updated first, max 30)
  const { docs: campaigns } = await safeFind(payload, "creative-campaigns", {
    limit: 30,
    depth: 1,
    sort: "-updatedAt",
    where: { status: { in: LIVE_CAMPAIGN_STATUSES } },
  });

  if (campaigns.length === 0) return [];

  // Score each campaign in parallel
  const scored = await Promise.allSettled(
    campaigns.map(async (campaign): Promise<CampaignHealthScore> => {
      const campaignId = campaign.id as number;
      const title      = (campaign.campaignTitle as string) ?? `Campaign #${campaignId}`;
      const hasBrandKit = Boolean(resolveId(campaign.brandKit));

      // Fetch linked item counts in parallel
      const [flyerR, socialR, videoR, assetR] = await Promise.allSettled([
        safeFind(payload, "flyer-requests",       { limit: 0, where: { relatedCampaign: { equals: campaignId } } }),
        safeFind(payload, "social-post-requests", { limit: 0, where: { relatedCampaign: { equals: campaignId } } }),
        safeFind(payload, "promo-video-requests", { limit: 0, where: { relatedCampaign: { equals: campaignId } } }),
        safeFind(payload, "creative-assets",      { limit: 0, where: { relatedCampaign: { equals: campaignId } } }),
      ]);

      // Total item counts across request types (not counting assets)
      const totalFlyers  = flyerR.status  === "fulfilled" ? flyerR.value.totalDocs  : 0;
      const totalSocial  = socialR.status === "fulfilled" ? socialR.value.totalDocs : 0;
      const totalVideos  = videoR.status  === "fulfilled" ? videoR.value.totalDocs  : 0;
      const totalAssets  = assetR.status  === "fulfilled" ? assetR.value.totalDocs  : 0;
      const totalItems   = totalFlyers + totalSocial + totalVideos;

      // Stalled and completed counts require fetching limited docs when > 0
      let stalledCount = 0;
      let completedCount = 0;

      if (totalItems > 0) {
        const [stalledFlyerR, stalledSocialR, stalledVideoR, completedFlyerR, completedSocialR, completedVideoR] =
          await Promise.allSettled([
            countWhere(payload, "flyer-requests",       { and: [{ relatedCampaign: { equals: campaignId } }, { status: { in: STALLED_STATUSES } }] }),
            countWhere(payload, "social-post-requests", { and: [{ relatedCampaign: { equals: campaignId } }, { status: { in: STALLED_STATUSES } }] }),
            countWhere(payload, "promo-video-requests", { and: [{ relatedCampaign: { equals: campaignId } }, { status: { in: STALLED_STATUSES } }] }),
            countWhere(payload, "flyer-requests",       { and: [{ relatedCampaign: { equals: campaignId } }, { status: { in: COMPLETE_STATUSES } }] }),
            countWhere(payload, "social-post-requests", { and: [{ relatedCampaign: { equals: campaignId } }, { status: { in: COMPLETE_STATUSES } }] }),
            countWhere(payload, "promo-video-requests", { and: [{ relatedCampaign: { equals: campaignId } }, { status: { in: COMPLETE_STATUSES } }] }),
          ]);

        stalledCount   = [stalledFlyerR,   stalledSocialR,   stalledVideoR].reduce((acc, r) => acc + (r.status === "fulfilled" ? r.value : 0), 0);
        completedCount = [completedFlyerR, completedSocialR, completedVideoR].reduce((acc, r) => acc + (r.status === "fulfilled" ? r.value : 0), 0);
      }

      // ── Score components ──────────────────────────────────────────────────

      const brandKitPenalty     = hasBrandKit ? 0 : 20;
      const completionRate      = totalItems > 0 ? completedCount / totalItems : 0;
      const staleness           = totalItems > 0 ? stalledCount / totalItems : 0;
      const stalenessPenalty    = Math.round(staleness * 30);
      const missingAssetsPenalty = totalAssets > 0 ? 0 : 10;
      const completionBonus     = Math.round(completionRate * 20);

      const score = clamp(
        100 - brandKitPenalty - stalenessPenalty - missingAssetsPenalty + completionBonus,
        0,
        100
      );

      return {
        campaignId,
        title,
        score,
        breakdown: {
          completionRate:       Math.round(completionRate * 100) / 100,
          stalenessPenalty,
          missingAssetsPenalty,
          brandKitPenalty,
        },
      };
    })
  );

  return scored
    .filter((r): r is PromiseFulfilledResult<CampaignHealthScore> => r.status === "fulfilled")
    .map(r => r.value)
    .sort((a, b) => a.score - b.score); // lowest score first — surface problems first
}

// ── 3. Orphaned Creative Items ────────────────────────────────────────────────

export interface OrphanedItem {
  id:     number;
  title:  string;
  status: string | null;
  client: string | null;
}

export interface OrphanedCreativeItems {
  flyers:      OrphanedItem[];
  videos:      OrphanedItem[];
  socialPosts: OrphanedItem[];
  assets:      OrphanedItem[];
}

/**
 * Find creative work items that have no campaign relationship set.
 * Items are considered orphaned when relatedCampaign is null/unset.
 * Returns up to 20 per type, sorted by creation date descending.
 * Non-archived items only.
 */
export async function getOrphanedCreativeItems(): Promise<OrphanedCreativeItems> {
  const empty: OrphanedCreativeItems = { flyers: [], videos: [], socialPosts: [], assets: [] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any;
  try {
    payload = await getPayload({ config });
  } catch {
    return empty;
  }

  const [flyersR, videosR, socialR, assetsR] = await Promise.allSettled([
    safeFind(payload, "flyer-requests", {
      limit: 20, depth: 1, sort: "-createdAt",
      where: { and: [{ relatedCampaign: { equals: null } }, { status: { not_in: ["archived"] } }] },
    }),
    safeFind(payload, "promo-video-requests", {
      limit: 20, depth: 1, sort: "-createdAt",
      where: { and: [{ relatedCampaign: { equals: null } }, { status: { not_in: ["archived"] } }] },
    }),
    safeFind(payload, "social-post-requests", {
      limit: 20, depth: 1, sort: "-createdAt",
      where: { and: [{ relatedCampaign: { equals: null } }, { status: { not_in: ["archived"] } }] },
    }),
    safeFind(payload, "creative-assets", {
      limit: 20, depth: 1, sort: "-createdAt",
      where: { and: [{ relatedCampaign: { equals: null } }, { status: { not_in: ["archived"] } }] },
    }),
  ]);

  /** Normalize a raw Payload doc into an OrphanedItem. */
  function normalize(
    doc: Record<string, unknown>,
    titleField: string
  ): OrphanedItem {
    const client = doc.client;
    const clientName = client && typeof client === "object" && "name" in client
      ? (client as Record<string, unknown>).name as string
      : null;

    return {
      id:     doc.id as number,
      title:  (doc[titleField] as string) ?? `#${doc.id}`,
      status: (doc.status as string) ?? null,
      client: clientName,
    };
  }

  return {
    flyers: flyersR.status === "fulfilled"
      ? flyersR.value.docs.map(d => normalize(d, "flyerTitle"))
      : [],
    videos: videosR.status === "fulfilled"
      ? videosR.value.docs.map(d => normalize(d, "videoTitle"))
      : [],
    socialPosts: socialR.status === "fulfilled"
      ? socialR.value.docs.map(d => normalize(d, "postTitle"))
      : [],
    assets: assetsR.status === "fulfilled"
      ? assetsR.value.docs.map(d => normalize(d, "assetTitle"))
      : [],
  };
}
