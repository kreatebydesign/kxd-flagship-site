/**
 * Standalone layout for /admin/training — internal Training & Enablement.
 */
import type { Metadata } from "next";
import { requireStaffAwarePage } from "@/lib/staff/guard";
import { ThemeBootScript } from "@/components/os/ThemeBootScript";
import "../../globals.css";
import "../../../design-system/os/styles/kxd-os.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "KXD OS · Operations Experience",
  description: "Learn to operate Kreate by Design through KXD OS.",
  robots: { index: false, follow: false },
};

export default async function TrainingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaffAwarePage("/admin/training");

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
