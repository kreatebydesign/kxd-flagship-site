import type { Metadata } from "next";
import { PageHero, PagePlaceholder } from "@/components/ui/PageHero";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Insights",
  description:
    "Editorial perspectives on luxury web design, hospitality, motorsports, membership platforms, and operational systems.",
  path: "/insights",
  keywords: [
    "Luxury Website Design",
    "Hospitality Website Design",
    "Motorsports Website Development",
  ],
});

export default function InsightsPage() {
  return (
    <>
      <PageHero
        label="Insights"
        title="Thinking in public."
        description="Long-form editorial content built for search authority and genuine perspective — not content marketing volume."
      />
      <PagePlaceholder message="Insights will publish from Payload CMS with blog schema, category targeting, and SEO metadata per article." />
    </>
  );
}
