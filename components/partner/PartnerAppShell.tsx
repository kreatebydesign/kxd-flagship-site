"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KxdLogo } from "@/components/ui/KxdLogo";

const NAV = [
  { href: "/portal/partner", label: "Home" },
  { href: "/portal/partner/playbook", label: "Playbook" },
  { href: "/portal/partner/submit-lead", label: "Submit lead" },
  { href: "/portal/partner/leads", label: "Introductions" },
  { href: "/portal/partner/earnings", label: "Earnings" },
  { href: "/portal/partner/book", label: "Book KXD in" },
] as const;

function isCurrent(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  if (href === "/portal/partner") {
    return path === "/portal/partner";
  }
  return path === href || path.startsWith(`${href}/`);
}

export function PartnerAppShell({
  children,
  partnerName,
  operatorPreview,
}: {
  children: React.ReactNode;
  partnerName: string;
  operatorPreview?: { label: string } | null;
}) {
  const pathname = usePathname() || "/portal/partner";

  return (
    <div className="kxd-partner-app">
      <div className="kxd-partner-shell">
        <aside className="kxd-partner-sidebar">
          <div className="kxd-partner-brand">
            <div className="kxd-partner-brand__logo">
              <KxdLogo
                disableLink
                width={218}
                height={205}
                imageClassName="kxd-partner-brand__logo-img"
              />
            </div>
            <p className="kxd-partner-brand__name">KXD Network</p>
            <p className="kxd-partner-brand__room">{partnerName}</p>
            <p className="kxd-partner-brand__tag">Private access</p>
          </div>
          <nav className="kxd-partner-nav" aria-label="Partner">
            {NAV.map((item) => {
              const current = isCurrent(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="kxd-partner-main">
          {operatorPreview ? (
            <div className="kxd-partner-preview" role="status">
              {operatorPreview.label}. Read-only — partner actions are disabled.
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
