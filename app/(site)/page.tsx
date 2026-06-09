import { CaseStudiesSection } from "@/components/home/CaseStudiesSection";
import { ClientLogoWall } from "@/components/home/ClientLogoWall";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";
import { FounderStandard } from "@/components/home/FounderStandard";
import { HeroSection } from "@/components/home/HeroSection";
import { ReviewsSection } from "@/components/home/ReviewsSection";
import { ServicesSection } from "@/components/home/ServicesSection";
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
    reviewDate: "2025-01-01",
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
      {/* 1. Hero */}
      <HeroSection />
      {/* 2. Services */}
      <ServicesSection />
      {/* 3. Selected Work */}
      <CaseStudiesSection />
      {/* 4. Founder-Led Standard */}
      <FounderStandard />
      {/* 5. Reviews / Proof */}
      <ReviewsSection />
      {/* 6. Client Trust */}
      <ClientLogoWall />
      {/* 7. Final CTA */}
      <FinalCtaSection />
    </>
  );
}
