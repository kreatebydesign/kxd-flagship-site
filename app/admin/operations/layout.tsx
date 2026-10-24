/**
 * Standalone layout for /admin/operations.
 * Loads KXD global CSS + fonts outside any route group so CSS variables
 * and typography are available without Payload admin CSS interference.
 *
 * Auth only here — route groups enforce staff vs founder access:
 * - `(studio)/layout.tsx` — founder / full operations
 * - `staff/layout.tsx` — restricted staff shell
 */
import type { Metadata } from "next";
import { ThemeBootScript } from "@/components/os/ThemeBootScript";
import "../../globals.css";
import "../../../design-system/os/styles/kxd-os.css";
import "../../../design-system/agreement/kxd-agreement-document.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "KXD OS · Creative Operations",
  description: "KXD OS — Creative Operations Platform for studio delivery and growth.",
  robots: { index: false, follow: false },
};

const OPERATIONS_LAYOUT_FALLBACK = "/admin/operations";

export default async function OperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { requirePayloadAdminPage } = await import("@/lib/admin/auth");
  await requirePayloadAdminPage(OPERATIONS_LAYOUT_FALLBACK);

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
