import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import type { WebsiteReviewLandingData } from "@/lib/ces/modules/website-review/types";
import {
  evolutionMaturityLabel,
  executivePanelNarrative,
  executivePanelTitle,
  executivePresentationToCssVars,
  getExecutiveZoneOrder,
  type ExecutivePerformanceBriefing,
  type ExecutiveWorkspaceZoneId,
} from "@/lib/ces/executive-performance";
import { CesWorkspaceSignature } from "./CesWorkspaceSignature";

export interface CesExecutivePerformanceWorkspaceProps {
  performance: ExecutivePerformanceBriefing;
  websiteReview: WebsiteReviewLandingData;
}

function connectionLabel(state: string): string {
  if (state === "connected") return "Connected";
  if (state === "awaiting-signal") return "Waiting";
  return "Not yet";
}

function ZoneTitle({
  title,
  id,
  action,
  lead,
}: {
  title: string;
  id: string;
  action?: ReactNode;
  lead?: string;
}) {
  return (
    <div className="kxd-ces-exec__zone-head">
      <div>
        <h2 id={id} className="kxd-ces-exec__heading">
          {title}
        </h2>
        {lead ? <p className="kxd-ces-exec__zone-lead">{lead}</p> : null}
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
  const periodLabel = performance.reportingProvenance.periodLabel;

  const zoneMap: Record<ExecutiveWorkspaceZoneId, ReactNode> = {
    summary: (
      <section
        key="summary"
        className="kxd-ces-exec__zone kxd-ces-exec__zone--summary"
        aria-labelledby="exec-summary-heading"
      >
        <ZoneTitle title="Executive Summary" id="exec-summary-heading" />
        <div className="kxd-ces-exec__summary-letter">
          <article className="kxd-ces-exec__letter-body">
            <h3 className="kxd-ces-exec__letter-headline">
              {performance.recommendation.headline}
            </h3>
            <p className="kxd-ces-exec__letter-copy">
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
          </article>
          <aside className="kxd-ces-exec__letter-meta" aria-label="Partnership context">
            <dl className="kxd-ces-exec__meta-list">
              <div className="kxd-ces-exec__meta-row">
                <dt>Phase</dt>
                <dd>{performance.summary.currentPhase}</dd>
              </div>
              <div className="kxd-ces-exec__meta-row">
                <dt>Focus</dt>
                <dd>{performance.summary.currentFocus}</dd>
              </div>
              <div className="kxd-ces-exec__meta-row">
                <dt>Next</dt>
                <dd>{performance.summary.nextMilestone}</dd>
              </div>
              <div className="kxd-ces-exec__meta-row kxd-ces-exec__meta-row--quiet">
                <dt>Recent</dt>
                <dd>{performance.summary.lastMajorMilestone}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>
    ),

    performance: (
      <section
        key="performance"
        className="kxd-ces-exec__zone kxd-ces-exec__zone--performance"
        aria-labelledby="exec-performance-heading"
      >
        <ZoneTitle
          title="Performance"
          id="exec-performance-heading"
          lead="A calm view of what we can show you — never estimated, never invented."
        />
        <div className="kxd-ces-exec__reporting-provenance">
          <p className="kxd-ces-exec__provenance-row">
            <span className="kxd-ces-exec__provenance-key">Period</span>
            <span className="kxd-ces-exec__provenance-value">{periodLabel}</span>
          </p>
          {performance.reportingProvenance.providerLabels.length > 0 ? (
            <p className="kxd-ces-exec__provenance-row">
              <span className="kxd-ces-exec__provenance-key">From</span>
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
          {performance.performancePanels.map((panel) => {
            const narrative = executivePanelNarrative(panel, periodLabel);
            return (
              <li
                key={panel.id}
                className={`kxd-ces-exec__status kxd-ces-exec__status--${panel.state}`}
              >
                <div className="kxd-ces-exec__status-top">
                  <span className="kxd-ces-exec__status-title">
                    {executivePanelTitle(panel)}
                  </span>
                  <span
                    className={`kxd-ces-exec__status-state kxd-ces-exec__status-state--${panel.state}`}
                  >
                    {connectionLabel(panel.state)}
                  </span>
                </div>
                <p className="kxd-ces-exec__status-summary">{narrative.lead}</p>
                {narrative.support ? (
                  <p className="kxd-ces-exec__status-detail">{narrative.support}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    ),

    progress: (
      <section
        key="progress"
        className="kxd-ces-exec__zone kxd-ces-exec__zone--progress"
        aria-labelledby="exec-progress-heading"
      >
        <ZoneTitle
          title="Partnership Progress"
          id="exec-progress-heading"
          lead="The story of the work we've done together — and what comes next."
        />
        <p className="kxd-ces-exec__story-lead">
          Since partnering with Kreate by Design…
        </p>
        <div className="kxd-ces-exec__progress-stage">
          {performance.progressBeats.length > 0 ? (
            <ol className="kxd-ces-exec__beats" aria-label="Journey">
              {performance.progressBeats.map((beat, index) => (
                <li
                  key={beat.id}
                  className={
                    beat.complete
                      ? "kxd-ces-exec__beat kxd-ces-exec__beat--done"
                      : "kxd-ces-exec__beat kxd-ces-exec__beat--ahead"
                  }
                >
                  <span className="kxd-ces-exec__beat-index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="kxd-ces-exec__beat-node" aria-hidden="true" />
                  <span className="kxd-ces-exec__beat-label">{beat.label}</span>
                </li>
              ))}
            </ol>
          ) : null}

          <div className="kxd-ces-exec__progress-columns">
            <div className="kxd-ces-exec__progress-col">
              <p className="kxd-ces-exec__subhead">What we&apos;ve built together</p>
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
                  <summary>Earlier partnership history</summary>
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

            <div className="kxd-ces-exec__progress-col kxd-ces-exec__progress-col--side">
              {performance.recentImprovements.length > 0 ? (
                <div className="kxd-ces-exec__progress-block">
                  <p className="kxd-ces-exec__subhead">Lately</p>
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
                </div>
              ) : null}
              {performance.workingSignals.length > 0 ? (
                <div className="kxd-ces-exec__progress-block kxd-ces-exec__progress-block--signals">
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
                </div>
              ) : null}
            </div>
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
        <ZoneTitle
          title="Website Review"
          id="exec-collab-heading"
          action={
            <Link href="/portal/website-review" className="kxd-ces-exec__section-link">
              See everything
            </Link>
          }
        />
        <div className="kxd-ces-exec__action-band">
          <div className="kxd-ces-exec__action-band-copy">
            <p className="kxd-ces-exec__collab-status">{performance.collaboration.statusLabel}</p>
            <p className="kxd-ces-exec__collab-invite">
              Whenever you&apos;re ready, review the latest version and leave anything
              you&apos;d like us to refine.
            </p>
            <p className="kxd-ces-exec__collab-lead">
              We&apos;ll keep every note organized in Website Review.
              {performance.collaboration.explanation
                ? ` ${performance.collaboration.explanation}`
                : ""}
            </p>
          </div>
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
                Open the review site
              </a>
            ) : null}
          </div>
        </div>
        {performance.collaboration.recentActivity.length > 0 ? (
          <div className="kxd-ces-exec__collab-side">
            <p className="kxd-ces-exec__subhead">Recent refinements</p>
            <ul className="kxd-ces-exec__compact-list">
              {performance.collaboration.recentActivity.map((item) => (
                <li key={item.id}>
                  <span className="kxd-ces-exec__compact-label">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    ),

    growth: (
      <section
        key="growth"
        className="kxd-ces-exec__zone kxd-ces-exec__zone--growth"
        aria-labelledby="exec-growth-heading"
      >
        <ZoneTitle
          title="Growth"
          id="exec-growth-heading"
          lead="Possibilities we can open when the partnership is ready — never pressed."
        />
        <ul className="kxd-ces-exec__growth">
          {performance.evolution.map((item) => (
            <li
              key={item.id}
              className={`kxd-ces-exec__growth-item kxd-ces-exec__growth-item--${item.maturity}`}
            >
              <div className="kxd-ces-exec__growth-top">
                <span className="kxd-ces-exec__growth-maturity">
                  {evolutionMaturityLabel(item.maturity)}
                </span>
              </div>
              <p className="kxd-ces-exec__growth-label">{item.label}</p>
              <p className="kxd-ces-exec__growth-detail">{item.detail}</p>
            </li>
          ))}
        </ul>
        {/*
          Future shelf (not exposed): Available Capabilities —
          Natural placement is after Growth and before Your Partnership.
          Shared Core zone candidate: "capabilities". Do not render until approved.
        */}
      </section>
    ),

    account: (
      <section
        key="account"
        className="kxd-ces-exec__zone kxd-ces-exec__zone--account"
        aria-labelledby="exec-account-heading"
      >
        <ZoneTitle
          title="Your Partnership"
          id="exec-account-heading"
          lead="Your relationship with Kreate by Design — quiet details, close support."
        />
        <div className="kxd-ces-exec__partnership-card">
          <div className="kxd-ces-exec__partnership-groups">
            <div className="kxd-ces-exec__partnership-group">
              <p className="kxd-ces-exec__subhead">Relationship</p>
              <dl className="kxd-ces-exec__account">
                <div>
                  <dt>Partnership</dt>
                  <dd>{performance.account.engagementStatus}</dd>
                </div>
                <div>
                  <dt>Engagement</dt>
                  <dd>{performance.account.billingAvailability}</dd>
                </div>
              </dl>
            </div>
            <div className="kxd-ces-exec__partnership-group">
              <p className="kxd-ces-exec__subhead">How we take care of you</p>
              <p className="kxd-ces-exec__account-note">{performance.account.note}</p>
            </div>
          </div>
        </div>
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

      <CesWorkspaceSignature />
    </div>
  );
}
