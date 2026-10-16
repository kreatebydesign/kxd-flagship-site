import type { CSSProperties, ReactNode } from "react";

const BARE_FONT_VARS = {
  "--kxd-os-font-sans": "'DM Sans', system-ui, sans-serif",
  "--kxd-os-font-serif": "'Cormorant Garamond', Georgia, serif",
} as CSSProperties;

/**
 * Google Fonts via stylesheet — not next/font/google.
 * Turbopack production builds on Vercel can fail resolving
 * @vercel/turbopack-next/internal/font/google/font (see app/globals.css).
 */
const BARE_GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=DM+Sans:wght@400;500;600&display=swap";

/**
 * Bare document shell — no portal chrome.
 * Used for print/PDF export of leadership reports.
 * Loads editorial fonts so the Letter PDF matches the premium portal presentation.
 */
export default function BareLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" style={BARE_FONT_VARS}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={BARE_GOOGLE_FONTS_HREF} rel="stylesheet" />
      </head>
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
