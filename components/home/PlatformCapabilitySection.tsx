import Link from "next/link";

const PLATFORM_CAPABILITIES = [
  "Client portals",
  "Operational dashboards",
  "Workflow systems",
  "CRM-connected infrastructure",
] as const;

/**
 * Homepage platforms elevation — brand-native systems capability.
 * Links to /platforms. Not a software feature grid.
 */
export function PlatformCapabilitySection() {
  return (
    <section
      className="kxd-section border-t"
      style={{
        background: "var(--kxd-black-deep)",
        borderColor: "var(--kxd-border-white)",
      }}
    >
      <div className="kxd-container">
        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-start lg:gap-16">
          <div>
            <p className="kxd-eyebrow">Platforms</p>

            <h2
              className="kxd-serif-title mt-4"
              style={{
                fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
                maxWidth: "22rem",
                lineHeight: 1.08,
              }}
            >
              When the website is only the beginning.
            </h2>

            <Link
              href="/platforms"
              className="kxd-ui-label mt-8 inline-flex items-center gap-2 text-[var(--kxd-cream-muted)] transition hover:text-[var(--kxd-cream)]"
            >
              Explore Platforms
              <span aria-hidden>→</span>
            </Link>
          </div>

          <div>
            <p
              className="kxd-body-sm"
              style={{
                maxWidth: "36rem",
                lineHeight: 1.85,
              }}
            >
              KXD builds the operational layer behind ambitious brands —
              portals, dashboards, and workflow infrastructure designed around
              how the business actually runs. Always in service of the brand.
              Never as a standalone software product.
            </p>

            <ul className="mt-10 grid gap-0 sm:grid-cols-2 sm:gap-x-10">
              {PLATFORM_CAPABILITIES.map((item) => (
                <li
                  key={item}
                  className="border-t py-5"
                  style={{ borderColor: "var(--kxd-border-white)" }}
                >
                  <p
                    className="font-sans font-light"
                    style={{
                      fontSize: "0.9375rem",
                      lineHeight: 1.5,
                      color: "var(--kxd-cream-soft)",
                    }}
                  >
                    <span
                      aria-hidden
                      className="mr-3 inline-block"
                      style={{ color: "var(--kxd-gold)", opacity: 0.7 }}
                    >
                      ◆
                    </span>
                    {item}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
