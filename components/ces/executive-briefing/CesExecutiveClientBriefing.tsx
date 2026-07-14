import type { ReactNode } from "react";
import Link from "next/link";
import type {
  ExecutiveClientBriefing,
  ExecutiveClientBriefingUnavailable,
} from "@/lib/executive-client-summary";

export type CesExecutiveClientBriefingProps = {
  briefing: ExecutiveClientBriefing | ExecutiveClientBriefingUnavailable;
};

function Chapter({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="kxd-ces-briefing__section">
      <h2 className="kxd-ces-briefing__heading">{title}</h2>
      <div className="kxd-ces-briefing__body">{children}</div>
    </section>
  );
}

function CesExecutiveClientBriefingUnavailableView({
  briefing,
}: {
  briefing: ExecutiveClientBriefingUnavailable;
}) {
  return (
    <div className="kxd-ces-briefing kxd-ces-briefing--empty">
      <p className="kxd-ces-briefing__eyebrow">Partnership</p>
      <h1 className="kxd-ces-briefing__title">Executive briefing</h1>
      <p className="kxd-ces-briefing__lead">
        {briefing.reason === "no-memory"
          ? "An executive partnership briefing will appear here once the relationship history is authored."
          : "This executive briefing isn’t available for this workspace yet."}
      </p>
      <Link href="/portal" className="kxd-ces-btn kxd-ces-btn--ghost">
        Back to overview
      </Link>
    </div>
  );
}

export function CesExecutiveClientBriefing({ briefing }: CesExecutiveClientBriefingProps) {
  if (!briefing.available) {
    return <CesExecutiveClientBriefingUnavailableView briefing={briefing} />;
  }

  const platform = briefing.platformOpportunity;
  const hasLiveMetrics = briefing.results.live.metrics.length > 0;
  const prepared = briefing.results.prepared;

  return (
    <article className="kxd-ces-briefing">
      <header className="kxd-ces-briefing__hero">
        <p className="kxd-ces-briefing__eyebrow">{briefing.opening.eyebrow}</p>
        <h1 className="kxd-ces-briefing__title">{briefing.opening.headline}</h1>
        <p className="kxd-ces-briefing__lead">{briefing.opening.perspective}</p>
        <dl className="kxd-ces-briefing__glance kxd-ces-briefing__glance--compact">
          <div>
            <dt>Phase</dt>
            <dd>{briefing.relationshipAtAGlance.phase}</dd>
          </div>
          <div>
            <dt>Focus</dt>
            <dd>{briefing.relationshipAtAGlance.focus}</dd>
          </div>
          <div>
            <dt>Next</dt>
            <dd>{briefing.relationshipAtAGlance.nextMilestone}</dd>
          </div>
          <div>
            <dt>Health</dt>
            <dd>{briefing.relationshipAtAGlance.health}</dd>
          </div>
        </dl>
      </header>

      {briefing.chapters.map((chapter) => (
        <Chapter key={chapter.id} title={chapter.title}>
          {chapter.paragraphs.map((paragraph) => (
            <p key={paragraph} className="kxd-ces-briefing__prose">
              {paragraph}
            </p>
          ))}
        </Chapter>
      ))}

      {(hasLiveMetrics || prepared) && (
        <Chapter title="Results in view">
          {hasLiveMetrics ? (
            <div className="kxd-ces-briefing__result-block">
              <p className="kxd-ces-briefing__subhead">Live reporting</p>
              {briefing.results.live.periodLabel ? (
                <p className="kxd-ces-briefing__meta">
                  {briefing.results.live.periodLabel}
                  {briefing.results.live.providerLabels.length > 0
                    ? ` · ${briefing.results.live.providerLabels.join(", ")}`
                    : ""}
                </p>
              ) : null}
              <ul className="kxd-ces-briefing__metrics">
                {briefing.results.live.metrics.map((m) => (
                  <li key={`${m.sourceLabel}-${m.label}`}>
                    <span>{m.label}</span>
                    <strong>{m.value}</strong>
                    <em>{m.sourceLabel}</em>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {prepared ? (
            <div className="kxd-ces-briefing__result-block kxd-ces-briefing__result-block--prepared">
              <p className="kxd-ces-briefing__subhead">Prepared partnership reporting</p>
              <p className="kxd-ces-briefing__meta">
                {prepared.title}
                {prepared.periodLabel ? ` · ${prepared.periodLabel}` : ""}
              </p>
              <p className="kxd-ces-briefing__note">{prepared.note}</p>
              {prepared.metrics.length > 0 ? (
                <ul className="kxd-ces-briefing__metrics">
                  {prepared.metrics.map((m) => (
                    <li key={`prepared-${m.label}`}>
                      <span>{m.label}</span>
                      <strong>{m.value}</strong>
                      <em>Prepared report</em>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </Chapter>
      )}

      {platform ? (
        <Chapter title={platform.title}>
          <p className="kxd-ces-briefing__positioning">{platform.positioning}</p>
          <ul className="kxd-ces-briefing__list">
            {platform.capabilities.map((cap) => (
              <li key={cap}>{cap}</li>
            ))}
          </ul>
          <div className="kxd-ces-briefing__pricing">
            <p className="kxd-ces-briefing__subhead">Engagement models</p>
            <ul className="kxd-ces-briefing__pricing-models">
              {platform.pricing.models.map((model) => (
                <li key={model.id}>
                  <span>{model.label}</span>
                  <span>{model.amountLabel ?? "Prepared separately"}</span>
                </li>
              ))}
            </ul>
            <p className="kxd-ces-briefing__note">{platform.pricing.note}</p>
          </div>
        </Chapter>
      ) : null}

      <Chapter title="Recommended next steps">
        <ol className="kxd-ces-briefing__steps">
          {briefing.recommendedNextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <div className="kxd-ces-briefing__actions">
          <Link href="/portal/website-review" className="kxd-ces-btn kxd-ces-btn--primary">
            Continue Website Review
          </Link>
          <Link href="/portal" className="kxd-ces-btn kxd-ces-btn--ghost">
            Executive Performance
          </Link>
        </div>
      </Chapter>
    </article>
  );
}
