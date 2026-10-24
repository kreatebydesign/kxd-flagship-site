/**
 * Standalone layout for /admin/sales.
 */
import type { Metadata } from "next";
import { trustedLayoutReturnPath } from "@/lib/admin/trusted-layout-return-path";
import { ThemeBootScript } from "@/components/os/ThemeBootScript";
import "../../globals.css";
import "../../../design-system/os/styles/kxd-os.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "KXD OS · Sales",
  description: "KXD Sales Engine — pipeline, proposals, and forecast.",
  robots: { index: false, follow: false },
};

const SALES_LAYOUT_FALLBACK = "/admin/sales";

export default async function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { requireStaffAwarePage } = await import("@/lib/staff/guard");
  const { headers } = await import("next/headers");
  const pathname = (await headers()).get("x-kxd-pathname")?.trim() || "";
  const returnPath = trustedLayoutReturnPath(
    pathname,
    SALES_LAYOUT_FALLBACK,
    SALES_LAYOUT_FALLBACK,
  );
  await requireStaffAwarePage(returnPath);

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
