import Link from "next/link";
import {
  PARTNERSHIP_ADD_ONS,
  PARTNERSHIP_PACKAGES,
  PARTNERSHIP_PAGE_COPY,
  PARTNERSHIP_SCOPE_COPY,
  partnershipInquiryHref,
  type PartnershipPackage,
} from "@/lib/partnerships/packages";

function PackageCard({ pkg }: { pkg: PartnershipPackage }) {
  const featured = Boolean(pkg.recommended);
  const href = partnershipInquiryHref(pkg.inquiryParam);

  return (
    <article
      className={`kxd-partnership-card${featured ? " kxd-partnership-card--featured" : ""}`}
      aria-labelledby={`pkg-${pkg.id}-title`}
    >
      <div className="kxd-partnership-card__head">
        <div className="kxd-partnership-card__badge-row">
          {featured ? (
            <p className="kxd-partnership-card__badges">
              <span>Recommended</span>
              <span aria-hidden>·</span>
              <span>Most Popular</span>
            </p>
          ) : (
            <span className="kxd-partnership-card__badge-spacer" aria-hidden />
          )}
        </div>

        <h2 id={`pkg-${pkg.id}-title`} className="kxd-partnership-card__title">
          {pkg.name}
        </h2>
        <p className="kxd-partnership-card__outcome">{pkg.outcome}</p>
      </div>

      <div className="kxd-partnership-card__pricing">
        <p className="kxd-partnership-card__price">{pkg.monthlyLabel}</p>
        <p className="kxd-partnership-card__meta">
          {pkg.setupLabel}
          <span aria-hidden> · </span>
          {pkg.credits} service credits / month
        </p>
      </div>

      <p className="kxd-partnership-card__ideal">
        <span className="kxd-partnership-card__ideal-label">Best for</span>
        {pkg.idealFor}
      </p>

      <ul className="kxd-partnership-card__list">
        {pkg.includes.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <Link
        href={href}
        className={featured ? "kxd-btn-primary" : "kxd-btn-ghost"}
        style={{ width: "100%", textAlign: "center", marginTop: "auto" }}
      >
        Discuss {pkg.name.replace("KXD ", "")}
      </Link>
    </article>
  );
}

export function PartnershipPackagesExperience() {
  return (
    <>
      <section
        className="kxd-partnership-hero"
        style={{
          paddingTop: "calc(var(--nav-height) + var(--section-py))",
          paddingBottom: "var(--section-py)",
          background: "var(--kxd-black-pure)",
          borderBottom: "1px solid var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "54rem" }}>
          <p className="kxd-eyebrow">{PARTNERSHIP_PAGE_COPY.eyebrow}</p>
          <h1
            className="kxd-serif-title mt-5"
            style={{
              fontSize: "clamp(2.35rem, 5vw, 3.5rem)",
              maxWidth: "38rem",
              lineHeight: 1.06,
            }}
          >
            {PARTNERSHIP_PAGE_COPY.headline}
          </h1>
          <p className="kxd-body mt-6" style={{ maxWidth: "38rem", lineHeight: 1.8 }}>
            {PARTNERSHIP_PAGE_COPY.lead}
          </p>
          <div
            className="mt-8 border-l pl-5"
            style={{ borderColor: "var(--kxd-border-gold)" }}
          >
            <p
              className="font-serif font-light italic"
              style={{
                fontSize: "clamp(0.9375rem, 1.4vw, 1.0625rem)",
                lineHeight: 1.7,
                color: "var(--kxd-cream-soft)",
                maxWidth: "34rem",
              }}
            >
              {PARTNERSHIP_PAGE_COPY.systemNote}
            </p>
          </div>
        </div>
      </section>

      <section
        className="kxd-section"
        style={{ background: "var(--kxd-black-base)" }}
        aria-label="Partnership packages"
      >
        <div className="kxd-container">
          <div className="kxd-partnership-grid">
            {PARTNERSHIP_PACKAGES.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} />
            ))}
          </div>

          <p
            className="mt-10 text-center"
            style={{
              fontSize: "0.8125rem",
              lineHeight: 1.7,
              color: "var(--kxd-cream-muted)",
              maxWidth: "40rem",
              marginInline: "auto",
            }}
          >
            {PARTNERSHIP_SCOPE_COPY.pricingNote}
          </p>
        </div>
      </section>

      <section
        className="kxd-section border-t"
        style={{
          background: "var(--kxd-black-pure)",
          borderColor: "var(--kxd-border-white)",
        }}
        aria-labelledby="credits-heading"
      >
        <div className="kxd-container" style={{ maxWidth: "52rem" }}>
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="kxd-eyebrow">Capacity</p>
              <h2
                id="credits-heading"
                className="kxd-serif-title mt-4"
                style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)" }}
              >
                {PARTNERSHIP_SCOPE_COPY.creditsTitle}
              </h2>
              <p className="kxd-body mt-5" style={{ lineHeight: 1.8 }}>
                {PARTNERSHIP_SCOPE_COPY.creditsBody}
              </p>
            </div>
            <div>
              <p className="kxd-eyebrow">Boundaries</p>
              <h2
                className="kxd-serif-title mt-4"
                style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)" }}
              >
                {PARTNERSHIP_SCOPE_COPY.boundariesTitle}
              </h2>
              <p className="kxd-body mt-5" style={{ lineHeight: 1.8 }}>
                {PARTNERSHIP_SCOPE_COPY.boundariesBody}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="kxd-section border-t"
        style={{
          background: "var(--kxd-black-base)",
          borderColor: "var(--kxd-border-white)",
        }}
        aria-labelledby="addons-heading"
      >
        <div className="kxd-container">
          <div style={{ maxWidth: "40rem" }}>
            <p className="kxd-eyebrow">Add-ons</p>
            <h2
              id="addons-heading"
              className="kxd-serif-title mt-4"
              style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)" }}
            >
              Extend the partnership when the work requires it.
            </h2>
            <p className="kxd-body mt-5" style={{ lineHeight: 1.8 }}>
              Specialized capabilities stay optional. Inventory + Public Showroom
              is available by proposal — never bundled into a base package.
            </p>
          </div>

          <ul className="kxd-partnership-addons mt-12">
            {PARTNERSHIP_ADD_ONS.map((addon) => (
              <li key={addon.id} className="kxd-partnership-addon">
                <div>
                  <h3 className="kxd-partnership-addon__title">{addon.name}</h3>
                  <p className="kxd-partnership-addon__summary">{addon.summary}</p>
                </div>
                <p className="kxd-partnership-addon__price">{addon.pricingNote}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className="kxd-section border-t"
        style={{
          background: "var(--kxd-black-pure)",
          borderColor: "var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container" style={{ maxWidth: "42rem", textAlign: "center" }}>
          <p className="kxd-eyebrow">Next step</p>
          <h2
            className="kxd-serif-title mt-4"
            style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)" }}
          >
            Tell us how your website needs to operate.
          </h2>
          <p className="kxd-body mt-5 mx-auto" style={{ maxWidth: "34rem", lineHeight: 1.8 }}>
            Share your current needs and the partnership you are considering.
            We will confirm fit, scope, and the right starting point.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={partnershipInquiryHref("operating")}
              className="kxd-btn-primary"
            >
              Start a Conversation
            </Link>
            <Link href="/work" className="kxd-btn-ghost">
              View Selected Work
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
