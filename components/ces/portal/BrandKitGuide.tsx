import type { ReactNode } from "react";
import type { PortalBrandKitPresentation } from "@/lib/portal/brand-kit";

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="kxd-brand-kit__section" aria-labelledby={id}>
      <p className="kxd-brand-kit__eyebrow">{eyebrow}</p>
      <h2 id={id} className="kxd-brand-kit__section-title">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Prose({ text }: { text: string }) {
  return <p className="kxd-brand-kit__prose">{text}</p>;
}

function RuleList({ items }: { items: string[] }) {
  return (
    <ul className="kxd-brand-kit__rules">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function AssetCard({
  title,
  description,
  href,
  previewSrc,
  usageContext,
}: {
  title: string;
  description: string | null;
  href: string | null;
  previewSrc: string | null;
  usageContext: string | null;
}) {
  const body = (
    <>
      {previewSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewSrc}
          alt=""
          className="kxd-brand-kit__asset-preview"
        />
      ) : (
        <div className="kxd-brand-kit__asset-preview kxd-brand-kit__asset-preview--empty" aria-hidden="true">
          File
        </div>
      )}
      <div className="kxd-brand-kit__asset-copy">
        <p className="kxd-brand-kit__asset-title">{title}</p>
        {description ? <p className="kxd-brand-kit__asset-desc">{description}</p> : null}
        {usageContext ? (
          <p className="kxd-brand-kit__asset-meta">{usageContext}</p>
        ) : null}
        {href ? <span className="kxd-brand-kit__asset-action">Open asset</span> : null}
      </div>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="kxd-brand-kit__asset"
        target={href.startsWith("/") ? undefined : "_blank"}
        rel={href.startsWith("/") ? undefined : "noopener noreferrer"}
      >
        {body}
      </a>
    );
  }

  return <div className="kxd-brand-kit__asset">{body}</div>;
}

/**
 * Reusable client-facing Brand Kit guide.
 * Renders only sections with real data — no empty scaffolding.
 */
