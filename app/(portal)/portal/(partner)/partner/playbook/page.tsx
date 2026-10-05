import { redirect } from "next/navigation";
import { PartnerPlaybookNav } from "@/components/partner/PartnerPlaybookNav";
import { getPartnerSession } from "@/lib/portal/partner/access";
import { PARTNER_PLAYBOOK_SECTIONS } from "@/lib/portal/partner/playbook";

export const dynamic = "force-dynamic";

function renderBullets(
  section: (typeof PARTNER_PLAYBOOK_SECTIONS)[number],
) {
  if (!section.bullets?.length) return null;

  if (section.treatment === "scripts") {
    return (
      <div className="kxd-partner-scripts">
        {section.bullets.map((bullet) => (
          <blockquote key={bullet} className="kxd-partner-script">
            {bullet}
          </blockquote>
        ))}
      </div>
    );
  }

  if (section.treatment === "objections") {
    return (
      <div className="kxd-partner-objections">
        {section.bullets.map((bullet) => {
          const [q, ...rest] = bullet.split(" → ");
          const a = rest.join(" → ");
          return (
            <article key={bullet} className="kxd-partner-objection">
              <p className="kxd-partner-objection__q">{q}</p>
              {a ? <p className="kxd-partner-objection__a">{a}</p> : null}
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <ul className="kxd-partner-checklist">
      {section.bullets.map((bullet) => (
        <li key={bullet}>{bullet}</li>
      ))}
    </ul>
  );
}

export default async function PartnerPlaybookPage() {
  const session = await getPartnerSession();
  if (!session) redirect("/portal/login");

  const navSections = PARTNER_PLAYBOOK_SECTIONS.map((s) => ({
    id: s.id,
    title: s.title,
  }));

  return (
    <div className="kxd-partner-page">
      <p className="kxd-partner-network">KXD Network</p>
      <h1 className="kxd-partner-title">The playbook</h1>
      <p className="kxd-partner-lead">
        How this house works. Find fit, open the door, hand off cleanly. KXD
        closes the work.
      </p>

      <div className="kxd-partner-playbook-layout">
        <PartnerPlaybookNav sections={navSections} />
        <div className="kxd-partner-playbook">
          {PARTNER_PLAYBOOK_SECTIONS.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className="kxd-partner-playbook__section"
            >
              <p className="kxd-partner-playbook__num">
                Chapter {String(index + 1).padStart(2, "0")}
              </p>
              <h2>{section.title}</h2>
              {section.pullQuote ? (
                <p className="kxd-partner-pullquote">{section.pullQuote}</p>
              ) : null}
              {section.treatment === "commission" ? (
                <div className="kxd-partner-commission">
                  {section.paragraphs.map((paragraph, i) => (
                    <div key={paragraph} className="kxd-partner-commission__item">
                      <strong>
                        {i === 0
                          ? "Project"
                          : i === 1
                            ? "Months 1–3"
                            : i === 2
                              ? "Approval"
                              : "Control"}
                      </strong>
                      {paragraph}
                    </div>
                  ))}
                </div>
              ) : (
                section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))
              )}
              {renderBullets(section)}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
