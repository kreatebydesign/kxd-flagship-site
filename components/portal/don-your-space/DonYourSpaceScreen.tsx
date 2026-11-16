import Link from "next/link";
import {
  DON_OWNERSHIP_GLOBAL_NOTES,
  DON_PORTFOLIO_FINANCIALS,
  DON_YOUR_SPACE_BUSINESSES,
  DON_YOUR_SPACE_WELCOME,
} from "@/lib/portal/don-your-space/facts";
import "./don-your-space.css";

function money(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function DonYourSpaceScreen({
  downloadsEnabled,
  missingDeliverables,
  showStudioChecklist = false,
}: {
  downloadsEnabled: boolean;
  missingDeliverables: string[];
  showStudioChecklist?: boolean;
}) {
  return (
    <div className="kxd-don-space">
      <header className="kxd-don-space__hero">
        <p className="kxd-os-section__label">Your Space</p>
        <h1>{DON_YOUR_SPACE_WELCOME.greeting}</h1>
        <p>{DON_YOUR_SPACE_WELCOME.lead}</p>
      </header>

      <section className="kxd-don-space__metrics" aria-label="Reconciled payments">
        <article className="kxd-don-space__metric">
          <p className="kxd-don-space__metric-label">Reconciled payments</p>
          <p className="kxd-don-space__metric-value">
            {money(DON_PORTFOLIO_FINANCIALS.grandTotalUsd)}
          </p>
          <p className="kxd-don-space__metric-note">
            {DON_PORTFOLIO_FINANCIALS.disclaimer}
          </p>
        </article>
        <article className="kxd-don-space__metric">
          <p className="kxd-don-space__metric-label">Payment records</p>
          <p className="kxd-don-space__metric-value">
            {DON_PORTFOLIO_FINANCIALS.paymentRecordCount}
          </p>
          <p className="kxd-don-space__metric-note">
            Period: {DON_PORTFOLIO_FINANCIALS.periodLabel}
          </p>
        </article>
        <article className="kxd-don-space__metric">
          <p className="kxd-don-space__metric-label">Businesses</p>
          <p className="kxd-don-space__metric-value">4</p>
          <p className="kxd-don-space__metric-note">Portfolio view on this login</p>
        </article>
      </section>

      <section aria-labelledby="don-businesses">
        <p id="don-businesses" className="kxd-don-space__section-label">
          Your businesses
        </p>
        <div className="kxd-don-space__cards">
          {DON_YOUR_SPACE_BUSINESSES.map((biz) => (
            <article key={biz.slug} className="kxd-don-space__card">
              <h3>
                <Link className="kxd-don-space__card-link" href={`/portal/your-space/${biz.slug}`}>
                  {biz.name}
                </Link>
              </h3>
              <p className="kxd-don-space__card-meta">
                Primary contact: {biz.primaryContact}
              </p>
              <p className="kxd-don-space__card-amount">
                Reconciled allocation: {money(biz.paymentsUsd)}
              </p>
              <ul className="kxd-don-space__list">
                <li>{biz.hosting}</li>
                {biz.accessSummary.slice(0, 2).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p className="kxd-don-space__card-cta">
                <Link href={`/portal/your-space/${biz.slug}`}>View details</Link>
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="don-ownership">
        <p id="don-ownership" className="kxd-don-space__section-label">
          Access &amp; ownership
        </p>
        <ul className="kxd-don-space__list">
          {DON_OWNERSHIP_GLOBAL_NOTES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="don-records">
        <p id="don-records" className="kxd-don-space__section-label">
          Documents &amp; records
        </p>
        {!downloadsEnabled ? (
          <div className="kxd-don-space__notice" role="status">
            <strong>Your report and supporting folder are not posted yet.</strong>
            <p className="kxd-don-space__prose" style={{ marginTop: "0.5rem" }}>
              They will appear here when publishing is complete. Sign in again after that to
              download.
            </p>
            {showStudioChecklist && missingDeliverables.length > 0 ? (
              <p
                className="kxd-don-space__prose"
                style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}
              >
                Studio checklist: {missingDeliverables.join("; ")}.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="kxd-don-space__prose">
            Your final accountability report and supporting records are ready. Use the buttons below
            to view or download. You must stay signed in to your portal session.
          </p>
        )}
        <div className="kxd-don-space__actions">
          {downloadsEnabled ? (
            <>
              <a
                className="kxd-don-space__btn"
                href="/api/portal/don-your-space/download?artifact=report-pdf"
              >
                View report
              </a>
              <a
                className="kxd-don-space__btn kxd-don-space__btn--ghost"
                href="/api/portal/don-your-space/download?artifact=supporting-zip"
              >
                Download supporting records
              </a>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}