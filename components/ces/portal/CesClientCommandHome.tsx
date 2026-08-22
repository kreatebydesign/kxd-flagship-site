import Link from "next/link";
import type {
  ClientHomePresentation,
  ClientHomePresentationItem,
} from "@/lib/ces/modules/home";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";
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
  const story = home.valueStory;
  const care = home.careContinuity;
  const showCare = Boolean(care?.visible);
  const isLaunchStage = story?.availability === "launch-stage";
  const isReportingAbsent =
    story?.availability === "not-entitled" || isLaunchStage;
  const showWatchingFallback = Boolean(story) && !showCare && !isReportingAbsent;
  const showWorkSections = showWork && !isLaunchStage;

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

      {story && isLaunchStage ? (
        <section
          className="kxd-client-home__section kxd-client-home__value-story"
          aria-labelledby="client-launch-stage-title"
        >
          <p className="kxd-client-home__eyebrow">Your engagement</p>
          <h2 id="client-launch-stage-title" className="kxd-client-home__section-title">
            Website project
          </h2>
          <p className="kxd-client-home__lead">{story.whatMovedForward}</p>
          <p className="kxd-client-home__empty-note">{story.whatItMeans}</p>
        </section>
      ) : null}

      {story && !isReportingAbsent ? (
        <section
          className="kxd-client-home__section kxd-client-home__value-story"
          aria-labelledby="client-value-story-title"
        >
          <p className="kxd-client-home__eyebrow">What moved forward</p>
          <h2 id="client-value-story-title" className="kxd-client-home__section-title">
            Your website story
          </h2>
          <p className="kxd-client-home__lead">{story.whatMovedForward}</p>
          <p className="kxd-client-home__eyebrow kxd-client-home__eyebrow--nested">What it means</p>
          <p className="kxd-client-home__empty-note">{story.whatItMeans}</p>
          {story.strongestSignal ? (
            <p className="kxd-client-home__note kxd-client-home__stack-sm">{story.strongestSignal}</p>
          ) : null}
          <p className="kxd-os-meta kxd-client-home__stack-sm">Period: {story.periodLabel}</p>
        </section>
      ) : null}

      {showWorkSections ? (
        <>
          <HomeListSection
            id="client-accomplishments-title"
            eyebrow="What KXD completed"
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

      {showCare && care ? (
        <section
          className="kxd-client-home__section kxd-client-home__care"
          aria-labelledby="client-care-title"
        >
          <p className="kxd-client-home__eyebrow">Hosting &amp; domain care</p>
          <h2 id="client-care-title" className="kxd-client-home__section-title">
            {care.headline}
          </h2>
          <p className="kxd-client-home__empty-note">{care.lead}</p>
          {care.responsiblePartyLabel ? (
            <p className="kxd-client-home__note kxd-client-home__stack-xs">
              {care.responsiblePartyLabel}
            </p>
          ) : null}
          {care.lines.length > 0 ? (
            <dl className="kxd-client-home__facts kxd-client-home__stack-md">
              {care.lines.map((line) => (
                <div key={line.id}>
                  <dt>{line.label}</dt>
                  <dd>{line.value}</dd>
                  {line.detail ? <p>{line.detail}</p> : null}
                </div>
              ))}
            </dl>
          ) : null}
        </section>
      ) : null}

      {showWatchingFallback && story ? (
        <section className="kxd-client-home__section" aria-labelledby="client-watching-title">
          <p className="kxd-client-home__eyebrow">Partnership care</p>
          <h2 id="client-watching-title" className="kxd-client-home__section-title">
            What KXD continues to handle
          </h2>
          <p className="kxd-client-home__empty-note">{story.whatKxdIsWatching}</p>
        </section>
      ) : null}

      {home.performance.visible ? (
        <section className="kxd-client-home__performance" aria-labelledby="client-performance-title">
          <p className="kxd-client-home__eyebrow">Supporting detail</p>
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
          {home.businessImpact.note ? (
            <p className="kxd-client-home__note">{home.businessImpact.note}</p>
          ) : null}
        </section>
      ) : null}

      {(story || home.nextMoves.length > 0) && (
        <section className="kxd-client-home__section" aria-labelledby="client-next-title">
          <p className="kxd-client-home__eyebrow">What should happen next</p>
          <h2 id="client-next-title" className="kxd-client-home__section-title">
            Smartest next move
          </h2>
          {story ? (
            <p className="kxd-client-home__empty-note">{story.smartestNextMove}</p>
          ) : null}
          {home.nextMoves.length > 0 ? (
            <ul className="kxd-client-home__list kxd-client-home__stack-md">
              {home.nextMoves.map((item) => (
                <HomeItem key={item.id} item={item} />
              ))}
            </ul>
          ) : null}
        </section>
      )}

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
