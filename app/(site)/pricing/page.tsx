import type { Metadata } from "next";
import { PartnershipPackagesExperience } from "@/components/partnerships/PartnershipPackagesExperience";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, webPageSchema } from "@/lib/seo/schema";

export const metadata: Metadata = buildMetadata({
  title: "Partnerships",
  description:
    "Ongoing monthly creative and operating partnerships with Kreate by Design — clear capacity, structured execution, and a private client experience. For one-time project builds, see Project Investment.",
  path: "/pricing",
  keywords: [
    "Website Partnership",
    "Ongoing Website Support",
    "Premium Creative Retainer",
    "KXD Partnership",
    "Website Operating Partnership",
  ],
});

export default function PricingPage() {
  const schema = [
    breadcrumbSchema([
      { name: "Partnerships", path: "/pricing" },
    ]),
    webPageSchema({
      title: "Partnerships",
      description:
        "Ongoing monthly creative and operating partnerships with Kreate by Design. For one-time project builds, see Project Investment.",
      path: "/pricing",
    }),
  ];

  return (
    <>
      <StructuredData data={schema} />
      <PartnershipPackagesExperience />
    </>
  );
}
