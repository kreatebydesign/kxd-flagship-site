/**
 * Standalone layout for /admin/connect — staff messaging UI (Batch C2).
 * Loads KXD OS CSS outside Payload admin chrome. No global Connect nav.
 */
import type { Metadata } from "next";
import { ThemeBootScript } from "@/components/os/ThemeBootScript";
import "../../globals.css";
import "../../../design-system/os/styles/kxd-os.css";
import "./connect.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "KXD Connect",
  description: "KXD Connect — internal staff messaging.",
  robots: { index: false, follow: false },
};

export default async function ConnectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="dark">
      <head>
        <ThemeBootScript />
        <meta
          httpEquiv="Cache-Control"
          content="no-store, no-cache, must-revalidate"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
