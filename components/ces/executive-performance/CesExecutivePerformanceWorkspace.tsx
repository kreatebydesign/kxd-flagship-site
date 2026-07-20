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

/** Desktop row packing — presentation only; preserves zone content & order. */
function packZoneRows(zones: ExecutiveWorkspaceZoneId[]): ExecutiveWorkspaceZoneId[][] {
  const remaining = [...zones];
  const rows: ExecutiveWorkspaceZoneId[][] = [];
  while (remaining.length > 0) {
    const next = remaining[0];
    if (next === "performance" && remaining.includes("collaboration")) {
      rows.push(["performance", "collaboration"]);
      remaining.splice(remaining.indexOf("performance"), 1);
      remaining.splice(remaining.indexOf("collaboration"), 1);
      continue;
    }
    rows.push([remaining.shift()!]);
  }
  return rows;
}

function MetaMark({ kind }: { kind: "phase" | "focus" | "next" | "recent" }) {
  const paths: Record<typeof kind, ReactNode> = {
    phase: (
      <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.2" />
    ),
    focus: (
      <path
        d="M8 2.5 13.5 8 8 13.5 2.5 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    ),
    next: (
      <path
        d="M5 4.5 9.5 8 5 11.5M9 4.5 13.5 8 9 11.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    recent: (
      <path
        d="M8 2.75 9.55 6.4l3.95.35-3 2.7.9 3.9L8 11.6l-3.4 2.05.9-3.9-3-2.7 3.95-.35Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    ),
  };
  return (
    <span className="kxd-ces-exec__meta-icon" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="14" height="14" focusable="false">
        {paths[kind]}
      </svg>
    </span>
  );
}

function GrowthMark() {
  return (
    <span className="kxd-ces-exec__growth-icon" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="14" height="14" focusable="false">
        <path
          d="M3 11.5 7 7.5l2.5 2.5L13 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 5h3v3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function ZoneTitle({
  eyebrow,
  eyebrowTone = "action",
  title,
  id,
  action,
  lead,
}: {
  eyebrow: string;
  eyebrowTone?: "action" | "signal";
  title: string;
  id: string;
  action?: ReactNode;
  lead?: string;
}) {
  return (
    <div className="kxd-ces-exec__zone-head">
      <div>
        <p
          className={`kxd-ces-exec__section-eyebrow kxd-ces-exec__section-eyebrow--${eyebrowTone}`}
        >
          {eyebrow}
        </p>
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
  const rows = packZoneRows(zones);
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
        <div className="kxd-ces-exec__briefing">
          <div className="kxd-ces-exec__briefing-lead">
            <ZoneTitle
              eyebrow="Briefing"
              title="Executive Summary"
              id="exec-summary-heading"
            />
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
          </div>
          <aside className="kxd-ces-exec__briefing-meta" aria-label="Partnership context">
            <dl className="kxd-ces-exec__meta-grid">
              <div className="kxd-ces-exec__meta-cell">
                <dt>
                  <MetaMark kind="phase" />
                  {performance.summary.labels.phase}
                </dt>
                <dd>{performance.summary.currentPhase}</dd>
              </div>
              <div className="kxd-ces-exec__meta-cell">
                <dt>
                  <MetaMark kind="focus" />
                  {performance.summary.labels.focus}
                </dt>
                <dd>{performance.summary.currentFocus}</dd>
              </div>
              <div className="kxd-ces-exec__meta-cell">
                <dt>
                  <MetaMark kind="next" />
                  {performance.summary.labels.next}
                </dt>
                <dd>{performance.summary.nextMilestone}</dd>
              </div>
              <div className="kxd-ces-exec__meta-cell kxd-ces-exec__meta-cell--quiet">
                <dt>
                  <MetaMark kind="recent" />
                  {performance.summary.labels.recent}
                </dt>
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
        <div className="kxd-ces-exec__zone-head kxd-ces-exec__zone-head--inline">
          <div>
            <p className="kxd-ces-exec__section-eyebrow kxd-ces-exec__section-eyebrow--signal">
              Signal
            </p>
            <h2 id="exec-performance-heading" className="kxd-ces-exec__heading">
              Performance
            </h2>
          </div>
          <div className="kxd-ces-exec__reporting-provenance">
            <p className="kxd-ces-exec__provenance-row">
              <span className="kxd-ces-exec__provenance-key">Period</span>
              <span className="kxd-ces-exec__provenance-value">{periodLabel}</span>
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
        </div>
        <ul className="kxd-ces-exec__status-row">
          {performance.performancePanels.map((panel) => {
            const narrative = executivePanelNarrative(panel, periodLabel);
            const metrics = panel.metrics ?? [];
            const hasLiveMetrics = metrics.length > 0;
            return (
              <li
                key={panel.id}
                className={[
                  "kxd-ces-exec__status",
                  `kxd-ces-exec__status--${panel.state}`,
                  hasLiveMetrics ? "kxd-ces-exec__status--live" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
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
                {hasLiveMetrics ? (
                  <dl className="kxd-ces-exec__metric-grid">
                    {metrics.map((metric) => (
                      <div key={metric.key} className="kxd-ces-exec__metric">
                        <dt>{metric.label}</dt>
                        <dd>{metric.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="kxd-ces-exec__status-summary">{narrative.lead}</p>
                )}
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
          eyebrow="Partnership"
          title="Partnership Progress"
          id="exec-progress-heading"
        />
        {performance.presentation.briefingEnabled ? (
          <Link href="/portal/partnership" className="kxd-ces-exec__section-link">
            Open executive briefing
          </Link>
        ) : null}
        {performance.presentation.executiveReviewEnabled ? (
          <Link href="/portal/executive-review" className="kxd-ces-exec__section-link">
            Open Executive Review
          </Link>
        ) : null}
        <div className="kxd-ces-exec__progress-stage">
          {performance.progressBeats.length > 0 ? (
            <div className="kxd-ces-exec__progress-journey">
              <p className="kxd-ces-exec__subhead">Journey</p>
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
                    <span className="kxd-ces-exec__beat-node" aria-hidden="true">
                      {beat.complete ? (
                        <svg viewBox="0 0 16 16" width="9" height="9" focusable="false">
                          <path
                            d="M3.5 8.2 6.4 11l6.1-6.4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        String(index + 1)
                      )}
                    </span>
                    <span className="kxd-ces-exec__beat-label">{beat.label}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

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
      </section>
    ),

    collaboration: (
      <section
        key="collaboration"
        className="kxd-ces-exec__zone kxd-ces-exec__zone--collaboration"
        aria-labelledby="exec-collab-heading"
      >
        <ZoneTitle
          eyebrow="Collaboration"
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
              Leave anything you&apos;d like us to refine.
            </p>
            <p className="kxd-ces-exec__collab-lead">
              {performance.collaboration.explanation ||
                "We'll keep every note organized here."}
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
          eyebrow="When you're ready"
          eyebrowTone="signal"
          title="Growth"
          id="exec-growth-heading"
        />
        {performance.presentation.executiveReviewEnabled ? (
          <Link href="/portal/executive-review" className="kxd-ces-exec__section-link">
            Open Executive Review
          </Link>
        ) : null}
        <ul className="kxd-ces-exec__growth">
          {performance.evolution.map((item) => (
            <li
              key={item.id}
              className={`kxd-ces-exec__growth-item kxd-ces-exec__growth-item--${item.maturity}`}
            >
              <GrowthMark />
              <p className="kxd-ces-exec__growth-label">{item.label}</p>
              <p className="kxd-ces-exec__growth-detail">{item.detail}</p>
              <div className="kxd-ces-exec__growth-foot">
                <span className="kxd-ces-exec__growth-maturity">
                  {evolutionMaturityLabel(item.maturity)}
                </span>
                <span className="kxd-ces-exec__growth-cue" aria-hidden="true" />
              </div>
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
        <div className="kxd-ces-exec__partnership-bar">
          <div className="kxd-ces-exec__partnership-title">
            <p className="kxd-ces-exec__section-eyebrow">Relationship</p>
            <h2 id="exec-account-heading" className="kxd-ces-exec__heading">
              Your Partnership
            </h2>
          </div>
          <div className="kxd-ces-exec__partnership-groups">
            <div className="kxd-ces-exec__partnership-group">
              <p className="kxd-ces-exec__subhead">Status</p>
              <p className="kxd-ces-exec__partnership-value">
                {performance.account.engagementStatus}
              </p>
            </div>
            <div className="kxd-ces-exec__partnership-group">
              <p className="kxd-ces-exec__subhead">Workspace</p>
              <p className="kxd-ces-exec__partnership-value">
                {performance.account.billingAvailability}
              </p>
            </div>
            <div className="kxd-ces-exec__partnership-group">
              <p className="kxd-ces-exec__subhead">Support</p>
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
        {rows.map((row) =>
          row.length > 1 ? (
            <div
              key={row.join("-")}
              className="kxd-ces-exec__band kxd-ces-exec__band--split"
            >
              {row.map((id) => zoneMap[id])}
            </div>
          ) : (
            zoneMap[row[0]]
          ),
        )}
      </div>

      <CesWorkspaceSignature />
    </div>
  );
}
