/**
 * Standalone layout for /admin/sales.
 */
import type { Metadata } from "next";
import { requireStaffAwarePage } from "@/lib/staff/guard";
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

export default async function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaffAwarePage("/admin/sales");

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
