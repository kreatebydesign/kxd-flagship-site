import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Junior Creators · KXD Academy",
  robots: { index: false, follow: false },
};

export default function JuniorCreatorsRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className="antialiased"
        style={{ background: "var(--kxd-black-base)", color: "var(--kxd-cream)" }}
      >
        {children}
      </body>
    </html>
  );
}
