import { CaseStudiesSection } from "@/components/home/CaseStudiesSection";
import { ClientLogoWall } from "@/components/home/ClientLogoWall";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";
import { FounderStandard } from "@/components/home/FounderStandard";
import { HeroSection } from "@/components/home/HeroSection";
import { OutcomesSection } from "@/components/home/OutcomesSection";
import { ProcessSection } from "@/components/home/ProcessSection";
import { ReviewsSection } from "@/components/home/ReviewsSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { WebsiteAuditorSection } from "@/components/home/WebsiteAuditorSection";
import { StructuredData } from "@/components/seo/StructuredData";
import {
  localBusinessSchema,
  organizationSchema,
  reviewSchema,
  websiteSchema,
} from "@/lib/seo/schema";
import { HOMEPAGE_REVIEWS } from "@/lib/homepage";

export default function HomePage() {
  const reviews = HOMEPAGE_REVIEWS.map((review) => ({
    authorName: review.author,
    rating: review.rating,
    reviewText: review.text,
    reviewDate: "2026-01-01",
  }));

  const schema = [
    organizationSchema(),
    localBusinessSchema(),
    websiteSchema(),
    reviewSchema(reviews),
  ].filter(Boolean) as Record<string, unknown>[];

  return (
    <>
      <StructuredData data={schema} />

      {/* 1. Hero — positioning + primary conversion */}
      <HeroSection />

      {/* 2. Selected Outcomes — prove trust before selling services */}
      <OutcomesSection />

      {/* 3. Services — what KXD builds */}
      <ServicesSection />

      {/* 4. Selected Work — transformation proof */}
      <CaseStudiesSection />

      {/* 5. Website Auditor — premium lead generation */}
      <WebsiteAuditorSection />

      {/* 6. Process — how premium work moves */}
      <ProcessSection />

      {/* 7. Founder Standard — the KXD point of view */}
      <FounderStandard />

      {/* 8. Reviews — social proof */}
      <ReviewsSection />

      {/* 9. Client Trust — brand validation */}
      <ClientLogoWall />

      {/* 10. Final CTA — partnership conversion */}
      <FinalCtaSection />
    </>
  );
}