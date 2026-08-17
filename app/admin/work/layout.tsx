/**
 * Standalone layout for /admin/work.
 * Mirrors /admin/operations document chrome so the route has a valid html/body root.
 */
import type { Metadata } from "next";
import { requireStaffAwarePage } from "@/lib/staff/guard";
import { ThemeBootScript } from "@/components/os/ThemeBootScript";
import "../../globals.css";
import "../../../design-system/os/styles/kxd-os.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  await requireStaffAwarePage("/admin/work");

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
