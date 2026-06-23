import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import "../globals.css";

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
  title: "KXD OS · Creative Operations Platform",
  description: "KXD OS — unified launcher for studio operations, research, client infrastructure, and growth systems.",
  robots: { index: false, follow: false },
};

export default function KxdOsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${cormorant.variable} ${outfit.variable} antialiased`}
        style={{ background: "#080808", color: "#F5F1E8" }}
      >
        {children}
      </body>
    </html>
  );
}
