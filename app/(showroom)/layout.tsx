import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";
import "../globals.css";
import "@/design-system/os/styles/kxd-os.css";
import "@/design-system/ces/styles/kxd-ces.css";

export const metadata: Metadata = buildMetadata({
  title: "Showroom",
  description: "Curated vehicle inventory.",
  path: "/showroom",
});

export const viewport = {
  themeColor: "#080808",
};

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "500", "600"],
  display: "swap",
});

export default function ShowroomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${outfit.variable}`}>
      <body className="kxd-showroom-body">
        <header className="kxd-showroom-shell__header">
          <Link href="/" className="kxd-showroom-shell__brand">
            Kreate by Design
          </Link>
          <span className="kxd-showroom-shell__mark">Showroom</span>
        </header>
        <main className="kxd-showroom-shell__main">{children}</main>
        <footer className="kxd-showroom-shell__footer">
          <p>Presented through KXD OS · Showroom inventory experience</p>
        </footer>
      </body>
    </html>
  );
}
