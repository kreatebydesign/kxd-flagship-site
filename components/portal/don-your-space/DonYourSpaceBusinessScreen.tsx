import Link from "next/link";
import type { DonYourSpaceBusinessFacts } from "@/lib/portal/don-your-space/facts";
import "./don-your-space.css";

function money(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function DonYourSpaceBusinessScreen({
  business,
  downloadsEnabled,
}: {
  business: DonYourSpaceBusinessFacts;
  downloadsEnabled: boolean;
}) {
  return (
    <div className="kxd-don-space">
      <p className="kxd-don-space__back">
        <Link href="/portal/your-space">← Your Space</Link>
      </p>

      <header className="kxd-don-space__hero">
        <p className="kxd-os-section__label">Your Space</p>
        <h1>{business.name}</h1>
        <p className="kxd-don-space__card-meta">
          Primary contact: {business.primaryContact}
        </p>
      </header>

      <section className="kxd-don-space__detail" aria-labelledby={`${business.slug}-overview`}>
        <p id={`${business.slug}-overview`} className="kxd-don-space__section-label">
          Overview
        </p>
        <p style={{ color: "rgba(255,255,255,0.78)", lineHeight: 1.55, margin: "0 0 0.75rem" }}>
          {business.hosting}
        </p>
        <p className="kxd-don-space__card-amount">
          Reconciled allocation: {money(business.paymentsUsd)}
        </p>
      </section>

      <section className="kxd-don-space__detail" aria-labelledby={`${business.slug}-work`}>
        <p id={`${business.slug}-work`} className="kxd-don-space__section-label">
          Work &amp; results
        </p>
        <p className="kxd-don-space__detail-intro">Work completed</p>
        <ul className="kxd-don-space__list">
          {business.workSummary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="kxd-don-space__detail-intro">Recorded results &amp; evidence</p>
        <ul className="kxd-don-space__list">
          {business.resultsSummary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {business.limitations.length > 0 ? (
          <>
            <p className="kxd-don-space__detail-intro">Known limits</p>
            <ul className="kxd-don-space__list kxd-don-space__list--muted">
              {business.limitations.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <section className="kxd-don-space__detail" aria-labelledby={`${business.slug}-payments`}>
        <p id={`${business.slug}-payments`} className="kxd-don-space__section-label">
          Payments
        </p>
        <p style={{ color: "rgba(255,255,255,0.78)", lineHeight: 1.55, margin: 0 }}>
          {business.paymentsNote}
        </p>
        <p className="kxd-don-space__detail-note">
          Portfolio totals and invoice evidence appear in the final accountability report.
        </p>
      </section>

      <section className="kxd-don-space__detail" aria-labelledby={`${business.slug}-access`}>
        <p id={`${business.slug}-access`} className="kxd-don-space__section-label">
          Access &amp; ownership
        </p>
        <ul className="kxd-don-space__list">
          {business.accessSummary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="kxd-don-space__detail" aria-labelledby={`${business.slug}-docs`}>
        <p id={`${business.slug}-docs`} className="kxd-don-space__section-label">
          Documents
        </p>
        <p style={{ color: "rgba(255,255,255,0.72)", fontSize: "0.95rem", margin: "0 0 0.75rem" }}>
          Full report and supporting records are available from Your Space when the package is complete.
        </p>
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
          ) : (
            <Link className="kxd-don-space__btn kxd-don-space__btn--ghost" href="/portal/your-space">
              View package status
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}