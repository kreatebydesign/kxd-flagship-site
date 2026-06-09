import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { AnalyticsScripts } from "@/components/seo/AnalyticsScripts";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { buildMetadata } from "@/lib/seo/metadata";
import { SEO_KEYWORDS } from "@/lib/seo/site";
import "../globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = buildMetadata({
  title: "Luxury Digital Experiences & Infrastructure",
  description:
    "Kreate by Design is a luxury web design agency specializing in premium website experiences, brand systems, and growth infrastructure. Direct strategy, senior-level execution — built to hold weight.",
  keywords: [...SEO_KEYWORDS],
});

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${cormorant.variable} ${outfit.variable} antialiased`}>
        <AnalyticsScripts />
        <SiteHeader />
        <main className="relative">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
