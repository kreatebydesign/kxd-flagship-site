import Link from "next/link";
import {
  getPartnershipStoryTimeline,
  type PartnershipBriefing,
} from "@/lib/ces/partnership";

function formatProgressDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export interface CesPartnershipBriefingProps {
  briefing: PartnershipBriefing;
  greeting: string;
}

export function CesPartnershipBriefing({ briefing, greeting }: CesPartnershipBriefingProps) {
  const { overview, needsAttention, websiteReview, results, recommendation } =
    briefing;
  const story = getPartnershipStoryTimeline(briefing.clientSlug);
  const updatedLabel = new Date().toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="kxd-ces-partnership">
      {/* Hero */}
      <header className="kxd-ces-partnership__hero">
        <p className="kxd-ces-partnership__eyebrow">Private Partnership Workspace</p>
        <h1 className="kxd-ces-partnership__brand">{briefing.clientName}</h1>
        <p className="kxd-ces-partnership__greeting">{greeting}</p>
        <p className="kxd-ces-partnership__lead">
          Everything Kreate by Design is actively delivering, planning, and recommending for{" "}
          {briefing.clientName}.
        </p>
        <p className="kxd-ces-partnership__updated">Updated {updatedLabel}</p>
      </header>

      {/* Where we are */}
      <section className="kxd-ces-partnership__section" aria-labelledby="where-we-stand-heading">
        <p className="kxd-ces-partnership__section-eyebrow">Where we are</p>
        <h2 id="where-we-stand-heading" className="kxd-ces-partnership__heading">
          The Partnership Today
        </h2>
        <dl className="kxd-ces-partnership__facts">
          <div className="kxd-ces-partnership__fact">
            <dt>Relationship</dt>
            <dd>{overview.relationshipStatus}</dd>
          </div>
          <div className="kxd-ces-partnership__fact">
            <dt>Phase</dt>
            <dd>{overview.currentPhase}</dd>
          </div>
          <div className="kxd-ces-partnership__fact">
            <dt>Focus</dt>
            <dd>{overview.currentFocus}</dd>
          </div>
          <div className="kxd-ces-partnership__fact">
            <dt>Most recent milestone</dt>
            <dd>{overview.lastMajorMilestone}</dd>
          </div>
          <div className="kxd-ces-partnership__fact">
            <dt>Next</dt>
            <dd>{overview.nextMilestone}</dd>
          </div>
          <div className="kxd-ces-partnership__fact kxd-ces-partnership__fact--accent">
            <dt>Recommendation</dt>
            <dd>{overview.recommendationLine}</dd>
          </div>
        </dl>
      </section>

      {/* Editorial relationship timeline */}
      <section
        className="kxd-ces-partnership__section kxd-ces-partnership__story"
        aria-labelledby="story-heading"
      >
        <p className="kxd-ces-partnership__section-eyebrow">The journey</p>
        <h2 id="story-heading" className="kxd-ces-partnership__heading">
          How We Arrived Here
        </h2>
        <ol className="kxd-ces-partnership__story-line">
          {story.map((beat, index) => (
            <li
              key={beat.id}
              className={
                beat.complete
                  ? "kxd-ces-partnership__story-beat kxd-ces-partnership__story-beat--done"
                  : "kxd-ces-partnership__story-beat kxd-ces-partnership__story-beat--ahead"
              }
            >
              <span className="kxd-ces-partnership__story-marker" aria-hidden="true">
                <span className="kxd-ces-partnership__story-dot" />
                {index < story.length - 1 ? (
                  <span className="kxd-ces-partnership__story-connector" />
                ) : null}
              </span>
              <span className="kxd-ces-partnership__story-label">{beat.label}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* What we've accomplished */}
      <section className="kxd-ces-partnership__section" aria-labelledby="accomplished-heading">
        <p className="kxd-ces-partnership__section-eyebrow">Together</p>
        <h2 id="accomplished-heading" className="kxd-ces-partnership__heading">
          What We’ve Accomplished Together
        </h2>
        <ul className="kxd-ces-partnership__milestones">
          {briefing.sincePartnering.map((item) => (
            <li
              key={item.id}
              className={
                item.complete
                  ? "kxd-ces-partnership__milestone kxd-ces-partnership__milestone--done"
                  : "kxd-ces-partnership__milestone"
              }
            >
              <span className="kxd-ces-partnership__check" aria-hidden="true">
                {item.complete ? "✓" : "·"}
              </span>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* What we've built / delivered */}
      <section className="kxd-ces-partnership__section" aria-labelledby="delivered-heading">
        <p className="kxd-ces-partnership__section-eyebrow">In our care</p>
        <h2 id="delivered-heading" className="kxd-ces-partnership__heading">
          What We’ve Built
        </h2>
        <ul className="kxd-ces-partnership__delivered">
          {briefing.delivered.map((item) => (
            <li key={item.id} className="kxd-ces-partnership__delivered-item">
              <div className="kxd-ces-partnership__delivered-main">
                <span className="kxd-ces-partnership__delivered-label">{item.label}</span>
                {item.value != null ? (
                  <span className="kxd-ces-partnership__delivered-value">{item.value}</span>
                ) : null}
              </div>
              <p className="kxd-ces-partnership__delivered-detail">{item.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Today */}
      <section className="kxd-ces-partnership__section" aria-labelledby="today-heading">
        <p className="kxd-ces-partnership__section-eyebrow">Right now</p>
        <h2 id="today-heading" className="kxd-ces-partnership__heading">
          Today
        </h2>
        <dl className="kxd-ces-partnership__state">
          <div>
            <dt>Initiative</dt>
            <dd>{briefing.currentState.initiative}</dd>
          </div>
          <div>
            <dt>Website</dt>
            <dd>{briefing.currentState.websiteStage}</dd>
          </div>
          <div>
            <dt>Review</dt>
            <dd>{briefing.currentState.reviewState}</dd>
          </div>
          <div>
            <dt>From you</dt>
            <dd>{briefing.currentState.outstandingClientAction ?? "Nothing outstanding"}</dd>
          </div>
          <div>
            <dt>From Kreate by Design</dt>
            <dd>{briefing.currentState.outstandingKxdAction ?? "Nothing outstanding"}</dd>
          </div>
          <div>
            <dt>Health</dt>
            <dd>{briefing.currentState.partnershipHealth}</dd>
          </div>
        </dl>
      </section>

      {/* One action */}
      <section
        className="kxd-ces-partnership__section kxd-ces-partnership__attention"
        aria-labelledby="attention-heading"
      >
        <p className="kxd-ces-partnership__section-eyebrow">One step</p>
        <h2 id="attention-heading" className="kxd-ces-partnership__heading">
          Ready When You Are
        </h2>
        {needsAttention.action ? (
          <div className="kxd-ces-partnership__attention-body">
            <p className="kxd-ces-partnership__attention-action">{needsAttention.action}</p>
            {needsAttention.href ? (
              <Link href={needsAttention.href} className="kxd-ces-btn kxd-ces-btn--primary">
                Begin
              </Link>
            ) : null}
          </div>
        ) : (
          <p className="kxd-ces-partnership__quiet">{needsAttention.emptyMessage}</p>
        )}
      </section>

      {/* Website Review */}
      <section className="kxd-ces-partnership__section" aria-labelledby="website-review-heading">
        <div className="kxd-ces-partnership__section-head">
          <div>
            <p className="kxd-ces-partnership__section-eyebrow">Collaboration</p>
            <h2 id="website-review-heading" className="kxd-ces-partnership__heading">
              Website Review
            </h2>
          </div>
          {websiteReview.hasRevisions ? (
            <Link href="/portal/website-review" className="kxd-ces-partnership__section-link">
              View all
            </Link>
          ) : null}
        </div>

        {websiteReview.hasRevisions ? (
          <>
            <dl className="kxd-ces-partnership__state">
              <div>
                <dt>Status</dt>
                <dd>{websiteReview.statusLabel}</dd>
              </div>
              <div>
                <dt>Progress</dt>
                <dd>{websiteReview.timelineLabel}</dd>
              </div>
              <div>
                <dt>Latest revision</dt>
                <dd>
                  {websiteReview.latestRevisionTitle ? (
                    websiteReview.latestRevisionHref ? (
                      <Link href={websiteReview.latestRevisionHref}>
                        {websiteReview.latestRevisionTitle}
                      </Link>
                    ) : (
                      websiteReview.latestRevisionTitle
                    )
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt>Latest response</dt>
                <dd>{websiteReview.latestKxdResponse ?? "Updates appear as work advances"}</dd>
              </div>
              <div>
                <dt>Next</dt>
                <dd>{websiteReview.nextStep}</dd>
              </div>
              <div>
                <dt>References</dt>
                <dd>
                  {websiteReview.attachmentCount > 0
                    ? `${websiteReview.attachmentCount} attached to the latest revision`
                    : "None attached yet"}
                </dd>
              </div>
            </dl>
            <div className="kxd-ces-partnership__review-actions">
              {websiteReview.websiteUrl ? (
                <>
                  <Link
                    href="/portal/website-review/session/new"
                    className="kxd-ces-btn kxd-ces-btn--primary"
                  >
                    Review the site
                  </Link>
                  <a
                    href={websiteReview.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="kxd-ces-btn kxd-ces-btn--ghost"
                  >
                    Open live site
                  </a>
                </>
              ) : (
                <Link href="/portal/website-review/request" className="kxd-ces-btn kxd-ces-btn--primary">
                  Share feedback
                </Link>
              )}
            </div>
          </>
        ) : (
          <div className="kxd-ces-partnership__empty">
            <p className="kxd-ces-partnership__empty-lead">
              The review space is ready. When you walk the site, your notes land here — organized,
              clear, and never lost.
            </p>
            <p className="kxd-ces-partnership__empty-detail">{websiteReview.nextStep}</p>
            <div className="kxd-ces-partnership__review-actions">
              {websiteReview.websiteUrl ? (
                <>
                  <Link
                    href="/portal/website-review/session/new"
                    className="kxd-ces-btn kxd-ces-btn--primary"
                  >
                    Review the site
                  </Link>
                  <Link href="/portal/website-review/request" className="kxd-ces-btn kxd-ces-btn--ghost">
                    Share written notes
                  </Link>
                </>
              ) : (
                <Link href="/portal/website-review/request" className="kxd-ces-btn kxd-ces-btn--primary">
                  Share feedback
                </Link>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Along the way */}
      <section className="kxd-ces-partnership__section" aria-labelledby="progress-heading">
        <p className="kxd-ces-partnership__section-eyebrow">Momentum</p>
        <h2 id="progress-heading" className="kxd-ces-partnership__heading">
          Along the Way
        </h2>
        <ol className="kxd-ces-partnership__progress">
          {briefing.recentProgress.map((item) => {
            const dateLabel = formatProgressDate(item.at);
            return (
              <li key={item.id} className="kxd-ces-partnership__progress-item">
                <div className="kxd-ces-partnership__progress-main">
                  <span className="kxd-ces-partnership__progress-label">{item.label}</span>
                  {dateLabel ? (
                    <time
                      className="kxd-ces-partnership__progress-date"
                      dateTime={item.at ?? undefined}
                    >
                      {dateLabel}
                    </time>
                  ) : null}
                </div>
                {item.detail ? (
                  <p className="kxd-ces-partnership__progress-detail">{item.detail}</p>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>

      {/* Growth outcomes */}
      {results ? (
        <section className="kxd-ces-partnership__section" aria-labelledby="results-heading">
          <p className="kxd-ces-partnership__section-eyebrow">{results.eyebrow}</p>
          <h2 id="results-heading" className="kxd-ces-partnership__heading">
            {results.title}
          </h2>
          {results.periodLabel ? (
            <p className="kxd-ces-partnership__period">{results.periodLabel}</p>
          ) : null}
          <ul className="kxd-ces-partnership__outcomes">
            {results.outcomes.map((outcome) => (
              <li key={outcome}>{outcome}</li>
            ))}
          </ul>
          {results.hasDetailedMetrics ? (
            <details className="kxd-ces-partnership__metrics">
              <summary>Campaign detail</summary>
              <dl className="kxd-ces-partnership__metrics-grid">
                {results.metrics.map((metric) => (
                  <div key={metric.label}>
                    <dt>{metric.label}</dt>
                    <dd>{metric.value}</dd>
                  </div>
                ))}
              </dl>
            </details>
          ) : null}
          {results.optimizations.length > 0 ? (
            <details className="kxd-ces-partnership__metrics">
              <summary>Recent optimization</summary>
              <ul className="kxd-ces-partnership__opt-list">
                {results.optimizations.map((opt) => (
                  <li key={opt}>{opt}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      ) : null}

      {/* Recommendation */}
      <section
        className="kxd-ces-partnership__section kxd-ces-partnership__recommend"
        aria-labelledby="recommend-heading"
      >
        <p className="kxd-ces-partnership__section-eyebrow">Counsel</p>
        <h2 id="recommend-heading" className="kxd-ces-partnership__heading">
          KXD Recommends
        </h2>
        <p className="kxd-ces-partnership__recommend-headline">{recommendation.headline}</p>
        <p className="kxd-ces-partnership__recommend-rationale">{recommendation.rationale}</p>
        {recommendation.evidenceLabels.length > 0 ? (
          <ul className="kxd-ces-partnership__evidence">
            {recommendation.evidenceLabels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* Looking ahead */}
      <section className="kxd-ces-partnership__section" aria-labelledby="looking-ahead-heading">
        <p className="kxd-ces-partnership__section-eyebrow">Expansion</p>
        <h2 id="looking-ahead-heading" className="kxd-ces-partnership__heading">
          Looking Ahead
        </h2>
        <p className="kxd-ces-partnership__section-lead">
          Capabilities planned for the partnership — labeled honestly, never oversold.
        </p>
        <ul className="kxd-ces-partnership__modules">
          {briefing.futureModules.map((mod) => (
            <li key={mod.id} className="kxd-ces-partnership__module">
              <span className="kxd-ces-partnership__module-label">{mod.label}</span>
              <span
                className={`kxd-ces-partnership__module-status kxd-ces-partnership__module-status--${mod.status}`}
              >
                {mod.statusLabel}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Billing — quiet */}
      <section
        className="kxd-ces-partnership__section kxd-ces-partnership__billing"
        aria-labelledby="billing-heading"
      >
        <p className="kxd-ces-partnership__section-eyebrow">Account</p>
        <h2 id="billing-heading" className="kxd-ces-partnership__heading">
          {briefing.billingPreview.title}
        </h2>
        <p className="kxd-ces-partnership__section-lead">{briefing.billingPreview.lead}</p>
        <ul className="kxd-ces-partnership__billing-caps">
          {briefing.billingPreview.capabilities.map((cap) => (
            <li key={cap}>{cap}</li>
          ))}
        </ul>
        <p className="kxd-ces-partnership__preview-note">{briefing.billingPreview.previewNote}</p>
        {briefing.billingPreview.retainerOnFile ? (
          <p className="kxd-ces-partnership__quiet">An active monthly engagement continues.</p>
        ) : null}
      </section>

      {/* Closing */}
      <footer className="kxd-ces-partnership__close">
        <p>
          Every improvement we build is designed to strengthen the partnership between{" "}
          {briefing.clientName} and Kreate by Design over time.
        </p>
      </footer>
    </div>
  );
}
