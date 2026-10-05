import Link from "next/link";

const NAV = [
  { href: "/portal/partner", label: "Home" },
  { href: "/portal/partner/playbook", label: "Playbook" },
  { href: "/portal/partner/submit-lead", label: "Submit lead" },
  { href: "/portal/partner/leads", label: "My leads" },
  { href: "/portal/partner/earnings", label: "My earnings" },
  { href: "/portal/partner/book", label: "Book KXD in" },
] as const;

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/portal/partner") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PartnerAppShell({
  children,
  pathname,
  partnerName,
  operatorPreview,
}: {
  children: React.ReactNode;
  pathname: string;
  partnerName: string;
  operatorPreview?: { label: string } | null;
}) {
  return (
    <div className="kxd-partner-app">
      <div className="kxd-partner-shell">
        <aside className="kxd-partner-sidebar">
          <div className="kxd-partner-brand">
            <span className="kxd-partner-brand__mark">Kreate by Design</span>
            <p className="kxd-partner-brand__name">Partner room</p>
            <p className="kxd-partner-brand__room">{partnerName}</p>
            <p className="kxd-partner-brand__tag">Selected partners only</p>
          </div>
          <nav className="kxd-partner-nav" aria-label="Partner">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
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
