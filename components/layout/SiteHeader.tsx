"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { HOMEPAGE_SERVICES } from "@/lib/homepage";
import { SITE } from "@/lib/site";
import { PRIMARY_PROJECTS } from "@/lib/projects";
import { cn } from "@/lib/utils";
import { KxdLogo } from "@/components/ui/KxdLogo";

const NAV_LINKS = [
  { label: "Work",       href: "/work" },
  { label: "Services",   href: "/services" },
  { label: "Investment", href: "/investment" },
  { label: "About",      href: "/about" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const megaRef = useRef<HTMLDivElement>(null);
  const workRef = useRef<HTMLDivElement>(null);

  /* scroll detection */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* close mobile nav on route change */
  useEffect(() => { setMobileOpen(false); setMegaOpen(false); }, [pathname]);

  /* lock body scroll while mobile nav is open */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  /* close mega menu on outside click */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        megaRef.current &&
        !megaRef.current.contains(e.target as Node) &&
        workRef.current &&
        !workRef.current.contains(e.target as Node)
      ) {
        setMegaOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const featuredProjects = PRIMARY_PROJECTS.slice(0, 4);

  return (
    <>
      <header
        className={cn(
          "kxd-nav",
          scrolled || megaOpen || mobileOpen ? "kxd-nav-scrolled" : "kxd-nav-transparent",
        )}
      >
        <div className="kxd-container grid h-full grid-cols-[auto_1fr_auto] items-center gap-8">
          {/* Logo — intentionally left-anchored */}
          <div className="shrink-0">
            <KxdLogo />
          </div>

          {/* Desktop center nav — precisely centered in its grid cell */}
          <nav className="hidden items-center justify-center gap-8 lg:flex" aria-label="Primary navigation">
            {NAV_LINKS.map((link) =>
              link.label === "Work" ? (
                <div
                  key="work"
                  ref={workRef}
                  className="relative"
                  onMouseEnter={() => setMegaOpen(true)}
                  onMouseLeave={() => setMegaOpen(false)}
                >
                  <Link
                    href={link.href}
                    className="kxd-nav-link block py-1"
                    data-active={isActive(link.href) ? "true" : undefined}
                    onClick={() => setMegaOpen(false)}
                  >
                    {link.label}
                  </Link>
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="kxd-nav-link py-1"
                  data-active={isActive(link.href) ? "true" : undefined}
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>

          {/* Desktop CTA — right-anchored */}
          <div className="hidden items-center justify-end lg:flex">
            <Link href="/contact" className="kxd-nav-cta">
              Start a Project
            </Link>
          </div>

          {/* Mobile hamburger — override grid center col to be right-aligned on mobile */}
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="kxd-ui-label col-start-3 flex h-10 w-10 items-center justify-center justify-self-end text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)] lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className="sr-only">{mobileOpen ? "Close" : "Menu"}</span>
            <svg
              width="20"
              height="14"
              viewBox="0 0 20 14"
              fill="none"
              aria-hidden
              className={cn("transition-opacity", mobileOpen ? "opacity-0" : "opacity-100")}
            >
              <line x1="0" y1="1" x2="20" y2="1" stroke="currentColor" strokeWidth="1.5" />
              <line x1="0" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="1.5" />
              <line x1="0" y1="13" x2="20" y2="13" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        {/* ── Work Mega Menu ── */}
        <div
          ref={megaRef}
          className="kxd-mega-menu hidden lg:block"
          data-open={megaOpen ? "true" : "false"}
          onMouseEnter={() => setMegaOpen(true)}
          onMouseLeave={() => setMegaOpen(false)}
        >
          <div className="kxd-container grid grid-cols-3 gap-12 py-10">
            {/* Col 1 — Selected Work */}
            <div>
              <p className="kxd-eyebrow mb-6">Selected Work</p>
              <ul className="space-y-1">
                {featuredProjects.map((project) => (
                  <li key={project.slug}>
                    <Link
                      href={`/work/${project.slug}`}
                      className="group flex items-center gap-3 py-2.5 text-[0.875rem] font-light text-[var(--kxd-cream-muted)] transition-colors hover:text-[var(--kxd-cream)]"
                      onClick={() => setMegaOpen(false)}
                    >
                      <span
                        aria-hidden
                        className="h-px w-5 bg-[var(--kxd-border-gold)] transition-all group-hover:w-8 group-hover:bg-[var(--kxd-gold)]"
                      />
                      {project.title}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/work"
                className="kxd-ui-label mt-7 inline-flex items-center gap-2 text-[var(--kxd-gold)] transition hover:text-[var(--kxd-gold-light)]"
                onClick={() => setMegaOpen(false)}
              >
                View All Work
                <span aria-hidden>→</span>
              </Link>
            </div>

            {/* Col 2 — Capabilities */}
            <div>
              <p className="kxd-eyebrow mb-6">Capabilities</p>
              <ul className="space-y-1">
                {HOMEPAGE_SERVICES.map((service) => (
                  <li key={service.slug}>
                    <Link
                      href={`/services/${service.slug}`}
                      className="group flex items-center gap-3 py-2.5 text-[0.875rem] font-light text-[var(--kxd-cream-muted)] transition-colors hover:text-[var(--kxd-cream)]"
                      onClick={() => setMegaOpen(false)}
                    >
                      <span
                        aria-hidden
                        className="h-px w-5 bg-[var(--kxd-border-gold)] transition-all group-hover:w-8 group-hover:bg-[var(--kxd-gold)]"
                      />
                      {service.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3 — Founder statement */}
            <div className="border-l border-[var(--kxd-border-white)] pl-10">
              <p className="kxd-label mb-6">The Standard</p>
              <p className="font-serif text-[1.125rem] font-light leading-[1.6] tracking-[0.01em] text-[var(--kxd-cream-soft)]">
                &ldquo;KXD builds digital experiences designed to hold weight long after launch.&rdquo;
              </p>
              <div className="mt-8 h-px w-12 bg-[var(--kxd-border-gold-strong)]" />
              <p className="kxd-label mt-4">Matt Lunger</p>
              <p className="mt-1 text-[0.6875rem] text-[var(--foreground-subtle)]">
                Founder & Creative Director
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile Full-Screen Nav Overlay ── */}
      <div
        className="kxd-mobile-nav lg:hidden"
        data-open={mobileOpen ? "true" : "false"}
        aria-hidden={!mobileOpen}
      >
        {/* Close button */}
        <div className="flex items-center justify-between px-6 pt-7">
          <KxdLogo />
          <button
            type="button"
            aria-label="Close menu"
            className="text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
            onClick={() => setMobileOpen(false)}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
              <line x1="2" y1="2" x2="20" y2="20" stroke="currentColor" strokeWidth="1.5" />
              <line x1="20" y1="2" x2="2" y2="20" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav
          className="flex flex-1 flex-col justify-center px-8"
          aria-label="Mobile navigation"
        >
          <ul className="space-y-2">
            {NAV_LINKS.map((link, i) => (
              <li key={link.href} style={{ animationDelay: `${i * 60}ms` }}>
                <Link
                  href={link.href}
                  className="kxd-mobile-nav-link block py-3"
                  data-active={isActive(link.href) ? "true" : undefined}
                  style={isActive(link.href) ? { color: "var(--kxd-cream)" } : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-10 h-px w-12 bg-[var(--kxd-border-gold)]" />

          <Link
            href="/contact"
            className="kxd-btn-primary kxd-ui-label mt-8 w-fit"
            onClick={() => setMobileOpen(false)}
          >
            Start a Project
          </Link>
        </nav>

        {/* Footer detail */}
        <div className="px-8 pb-10">
          <p className="kxd-label">{SITE.location}</p>
        </div>
      </div>
    </>
  );
}
