import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { AnalyticsScripts } from "@/components/seo/AnalyticsScripts";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { buildMetadata } from "@/lib/seo/metadata";
import { SEO_KEYWORDS } from "@/lib/seo/site";
import "../globals.css";

export const viewport = {
  themeColor: "#080808",
};

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Luxury Digital Experiences & Infrastructure",
    description:
      "Kreate by Design is a luxury web design agency specializing in premium website experiences, brand systems, and growth infrastructure. Direct strategy, senior-level execution — designed to endure.",
    keywords: [...SEO_KEYWORDS],
  }),
  icons: {
    icon: [
      { url: "/migrated-assets/favicons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/migrated-assets/favicons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/migrated-assets/favicons/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/migrated-assets/favicons/favicon.ico", rel: "shortcut icon" },
    ],
    apple: [{ url: "/migrated-assets/favicons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

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
