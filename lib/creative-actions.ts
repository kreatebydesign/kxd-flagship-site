/**
 * lib/creative-actions.ts
 *
 * KXD Creative Engine — Execution Layer.
 *
 * Controlled, manually-triggered repair and regeneration actions.
 * Converts Creative Intelligence insights into actual system operations.
 *
 * SAFETY CONTRACT:
 *   - No automatic execution. Every function must be explicitly called.
 *   - No destructive mutations. Data is only updated or created, never deleted.
 *   - All operations are individually try/caught and logged in the result.
 *   - All results include a full audit log: what was attempted, what changed,
 *     what was skipped, and any errors.
 *   - fixStalledItems() is READ-ONLY — it returns the stalled list without
 *     any status changes until a future phase activates that behavior.
 *
 * IDEMPOTENCY:
 *   - repairOrphanedItems: only updates records whose relatedCampaign is null.
 *     Running twice won't re-link already-linked records.
 *   - rerunCampaignSpawn / regenerateMissingOutputs: delegate to the spawn
 *     engine which already guarantees idempotency by counting existing records.
 */

import { getPayload } from "payload";
import config from "@payload-config";
import { spawnCreativeFromCampaign, type SpawnResult } from "@/lib/creative-spawn-engine";

// ── Shared types ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

/** Resolve a relationship field to a numeric ID or null. */
function resolveId(rel: unknown): number | null {
  if (!rel) return null;
  if (typeof rel === "number") return rel;
  if (typeof rel === "object" && rel !== null && "id" in rel)
    return (rel as AnyDoc).id as number;
  return null;
}

/** Clamp a non-negative number. */
function nn(n: unknown): number { return Math.max(0, Number(n ?? 0)); }

// ── 1. repairOrphanedItems ────────────────────────────────────────────────────

export interface RepairedItem {
  id:     number;
  title:  string;
  client: string | null;
  linkedCampaignId: number | null;
  linkedBrandKitId: number | null;
}

export interface UnresolvedItem {
  id:     number;
  title:  string;
  client: string | null;
  reason: string;
}

export interface RepairOrphansResult {
  attempted:  number;
  repaired:   { flyers: number; videos: number; socialPosts: number; assets: number };
  unresolved: { flyers: UnresolvedItem[]; videos: UnresolvedItem[]; socialPosts: UnresolvedItem[]; assets: UnresolvedItem[] };
  errors:     string[];
}

/**
 * Finds orphaned creative items (no relatedCampaign set) and attempts to
 * re-link them by matching on the item's client.
 *
 * Matching heuristic (conservative):
 *   — If the item's client has exactly ONE active campaign → link it.
 *   — If the item's client has exactly ONE brand kit → link it.
 *   — If zero or multiple candidates exist → leave unresolved (too ambiguous).
 *
 * Never deletes data. Only sets relatedCampaign / brandKit where currently null.
 */
