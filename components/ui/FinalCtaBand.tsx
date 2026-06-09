import Link from "next/link";
import { INQUIRY_EMAIL } from "@/lib/site";

type FinalCtaBandProps = {
  showEmail?: boolean;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function FinalCtaBand({
  showEmail = true,
  secondaryHref = "/services",
  secondaryLabel = "Explore Services",
}: FinalCtaBandProps) {
  return (
    <section
      className="kxd-section border-t"
      style={{
        background: "var(--kxd-black-pure)",
        borderColor: "var(--kxd-border-gold)",
      }}
    >
      <div className="kxd-container text-center">
        {/* Ornament */}
        <div
          aria-hidden
          className="kxd-gold-rule mx-auto mb-14"
          style={{ maxWidth: "6rem" }}
        />

        <p className="kxd-eyebrow">Work With KXD</p>

        <h2
          className="kxd-serif-title mx-auto mt-5"
          style={{ fontSize: "clamp(2rem, 4.5vw, 3.25rem)", maxWidth: "38rem" }}
        >
          Let&rsquo;s build what others can&rsquo;t.
        </h2>

        <p className="kxd-body mx-auto mt-5" style={{ maxWidth: "22rem" }}>
          Built for brands that refuse average.
        </p>

        {/* Primary CTA + understated text link */}
        <div className="mt-10 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
          <Link href="/contact" className="kxd-btn-primary">
            Get In Touch
          </Link>

          <Link
            href={secondaryHref}
            className="group inline-flex items-center gap-2 font-sans font-medium uppercase"
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
              className="inline-block transition-transform duration-300 group-hover:translate-x-0.5"
              style={{ color: "var(--kxd-gold)" }}
            >
              →
            </span>
          </Link>
        </div>

        {showEmail ? (
          <div className="mt-14">
            <div
              aria-hidden
              className="kxd-white-rule mx-auto mb-8"
              style={{ maxWidth: "4rem" }}
            />
            <p className="kxd-label">Direct</p>
            <a
              href={`mailto:${INQUIRY_EMAIL}`}
              className="mt-3 inline-block text-[0.875rem] font-light tracking-[0.04em] transition"
              style={{ color: "var(--kxd-gold)" }}
            >
              {INQUIRY_EMAIL}
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
