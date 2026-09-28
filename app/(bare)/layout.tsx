import type { ReactNode } from "react";

/**
 * Bare document shell — no portal chrome.
 * Used for print/PDF export of leadership reports.
 */
export default function BareLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0a0a0a" }}>{children}</body>
    </html>
  );
}
