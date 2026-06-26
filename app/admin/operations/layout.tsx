/**
 * Standalone layout for /admin/operations.
 * Loads KXD global CSS + fonts outside any route group so CSS variables
 * and typography are available without Payload admin CSS interference.
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
  title: "KXD OS · Creative Operations",
  description: "KXD OS — Creative Operations Platform for studio delivery and growth.",
  robots: { index: false, follow: false },
};

export default async function OperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePayloadAdminPage();

  return (
    <html lang="en">
      <body className={`${cormorant.variable} ${outfit.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
