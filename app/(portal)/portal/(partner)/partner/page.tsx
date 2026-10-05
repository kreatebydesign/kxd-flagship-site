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

  return (
    <div className="kxd-partner-page">
      <header className="kxd-partner-hero">
        <h1 className="kxd-partner-title">Welcome, {firstName}.</h1>
        <p className="kxd-partner-lead">
          Track your introductions and keep the next opportunity moving.
        </p>
      </header>

      <section className="kxd-partner-board" aria-label="Focus">
        <div className="kxd-partner-cta">
          <h2 className="kxd-partner-cta__title">{snapshot.nextAction.label}</h2>
          <p className="kxd-partner-cta__hint">{snapshot.nextAction.hint}</p>
          <Link className="kxd-partner-btn" href={snapshot.nextAction.href}>
            {snapshot.nextAction.label}
          </Link>
        </div>

        <div className="kxd-partner-paid">
          <p className="kxd-partner-paid__label">Paid earnings</p>
          <p className="kxd-partner-paid__value">
            {formatPartnerCents(snapshot.paidEarningsCents)}
          </p>
          <p className="kxd-partner-paid__note">
            Approved {formatPartnerCents(snapshot.approvedEarningsCents)}
          </p>
        </div>
      </section>

      <section className="kxd-partner-section">
        <h2 className="kxd-partner-section__title">Progress</h2>
        {early ? (
          <p className="kxd-partner-empty">
            Your board starts empty on purpose. The first strong introduction
            changes the picture.
          </p>
        ) : null}
        <ol className="kxd-partner-pipe" aria-label="Pipeline">
          <li className={snapshot.submittedLeads === 0 ? "is-empty" : undefined}>
            <span className="kxd-partner-pipe__value">{snapshot.submittedLeads}</span>
            <span className="kxd-partner-pipe__label">Leads submitted</span>
          </li>
          <li className={snapshot.qualifiedLeads === 0 ? "is-empty" : undefined}>
            <span className="kxd-partner-pipe__value">{snapshot.qualifiedLeads}</span>
            <span className="kxd-partner-pipe__label">Qualified opportunities</span>
          </li>
          <li className={snapshot.bookedCalls === 0 ? "is-empty" : undefined}>
            <span className="kxd-partner-pipe__value">{snapshot.bookedCalls}</span>
            <span className="kxd-partner-pipe__label">Discovery calls booked</span>
          </li>
          <li className={snapshot.wonClients === 0 ? "is-empty" : undefined}>
            <span className="kxd-partner-pipe__value">{snapshot.wonClients}</span>
            <span className="kxd-partner-pipe__label">Won clients</span>
          </li>
        </ol>
      </section>

      <section className="kxd-partner-section kxd-partner-section--later">
        <div className="kxd-partner-fit">
          <h2 className="kxd-partner-section__title">What a strong lead looks like</h2>
          <div className="kxd-partner-fit__grid">
            <p className="kxd-partner-section__text">
              Not every conversation belongs here. Send introductions where the
              business is real, the timing is live, and a decision maker will take
              the call.
            </p>
            <ul className="kxd-partner-fit__list">
              <li>Owner or decision maker is reachable</li>
              <li>Visible gap between the brand and the digital presence</li>
              <li>A clear reason this matters now</li>
              <li>Open to a short discovery with KXD</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
