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
import {
  getLatestPrimalLeadershipReportHref,
  isPrimalLeadershipReportClient,
} from "@/lib/ces/leadership-report";
import type { LeadAttentionCounts } from "@/lib/client-command/leads/types";
import { summarizeLeadAttentionHeadline } from "@/lib/client-command/leads/overview";
import { CesWorkspaceSignature } from "./CesWorkspaceSignature";

export interface CesExecutivePerformanceWorkspaceProps {
  performance: ExecutivePerformanceBriefing;
  websiteReview: WebsiteReviewLandingData;
  /** Real lead attention counts when Leads is enabled — never invented. */
  leadAttention?: LeadAttentionCounts | null;
}

function connectionLabel(state: string, summary?: string | null): string {
  if (state === "connected") return "Connected";
  if (state === "awaiting-signal") {
    if (summary?.toLowerCase().includes("baseline")) return "Baseline";
    return "No signal yet";
  }
  if (summary?.toLowerCase().includes("measurement active")) return "Active";
  if (summary?.toLowerCase().includes("performance reviewed")) return "Reviewed";
  if (summary?.toLowerCase().includes("leadership report")) return "In report";
  return "Not connected";
}

function clampCopy(text: string, maxChars = 280): string {
  const value = text.trim();
  if (value.length <= maxChars) return value;
  const slice = value.slice(0, maxChars);
  const breakAt = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("; "), slice.lastIndexOf(", "));
  const cut = breakAt > 120 ? slice.slice(0, breakAt + 1) : slice;
  return `${cut.trim()}…`;
}

function isLivePanel(panel: { state: string; metrics?: unknown[] | null }): boolean {
  return panel.state === "connected" || Boolean(panel.metrics && panel.metrics.length > 0);
}

