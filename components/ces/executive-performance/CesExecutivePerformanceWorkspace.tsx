import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import type { WebsiteReviewLandingData } from "@/lib/ces/modules/website-review/types";
import {
  evolutionMaturityLabel,
  executivePresentationToCssVars,
  getExecutiveZoneOrder,
  type ExecutivePerformanceBriefing,
  type ExecutiveWorkspaceZoneId,
} from "@/lib/ces/executive-performance";

export interface CesExecutivePerformanceWorkspaceProps {
  performance: ExecutivePerformanceBriefing;
  websiteReview: WebsiteReviewLandingData;
}

function connectionLabel(state: string): string {
  if (state === "connected") return "Connected";
  if (state === "awaiting-signal") return "Awaiting";
  return "Unavailable";
}

function ZoneHeader({
  eyebrow,
  title,
  id,
  action,
}: {
  eyebrow: string;
  title: string;
  id: string;
  action?: ReactNode;
}) {
  return (
    <div className="kxd-ces-exec__zone-head">
      <div>
        <p className="kxd-ces-exec__section-eyebrow">{eyebrow}</p>
        <h2 id={id} className="kxd-ces-exec__heading">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function CesExecutivePerformanceWorkspace({
  performance,
  websiteReview,
}: CesExecutivePerformanceWorkspaceProps) {
  const { presentation } = performance;
  const zones = getExecutiveZoneOrder(presentation);
  const updatedLabel = new Date(performance.composedAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const hasHeroImage = Boolean(presentation.heroImageSrc?.trim());
  const themeStyle = executivePresentationToCssVars(presentation) as CSSProperties;

  const zoneMap: Record<ExecutiveWorkspaceZoneId, ReactNode> = {
    summary: (
      <section
        key="summary"
        className="kxd-ces-exec__zone kxd-ces-exec__zone--summary"
        aria-labelledby="exec-summary-heading"
      >
        <ZoneHeader eyebrow="Now" title="Executive Summary" id="exec-summary-heading" />
        <div className="kxd-ces-exec__summary-grid">
          <dl className="kxd-ces-exec__facts">
            <div className="kxd-ces-exec__fact">
              <dt>Phase</dt>
              <dd>{performance.summary.currentPhase}</dd>
            </div>
            <div className="kxd-ces-exec__fact">
              <dt>Focus</dt>
              <dd>{performance.summary.currentFocus}</dd>
            </div>
            <div className="kxd-ces-exec__fact">
              <dt>Next</dt>
              <dd>{performance.summary.nextMilestone}</dd>
            </div>
            <div className="kxd-ces-exec__fact kxd-ces-exec__fact--muted">
              <dt>Recent milestone</dt>
              <dd>{performance.summary.lastMajorMilestone}</dd>
            </div>
          </dl>
          <div className="kxd-ces-exec__summary-recommend">
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
      </section>
    ),

    performance: (
      <section
        key="performance"
        className="kxd-ces-exec__zone kxd-ces-exec__zone--performance"
        aria-labelledby="exec-performance-heading"
      >
        <ZoneHeader eyebrow="Signal" title="Performance" id="exec-performance-heading" />
        <div className="kxd-ces-exec__reporting-provenance">
          <p className="kxd-ces-exec__provenance-row">
            <span className="kxd-ces-exec__provenance-key">Period</span>
            <span className="kxd-ces-exec__provenance-value">
              {performance.reportingProvenance.periodLabel}
            </span>
          </p>
          {performance.reportingProvenance.providerLabels.length > 0 ? (
            <p className="kxd-ces-exec__provenance-row">
              <span className="kxd-ces-exec__provenance-key">Source</span>
              <span className="kxd-ces-exec__provenance-value kxd-ces-exec__provenance-value--intel">
                {performance.reportingProvenance.providerLabels.join(", ")}
              </span>
            </p>
          ) : null}
          {performance.reportingProvenance.statusNote ? (
            <p className="kxd-ces-exec__provenance-note">
              {performance.reportingProvenance.statusNote}
            </p>
          ) : null}
        </div>
        <ul className="kxd-ces-exec__status-row">
          {performance.performancePanels.map((panel) => (
            <li
              key={panel.id}
              className={`kxd-ces-exec__status kxd-ces-exec__status--${panel.state}`}
            >
              <div className="kxd-ces-exec__status-top">
                <span className="kxd-ces-exec__status-title">{panel.title}</span>
                <span
                  className={`kxd-ces-exec__status-state kxd-ces-exec__status-state--${panel.state}`}
                >
                  {connectionLabel(panel.state)}
                </span>
              </div>
              {panel.summary ? (
                <p className="kxd-ces-exec__status-summary">{panel.summary}</p>
              ) : null}
              {panel.detail ? (
                <p className="kxd-ces-exec__status-detail">{panel.detail}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    ),

    progress: (
      <section
        key="progress"
        className="kxd-ces-exec__zone kxd-ces-exec__zone--progress"
        aria-labelledby="exec-progress-heading"
      >
        <ZoneHeader
          eyebrow="Partnership"
          title="Partnership Progress"
          id="exec-progress-heading"
        />
        {performance.progressBeats.length > 0 ? (
          <ol className="kxd-ces-exec__beats" aria-label="Journey">
            {performance.progressBeats.map((beat) => (
              <li
                key={beat.id}
                className={
                  beat.complete
                    ? "kxd-ces-exec__beat kxd-ces-exec__beat--done"
                    : "kxd-ces-exec__beat kxd-ces-exec__beat--ahead"
                }
              >
                <span className="kxd-ces-exec__beat-dot" aria-hidden="true" />
                <span className="kxd-ces-exec__beat-label">{beat.label}</span>
              </li>
            ))}
          </ol>
        ) : null}

        <div className="kxd-ces-exec__progress-columns">
          <div className="kxd-ces-exec__progress-col">
            <p className="kxd-ces-exec__subhead">Accomplished</p>
            <ul className="kxd-ces-exec__compact-list">
              {performance.partnershipPrimary.map((item) => (
                <li key={item.id}>
                  <span className="kxd-ces-exec__compact-label">{item.label}</span>
                  <span className="kxd-ces-exec__compact-detail">{item.detail}</span>
                </li>
              ))}
            </ul>
            {performance.partnershipSecondary.length > 0 ? (
              <details className="kxd-ces-exec__disclosure">
                <summary>More partnership history</summary>
                <ul className="kxd-ces-exec__compact-list">
                  {performance.partnershipSecondary.map((item) => (
                    <li key={item.id}>
                      <span className="kxd-ces-exec__compact-label">{item.label}</span>
                      <span className="kxd-ces-exec__compact-detail">{item.detail}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>

          <div className="kxd-ces-exec__progress-col">
            {performance.recentImprovements.length > 0 ? (
              <>
                <p className="kxd-ces-exec__subhead">Recent</p>
                <ul className="kxd-ces-exec__compact-list">
                  {performance.recentImprovements.map((item) => (
                    <li key={item.id}>
                      <span className="kxd-ces-exec__compact-label">{item.label}</span>
                      {item.detail ? (
                        <span className="kxd-ces-exec__compact-detail">{item.detail}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {performance.workingSignals.length > 0 ? (
              <>
                <p className="kxd-ces-exec__subhead">What&apos;s working</p>
                <ul className="kxd-ces-exec__signal-list">
                  {performance.workingSignals.map((item) => (
                    <li key={item.id}>
                      <span className="kxd-ces-exec__signal-mark" aria-hidden="true" />
                      <span className="kxd-ces-exec__signal-label">{item.label}</span>
                      {item.detail ? (
                        <span className="kxd-ces-exec__signal-detail">{item.detail}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </div>
      </section>
    ),

    collaboration: (
      <section
        key="collaboration"
        className="kxd-ces-exec__zone kxd-ces-exec__zone--collaboration"
        aria-labelledby="exec-collab-heading"
      >
        <ZoneHeader
          eyebrow="Action"
          title="Website Review"
          id="exec-collab-heading"
          action={
            <Link href="/portal/website-review" className="kxd-ces-exec__section-link">
              View all
            </Link>
          }
        />
        <div className="kxd-ces-exec__collab">
          <div className="kxd-ces-exec__collab-main">
            <p className="kxd-ces-exec__collab-status">{performance.collaboration.statusLabel}</p>
            <p className="kxd-ces-exec__collab-lead">
              {performance.collaboration.explanation}
            </p>
            <div className="kxd-ces-exec__actions">
              {performance.collaboration.primaryAction ? (
                <Link
                  href={performance.collaboration.primaryAction.href}
                  className="kxd-ces-btn kxd-ces-btn--primary"
                >
                  {performance.collaboration.primaryAction.label}
                </Link>
              ) : null}
              {performance.collaboration.secondaryAction ? (
                <Link
                  href={performance.collaboration.secondaryAction.href}
                  className="kxd-ces-btn kxd-ces-btn--ghost"
                >
                  {performance.collaboration.secondaryAction.label}
                </Link>
              ) : null}
              {websiteReview.websiteUrl ? (
                <a
                  href={websiteReview.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="kxd-ces-btn kxd-ces-btn--ghost"
                >
                  Open Review Site
                </a>
              ) : null}
            </div>
          </div>
          {performance.collaboration.recentActivity.length > 0 ? (
            <div className="kxd-ces-exec__collab-side">
              <p className="kxd-ces-exec__subhead">Recent revisions</p>
              <ul className="kxd-ces-exec__compact-list">
                {performance.collaboration.recentActivity.map((item) => (
                  <li key={item.id}>
                    <span className="kxd-ces-exec__compact-label">{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    ),

    growth: (
      <section
        key="growth"
        className="kxd-ces-exec__zone kxd-ces-exec__zone--growth"
        aria-labelledby="exec-growth-heading"
      >
        <ZoneHeader eyebrow="When you&apos;re ready" title="Growth" id="exec-growth-heading" />
        <ul className="kxd-ces-exec__growth">
          {performance.evolution.map((item) => (
            <li
              key={item.id}
              className={`kxd-ces-exec__growth-item kxd-ces-exec__growth-item--${item.maturity}`}
            >
              <div className="kxd-ces-exec__growth-top">
                <p className="kxd-ces-exec__growth-label">{item.label}</p>
                <span className="kxd-ces-exec__growth-maturity">
                  {evolutionMaturityLabel(item.maturity)}
                </span>
              </div>
              <p className="kxd-ces-exec__growth-detail">{item.detail}</p>
            </li>
          ))}
        </ul>
      </section>
    ),

    account: (
      <section
        key="account"
        className="kxd-ces-exec__zone kxd-ces-exec__zone--account"
        aria-labelledby="exec-account-heading"
      >
        <ZoneHeader eyebrow="Quiet" title="Account" id="exec-account-heading" />
        <dl className="kxd-ces-exec__account">
          <div>
            <dt>Engagement</dt>
            <dd>{performance.account.engagementStatus}</dd>
          </div>
          <div>
            <dt>Billing</dt>
            <dd>{performance.account.billingAvailability}</dd>
          </div>
        </dl>
        <p className="kxd-ces-exec__account-note">{performance.account.note}</p>
      </section>
    ),
  };

  return (
    <div className="kxd-ces-exec kxd-ces-exec--workspace" style={themeStyle}>
      <header
        className={[
          "kxd-ces-exec__hero",
          "kxd-ces-exec__hero--compact",
          `kxd-ces-exec__hero--${presentation.heroOverlay}`,
          hasHeroImage ? "kxd-ces-exec__hero--imaged" : "kxd-ces-exec__hero--fallback",
        ].join(" ")}
        aria-label={presentation.heroImageAlt}
      >
        <div className="kxd-ces-exec__hero-veil" aria-hidden="true" />
        <div className="kxd-ces-exec__hero-vignette" aria-hidden="true" />
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
        </div>
      </header>

      <div className="kxd-ces-exec__zones">
        {zones.map((id) => zoneMap[id])}
      </div>
    </div>
  );
}
