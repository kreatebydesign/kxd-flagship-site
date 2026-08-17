import type { Metadata } from "next";
import { ThemeBootScript } from "@/components/os/ThemeBootScript";
import "../globals.css";
import "../../design-system/os/styles/kxd-os.css";
import "../../design-system/ces/styles/kxd-ces.css";

export const metadata: Metadata = {
  title: {
    default: "Your partnership",
    template: "%s · Kreate by Design",
  },
  robots: { index: false, follow: false },
};

export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeBootScript />
      </head>
      <body
        className="antialiased"
        style={{
          background: "var(--kxd-os-bg-canvas)",
          color: "var(--kxd-os-text-primary)",
        }}
      >
        {children}
      </body>
    </html>
  );
}