/** One zone per band — Overview hierarchy over side-by-side density. */
function packZoneRows(zones: ExecutiveWorkspaceZoneId[]): ExecutiveWorkspaceZoneId[][] {
  return zones.map((zone) => [zone]);
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
  leadAttention = null,
}: CesExecutivePerformanceWorkspaceProps) {
  const { presentation } = performance;
  const zones = getExecutiveZoneOrder(presentation);
  const rows = packZoneRows(zones);
  const hasHeroImage = Boolean(presentation.heroImageSrc?.trim());
  const themeStyle = executivePresentationToCssVars(presentation) as CSSProperties;
  const periodLabel = performance.reportingProvenance.periodLabel;
  const provenance = performance.reportingProvenance;
  const lastSyncLabel = provenance.lastSuccessfulSyncAt
    ? new Date(provenance.lastSuccessfulSyncAt).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const freshnessHeroLabel = provenance.freshnessLabel
    ? lastSyncLabel
      ? `${provenance.freshnessLabel} · data refreshed ${lastSyncLabel}`
      : provenance.freshnessLabel
    : null;

  const zoneMap: Record<ExecutiveWorkspaceZoneId, ReactNode> = {
    summary: (
      <section
        key="summary"
        className="kxd-ces-exec__zone kxd-ces-exec__zone--summary"
        aria-labelledby="exec-summary-heading"
      >
        <div className="kxd-ces-exec__briefing kxd-ces-exec__briefing--elite">
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
              {clampCopy(performance.recommendation.rationale, 260)}
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
          <aside className="kxd-ces-exec__briefing-signals" aria-label="Executive signals">
            <div className="kxd-ces-exec__signal-row">
              <p className="kxd-ces-exec__signal-key">{performance.summary.labels.phase}</p>
              <p className="kxd-ces-exec__signal-val">{performance.summary.currentPhase}</p>
            </div>
            <div className="kxd-ces-exec__signal-row">
              <p className="kxd-ces-exec__signal-key">{performance.summary.labels.focus}</p>
              <p className="kxd-ces-exec__signal-val">{performance.summary.currentFocus}</p>
            </div>
            <details className="kxd-ces-exec__disclosure">
              <summary>More context</summary>
              <dl className="kxd-ces-exec__signal-more">
                <div>
                  <dt>{performance.summary.labels.next}</dt>
                  <dd>{performance.summary.nextMilestone}</dd>
                </div>
                <div>
                  <dt>{performance.summary.labels.recent}</dt>
                  <dd>{performance.summary.lastMajorMilestone}</dd>
                </div>
              </dl>
            </details>
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
          eyebrow="Signal"
          eyebrowTone="signal"
          title="Performance"
          id="exec-performance-heading"
          lead="Current snapshot — open Performance for the full picture."
          action={
            <Link href="/portal/analytics" className="kxd-ces-exec__section-link">
              Open Performance
            </Link>
          }
        />
        <p className="kxd-ces-exec__snapshot-meta">
          {[
            provenance.monthlyPeriodLabel ?? periodLabel,
            provenance.freshnessLabel,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="kxd-ces-exec__primary-leads" aria-label="Primary leads">
          <p className="kxd-ces-exec__subhead">Primary leads</p>
          <dl className="kxd-ces-exec__metric-grid kxd-ces-exec__metric-grid--leads">
            {(
              [
                performance.primaryLeads.websiteFormLeads,
                performance.primaryLeads.paidQualifiedCallLeads,
                performance.primaryLeads.totalPrimaryLeads,
              ] as const
            ).map((lead) => (
              <div
                key={lead.key}
                className={[
                  "kxd-ces-exec__metric",
                  lead.available ? "" : "kxd-ces-exec__metric--unavailable",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <dt>{lead.label}</dt>
                <dd>{lead.value}</dd>
                {lead.deltaLabel ? (
                  <p className="kxd-ces-exec__metric-delta">{lead.deltaLabel}</p>
                ) : null}
              </div>
            ))}
          </dl>
        </div>
        <ul className="kxd-ces-exec__status-row kxd-ces-exec__status-row--snapshot">
          {[...performance.performancePanels]
            .sort((a, b) => Number(isLivePanel(b)) - Number(isLivePanel(a)))
            .map((panel) => {
              const narrative = executivePanelNarrative(panel, periodLabel);
              const metrics = panel.metrics ?? [];
              const hasLiveMetrics = metrics.length > 0;
              const live = isLivePanel(panel);
              return (
                <li
                  key={panel.id}
                  className={[
                    "kxd-ces-exec__status",
                    `kxd-ces-exec__status--${panel.state}`,
                    hasLiveMetrics ? "kxd-ces-exec__status--live" : "",
                    live ? "" : "kxd-ces-exec__status--quiet",
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
                      {connectionLabel(panel.state, panel.summary)}
                    </span>
                  </div>
                  {hasLiveMetrics ? (
                    <dl className="kxd-ces-exec__metric-grid">
                      {metrics.slice(0, 2).map((metric) => (
                        <div key={metric.key} className="kxd-ces-exec__metric">
                          <dt>{metric.label}</dt>
                          <dd>{metric.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="kxd-ces-exec__status-summary">{narrative.lead}</p>
                  )}
                </li>
              );
            })}
        </ul>
        <details className="kxd-ces-exec__disclosure">
          <summary>About these figures</summary>
          <div className="kxd-ces-exec__provenance-details">
            {provenance.baselineLabel ? (
              <p className="kxd-ces-exec__provenance-row">
                <span className="kxd-ces-exec__provenance-key">Baseline</span>
                <span className="kxd-ces-exec__provenance-value">
                  {provenance.baselineLabel}
                </span>
              </p>
            ) : null}
            {provenance.statusNote ? (
              <p className="kxd-ces-exec__provenance-note">{provenance.statusNote}</p>
            ) : null}
            {provenance.providerLabels.length > 0 ? (
              <p className="kxd-ces-exec__provenance-row">
                <span className="kxd-ces-exec__provenance-key">Source</span>
                <span className="kxd-ces-exec__provenance-value">
                  {provenance.providerLabels.join(", ")}
                </span>
              </p>
            ) : null}
            <p className="kxd-ces-exec__provenance-note">
              {performance.primaryLeads.excludedNote}
            </p>
          </div>
        </details>
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
          lead="Where we started, what has moved, and what we’re focused on now."
        />
        <div className="kxd-ces-exec__progress-elite">
          <div className="kxd-ces-exec__progress-now">
            <p className="kxd-ces-exec__subhead">Now</p>
            <p className="kxd-ces-exec__progress-phase">{performance.summary.currentPhase}</p>
            <p className="kxd-ces-exec__progress-focus">{performance.summary.currentFocus}</p>
            <div className="kxd-ces-exec__destinations" aria-label="Partnership destinations">
              {isPrimalLeadershipReportClient(performance.clientSlug) ? (
                <Link
                  href={getLatestPrimalLeadershipReportHref()}
                  className="kxd-ces-exec__section-link"
                >
                  Leadership Performance Update
                </Link>
              ) : null}
              {performance.presentation.briefingEnabled ? (
                <Link
                  href="/portal/partnership"
                  className="kxd-ces-exec__section-link kxd-ces-exec__section-link--quiet"
                >
                  Partnership briefing
                </Link>
              ) : null}
            </div>
          </div>
          <div className="kxd-ces-exec__progress-col">
            <p className="kxd-ces-exec__subhead">Accomplished</p>
            <ul className="kxd-ces-exec__compact-list">
              {performance.partnershipPrimary.slice(0, 3).map((item) => (
                <li key={item.id}>
                  <span className="kxd-ces-exec__compact-label">{item.label}</span>
                  <span className="kxd-ces-exec__compact-detail">{item.detail}</span>
                </li>
              ))}
            </ul>
            {(performance.partnershipPrimary.length > 3 ||
              performance.partnershipSecondary.length > 0 ||
              performance.recentImprovements.length > 0 ||
              performance.workingSignals.length > 0 ||
              performance.progressBeats.length > 0) ? (
              <details className="kxd-ces-exec__disclosure">
                <summary>Full partnership detail</summary>
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
                            {beat.complete ? "✓" : String(index + 1)}
                          </span>
                          <span className="kxd-ces-exec__beat-label">{beat.label}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
                {performance.partnershipPrimary.length > 3 ? (
                  <ul className="kxd-ces-exec__compact-list">
                    {performance.partnershipPrimary.slice(3).map((item) => (
                      <li key={item.id}>
                        <span className="kxd-ces-exec__compact-label">{item.label}</span>
                        <span className="kxd-ces-exec__compact-detail">{item.detail}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {performance.partnershipSecondary.length > 0 ? (
                  <ul className="kxd-ces-exec__compact-list">
                    {performance.partnershipSecondary.map((item) => (
                      <li key={item.id}>
                        <span className="kxd-ces-exec__compact-label">{item.label}</span>
                        <span className="kxd-ces-exec__compact-detail">{item.detail}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
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
              </details>
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
          lead="Website status and the next useful action."
        />
        <div className="kxd-ces-exec__action-band kxd-ces-exec__action-band--elite">
          <div className="kxd-ces-exec__action-band-copy">
            <p className="kxd-ces-exec__collab-status">{performance.collaboration.statusLabel}</p>
            <p className="kxd-ces-exec__collab-lead">
              {performance.collaboration.explanation ||
                "Leave anything you'd like us to refine — we’ll keep every note organized here."}
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
            ) : (
              <Link href="/portal/website-review" className="kxd-ces-btn kxd-ces-btn--primary">
                Open Website Review
              </Link>
            )}
          </div>
        </div>
        <div className="kxd-ces-exec__quiet-links">
          {performance.collaboration.secondaryAction ? (
            <Link
              href={performance.collaboration.secondaryAction.href}
              className="kxd-ces-exec__section-link kxd-ces-exec__section-link--quiet"
            >
              {performance.collaboration.secondaryAction.label}
            </Link>
          ) : null}
          {websiteReview.websiteUrl ? (
            <a
              href={websiteReview.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="kxd-ces-exec__section-link kxd-ces-exec__section-link--quiet"
            >
              Open the live site
            </a>
          ) : null}
          <Link
            href="/portal/website-review"
            className="kxd-ces-exec__section-link kxd-ces-exec__section-link--quiet"
          >
            See all review activity
          </Link>
        </div>
      </section>
    ),

    growth: (
      <section
        key="growth"
        className="kxd-ces-exec__zone kxd-ces-exec__zone--growth"
        aria-labelledby="exec-growth-heading"
      >
        <ZoneTitle
          eyebrow="Forward"
          eyebrowTone="signal"
          title="Growth"
          id="exec-growth-heading"
          lead="Where the next opportunities sit — not committed work."
        />
        <ul className="kxd-ces-exec__growth kxd-ces-exec__growth--elite">
          {performance.evolution.slice(0, 3).map((item) => (
            <li
              key={item.id}
              className={`kxd-ces-exec__growth-item kxd-ces-exec__growth-item--${item.maturity}`}
            >
              <p className="kxd-ces-exec__growth-label">{item.label}</p>
              <p className="kxd-ces-exec__growth-detail">{item.detail}</p>
              <span className="kxd-ces-exec__growth-maturity">
                {evolutionMaturityLabel(item.maturity)}
              </span>
            </li>
          ))}
        </ul>
        {performance.presentation.executiveReviewEnabled ? (
          <Link
            href="/portal/executive-review"
            className="kxd-ces-exec__section-link kxd-ces-exec__section-link--quiet"
          >
            Monthly Executive Review
          </Link>
        ) : null}
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
          "kxd-ces-exec__hero--compact",
          "kxd-ces-exec__hero--elite",
          `kxd-ces-exec__hero--${presentation.heroOverlay}`,
          hasHeroImage ? "kxd-ces-exec__hero--imaged" : "kxd-ces-exec__hero--fallback",
        ].join(" ")}
        aria-label={presentation.heroImageAlt}
      >
        <div className="kxd-ces-exec__hero-veil" aria-hidden="true" />
        <div className="kxd-ces-exec__hero-vignette" aria-hidden="true" />
        <div className="kxd-ces-exec__hero-inner">
          {presentation.workspaceEyebrow.trim() ? (
            <p className="kxd-ces-exec__eyebrow">{presentation.workspaceEyebrow}</p>
          ) : null}
          <h1 className="kxd-ces-exec__brand">{performance.clientName}</h1>
          {presentation.workspaceTitle.trim() ? (
            <p className="kxd-ces-exec__workspace-title">{presentation.workspaceTitle}</p>
          ) : null}
          <p className="kxd-ces-exec__greeting">{performance.greeting}</p>
          <p className="kxd-ces-exec__hero-status">
            {[presentation.introduction.trim(), freshnessHeroLabel]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </header>

      {leadAttention ? (
        <OperationalAttentionStrip
          attention={leadAttention}
          leadsHref="/portal/leads"
        />
      ) : null}

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

function OperationalAttentionStrip({
  attention,
  leadsHref,
}: {
  attention: LeadAttentionCounts;
  leadsHref: string;
}) {
  const tiles = [
    { key: "new", label: "New", value: attention.newUntouched },
    { key: "unassigned", label: "Unassigned", value: attention.unassigned },
    { key: "due", label: "Follow-up due", value: attention.followUpDue },
    { key: "overdue", label: "Overdue", value: attention.followUpOverdue },
  ] as const;
  const hasPressure =
    attention.newUntouched > 0 ||
    attention.unassigned > 0 ||
    attention.followUpDue > 0 ||
    attention.followUpOverdue > 0;

  return (
    <section
      className={`kxd-ces-exec__ops kxd-ces-exec__ops--strip${hasPressure ? " kxd-ces-exec__ops--attention" : ""}`}
      aria-labelledby="exec-ops-heading"
    >
      <div className="kxd-ces-exec__ops-head">
        <div>
          <h2 id="exec-ops-heading" className="kxd-ces-exec__heading">
            Lead attention
          </h2>
          <p className="kxd-ces-exec__ops-lede">
            {summarizeLeadAttentionHeadline(attention)}
          </p>
        </div>
        <Link href={leadsHref} className="kxd-ces-btn kxd-ces-btn--primary">
          Open leads
        </Link>
      </div>
      <ul className="kxd-ces-exec__ops-grid" aria-label="Lead attention counts">
        {tiles.map((tile) => (
          <li
            key={tile.key}
            className={
              tile.value > 0
                ? "kxd-ces-exec__ops-tile kxd-ces-exec__ops-tile--hot"
                : "kxd-ces-exec__ops-tile kxd-ces-exec__ops-tile--quiet"
            }
          >
            <span className="kxd-ces-exec__ops-value">{tile.value}</span>
            <span className="kxd-ces-exec__ops-label">{tile.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
