export type LegalSection = {
  title: string;
  paragraphs: string[];
  list?: string[];
};

type LegalPageLayoutProps = {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
  contactEmail: string;
  contactNote?: string;
};

export function LegalPageLayout({
  eyebrow,
  title,
  lastUpdated,
  intro,
  sections,
  contactEmail,
  contactNote,
}: LegalPageLayoutProps) {
  return (
    <>
      <section
        style={{
          paddingTop: "calc(var(--nav-height) + var(--section-py))",
          paddingBottom: "var(--section-py)",
          background: "var(--kxd-black-pure)",
          borderBottom: "1px solid var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container">
          <p className="kxd-eyebrow">{eyebrow}</p>
          <h1
            className="kxd-serif-title mt-5"
            style={{
              fontSize: "clamp(2.25rem, 4.5vw, 3.25rem)",
              maxWidth: "36rem",
              lineHeight: 1.08,
            }}
          >
            {title}
          </h1>
          <p className="kxd-body mt-6" style={{ maxWidth: "38rem" }}>
            {intro}
          </p>
          <p
            className="mt-6 font-sans font-medium uppercase"
            style={{
              fontSize: "0.625rem",
              letterSpacing: "0.14em",
              color: "var(--foreground-subtle)",
            }}
          >
            Last updated {lastUpdated}
          </p>
        </div>
      </section>

      <section
        className="kxd-section"
        style={{
          background: "var(--kxd-black-soft)",
          borderBottom: "1px solid var(--kxd-border-white)",
        }}
      >
        <div className="kxd-container">
          <div style={{ maxWidth: "42rem" }}>
            {sections.map((section) => (
              <article key={section.title} className="mb-12 last:mb-0">
                <h2
                  className="kxd-serif-title"
                  style={{
                    fontSize: "clamp(1.375rem, 2.5vw, 1.75rem)",
                    lineHeight: 1.15,
                  }}
                >
                  {section.title}
                </h2>
                <div className="mt-5 space-y-4">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="kxd-body">
                      {paragraph}
                    </p>
                  ))}
                </div>
                {section.list && section.list.length > 0 && (
                  <ul className="mt-5 space-y-2 pl-5">
                    {section.list.map((item) => (
                      <li
                        key={item}
                        className="kxd-body-sm"
                        style={{ listStyleType: "disc" }}
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}

            <div
              className="mt-14 pt-8"
              style={{ borderTop: "1px solid var(--kxd-border-white)" }}
            >
              <h2
                className="kxd-serif-title"
                style={{
                  fontSize: "clamp(1.375rem, 2.5vw, 1.75rem)",
                  lineHeight: 1.15,
                }}
              >
                Contact
              </h2>
              <p className="kxd-body mt-5">
                {contactNote ??
                  "Questions about this page or how we handle information? Reach out directly."}
              </p>
              <p className="mt-4">
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-[0.9375rem] font-light transition hover:text-[var(--kxd-gold-light)]"
                  style={{ color: "var(--kxd-gold)" }}
                >
                  {contactEmail}
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
