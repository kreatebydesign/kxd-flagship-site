import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import "../globals.css";
import "../../design-system/os/styles/kxd-os.css";
import "../../design-system/ces/styles/kxd-ces.css";

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
  title: "Workspace",
  robots: { index: false, follow: false },
};

export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${cormorant.variable} ${outfit.variable} antialiased`}
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
