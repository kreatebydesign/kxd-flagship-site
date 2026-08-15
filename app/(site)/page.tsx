import { CaseStudiesSection } from "@/components/home/CaseStudiesSection";
import { ClientLogoWall } from "@/components/home/ClientLogoWall";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";
import { FounderStandard } from "@/components/home/FounderStandard";
import { HeroSection } from "@/components/home/HeroSection";
import { OutcomesSection } from "@/components/home/OutcomesSection";
import { PlatformCapabilitySection } from "@/components/home/PlatformCapabilitySection";
import { ProcessSection } from "@/components/home/ProcessSection";
import { ReviewsSection } from "@/components/home/ReviewsSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { WebsiteAuditorSection } from "@/components/home/WebsiteAuditorSection";
import { StructuredData } from "@/components/seo/StructuredData";
import {
  localBusinessSchema,
  organizationSchema,
  websiteSchema,
} from "@/lib/seo/schema";

export default function HomePage() {
  const schema = [
    organizationSchema(),
    localBusinessSchema(),
    websiteSchema(),
  ].filter(Boolean) as Record<string, unknown>[];

  return (
    <>
      <StructuredData data={schema} />

      {/* 1. Hero — premium digital systems positioning */}
      <HeroSection />

      {/* 2. Outcomes — presence → growth → systems */}
      <OutcomesSection />

      {/* 3. Services — capability ladder */}
      <ServicesSection />

      {/* 4. Selected Work — acquisition-aligned proof */}
      <CaseStudiesSection />

      {/* 5. Platforms — systems behind the brand */}
      <PlatformCapabilitySection />

      {/* 6. KXD Intelligence — diagnosis → solution path */}
      <WebsiteAuditorSection />

      {/* 7. Process — how premium work moves */}
      <ProcessSection />

      {/* 8. Founder Standard — the KXD point of view */}
      <FounderStandard />

      {/* 9. Reviews — verified Google reviews only (omits when unavailable) */}
      <ReviewsSection />

      {/* 10. Client Trust — brand validation */}
      <ClientLogoWall />

      {/* 11. Final CTA — project or diagnosis */}
      <FinalCtaSection />
    </>
  );
}
