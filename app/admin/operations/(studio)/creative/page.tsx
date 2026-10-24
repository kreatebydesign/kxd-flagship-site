/**
 * /admin/operations/creative
 * KXD Creative Engine — Creative Operations
 */

import type { Metadata } from "next";
import { getPayload } from "payload";
import config from "@payload-config";
import { CreativeScreen } from "@/components/admin/operations/creative/CreativeScreen";
import {
  getCreativeSystemHealth,
  getCampaignHealthScores,
  getOrphanedCreativeItems,
  type CreativeSystemHealth,
  type OrphanedCreativeItems,
} from "@/lib/creative-intelligence";

export const metadata: Metadata = {
  title: "Creative Engine · KXD OS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  // ── Existing operational data ─────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let campaigns: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let flyers:    any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let videos:    any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let social:    any[] = [];
  let campaignCount = 0, flyerCount = 0, videoCount = 0, socialCount = 0, assetCount = 0;

  try {
    const payload = await getPayload({ config });
    const [c, f, v, s, a] = await Promise.allSettled([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "creative-campaigns"   as any, limit: 20 }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "flyer-requests"       as any, limit: 20 }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "promo-video-requests" as any, limit: 20 }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "social-post-requests" as any, limit: 20 }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload.find({ collection: "creative-assets"      as any, limit: 1  }),
    ]);
    if (c.status === "fulfilled") { campaigns = c.value.docs; campaignCount = c.value.totalDocs; }
    if (f.status === "fulfilled") { flyers    = f.value.docs; flyerCount    = f.value.totalDocs; }
    if (v.status === "fulfilled") { videos    = v.value.docs; videoCount    = v.value.totalDocs; }
    if (s.status === "fulfilled") { social    = s.value.docs; socialCount   = s.value.totalDocs; }
    if (a.status === "fulfilled") { assetCount = a.value.totalDocs; }
  } catch {}

  // ── Intelligence layer — parallel, fully fail-safe ────────────────────────

  const defaultHealth: CreativeSystemHealth = {
    activeCampaigns: 0, totalRequests: 0, stalledItems: 0,
    completedItems: 0, orphanedAssets: 0, missingBrandKits: 0,
  };
  const defaultOrphaned: OrphanedCreativeItems = { flyers: [], videos: [], socialPosts: [], assets: [] };

  const [healthR, scoresR, orphanedR] = await Promise.allSettled([
    getCreativeSystemHealth(),
    getCampaignHealthScores(),
    getOrphanedCreativeItems(),
  ]);

  const health   = healthR.status   === "fulfilled" ? healthR.value   : defaultHealth;
  const scores   = scoresR.status   === "fulfilled" ? scoresR.value   : [];
  const orphaned = orphanedR.status === "fulfilled" ? orphanedR.value : defaultOrphaned;

  return (
    <CreativeScreen
      campaigns={campaigns}
      flyers={flyers}
      videos={videos}
      social={social}
      campaignCount={campaignCount}
      flyerCount={flyerCount}
      videoCount={videoCount}
      socialCount={socialCount}
      assetCount={assetCount}
      health={health}
      scores={scores}
      orphaned={orphaned}
    />
  );
}
