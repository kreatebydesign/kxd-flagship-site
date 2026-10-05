import Link from "next/link";
import { redirect } from "next/navigation";
import { getPartnerSession } from "@/lib/portal/partner/access";
import { formatPartnerCents } from "@/lib/portal/partner/earnings";
import { loadPartnerHomeSnapshot } from "@/lib/portal/partner/referrals";

export const dynamic = "force-dynamic";

export default async function PartnerHomePage() {
  const session = await getPartnerSession();
  if (!session) redirect("/portal/login");

  const snapshot = await loadPartnerHomeSnapshot(session.partnerId);
  const firstName =
    session.greetingName || session.displayName.split(/\s+/)[0] || "there";
  const early =
    snapshot.submittedLeads === 0 &&
    snapshot.approvedEarningsCents === 0 &&
    snapshot.paidEarningsCents === 0;

  const nextMove = early
    ? {
        label: "Bring an introduction",
        href: "/portal/partner/submit-lead",
        hint: "A real decision-maker, live timing, and a reason this belongs at KXD.",
      }
    : snapshot.nextAction;

  return (
    <div className="kxd-partner-page">
      <header className="kxd-partner-arrival">
        <p className="kxd-partner-network">Private access · KXD Network</p>
        <h1 className="kxd-partner-arrival__title">
          You are inside KXD, {firstName}.
        </h1>
        <p className="kxd-partner-arrival__lead">
          This is invitation-only. The introductions you bring are held to the
          same standard as the work KXD delivers.
        </p>
        <p className="kxd-partner-arrival__expect">
          Access is earned by judgment. Bring the right opportunity. KXD takes
          the close — and the work — at the highest level.
        </p>
        <Link className="kxd-partner-btn" href={nextMove.href}>
          {nextMove.label}
        </Link>
      </header>

      <section className="kxd-partner-section" aria-label="Your next move">
        <h2 className="kxd-partner-section__title">Your next move</h2>
        <div className="kxd-partner-cta">
          <h3 className="kxd-partner-cta__title">{nextMove.label}</h3>
          <p className="kxd-partner-cta__hint">{nextMove.hint}</p>
        </div>
      </section>

      <section className="kxd-partner-section" aria-label="Your position">
        <h2 className="kxd-partner-section__title">Your position</h2>
        {early ? (
          <p className="kxd-partner-empty">
            No record yet. The first right-fit introduction is how this ledger
            begins.
          </p>
        ) : null}
        <ol className="kxd-partner-pipe" aria-label="Operating record">
          <li className={snapshot.submittedLeads === 0 ? "is-empty" : undefined}>
            <span className="kxd-partner-pipe__value">{snapshot.submittedLeads}</span>
            <span className="kxd-partner-pipe__label">Introductions</span>
          </li>
          <li className={snapshot.qualifiedLeads === 0 ? "is-empty" : undefined}>
            <span className="kxd-partner-pipe__value">{snapshot.qualifiedLeads}</span>
            <span className="kxd-partner-pipe__label">Qualified</span>
          </li>
          <li className={snapshot.bookedCalls === 0 ? "is-empty" : undefined}>
            <span className="kxd-partner-pipe__value">{snapshot.bookedCalls}</span>
            <span className="kxd-partner-pipe__label">Discovery booked</span>
          </li>
          <li className={snapshot.wonClients === 0 ? "is-empty" : undefined}>
            <span className="kxd-partner-pipe__value">{snapshot.wonClients}</span>
            <span className="kxd-partner-pipe__label">Clients won</span>
          </li>
        </ol>
      </section>

      <section className="kxd-partner-section" aria-label="What you are building">
        <h2 className="kxd-partner-section__title">What you are building</h2>
        {early ? (
          <p className="kxd-partner-section__text">
            Nothing is approved or paid yet — that is honest. Earnings appear
            only when KXD closes work you sourced. Consistent, high-judgment
            introductions can open larger opportunity inside KXD. This is not
            a job offer. It is a record of contribution.
          </p>
        ) : (
          <div className="kxd-partner-building">
            <div className="kxd-partner-paid">
              <p className="kxd-partner-paid__label">Paid</p>
              <p className="kxd-partner-paid__value">
                {formatPartnerCents(snapshot.paidEarningsCents)}
              </p>
              <p className="kxd-partner-paid__note">
                Approved {formatPartnerCents(snapshot.approvedEarningsCents)}
              </p>
            </div>
            <p className="kxd-partner-section__text">
              {snapshot.submittedLeads} active introduction
              {snapshot.submittedLeads === 1 ? "" : "s"} in motion. Consistent
              results can open larger KXD opportunity — earned, never promised
              as employment.
            </p>
          </div>
        )}
      </section>

      <section className="kxd-partner-section kxd-partner-section--later">
        <h2 className="kxd-partner-section__title">The KXD standard</h2>
        <p className="kxd-partner-section__text kxd-partner-section__text--emphasis">
          Bring people who can decide, moments that are live, and businesses
          that actually need this work. Volume is not the test. Judgment is.
          KXD will do the rest at the level this house is known for.
        </p>
        <ul className="kxd-partner-fit__list">
          <li>A reachable owner or decision-maker</li>
          <li>A visible gap between the brand and the digital presence</li>
          <li>A clear reason this matters now</li>
          <li>Openness to a short discovery with KXD</li>
        </ul>
      </section>
    </div>
  );
}
