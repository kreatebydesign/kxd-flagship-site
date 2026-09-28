import type { ReactNode } from "react";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--kxd-os-font-sans",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--kxd-os-font-serif",
  display: "swap",
});

/**
 * Bare document shell — no portal chrome.
 * Used for print/PDF export of leadership reports.
 * Loads editorial fonts so the Letter PDF matches the premium portal presentation.
 */
export default function BareLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${cormorant.variable}`}>
      <body
        style={{
          margin: 0,
          background: "#0a0a0a",
          fontFamily: "var(--kxd-os-font-sans), system-ui, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