export function BrandKitGuide({
  brandKit,
}: {
  brandKit: PortalBrandKitPresentation;
}) {
  const showPersonality =
    Boolean(brandKit.positioningStatement) || Boolean(brandKit.brandPersonality);
  const showVoice = Boolean(brandKit.voiceTone);
  const showDoDont = brandKit.doRules.length > 0 || brandKit.dontRules.length > 0;
  const showCopy =
    Boolean(brandKit.socialBio) ||
    Boolean(brandKit.websiteIntroCopy) ||
    Boolean(brandKit.primaryCta) ||
    Boolean(brandKit.secondaryCta);

  return (
    <article className="kxd-brand-kit">
      <header className="kxd-brand-kit__hero">
        {brandKit.heroLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brandKit.heroLogo.src}
            alt={brandKit.heroLogo.alt}
            className="kxd-brand-kit__hero-logo"
          />
        ) : null}
        <div className="kxd-brand-kit__hero-copy">
          <p className="kxd-brand-kit__eyebrow">Brand Kit</p>
          <h2 className="kxd-brand-kit__brand-name">{brandKit.brandName}</h2>
          {brandKit.tagline ? (
            <p className="kxd-brand-kit__tagline">{brandKit.tagline}</p>
          ) : null}
          {brandKit.identityLine ? (
            <p className="kxd-brand-kit__identity">{brandKit.identityLine}</p>
          ) : null}
        </div>
      </header>

      {brandKit.colors.length > 0 ? (
        <Section id="brand-kit-colors" eyebrow="Palette" title="Color system">
          <ul className="kxd-brand-kit__swatches">
            {brandKit.colors.map((swatch) => (
              <li key={swatch.role} className="kxd-brand-kit__swatch">
                <div
                  className="kxd-brand-kit__swatch-chip"
                  style={{
                    background: swatch.hex,
                    color: swatch.textOnSwatch,
                  }}
                >
                  <span>{swatch.role}</span>
                  <span>{swatch.hex}</span>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {brandKit.typographyDirection ? (
        <Section id="brand-kit-type" eyebrow="Typography" title="Type direction">
          <Prose text={brandKit.typographyDirection} />
        </Section>
      ) : null}

      {showPersonality ? (
        <Section
          id="brand-kit-personality"
          eyebrow="Character"
          title="Positioning & personality"
        >
          {brandKit.positioningStatement ? (
            <div className="kxd-brand-kit__block">
              <h3 className="kxd-brand-kit__subhead">Positioning</h3>
              <Prose text={brandKit.positioningStatement} />
            </div>
          ) : null}
          {brandKit.brandPersonality ? (
            <div className="kxd-brand-kit__block">
              <h3 className="kxd-brand-kit__subhead">Personality</h3>
              <Prose text={brandKit.brandPersonality} />
            </div>
          ) : null}
        </Section>
      ) : null}

      {showVoice ? (
        <Section id="brand-kit-voice" eyebrow="Voice" title="Voice & tone">
          <Prose text={brandKit.voiceTone!} />
        </Section>
      ) : null}

      {brandKit.keywords.length > 0 ? (
        <Section id="brand-kit-keywords" eyebrow="Themes" title="Brand keywords">
          <ul className="kxd-brand-kit__keywords">
            {brandKit.keywords.map((keyword) => (
              <li key={keyword}>{keyword}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {showDoDont ? (
        <Section id="brand-kit-guidance" eyebrow="Guidance" title="Do & don’t">
          <div className="kxd-brand-kit__do-dont">
            {brandKit.doRules.length > 0 ? (
              <div className="kxd-brand-kit__guidance">
                <h3 className="kxd-brand-kit__subhead">Do</h3>
                <RuleList items={brandKit.doRules} />
              </div>
            ) : null}
            {brandKit.dontRules.length > 0 ? (
              <div className="kxd-brand-kit__guidance">
                <h3 className="kxd-brand-kit__subhead">Don’t</h3>
                <RuleList items={brandKit.dontRules} />
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {brandKit.logoNotes.length > 0 ? (
        <Section id="brand-kit-logo-usage" eyebrow="Logo" title="Logo usage">
          <RuleList items={brandKit.logoNotes} />
        </Section>
      ) : null}

      {brandKit.assets.length > 0 ? (
        <Section id="brand-kit-assets" eyebrow="Assets" title="Approved assets">
          <div className="kxd-brand-kit__assets">
            {brandKit.assets.map((asset) => (
              <AssetCard
                key={asset.id}
                title={asset.title}
                description={asset.description}
                href={asset.href}
                previewSrc={asset.previewable && asset.href ? asset.href : null}
                usageContext={asset.usageContext}
              />
            ))}
          </div>
        </Section>
      ) : null}

      {showCopy ? (
        <Section id="brand-kit-copy" eyebrow="Copy" title="Approved messaging">
          {brandKit.websiteIntroCopy ? (
            <div className="kxd-brand-kit__block">
              <h3 className="kxd-brand-kit__subhead">Website intro</h3>
              <Prose text={brandKit.websiteIntroCopy} />
            </div>
          ) : null}
          {brandKit.socialBio ? (
            <div className="kxd-brand-kit__block">
              <h3 className="kxd-brand-kit__subhead">Social bio</h3>
              <pre className="kxd-brand-kit__bio">{brandKit.socialBio}</pre>
            </div>
          ) : null}
          {brandKit.primaryCta || brandKit.secondaryCta ? (
            <div className="kxd-brand-kit__cta-row">
              {brandKit.primaryCta ? (
                <p className="kxd-brand-kit__cta">
                  <span>Primary CTA</span>
                  {brandKit.primaryCta}
                </p>
              ) : null}
              {brandKit.secondaryCta ? (
                <p className="kxd-brand-kit__cta">
                  <span>Secondary CTA</span>
                  {brandKit.secondaryCta}
                </p>
              ) : null}
            </div>
          ) : null}
        </Section>
      ) : null}
    </article>
  );
}
