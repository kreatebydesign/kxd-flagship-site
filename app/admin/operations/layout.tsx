/**
 * Standalone layout for /admin/operations.
 * Loads KXD global CSS + fonts outside any route group so CSS variables
 * and typography are available without Payload admin CSS interference.
 */
import type { Metadata } from "next";
import { trustedLayoutReturnPath } from "@/lib/admin/trusted-layout-return-path";
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
  const { requireStaffAwarePage, resolveRequestPathname } = await import(
    "@/lib/staff/guard"
  );
  const pathname = (await resolveRequestPathname("")).trim();
  if (!pathname) {
    // Nested RSC layout runs may omit middleware pathname headers. Child layouts
    // and pages enforce staff allowlists with canonical paths — auth only here.
    await requirePayloadAdminPage(OPERATIONS_LAYOUT_FALLBACK);
  } else {
    const returnPath = trustedLayoutReturnPath(
      pathname,
      OPERATIONS_LAYOUT_FALLBACK,
      "/admin/operations",
    );
    await requireStaffAwarePage(returnPath);
  }

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
