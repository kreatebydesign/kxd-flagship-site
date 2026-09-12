import Image from "next/image";
import Link from "next/link";
import type { LeadershipReportDocument } from "@/lib/ces/leadership-report";
import { LeadershipReportPrintButton } from "./LeadershipReportPrintButton";
import "./primal-leadership-report.css";

function Prose({ paragraphs }: { paragraphs: string[] }) {
  return (
    <>
      {paragraphs.map((paragraph) => (
        <p key={paragraph.slice(0, 48)} className="kxd-lead-report__prose">
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

export function PrimalLeadershipReport({
  report,
}: {
  report: LeadershipReportDocument;
}) {
  return (
    <article
      className="kxd-lead-report"
      style={{ ["--kxd-lr-accent" as string]: report.accent }}
    >
      <div className="kxd-lead-report__toolbar">
        <Link href="/portal/partnership" className="kxd-lead-report__back">
          ← Partnership
        </Link>
        <LeadershipReportPrintButton />
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
          <p className="kxd-lead-report__support">{report.supportingLine}</p>
        </div>
      </header>

      <div className="kxd-lead-report__body">
        <section className="kxd-lead-report__section" aria-labelledby="lr-summary">
          <p className="kxd-lead-report__section-label">Overview</p>
          <h2 id="lr-summary" className="kxd-lead-report__heading">
            Executive summary
          </h2>
          <Prose paragraphs={report.executiveSummary} />
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-status">
          <p className="kxd-lead-report__section-label">Status</p>
          <h2 id="lr-status" className="kxd-lead-report__heading">
            Current status
          </h2>
          <div className="kxd-lead-report__scorecard">
            {report.statusItems.map((item) => (
              <div key={item.id} className="kxd-lead-report__score">
                <p className="kxd-lead-report__score-label">{item.label}</p>
                <p className="kxd-lead-report__score-value">{item.statusLabel}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-history">
          <p className="kxd-lead-report__section-label">Context</p>
          <h2 id="lr-history" className="kxd-lead-report__heading">
            Historical baseline note
          </h2>
          <span className="kxd-lead-report__badge">Historical</span>
          <Prose paragraphs={report.historicalBaselineNote} />
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-equity">
          <p className="kxd-lead-report__section-label">Organic search</p>
          <h2 id="lr-equity" className="kxd-lead-report__heading">
            Protecting Primal&apos;s existing search equity
          </h2>
          <Prose paragraphs={report.searchEquityIntro} />
          <div className="kxd-lead-report__panel">
            <p className="kxd-lead-report__panel-title">
              Selected historical primalracing.com positions
            </p>
            <table className="kxd-lead-report__table">
              <thead>
                <tr>
                  <th scope="col">Query</th>
                  <th scope="col">Avg position</th>
                </tr>
              </thead>
              <tbody>
                {report.historicalQueries.map((row) => (
                  <tr key={row.query}>
                    <td>{row.query}</td>
                    <td>{row.positionDisplay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Prose paragraphs={report.searchEquityClose} />
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-organic">
          <p className="kxd-lead-report__section-label">Organic search</p>
          <h2 id="lr-organic" className="kxd-lead-report__heading">
            Current organic search baseline
          </h2>
          <span className="kxd-lead-report__badge kxd-lead-report__badge--baseline">
            {report.organicBaseline.periodLabel}
          </span>
          <div className="kxd-lead-report__metrics">
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">Organic clicks</p>
              <p className="kxd-lead-report__metric-value">
                {report.organicBaseline.clicksDisplay}
              </p>
            </div>
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">Impressions</p>
              <p className="kxd-lead-report__metric-value">
                {report.organicBaseline.impressionsDisplay}
              </p>
            </div>
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">CTR</p>
              <p className="kxd-lead-report__metric-value">
                {report.organicBaseline.ctrDisplay}
              </p>
            </div>
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">Avg position</p>
              <p className="kxd-lead-report__metric-value">
                {report.organicBaseline.averagePositionDisplay}
              </p>
            </div>
          </div>
          <p className="kxd-lead-report__note">{report.organicBaseline.note}</p>
          <div className="kxd-lead-report__split">
            <div className="kxd-lead-report__panel">
              <p className="kxd-lead-report__panel-title">Selected current visibility</p>
              <table className="kxd-lead-report__table">
                <thead>
                  <tr>
                    <th scope="col">Query</th>
                    <th scope="col">Avg position</th>
                  </tr>
                </thead>
                <tbody>
                  {report.organicBaseline.currentQueries.map((row) => (
                    <tr key={row.query}>
                      <td>{row.query}</td>
                      <td>{row.positionDisplay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <p className="kxd-lead-report__prose">
                {report.organicBaseline.visibilityNote}
              </p>
            </div>
          </div>
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-opportunity">
          <p className="kxd-lead-report__section-label">Organic search</p>
          <h2 id="lr-opportunity" className="kxd-lead-report__heading">
            {report.searchOpportunity.title}
          </h2>
          <p className="kxd-lead-report__emphasis">
            “{report.searchOpportunity.query}”
          </p>
          <p className="kxd-lead-report__prose">
            {report.searchOpportunity.recentPositionNote}
          </p>
          <p className="kxd-lead-report__prose">
            {report.searchOpportunity.historicalContext}
          </p>
          <Prose paragraphs={report.searchOpportunity.framing} />
          <p className="kxd-lead-report__note">
            Search Console has also shown meaningful visibility for{" "}
            {report.searchOpportunity.supportingVisibility.join(", ")}.
          </p>
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-ads">
          <p className="kxd-lead-report__section-label">Google Ads</p>
          <h2 id="lr-ads" className="kxd-lead-report__heading">
            Verified 30-day review
          </h2>
          <span className="kxd-lead-report__badge">
            Ads reporting period · {report.googleAds.periodLabel}
          </span>
          <div className="kxd-lead-report__metrics">
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">Spend</p>
              <p className="kxd-lead-report__metric-value">
                {report.googleAds.spendDisplay}
              </p>
            </div>
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">Clicks</p>
              <p className="kxd-lead-report__metric-value">
                {report.googleAds.clicksDisplay}
              </p>
            </div>
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">Impressions</p>
              <p className="kxd-lead-report__metric-value">
                {report.googleAds.impressionsDisplay}
              </p>
            </div>
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">Primary conversions</p>
              <p className="kxd-lead-report__metric-value">
                {report.googleAds.primaryConversionsDisplay}
              </p>
              <p className="kxd-lead-report__metric-note">
                {report.googleAds.primaryBreakdown.join(" · ")}
              </p>
            </div>
          </div>
          <p className="kxd-lead-report__note">{report.googleAds.primaryClarifier}</p>
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-bottom">
          <p className="kxd-lead-report__section-label">Google Ads</p>
          <h2 id="lr-bottom" className="kxd-lead-report__heading">
            {report.bottomFunnel.title}
          </h2>
          <div className="kxd-lead-report__pair">
            <div className="kxd-lead-report__pair-card">
              <h4>August</h4>
              <dl>
                <div>
                  <dt>Conversions</dt>
                  <dd>{report.bottomFunnel.august.conversionsDisplay}</dd>
                </div>
                <div>
                  <dt>Spend</dt>
                  <dd>{report.bottomFunnel.august.spendDisplay}</dd>
                </div>
                <div>
                  <dt>Cost / conversion</dt>
                  <dd>{report.bottomFunnel.august.cpaDisplay}</dd>
                </div>
              </dl>
            </div>
            <div className="kxd-lead-report__pair-card">
              <h4>September through September 10</h4>
              <dl>
                <div>
                  <dt>Conversions</dt>
                  <dd>{report.bottomFunnel.september.conversionsDisplay}</dd>
                </div>
                <div>
                  <dt>Spend</dt>
                  <dd>{report.bottomFunnel.september.spendDisplay}</dd>
                </div>
                <div>
                  <dt>Cost / conversion</dt>
                  <dd>{report.bottomFunnel.september.cpaDisplay}</dd>
                </div>
              </dl>
            </div>
          </div>
          <p className="kxd-lead-report__emphasis">
            {report.bottomFunnel.cpaChangeDisplay}
          </p>
          <p className="kxd-lead-report__prose">{report.bottomFunnel.cpaCaveat}</p>
          <div className="kxd-lead-report__metrics">
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">September Search CTR</p>
              <p className="kxd-lead-report__metric-value">
                {report.bottomFunnel.septemberSearchCtrDisplay}
              </p>
            </div>
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">
                September Search impression share
              </p>
              <p className="kxd-lead-report__metric-value">
                {report.bottomFunnel.septemberImpressionShareDisplay}
              </p>
            </div>
          </div>
          <Prose paragraphs={report.bottomFunnel.notes} />
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-audit">
          <p className="kxd-lead-report__section-label">Google Ads</p>
          <h2 id="lr-audit" className="kxd-lead-report__heading">
            What the Ads audit found
          </h2>
          <Prose paragraphs={report.adsAudit.intro} />
          <div className="kxd-lead-report__panel">
            <p className="kxd-lead-report__panel-title">
              Examples from the audited period
            </p>
            <table className="kxd-lead-report__table">
              <thead>
                <tr>
                  <th scope="col">Keyword</th>
                  <th scope="col">Spend</th>
                  <th scope="col">Conv.</th>
                  <th scope="col">CPA</th>
                </tr>
              </thead>
              <tbody>
                {report.adsAudit.examples.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.matchType} “{row.term}”
                    </td>
                    <td>{row.spendDisplay}</td>
                    <td>{row.conversionsDisplay}</td>
                    <td>{row.cpaDisplay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Prose paragraphs={report.adsAudit.close} />
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-upper">
          <p className="kxd-lead-report__section-label">Google Ads</p>
          <h2 id="lr-upper" className="kxd-lead-report__heading">
            Upper Funnel &amp; Remarketing
          </h2>
          <div className="kxd-lead-report__metrics">
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">Budget</p>
              <p className="kxd-lead-report__metric-value">
                {report.upperFunnel.budgetDisplay}
              </p>
            </div>
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">Audited-period spend</p>
              <p className="kxd-lead-report__metric-value">
                {report.upperFunnel.auditedSpendDisplay}
              </p>
              <p className="kxd-lead-report__metric-note">
                {report.upperFunnel.conversionsDisplay} conversion
              </p>
            </div>
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">September through Sept 10</p>
              <p className="kxd-lead-report__metric-value">
                {report.upperFunnel.septemberSpendDisplay}
              </p>
              <p className="kxd-lead-report__metric-note">
                {report.upperFunnel.septemberConversionsDisplay} conversions
              </p>
            </div>
          </div>
          <Prose paragraphs={report.upperFunnel.notes} />
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-ga4">
          <p className="kxd-lead-report__section-label">Measurement</p>
          <h2 id="lr-ga4" className="kxd-lead-report__heading">
            GA4 / Measurement
          </h2>
          <p className="kxd-lead-report__prose">
            GA4 property {report.measurement.ga4PropertyId} is receiving production
            data.
          </p>
          <span className="kxd-lead-report__badge">
            {report.measurement.snapshotLabel}
          </span>
          <div className="kxd-lead-report__metrics">
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">Active users</p>
              <p className="kxd-lead-report__metric-value">
                {report.measurement.activeUsersDisplay}
              </p>
            </div>
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">New users</p>
              <p className="kxd-lead-report__metric-value">
                {report.measurement.newUsersDisplay}
              </p>
            </div>
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">Events</p>
              <p className="kxd-lead-report__metric-value">
                {report.measurement.eventsDisplay}
              </p>
            </div>
            <div className="kxd-lead-report__metric">
              <p className="kxd-lead-report__metric-label">Key events</p>
              <p className="kxd-lead-report__metric-value">
                {report.measurement.keyEventsDisplay}
              </p>
            </div>
          </div>
          <BulletList
            items={[
              report.measurement.generateLeadNote,
              report.measurement.formStartNote,
              report.measurement.postLaunchLeadNote,
            ]}
          />
          <Prose paragraphs={report.measurement.clarifiers} />
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-fixed">
          <p className="kxd-lead-report__section-label">Post-launch</p>
          <h2 id="lr-fixed" className="kxd-lead-report__heading">
            What we found / what we fixed
          </h2>
          <div className="kxd-lead-report__remediation">
            {report.remediations.map((item) => (
              <div key={item.id} className="kxd-lead-report__remediation-item">
                <div>
                  <p className="kxd-lead-report__remediation-kicker">Found</p>
                  <p className="kxd-lead-report__prose">{item.found}</p>
                </div>
                <div>
                  <p className="kxd-lead-report__remediation-kicker kxd-lead-report__remediation-kicker--fixed">
                    Fixed
                  </p>
                  <p className="kxd-lead-report__prose">{item.fixed}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="kxd-lead-report__final">{report.remediationsClose}</p>
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-platform">
          <p className="kxd-lead-report__section-label">Platform</p>
          <h2 id="lr-platform" className="kxd-lead-report__heading">
            Website / platform completed
          </h2>
          <p className="kxd-lead-report__prose">{report.platformCompleted.intro}</p>
          <BulletList items={report.platformCompleted.items} />
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-next">
          <p className="kxd-lead-report__section-label">Next</p>
          <h2 id="lr-next" className="kxd-lead-report__heading">
            What we&apos;re working on next
          </h2>
          <div className="kxd-lead-report__columns">
            <div className="kxd-lead-report__column">
              <h3>SEO</h3>
              <BulletList items={report.nextWork.seo} />
            </div>
            <div className="kxd-lead-report__column">
              <h3>Google Ads</h3>
              <BulletList items={report.nextWork.ads} />
            </div>
            <div className="kxd-lead-report__column">
              <h3>Conversion</h3>
              <BulletList items={report.nextWork.conversion} />
            </div>
          </div>
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-plan">
          <p className="kxd-lead-report__section-label">Plan</p>
          <h2 id="lr-plan" className="kxd-lead-report__heading">
            30 / 60 / 90 day plan
          </h2>
          <div className="kxd-lead-report__plan">
            {report.plan.map((phase) => (
              <div key={phase.id} className="kxd-lead-report__plan-phase">
                <div>
                  <p className="kxd-lead-report__plan-horizon">{phase.horizon}</p>
                  <p className="kxd-lead-report__plan-title">{phase.title}</p>
                </div>
                <BulletList items={phase.items} />
              </div>
            ))}
          </div>
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-future">
          <p className="kxd-lead-report__section-label">Direction</p>
          <h2 id="lr-future" className="kxd-lead-report__heading">
            Future platform direction
          </h2>
          <Prose paragraphs={report.futureDirection} />
        </section>

        <section className="kxd-lead-report__section" aria-labelledby="lr-commit">
          <p className="kxd-lead-report__section-label">Baseline</p>
          <h2 id="lr-commit" className="kxd-lead-report__heading">
            Measurement commitment
          </h2>
          <span className="kxd-lead-report__badge kxd-lead-report__badge--baseline">
            Post-launch baseline · {report.reportDateLabel}
          </span>
          <Prose paragraphs={report.measurementCommitment} />
        </section>

        <p className="kxd-lead-report__footer">{report.footerNote}</p>
      </div>
    </article>
  );
}