export async function repairOrphanedItems(): Promise<RepairOrphansResult> {
  const errors: string[] = [];
  const result: RepairOrphansResult = {
    attempted:  0,
    repaired:   { flyers: 0, videos: 0, socialPosts: 0, assets: 0 },
    unresolved: { flyers: [], videos: [], socialPosts: [], assets: [] },
    errors,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any;
  try {
    payload = await getPayload({ config });
  } catch (err) {
    errors.push(`Payload init failed: ${String(err)}`);
    return result;
  }

  // ── Fetch all non-archived orphaned items ──────────────────────────────

  const COLLECTIONS: Array<{
    key:         keyof RepairOrphansResult["repaired"];
    slug:        string;
    titleField:  string;
  }> = [
    { key: "flyers",      slug: "flyer-requests",       titleField: "flyerTitle"  },
    { key: "videos",      slug: "promo-video-requests",  titleField: "videoTitle"  },
    { key: "socialPosts", slug: "social-post-requests",  titleField: "postTitle"   },
    { key: "assets",      slug: "creative-assets",       titleField: "assetTitle"  },
  ];

  for (const col of COLLECTIONS) {
    let docs: AnyDoc[] = [];
    try {
      const res = await payload.find({
        collection: col.slug,
        depth: 1,
        limit: 50,
        where: {
          and: [
            { relatedCampaign: { equals: null } },
            { status: { not_in: ["archived"] } },
          ],
        },
      });
      docs = (res.docs ?? []) as AnyDoc[];
    } catch (err) {
      errors.push(`Failed to fetch orphaned ${col.slug}: ${String(err)}`);
      continue;
    }

    result.attempted += docs.length;

    for (const doc of docs) {
      const id         = doc.id as number;
      const title      = (doc[col.titleField] as string) ?? `#${id}`;
      const clientId   = resolveId(doc.client);
      const clientName = doc.client && typeof doc.client === "object" ? (doc.client as AnyDoc).name as string : null;

      if (!clientId) {
        result.unresolved[col.key].push({ id, title, client: clientName, reason: "No client set — cannot match to campaign." });
        continue;
      }

      // Find campaigns for this client
      let matchedCampaignId: number | null = null;
      let matchedBrandKitId: number | null = null;

      try {
        const campaignRes = await payload.find({
          collection: "creative-campaigns",
          depth: 0,
          limit: 5,
          where: {
            and: [
              { client: { equals: clientId } },
              { status: { in: ["planning", "active", "in-review", "approved"] } },
            ],
          },
        });
        if (campaignRes.totalDocs === 1) {
          matchedCampaignId = (campaignRes.docs[0] as AnyDoc).id as number;
        }
      } catch (err) {
        errors.push(`Campaign lookup failed for item #${id}: ${String(err)}`);
      }

      // Find brand kits for this client (only if item has no brandKit set)
      if (!resolveId(doc.brandKit)) {
        try {
          const kitRes = await payload.find({
            collection: "brand-kits",
            depth: 0,
            limit: 5,
            where: {
              and: [
                { client: { equals: clientId } },
                { status: { not_in: ["archived"] } },
              ],
            },
          });
          if (kitRes.totalDocs === 1) {
            matchedBrandKitId = (kitRes.docs[0] as AnyDoc).id as number;
          }
        } catch (err) {
          errors.push(`Brand kit lookup failed for item #${id}: ${String(err)}`);
        }
      }

      // Only update if we found at least one unambiguous match
      if (!matchedCampaignId && !matchedBrandKitId) {
        const reason = matchedCampaignId === null
          ? "No unambiguous campaign found for this client (0 or multiple active campaigns)."
          : "No unambiguous brand kit found.";
        result.unresolved[col.key].push({ id, title, client: clientName, reason });
        continue;
      }

      // Apply the repair
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: Record<string, any> = {};
        if (matchedCampaignId) updateData.relatedCampaign = matchedCampaignId;
        if (matchedBrandKitId) updateData.brandKit         = matchedBrandKitId;

        await payload.update({ collection: col.slug, id, data: updateData });
        result.repaired[col.key]++;
        console.info(`[KXD Repair] Linked ${col.slug} #${id} "${title}" → campaign #${matchedCampaignId ?? "—"}, brandKit #${matchedBrandKitId ?? "—"}`);
      } catch (err) {
        errors.push(`Update failed for ${col.slug} #${id}: ${String(err)}`);
        result.unresolved[col.key].push({ id, title, client: clientName, reason: `Update error: ${String(err)}` });
      }
    }
  }

  return result;
}

// ── 2. rerunCampaignSpawn ─────────────────────────────────────────────────────

export interface RerunResult extends SpawnResult {
  note: string;
}

/**
 * Re-trigger the spawn engine for a campaign.
 * Delegates entirely to spawnCreativeFromCampaign which is already idempotent.
 * Safe to call multiple times — only the deficit is created.
 */
export async function rerunCampaignSpawn(campaignId: number): Promise<RerunResult> {
  if (!campaignId || isNaN(campaignId) || campaignId <= 0) {
    return {
      campaignId:    campaignId,
      campaignTitle: "",
      clientId:      null,
      created:  { brandKits: 0, flyers: 0, socialPosts: 0, videos: 0 },
      skipped:  { brandKits: 0, flyers: 0, socialPosts: 0, videos: 0 },
      errors:   ["Invalid campaignId."],
      note:     "Aborted — invalid campaignId.",
    };
  }

  const spawn = await spawnCreativeFromCampaign(campaignId);
  const totalCreated = Object.values(spawn.created).reduce((a, b) => a + b, 0);

  return {
    ...spawn,
    note: totalCreated > 0
      ? `${totalCreated} item(s) created. Existing items were skipped.`
      : "No new items created — all configured items already exist.",
  };
}

// ── 3. regenerateMissingOutputs ───────────────────────────────────────────────

export interface RegenerateResult {
  campaignId:    number;
  campaignTitle: string;
  configFound:   boolean;
  spawn:         SpawnResult | null;
  note:          string;
  errors:        string[];
}

/**
 * Inspect a campaign's generationConfig and create only the missing items.
 * Reuses spawn engine idempotency — safe to call repeatedly.
 * Returns an error note if the campaign has no generationConfig or all fields
 * are zero (nothing to regenerate without user intent set in Payload).
 */
