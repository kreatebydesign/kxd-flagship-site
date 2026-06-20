"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KxdLogo } from "@/components/ui/KxdLogo";

const NAV = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/projects", label: "Projects" },
  { href: "/portal/requests", label: "Requests" },
  { href: "/portal/deliverables", label: "Deliverables" },
  { href: "/portal/assets", label: "Assets" },
] as const;

export function PortalNav() {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/portal/auth/logout", { method: "POST" });
    window.location.href = "/portal/login";
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "var(--kxd-black-pure)",
        borderBottom: "1px solid var(--kxd-border-gold)",
      }}
    >
      <div className="kxd-container flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <KxdLogo />
          <span style={{ color: "rgba(255,255,255,0.12)", fontSize: "0.375rem" }}>◆</span>
          <p
            className="font-sans uppercase"
            style={{
              fontSize: "0.5rem",
              letterSpacing: "0.16em",
              color: "var(--kxd-cream-muted)",
            }}
          >
            Client Portal
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-1 sm:gap-2">
          {NAV.map((item) => {
            const active =
              item.href === "/portal"
                ? pathname === "/portal"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="font-sans uppercase transition-colors"
                style={{
                  fontSize: "0.5rem",
                  letterSpacing: "0.14em",
                  padding: "0.45rem 0.75rem",
                  textDecoration: "none",
                  color: active ? "var(--kxd-gold)" : "rgba(255,255,255,0.35)",
                  border: active
                    ? "1px solid var(--kxd-border-gold)"
                    : "1px solid transparent",
                  background: active ? "rgba(197,166,92,0.06)" : "transparent",
                }}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleLogout}
            className="font-sans uppercase"
            style={{
              fontSize: "0.5rem",
              letterSpacing: "0.14em",
              padding: "0.45rem 0.75rem",
              color: "rgba(255,255,255,0.3)",
              background: "transparent",
              border: "1px solid transparent",
              cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </nav>
      </div>
    </header>
  );
}
