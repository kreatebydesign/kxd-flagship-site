import Link from "next/link";
import { HOMEPAGE_SERVICES } from "@/lib/homepage";
import { INQUIRY_EMAIL, SITE } from "@/lib/site";
import { KxdLogo } from "@/components/ui/KxdLogo";

const NAV_LINKS = [
  { label: "Work",     href: "/work" },
  { label: "Services", href: "/services" },
  { label: "About",    href: "/about" },
  { label: "Contact",  href: "/contact" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="mt-auto border-t"
      style={{
        background: "var(--kxd-black-pure)",
        borderColor: "var(--kxd-border-white)",
      }}
    >
      <div className="kxd-container py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Brand */}
          <div>
            <KxdLogo />
            <p className="kxd-body-sm mt-5" style={{ maxWidth: "18rem" }}>
              Precision. Clarity. Presence. Founder-led luxury digital.
            </p>
            <p className="kxd-label mt-5">Est. {SITE.foundedYear}</p>
            <p className="mt-1 text-[0.6875rem] font-light text-[var(--foreground-subtle)]">
              {SITE.location}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="kxd-eyebrow mb-5">Navigation</p>
            <ul className="space-y-3">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[0.875rem] font-light text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <p className="kxd-eyebrow mb-5">Services</p>
            <ul className="space-y-3">
              {HOMEPAGE_SERVICES.map((service) => (
                <li key={service.slug}>
                  <Link
                    href={`/services/${service.slug}`}
                    className="text-[0.875rem] font-light text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
                  >
                    {service.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <p className="kxd-eyebrow mb-5">Connect</p>
            <div className="space-y-3">
              <a
                href={SITE.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[0.875rem] font-light text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
              >
                Instagram
              </a>
              <a
                href={SITE.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[0.875rem] font-light text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
              >
                LinkedIn
              </a>
              <a
                href={`mailto:${INQUIRY_EMAIL}`}
                className="block text-[0.875rem] font-light transition"
                style={{ color: "var(--kxd-gold)" }}
              >
                {INQUIRY_EMAIL}
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          className="mt-10 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, var(--kxd-border-white-strong) 30%, var(--kxd-border-white-strong) 70%, transparent 100%)",
          }}
        />

        {/* Bottom bar */}
        <div className="mt-6 flex flex-col gap-2 text-[0.6875rem] text-[var(--foreground-subtle)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {SITE.name} ({SITE.shortName}). All rights reserved.
          </p>
          <p>{SITE.location}</p>
        </div>
      </div>
    </footer>
  );
}
