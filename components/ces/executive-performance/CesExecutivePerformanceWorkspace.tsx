import type { CSSProperties } from "react";
import Link from "next/link";
import type { PartnershipBriefing } from "@/lib/ces/partnership";
import type { ExecutivePerformanceBriefing } from "@/lib/ces/executive-performance";
import type { WebsiteReviewLandingData } from "@/lib/ces/modules/website-review/types";

export interface CesExecutivePerformanceWorkspaceProps {
  performance: ExecutivePerformanceBriefing;
  briefing: PartnershipBriefing;
  websiteReview: WebsiteReviewLandingData;
}

function connectionLabel(state: string): string {
  if (state === "connected") return "Connected";
  if (state === "awaiting-signal") return "Awaiting signal";
  return "Not connected";
}

export function CesExecutivePerformanceWorkspace({
  performance,
  briefing,
  websiteReview,
}: CesExecutivePerformanceWorkspaceProps) {
  const { presentation } = performance;
  const updatedLabel = new Date(performance.composedAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const heroStyle = {
    "--kxd-ces-exec-hero-image": `url(${presentation.heroImageSrc})`,
  } as CSSProperties;

  return (
    <div className="kxd-ces-exec">
      <header
        className={`kxd-ces-exec__hero kxd-ces-exec__hero--${presentation.heroOverlay}`}
        style={heroStyle}
        aria-label={presentation.heroImageAlt}
      >
        <div className="kxd-ces-exec__hero-veil" aria-hidden="true" />
        <div className="kxd-ces-exec__hero-inner">
          {presentation.logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="kxd-ces-exec__logo"
              src={presentation.logoSrc}
              alt={presentation.logoAlt}
            />
          ) : null}
          <p className="kxd-ces-exec__eyebrow">{presentation.workspaceEyebrow}</p>
          <h1 className="kxd-ces-exec__brand">{performance.clientName}</h1>
          <p className="kxd-ces-exec__workspace-title">{presentation.workspaceTitle}</p>
          <p className="kxd-ces-exec__greeting">{performance.greeting}</p>
          <p className="kxd-ces-exec__intro">{presentation.introduction}</p>
          <p className="kxd-ces-exec__updated">Updated {updatedLabel}</p>

          <div className="kxd-ces-exec__hero-focus">
            <p className="kxd-ces-exec__focus-label">Current focus</p>
            <p className="kxd-ces-exec__focus-value">{performance.currentFocus}</p>
          </div>

          <div className="kxd-ces-exec__recommend-card">
            <p className="kxd-ces-exec__recommend-eyebrow">KXD Recommends</p>
            <p className="kxd-ces-exec__recommend-headline">
              {performance.recommendation.headline}
            </p>
            <p className="kxd-ces-exec__recommend-rationale">
              {performance.recommendation.rationale}
            </p>
            {performance.primaryAction ? (
              <Link
                href={performance.primaryAction.href}
                className="kxd-ces-btn kxd-ces-btn--primary"
              >
                {performance.primaryAction.label}
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <section className="kxd-ces-exec__section" aria-labelledby="exec-performance-heading">
        <p className="kxd-ces-exec__section-eyebrow">Clarity</p>
        <h2 id="exec-performance-heading" className="kxd-ces-exec__heading">
          Executive Performance
        </h2>
        <p className="kxd-ces-exec__section-lead">
          Reporting panels reflect only enabled capabilities and recorded signal.
        </p>
        {performance.momentumLabel ? (
          <p className="kxd-ces-exec__momentum">{performance.momentumLabel}</p>
        ) : null}
        <ul className="kxd-ces-exec__panels">
          {performance.performancePanels.map((panel) => (
            <li
              key={panel.id}
              className={`kxd-ces-exec__panel kxd-ces-exec__panel--${panel.state}`}
            >
              <div className="kxd-ces-exec__panel-head">
                <h3 className="kxd-ces-exec__panel-title">{panel.title}</h3>
                <span className="kxd-ces-exec__panel-state">
                  {connectionLabel(panel.state)}
                </span>
              </div>
              <p className="kxd-ces-exec__panel-summary">{panel.summary}</p>
              {panel.detail ? (
                <p className="kxd-ces-exec__panel-detail">{panel.detail}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {performance.recentImprovements.length > 0 ? (
        <section className="kxd-ces-exec__section" aria-labelledby="exec-improvements-heading">
          <p className="kxd-ces-exec__section-eyebrow">Movement</p>
          <h2 id="exec-improvements-heading" className="kxd-ces-exec__heading">
            Recent Improvements
          </h2>
          <p className="kxd-ces-exec__section-lead">
            What has moved recently in the partnership.
          </p>
          <ul className="kxd-ces-exec__list">
            {performance.recentImprovements.map((item) => (
              <li key={item.id} className="kxd-ces-exec__list-item">
                <span className="kxd-ces-exec__list-mark" aria-hidden="true">
                  ·
                </span>
                <div>
                  <p className="kxd-ces-exec__list-label">{item.label}</p>
                  {item.detail ? (
                    <p className="kxd-ces-exec__list-detail">{item.detail}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="kxd-ces-exec__section" aria-labelledby="exec-partnership-heading">
        <p className="kxd-ces-exec__section-eyebrow">Together</p>
        <h2 id="exec-partnership-heading" className="kxd-ces-exec__heading">
          Our Partnership
        </h2>
        <p className="kxd-ces-exec__section-lead">
          What has been built and practiced — grounded in completed work.
        </p>
        <ul className="kxd-ces-exec__list">
          {performance.partnership.map((item) => (
            <li
              key={item.id}
              className={
                item.complete
                  ? "kxd-ces-exec__list-item kxd-ces-exec__list-item--done"
                  : "kxd-ces-exec__list-item"
              }
            >
              <span className="kxd-ces-exec__list-mark" aria-hidden="true">
                {item.complete ? "—" : "·"}
              </span>
              <div>
                <p className="kxd-ces-exec__list-label">{item.label}</p>
                <p className="kxd-ces-exec__list-detail">{item.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="kxd-ces-exec__section" aria-labelledby="exec-impact-heading">
        <p className="kxd-ces-exec__section-eyebrow">Outcomes</p>
        <h2 id="exec-impact-heading" className="kxd-ces-exec__heading">
          Business Impact
        </h2>
        <p className="kxd-ces-exec__section-lead">
          What the partnership is designed to strengthen — with evidence when it exists.
        </p>
        <ul className="kxd-ces-exec__impact">
          {performance.impact.map((item) => (
            <li key={item.id} className="kxd-ces-exec__impact-item">
              <p className="kxd-ces-exec__impact-label">{item.label}</p>
              <p className="kxd-ces-exec__impact-detail">{item.detail}</p>
              {item.hasEvidence ? (
                <p className="kxd-ces-exec__impact-evidence">Evidence on file</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="kxd-ces-exec__section" aria-labelledby="exec-review-heading">
        <div className="kxd-ces-exec__section-head">
          <div>
            <p className="kxd-ces-exec__section-eyebrow">Collaboration</p>
            <h2 id="exec-review-heading" className="kxd-ces-exec__heading">
              Website Review
            </h2>
          </div>
          <Link href="/portal/website-review" className="kxd-ces-exec__section-link">
            View all
          </Link>
        </div>
        <p className="kxd-ces-exec__section-lead">{briefing.websiteReview.nextStep}</p>
        <div className="kxd-ces-exec__actions">
          {websiteReview.websiteUrl ? (
            <>
              <Link
                href="/portal/website-review/session/new"
                className="kxd-ces-btn kxd-ces-btn--primary"
              >
                Review Website
              </Link>
              <a
                href={websiteReview.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="kxd-ces-btn kxd-ces-btn--ghost"
              >
                Open Review Site
              </a>
            </>
          ) : (
            <Link href="/portal/website-review/request" className="kxd-ces-btn kxd-ces-btn--primary">
              Share feedback
            </Link>
          )}
        </div>
      </section>

      <section className="kxd-ces-exec__section" aria-labelledby="exec-evolution-heading">
        <p className="kxd-ces-exec__section-eyebrow">When you&apos;re ready</p>
        <h2 id="exec-evolution-heading" className="kxd-ces-exec__heading">
          Growing Together
        </h2>
        <p className="kxd-ces-exec__section-lead">
          Partnership possibilities — paced to readiness, never pressed as a catalog.
        </p>
        <ul className="kxd-ces-exec__evolution">
          {performance.evolution.map((item) => (
            <li key={item.id} className="kxd-ces-exec__evolution-item">
              <p className="kxd-ces-exec__evolution-label">{item.label}</p>
              <p className="kxd-ces-exec__evolution-detail">{item.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="kxd-ces-exec__close">
        <p>
          Every improvement we build is designed to strengthen the partnership between{" "}
          {performance.clientName} and Kreate by Design over time.
        </p>
      </footer>
    </div>
  );
}
