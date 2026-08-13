import Link from "next/link";
import type {
  ClientHomePresentation,
  ClientHomePresentationItem,
} from "@/lib/ces/modules/home";
import type { ActiveEngagementSnapshot } from "@/lib/portal/active-engagement";
import { ActiveEngagementCard } from "./ActiveEngagementCard";

function HomeItem({ item }: { item: ClientHomePresentationItem }) {
  const content = (
    <>
      <div className="kxd-client-home__item-copy">
        <h3>{item.title}</h3>
        {item.detail ? <p>{item.detail}</p> : null}
      </div>
      {item.meta ? <span className="kxd-client-home__item-meta">{item.meta}</span> : null}
    </>
  );

  return (
    <li className="kxd-client-home__item">
      {item.href ? (
        <Link href={item.href} className="kxd-client-home__item-link">
          {content}
        </Link>
      ) : (
        <div className="kxd-client-home__item-link">{content}</div>
      )}
    </li>
  );
}

function HomeListSection({
  eyebrow,
  title,
  items,
  emptyLead,
  id,
}: {
  eyebrow: string;
  title: string;
  items: ClientHomePresentationItem[];
  emptyLead: string;
  id: string;
}) {
  return (
    <section className="kxd-client-home__section" aria-labelledby={id}>
      <p className="kxd-client-home__eyebrow">{eyebrow}</p>
      <h2 id={id} className="kxd-client-home__section-title">
        {title}
      </h2>
      {items.length > 0 ? (
        <ul className="kxd-client-home__list">
          {items.map((item) => (
            <HomeItem key={item.id} item={item} />
          ))}
        </ul>
      ) : (
        <p className="kxd-client-home__empty-note">{emptyLead}</p>
      )}
    </section>
  );
}

export function CesClientCommandHome({
  home,
  showWork,
  showPartnership,
  engagement = null,
  engagementEyebrow,
  engagementTitle,
}: {
  home: ClientHomePresentation;
  showWork: boolean;
  showPartnership: boolean;
  engagement?: ActiveEngagementSnapshot | null;
  engagementEyebrow?: string;
  engagementTitle?: string;
}) {
  return (
    <div className="kxd-client-home">
      <header className="kxd-client-home__welcome">
        <p className="kxd-client-home__eyebrow">{home.welcome.eyebrow}</p>
        <h1>{home.welcome.greeting}</h1>
        <p className="kxd-client-home__lead">{home.welcome.lead}</p>
        {showPartnership ? (
          <Link href="/portal/partnership" className="kxd-ces-btn kxd-ces-btn--ghost">
            View your partnership
          </Link>
        ) : null}
      </header>

      <ActiveEngagementCard
        engagement={engagement}
        eyebrow={engagementEyebrow}
        title={engagementTitle}
      />

      <section className="kxd-client-home__attention" aria-labelledby="client-attention-title">
        <p className="kxd-client-home__eyebrow">Needs your attention</p>
        <h2 id="client-attention-title" className="kxd-client-home__section-title">
          {home.attention.items.length > 0
            ? "Where your input helps"
            : home.attention.allClearTitle}
        </h2>
        {home.attention.items.length > 0 ? (
          <ul className="kxd-client-home__list">
            {home.attention.items.map((item) => (
              <HomeItem key={item.id} item={item} />
            ))}
          </ul>
        ) : (
          <p className="kxd-client-home__empty-note">{home.attention.allClearLead}</p>
        )}
      </section>

      {showWork ? (
        <>
          <HomeListSection
            id="client-accomplishments-title"
            eyebrow="What KXD accomplished"
            title="Completed work"
            items={home.accomplishments}
            emptyLead="No completed work has been recorded for this period yet."
          />
          <HomeListSection
            id="client-active-work-title"
            eyebrow="What KXD is advancing"
            title="Currently underway"
            items={home.advancing}
            emptyLead="Current work will appear here as it is recorded."
          />
        </>
      ) : null}

      {home.performance.visible ? (
        <section className="kxd-client-home__performance" aria-labelledby="client-performance-title">
          <p className="kxd-client-home__eyebrow">How the business is performing</p>
          <h2 id="client-performance-title" className="kxd-client-home__section-title">
            Website &amp; search activity
          </h2>
          {home.performance.facts.length > 0 ? (
            <dl className="kxd-client-home__facts">
              {home.performance.facts.map((fact) => (
                <div key={fact.id}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                  {fact.detail ? <p>{fact.detail}</p> : null}
                </div>
              ))}
            </dl>
          ) : (
            <p className="kxd-client-home__empty-note">
              {home.performance.statusNote ?? "Performance reporting is being prepared."}
            </p>
          )}
          {home.performance.href ? (
            <Link href={home.performance.href} className="kxd-client-home__quiet-link">
              Open performance
            </Link>
          ) : null}
        </section>
      ) : null}

      {home.businessImpact ? (
        <section className="kxd-client-home__impact" aria-labelledby="client-impact-title">
          <p className="kxd-client-home__eyebrow">Leads &amp; business impact</p>
          <h2 id="client-impact-title" className="kxd-client-home__section-title">
            Opportunities created
          </h2>
          <ul className="kxd-client-home__list">
            {home.businessImpact.items.map((item) => (
              <HomeItem key={item.id} item={item} />
            ))}
          </ul>
          {home.businessImpact.note ? <p className="kxd-client-home__note">{home.businessImpact.note}</p> : null}
        </section>
      ) : null}

      {home.services.length > 0 ? (
        <section className="kxd-client-home__services" aria-labelledby="client-services-title">
          <p className="kxd-client-home__eyebrow">Included in this partnership</p>
          <h2 id="client-services-title" className="kxd-client-home__section-title">
            What KXD manages for you
          </h2>
          <ul className="kxd-client-home__service-list">
            {home.services.map((service) => (
              <li key={service.id}>
                {service.href ? (
                  <Link href={service.href} className="kxd-client-home__service">
                    <h3>{service.title}</h3>
                    {service.detail ? <p>{service.detail}</p> : null}
                  </Link>
                ) : (
                  <div className="kxd-client-home__service">
                    <h3>{service.title}</h3>
                    {service.detail ? <p>{service.detail}</p> : null}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
