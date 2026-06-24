import Link from "next/link";

type FinalCtaBandProps = {
  showEmail?: boolean;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  headline?: string;
  subCopy?: string;
};

export function FinalCtaBand({
  primaryLabel = "Start a Project",
  primaryHref = "/contact",
  secondaryHref = "/services",
  secondaryLabel = "View Services",
  headline = "Ready to Build Something Exceptional?",
  subCopy = "KXD partners with brands that value clarity, execution, and experiences designed to last.",
}: FinalCtaBandProps) {
  return (
    <section className="kxd-final-cta relative overflow-hidden">
      <div className="kxd-final-cta__atmosphere" aria-hidden />
      <div className="kxd-final-cta__glow" aria-hidden />

      <div className="kxd-container relative z-10">
        <div className="kxd-final-cta__glass mx-auto" style={{ maxWidth: "52rem" }}>
          <div className="mx-auto text-center">
            <div
              aria-hidden
              className="mx-auto mb-10"
              style={{
                width: "3rem",
                height: "1px",
                background:
                  "linear-gradient(90deg, transparent, var(--kxd-gold) 30%, var(--kxd-gold) 70%, transparent)",
                opacity: 0.5,
              }}
            />

            <p className="kxd-eyebrow">Work With KXD</p>

            <h2
              className="mx-auto mt-7 font-serif font-light"
              style={{
                fontSize: "clamp(2rem, 4.5vw, 3.5rem)",
                lineHeight: 1.05,
                letterSpacing: "0.01em",
                color: "var(--kxd-cream)",
                maxWidth: "40rem",
              }}
            >
              {headline}
            </h2>

            <p
              className="mx-auto mt-6 font-serif font-light italic"
              style={{
                fontSize: "clamp(0.9375rem, 1.4vw, 1.125rem)",
                letterSpacing: "0.015em",
                lineHeight: 1.72,
                color: "var(--kxd-cream-soft)",
                maxWidth: "38rem",
              }}
            >
              {subCopy}
            </p>

            <div className="mt-12 flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
              <Link href={primaryHref} className="kxd-btn-primary">
                {primaryLabel}
              </Link>
              <Link
                href={secondaryHref}
                className="group inline-flex items-center gap-2.5 font-sans font-medium uppercase"
                style={{
                  fontSize: "0.6875rem",
                  letterSpacing: "var(--tracking-button)",
                  color: "var(--kxd-cream-muted)",
                }}
              >
                <span className="transition-colors duration-200 group-hover:text-[var(--kxd-cream)]">
                  {secondaryLabel}
                </span>
                <span
                  aria-hidden
                  className="inline-block transition-transform duration-300 group-hover:translate-x-1"
                  style={{ color: "var(--kxd-gold)" }}
                >
                  →
                </span>
              </Link>
            </div>

            <div
              aria-hidden
              className="mx-auto mt-14"
              style={{
                width: "3rem",
                height: "1px",
                background:
                  "linear-gradient(90deg, transparent, rgba(197,166,92,0.28) 30%, rgba(197,166,92,0.28) 70%, transparent)",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
