import type { Metadata } from "next";
import { PageHero, PagePlaceholder } from "@/components/ui/PageHero";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Pricing",
  description:
    "Investment ranges for luxury website design and extended digital infrastructure work.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <>
      <PageHero
        label="Pricing"
        title="Clear ranges. No ambiguity."
        description="Luxury website projects typically begin at defined investment tiers. Platform and enterprise work is scoped after discovery."
      />
      <PagePlaceholder message="Pricing architecture will support package tiers, discovery call deposits, and Stripe checkout — prepared but not yet active." />
    </>
  );
}
