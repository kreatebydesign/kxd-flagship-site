/**
 * Strategic roadmap document links — client-safe presentation assets.
 * Do not label these as PDFs or decks in client UI.
 */

import type { PartnershipStrategicRoadmap } from "./types";

const BY_SLUG: Record<string, PartnershipStrategicRoadmap> = {
  "primal-motorsports": {
    title: "The Road Ahead",
    lead:
      "A long-term operating vision developed specifically for Primal Motorsports — where the partnership can grow from here.",
    ctaLabel: "Explore the Partnership Roadmap",
    href: "/media/portal/primal-partnership-roadmap.pdf",
  },
};

export function getStrategicRoadmap(slug: string | null): PartnershipStrategicRoadmap | null {
  if (!slug) return null;
  return BY_SLUG[slug] ?? null;
}
