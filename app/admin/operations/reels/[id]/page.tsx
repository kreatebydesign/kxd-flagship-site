/**
 * /admin/operations/reels/[id]
 * KXD OS — Reel Detail: Screenshot Capture + Storyboard Generation + Review
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import { ReelDetailClient } from "./ReelDetailClient";

export const metadata: Metadata = {
  title: "Reel Detail · KXD OS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReelDetailPage({ params }: Props) {
  const { id } = await params;
  const numId   = parseInt(id, 10);

  if (isNaN(numId)) notFound();

  let doc: AnyDoc | null = null;

  try {
    const payload = await getPayload({ config });
    doc = await payload.findByID({
      collection: "promo-video-requests" as "clients",
      id: numId,
      depth: 2,
    }) as AnyDoc;
  } catch {
    notFound();
  }

  if (!doc || !doc.isWebsiteReel) notFound();

  return <ReelDetailClient doc={doc} />;
}
