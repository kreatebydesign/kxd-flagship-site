import Image from "next/image";
import Link from "next/link";
import type { LeadershipProgressReportDocument } from "@/lib/ces/leadership-report";
import { listPrimalLeadershipReports } from "@/lib/ces/leadership-report";
import { LeadershipReportPrintButton } from "./LeadershipReportPrintButton";
import "./primal-leadership-report.css";

function Prose({ paragraphs }: { paragraphs: string[] }) {
  return (
    <>
      {paragraphs.map((paragraph) => (
        <p key={paragraph.slice(0, 64)} className="kxd-lead-report__prose">
          {paragraph}
        </p>
      ))}
    </>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="kxd-lead-report__list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function movementLabel(
  movement: LeadershipProgressReportDocument["organic"]["queries"][number]["movement"],
): string {
  if (movement === "improved") return "Improved";
  if (movement === "declined") return "Declined";
  if (movement === "new") return "New visibility";
  if (movement === "context") return "Context";
  return "Stable";
}

export function PrimalLeadershipProgressReport({
  report,
}: {
  report: LeadershipProgressReportDocument;
}) {
  const archive = listPrimalLeadershipReports();

  return (
    <article
      className="kxd-lead-report kxd-lead-report--progress"
      style={{ ["--kxd-lr-accent" as string]: report.accent }}
    >
      <div className="kxd-lead-report__toolbar">
        <Link href="/portal/partnership" className="kxd-lead-report__back">
          ← Partnership
        </Link>
        <LeadershipReportPrintButton documentTitle={report.printDocumentTitle} />
      </div>

      <header className="kxd-lead-report__cover">
        <div className="kxd-lead-report__cover-media" aria-hidden="true">
          <Image
            src={report.heroImageSrc}
            alt=""
            fill
            priority
            sizes="(max-width: 960px) 100vw, 58rem"
          />
        </div>
        <div className="kxd-lead-report__cover-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={report.logoSrc}
            alt={report.logoAlt}
            className="kxd-lead-report__logo"
          />
          <p className="kxd-lead-report__eyebrow">Leadership briefing</p>
          <div className="kxd-lead-report__rule" aria-hidden="true" />
          <p className="kxd-lead-report__client">{report.subtitle}</p>
          <h1 className="kxd-lead-report__title">{report.title}</h1>
          <p className="kxd-lead-report__period">{report.periodLabel}</p>
          <p className="kxd-lead-report__data-through">{report.dataThroughLabel}</p>
          <p className="kxd-lead-report__support">{report.supportingLine}</p>
        </div>
      </header>

      <div className="kxd-lead-report__body">
        <section
          className="kxd-lead-report__section kxd-lead-report__section--hero-callout"
          aria-labelledby="lr-hero-callout"
        >
          <p className="kxd-lead-report__section-label">
            {report.heroCallout.eyebrow}
          </p>
          <h2 id="lr-hero-callout" className="kxd-lead-report__heading">
            Executive summary
          </h2>
          <div className="kxd-lead-report__hero-callout">
            <p className="kxd-lead-report__hero-callout-query">
              “{report.heroCallout.query}”
            </p>
            <div className="kxd-lead-report__hero-callout-move" aria-label="Average position movement">
              <span className="kxd-lead-report__hero-callout-from">
                {report.heroCallout.previousDisplay}
              </span>
              <span className="kxd-lead-report__hero-callout-arrow" aria-hidden="true">
                →
              </span>
              <span className="kxd-lead-report__hero-callout-to">
                {report.heroCallout.currentDisplay}
              </span>
            </div>
            <p className="kxd-lead-report__hero-callout-caption">
              Average position · matched Search Console periods
            </p>
          </div>
          <Prose paragraphs={report.heroCallout.body} />
          <Prose paragraphs={report.executiveSummary} />
          <div className="kxd-lead-report__work-highlights">
            <p className="kxd-lead-report__panel-title">
              Work completed since the previous leadership review
            </p>
            <div className="kxd-lead-report__work-highlights-grid">
              {report.workHighlights.map((item) => (
                <div key={item.id} className="kxd-lead-report__work-highlight">
                  <p className="kxd-lead-report__work-highlight-label">{item.label}</p>
                  <p className="kxd-lead-report__work-highlight-detail">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="kxd-lead-report__note">{report.heroCallout.caveat}</p>
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-scorecard">
          <p className="kxd-lead-report__section-label">02</p>
          <h2 id="lr-scorecard" className="kxd-lead-report__heading">
            Since our September leadership review
          </h2>
          <Prose paragraphs={report.scorecardIntro} />
          <div className="kxd-lead-report__scorecard kxd-lead-report__scorecard--progress">
            {report.scorecard.map((item) => (
              <div key={item.id} className="kxd-lead-report__score">
                <p className="kxd-lead-report__score-label">{item.label}</p>
                <p className="kxd-lead-report__score-value">{item.value}</p>
                <p className="kxd-lead-report__metric-note">{item.periodLabel}</p>
                {item.note ? (
                  <p className="kxd-lead-report__metric-note">{item.note}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-organic">
          <p className="kxd-lead-report__section-label">03</p>
          <h2 id="lr-organic" className="kxd-lead-report__heading">
            Organic search movement
          </h2>
          <Prose paragraphs={report.organic.methodology} />
          <div className="kxd-lead-report__pair">
            <div className="kxd-lead-report__pair-card">
              <h4>Previous · {report.organic.previousPeriodLabel}</h4>
              <dl>
                <div>
                  <dt>Clicks</dt>
                  <dd>{report.organic.previous.clicksDisplay}</dd>
                </div>
                <div>
                  <dt>Impressions</dt>
                  <dd>{report.organic.previous.impressionsDisplay}</dd>
                </div>
                <div>
                  <dt>CTR</dt>
                  <dd>{report.organic.previous.ctrDisplay}</dd>
                </div>
              </dl>
            </div>
            <div className="kxd-lead-report__pair-card">
              <h4>Current · {report.organic.currentPeriodLabel}</h4>
              <dl>
                <div>
                  <dt>Clicks</dt>
                  <dd>{report.organic.current.clicksDisplay}</dd>
                </div>
                <div>
                  <dt>Impressions</dt>
                  <dd>{report.organic.current.impressionsDisplay}</dd>
                </div>
                <div>
                  <dt>CTR</dt>
                  <dd>{report.organic.current.ctrDisplay}</dd>
                </div>
              </dl>
            </div>
          </div>
          <Prose paragraphs={report.organic.volumeNote} />
          <div className="kxd-lead-report__panel">
            <p className="kxd-lead-report__panel-title">
              Selected query average positions
            </p>
            <table className="kxd-lead-report__table">
              <thead>
                <tr>
                  <th scope="col">Query</th>
                  <th scope="col">Previous</th>
                  <th scope="col">Current</th>
                  <th scope="col">Reading</th>
                </tr>
              </thead>
              <tbody>
                {report.organic.queries.map((row) => (
                  <tr
                    key={row.query}
                    className={
                      row.query === report.heroCallout.query
                        ? "kxd-lead-report__row--emphasis"
                        : undefined
                    }
                  >
                    <td>{row.query}</td>
                    <td>{row.previousDisplay}</td>
                    <td>{row.currentDisplay}</td>
                    <td>
                      {movementLabel(row.movement)}
                      {row.note ? ` · ${row.note}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Prose paragraphs={report.organic.closing} />
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-local">
          <p className="kxd-lead-report__section-label">04</p>
          <h2 id="lr-local" className="kxd-lead-report__heading">
            Atlanta / local Google visibility
          </h2>
          <Prose paragraphs={report.localVisibility.intro} />
          <span className="kxd-lead-report__badge">
            {report.localVisibility.gbpPeriodLabel}
          </span>
          <div className="kxd-lead-report__metrics">
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">Business Profile views</p>
              <p className="kxd-lead-report__metric-value">
                {report.localVisibility.metrics.viewsDisplay}
              </p>
            </div>
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">Searches that showed profile</p>
              <p className="kxd-lead-report__metric-value">
                {report.localVisibility.metrics.searchesDisplay}
              </p>
            </div>
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">Interactions</p>
              <p className="kxd-lead-report__metric-value">
                {report.localVisibility.metrics.interactionsDisplay}
              </p>
            </div>
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">Website clicks</p>
              <p className="kxd-lead-report__metric-value">
                {report.localVisibility.metrics.websiteClicksDisplay}
              </p>
            </div>
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">Calls</p>
              <p className="kxd-lead-report__metric-value">
                {report.localVisibility.metrics.callsDisplay}
              </p>
            </div>
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">Public profile</p>
              <p className="kxd-lead-report__metric-value">
                {report.localVisibility.metrics.ratingDisplay} /{" "}
                {report.localVisibility.metrics.reviewsDisplay} reviews
              </p>
            </div>
          </div>
          <div className="kxd-lead-report__split">
            <div className="kxd-lead-report__panel">
              <p className="kxd-lead-report__panel-title">
                Top search terms shown in GBP performance
              </p>
              <table className="kxd-lead-report__table">
                <thead>
                  <tr>
                    <th scope="col">Term</th>
                    <th scope="col">Appearances</th>
                  </tr>
                </thead>
                <tbody>
                  {report.localVisibility.searchTerms.map((row) => (
                    <tr key={row.term}>
                      <td>{row.term}</td>
                      <td>{row.appearancesDisplay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="kxd-lead-report__panel">
              <p className="kxd-lead-report__panel-title">Profile views by surface</p>
              <table className="kxd-lead-report__table">
                <thead>
                  <tr>
                    <th scope="col">Channel</th>
                    <th scope="col">Views</th>
                    <th scope="col">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {report.localVisibility.devices.map((row) => (
                    <tr key={row.channel}>
                      <td>{row.channel}</td>
                      <td>{row.viewsDisplay}</td>
                      <td>{row.shareDisplay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Prose paragraphs={report.localVisibility.closing} />
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-ads">
          <p className="kxd-lead-report__section-label">05</p>
          <h2 id="lr-ads" className="kxd-lead-report__heading">
            Google Ads
          </h2>
          <span className="kxd-lead-report__badge">
            {report.googleAds.performancePeriodLabel}
          </span>
          <div className="kxd-lead-report__metrics">
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">Spend</p>
              <p className="kxd-lead-report__metric-value">
                {report.googleAds.spendDisplay}
              </p>
            </div>
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">Conversions</p>
              <p className="kxd-lead-report__metric-value">
                {report.googleAds.conversionsDisplay}
              </p>
            </div>
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">Approx. CPA</p>
              <p className="kxd-lead-report__metric-value">
                {report.googleAds.cpaDisplay}
              </p>
            </div>
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">Current daily budget</p>
              <p className="kxd-lead-report__metric-value">
                {report.googleAds.dailyBudgetDisplay}
              </p>
            </div>
          </div>
          <p className="kxd-lead-report__panel-title">Conversion distribution</p>
          <BulletList items={report.googleAds.conversionDistribution} />
          <div className="kxd-lead-report__columns">
            <div className="kxd-lead-report__column">
              <h3>Performance</h3>
              <BulletList items={report.googleAds.performanceNotes} />
            </div>
            <div className="kxd-lead-report__column">
              <h3>Measurement confidence</h3>
              <BulletList items={report.googleAds.measurementNotes} />
            </div>
            <div className="kxd-lead-report__column">
              <h3>Optimization work</h3>
              <BulletList items={report.googleAds.optimizationNotes} />
            </div>
          </div>
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-cro">
          <p className="kxd-lead-report__section-label">06</p>
          <h2 id="lr-cro" className="kxd-lead-report__heading">
            Conversion optimization
          </h2>
          <Prose paragraphs={report.conversionOptimization.intro} />
          <div className="kxd-lead-report__metrics">
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">
                {report.conversionOptimization.availabilityLabel}
              </p>
              <p className="kxd-lead-report__metric-value">
                {report.conversionOptimization.availabilityValue}
              </p>
            </div>
          </div>
          <p className="kxd-lead-report__panel-title">Permanent fix</p>
          <BulletList items={report.conversionOptimization.completed} />
          <p className="kxd-lead-report__panel-title">Production verification</p>
          <BulletList items={report.conversionOptimization.verification} />
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-work">
          <p className="kxd-lead-report__section-label">07</p>
          <h2 id="lr-work" className="kxd-lead-report__heading">
            Work completed since last leadership review
          </h2>
          <BulletList items={report.workCompleted} />
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-data">
          <p className="kxd-lead-report__section-label">08</p>
          <h2 id="lr-data" className="kxd-lead-report__heading">
            What the data says now
          </h2>
          <div className="kxd-lead-report__columns">
            <div className="kxd-lead-report__column">
              <h3>Strong</h3>
              <BulletList items={report.interpretation.strong} />
            </div>
            <div className="kxd-lead-report__column">
              <h3>Still improving</h3>
              <BulletList items={report.interpretation.stillImproving} />
            </div>
          </div>
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-next">
          <p className="kxd-lead-report__section-label">09</p>
          <h2 id="lr-next" className="kxd-lead-report__heading">
            Next 30 days
          </h2>
          <BulletList items={report.nextThirtyDays} />
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-commit">
          <p className="kxd-lead-report__section-label">10</p>
          <h2 id="lr-commit" className="kxd-lead-report__heading">
            Measurement commitment
          </h2>
          <Prose paragraphs={report.measurementCommitment} />
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-archive">
          <p className="kxd-lead-report__section-label">Archive</p>
          <h2 id="lr-archive" className="kxd-lead-report__heading">
            Leadership reports on file
          </h2>
          <ul className="kxd-lead-report__list">
            {archive.map((entry) => {
              const periodIncludesType = entry.archivePeriodLabel
                .toLowerCase()
                .includes(entry.archiveTypeLabel.toLowerCase());
              return (
                <li key={entry.id}>
                  <Link href={entry.href} className="kxd-lead-report__archive-link">
                    {entry.archivePeriodLabel}
                  </Link>
                  {periodIncludesType ? null : (
                    <>
                      {" — "}
                      {entry.archiveTypeLabel}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <p className="kxd-lead-report__footer">{report.footerNote}</p>
      </div>
    </article>
  );
}
