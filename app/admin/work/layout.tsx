/**
 * Standalone layout for /admin/work.
 * Mirrors /admin/operations document chrome so the route has a valid html/body root.
 */
import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import "../../globals.css";
import "../../../design-system/os/styles/kxd-os.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

export const metadata: Metadata = {
  title: "KXD OS · Work Engine",
  description: "KXD Work Engine — execution workspace for the studio.",
  robots: { index: false, follow: false },
};

export default async function WorkEngineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePayloadAdminPage("/admin/work");

  return (
    <html lang="en">
      <body className={`${cormorant.variable} ${outfit.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
