import Link from "next/link";
import type { ClientHomePresentation, ClientHomePresentationItem } from "@/lib/ces/modules/home";

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
  emptyTitle,
  emptyLead,
  id,
}: {
  eyebrow: string;
  title: string;
  items: ClientHomePresentationItem[];
  emptyTitle: string;
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
        <div className="kxd-ces-empty">
          <p className="kxd-ces-empty__title">{emptyTitle}</p>
          <p className="kxd-ces-empty__lead">{emptyLead}</p>
        </div>
      )}
    </section>
  );
}

export function CesClientCommandHome({
  home,
  showWork,
  showPartnership,
}: {
  home: ClientHomePresentation;
  showWork: boolean;
  showPartnership: boolean;
}) {
  return (
    <div className="kxd-client-home">
      <header className="kxd-client-home__hero">
        <p className="kxd-client-home__eyebrow">{home.opening.eyebrow}</p>
        <h1>{home.opening.title}</h1>
        <p className="kxd-client-home__lead">{home.opening.lead}</p>
        {showPartnership ? (
          <Link href="/portal/partnership" className="kxd-ces-btn kxd-ces-btn--ghost">
            View your KXD partnership
          </Link>
        ) : null}
      </header>

      <section className="kxd-client-home__snapshot" aria-labelledby="client-snapshot-title">
        <div>
          <p className="kxd-client-home__eyebrow">Executive snapshot</p>
          <h2 id="client-snapshot-title">The business, at a glance</h2>
        </div>
        <dl>
          {home.snapshot.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {showWork ? (
        <>
          <HomeListSection
            id="client-accomplishments-title"
            eyebrow="KXD accomplishments"
            title="What moved forward"
            items={home.accomplishments}
            emptyTitle="No completed work recorded this month"
            emptyLead="KXD only shows completed work here when it is supported by a recorded deliverable, project, or review."
          />
          <HomeListSection
            id="client-active-work-title"
            eyebrow="Active work"
            title="What KXD is advancing"
            items={home.activeWork}
            emptyTitle="No active work needs a status card"
            emptyLead="Your partnership remains active. New work appears here as it enters the shared workflow."
          />
        </>
      ) : null}

      <HomeListSection
        id="client-attention-title"
        eyebrow="Your attention"
        title="Where your input helps"
        items={home.attention}
        emptyTitle="Nothing is waiting on you"
        emptyLead="KXD can continue managing the current work without anything from you right now."
      />

      <HomeListSection
        id="client-opportunities-title"
        eyebrow="Opportunities"
        title="Evidence-backed next moves"
        items={home.opportunities}
        emptyTitle="No recommendation needs your attention"
        emptyLead="KXD will surface an opportunity here when the work or reporting evidence supports one."
      />

      <section className="kxd-client-home__next" aria-labelledby="client-next-title">
        <p className="kxd-client-home__eyebrow">What&apos;s next</p>
        <h2 id="client-next-title">{home.next.title}</h2>
        <p>{home.next.detail}</p>
        {home.next.href ? (
          <Link href={home.next.href} className="kxd-ces-btn kxd-ces-btn--primary">
            Continue
          </Link>
        ) : null}
      </section>
    </div>
  );
}
