import type { Metadata } from "next";
import { PartnershipPackagesExperience } from "@/components/partnerships/PartnershipPackagesExperience";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, webPageSchema } from "@/lib/seo/schema";

export const metadata: Metadata = buildMetadata({
  title: "Partnerships",
  description:
    "KXD Partnership, KXD Operating Partnership, and KXD Executive Partnership — premium creative and operating relationships with clear monthly capacity and starting investment.",
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
        "Premium creative and operating partnerships with Kreate by Design — clear capacity, organized execution, and a private client experience.",
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
