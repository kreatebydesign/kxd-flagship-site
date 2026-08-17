/**
 * Standalone layout for /admin/operations.
 * Loads KXD global CSS + fonts outside any route group so CSS variables
 * and typography are available without Payload admin CSS interference.
 */
import type { Metadata } from "next";
import { ThemeBootScript } from "@/components/os/ThemeBootScript";
import "../../globals.css";
import "../../../design-system/os/styles/kxd-os.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  const { requireStaffAwarePage } = await import("@/lib/staff/guard");
  await requireStaffAwarePage();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeBootScript />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
