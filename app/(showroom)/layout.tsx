import type { Metadata } from "next";
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

export default function ShowroomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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
