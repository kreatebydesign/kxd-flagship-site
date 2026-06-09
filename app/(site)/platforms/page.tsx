import type { Metadata } from "next";
import { PageHero, PagePlaceholder } from "@/components/ui/PageHero";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Platforms",
  description:
    "Membership platforms, client portals, operational dashboards, and enterprise systems — built as brand extensions, not software products.",
  path: "/platforms",
  keywords: ["Membership Platform Development", "Operational Platform Development"],
});

export default function PlatformsPage() {
  return (
    <>
      <PageHero
        label="Platforms"
        title="Systems that run the business behind the brand."
        description="KXD develops operational platforms for organizations that have outgrown disconnected tools — without repositioning the studio as a software company."
      />
      <PagePlaceholder message="Platform applications route through Payload CMS. The public page will present capability, process, and a qualified application path for membership, operational, and enterprise work." />
    </>
  );
}