export async function regenerateMissingOutputs(campaignId: number): Promise<RegenerateResult> {
  const base: RegenerateResult = {
    campaignId, campaignTitle: "", configFound: false, spawn: null,
    note: "", errors: [],
  };

  if (!campaignId || isNaN(campaignId) || campaignId <= 0) {
    base.errors.push("Invalid campaignId.");
    base.note = "Aborted — invalid campaignId.";
    return base;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any;
  try {
    payload = await getPayload({ config });
  } catch (err) {
    base.errors.push(`Payload init failed: ${String(err)}`);
    base.note = "Aborted — could not initialize Payload.";
    return base;
  }

  // Fetch campaign to validate generationConfig is populated
  let campaign: AnyDoc | null = null;
  try {
    campaign = await payload.findByID({ collection: "creative-campaigns", id: campaignId, depth: 0 });
  } catch (err) {
    base.errors.push(`Campaign fetch failed: ${String(err)}`);
    base.note = "Aborted — campaign not found.";
    return base;
  }

  if (!campaign) {
    base.errors.push(`Campaign #${campaignId} not found.`);
    base.note = "Aborted — campaign not found.";
    return base;
  }

  base.campaignTitle = (campaign.campaignTitle as string) ?? `Campaign #${campaignId}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cfg = (campaign.generationConfig as Record<string, any>) ?? {};
  const totalConfigured =
    nn(cfg.flyers) + nn(cfg.socialPosts) + nn(cfg.videos) + (cfg.createBrandKit ? 1 : 0);

  if (totalConfigured === 0) {
    base.note = "Nothing to regenerate — generationConfig is empty. Set flyer/social/video counts or enable brand kit creation in Payload, then re-trigger.";
    return base;
  }

  base.configFound = true;

  const spawn = await spawnCreativeFromCampaign(campaignId);
  const totalCreated = Object.values(spawn.created).reduce((a, b) => a + b, 0);
  const totalSkipped = Object.values(spawn.skipped).reduce((a, b) => a + b, 0);

  base.spawn = spawn;
  base.errors = spawn.errors;
  base.note = totalCreated > 0
    ? `${totalCreated} item(s) created, ${totalSkipped} already existed and were skipped.`
    : `All ${totalSkipped} configured item(s) already exist — nothing new created.`;

  return base;
}

// ── 4. fixStalledItems (READ-ONLY) ────────────────────────────────────────────

export interface StalledItem {
  id:              number;
  title:           string;
  status:          string;
  client:          string | null;
  updatedAt:       string | null;
  daysSinceUpdate: number | null;
}

export interface StalledItemsReport {
  flyers:       StalledItem[];
  videos:       StalledItem[];
  socialPosts:  StalledItem[];
  totalStalled: number;
  note:         string;
}

/** Days elapsed since an ISO timestamp. Returns null if timestamp is invalid. */
function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (isNaN(ms) || ms < 0) return null;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * READ-ONLY scan. Identifies stalled creative work items:
 *   — Status is still in an early/unstarted state ("new" or "drafting").
 *   — Returned grouped by type, sorted by oldest first.
 *
 * No status changes are made. This function is purely observational.
 * Status auto-correction is reserved for a future phase.
 */
export async function fixStalledItems(): Promise<StalledItemsReport> {
  const report: StalledItemsReport = {
    flyers: [], videos: [], socialPosts: [], totalStalled: 0,
    note: "READ-ONLY — no status changes made. Review and action in Payload.",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any;
  try {
    payload = await getPayload({ config });
  } catch (err) {
    report.note = `Payload init failed: ${String(err)}`;
    return report;
  }

  const STALLED_STATUSES = ["new", "drafting"];

  const COLLECTIONS: Array<{
    key:        keyof Pick<StalledItemsReport, "flyers" | "videos" | "socialPosts">;
    slug:       string;
    titleField: string;
  }> = [
    { key: "flyers",      slug: "flyer-requests",       titleField: "flyerTitle"  },
    { key: "videos",      slug: "promo-video-requests",  titleField: "videoTitle"  },
    { key: "socialPosts", slug: "social-post-requests",  titleField: "postTitle"   },
  ];

  await Promise.allSettled(COLLECTIONS.map(async col => {
    try {
      const res = await payload.find({
        collection: col.slug,
        depth: 1,
        limit: 50,
        sort: "updatedAt",   // oldest first
        where: {
          and: [
            { status:  { in: STALLED_STATUSES } },
            { status:  { not_in: ["archived"] } },
          ],
        },
      });

      report[col.key] = ((res.docs ?? []) as AnyDoc[]).map(doc => {
        const updatedAt = (doc.updatedAt as string) ?? null;
        const client    = doc.client && typeof doc.client === "object"
          ? (doc.client as AnyDoc).name as string
          : null;
        return {
          id:              doc.id as number,
          title:           (doc[col.titleField] as string) ?? `#${doc.id}`,
          status:          (doc.status as string) ?? "unknown",
          client,
          updatedAt,
          daysSinceUpdate: daysSince(updatedAt),
        };
      });
    } catch {
      // Silently skip failed collection — partial results are still useful
    }
  }));

  report.totalStalled =
    report.flyers.length + report.videos.length + report.socialPosts.length;

  return report;
}
