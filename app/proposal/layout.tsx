import type { Metadata } from "next";
import "../globals.css";
import "../../design-system/os/styles/kxd-os.css";

export const metadata: Metadata = {
  title: "KXD Proposal",
  robots: { index: false, follow: false },
};

export default function ProposalLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="kxd-proposal-body antialiased">
        {children}
      </body>
    </html>
  );
}
