/**
 * /admin/operations/reels
 * KXD OS — Website Showcase Reel Generator
 */

import type { Metadata } from "next";
import { getPayload } from "payload";
import config from "@payload-config";
import { ReelsScreen } from "@/components/admin/operations/reels/ReelsScreen";

export const metadata: Metadata = {
  title: "Reel Generator · KXD OS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ReelsDashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let docs: any[] = [];
  let totalDocs = 0;
  let counts = { total: 0, complete: 0, generating: 0, screenshotted: 0 };

  try {
    const payload = await getPayload({ config });
    const result  = await payload.find({
      collection: "promo-video-requests" as "clients",
      where: { isWebsiteReel: { equals: true } },
      limit: 100,
      depth: 1,
      sort: "-createdAt",
    });
    docs      = result.docs;
    totalDocs = result.totalDocs;
    counts = {
      total:        totalDocs,
      complete:     docs.filter(d => d.storyboardGenerationStatus === "complete").length,
      generating:   docs.filter(d => d.storyboardGenerationStatus === "generating").length,
      screenshotted:docs.filter(d => d.screenshotStatus === "complete").length,
    };
  } catch { /* Payload unavailable — show empty state */ }

  return (
    <ReelsScreen docs={docs} counts={counts} />
  );
}
