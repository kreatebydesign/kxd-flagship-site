import Link from "next/link";
import { HOMEPAGE_SERVICES } from "@/lib/homepage";
import { INQUIRY_EMAIL, SITE } from "@/lib/site";
import { KxdLogo } from "@/components/ui/KxdLogo";

const NAV_LINKS = [
  { label: "Work",       href: "/work" },
  { label: "Services",   href: "/services" },
  { label: "Investment", href: "/investment" },
  { label: "About",      href: "/about" },
  { label: "Contact",    href: "/contact" },
];

const utilityLinkClass =
  "text-[0.8125rem] font-light text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]";

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

            {/* Editorial serif descriptor */}
            <p
              className="mt-5 font-serif font-light italic leading-snug"
              style={{
                fontSize: "clamp(0.875rem, 1.2vw, 1rem)",
                letterSpacing: "0.005em",
                color: "var(--kxd-cream-soft)",
                maxWidth: "17rem",
              }}
            >
              Precision. Clarity. Presence.<br />
              Digital work built to hold weight.
            </p>

            <p
              className="mt-5 font-sans font-medium uppercase"
              style={{
                fontSize: "0.5rem",
                letterSpacing: "0.16em",
                color: "var(--foreground-subtle)",
              }}
            >
              Est. {SITE.foundedYear}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="kxd-eyebrow mb-5">Navigation</p>
            <ul className="space-y-3">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={utilityLinkClass}>
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
                  <Link href={`/services/${service.slug}`} className={utilityLinkClass}>
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
                className={utilityLinkClass}
              >
                Instagram
              </a>
              <a
                href={SITE.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className={`block ${utilityLinkClass}`}
              >
                LinkedIn
              </a>
              <a
                href={`mailto:${INQUIRY_EMAIL}`}
                className="block text-[0.8125rem] font-light transition hover:text-[var(--kxd-gold-light)]"
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

        {/* Bottom bar — Inter utility type, no "(KXD)" */}
        <div
          className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          style={{
            fontFamily: "var(--font-sans, Inter, sans-serif)",
            fontSize: "0.6875rem",
            fontWeight: 300,
            letterSpacing: "0.04em",
            color: "var(--foreground-subtle)",
          }}
        >
          <p>&copy; {year} {SITE.name}. All rights reserved.</p>
          <p>{SITE.location}</p>
        </div>
      </div>
    </footer>
  );
}
