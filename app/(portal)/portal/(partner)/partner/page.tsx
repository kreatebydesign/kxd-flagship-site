import Link from "next/link";
import { redirect } from "next/navigation";
import { getPartnerSession } from "@/lib/portal/partner/access";
import { formatPartnerCents } from "@/lib/portal/partner/earnings";
import { loadPartnerHomeSnapshot } from "@/lib/portal/partner/referrals";

export const dynamic = "force-dynamic";

const PATH = [
  "Find fit",
  "Open conversation",
  "Submit lead",
  "Book KXD in",
  "Earn",
] as const;

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
        <p className="kxd-partner-eyebrow">Private partner room</p>
        <h1 className="kxd-partner-title">Welcome, {firstName}.</h1>
        <span className="kxd-partner-hairline" aria-hidden="true" />
        <p className="kxd-partner-lead">
          You are here because the introductions you make matter. Find the right
          businesses, open the door, and let KXD take the close.
        </p>
        <p className="kxd-partner-hero__aside">
          This room is yours alone — no client data, no internal notes, no noise.
        </p>

        <div className="kxd-partner-path" aria-label="Your path">
          {PATH.map((step, index) => (
            <span key={step} className="kxd-partner-path__step">
              {index > 0 ? <span className="kxd-partner-path__sep" aria-hidden="true" /> : null}
              <span className="kxd-partner-path__num">{index + 1}</span>
              {step}
            </span>
          ))}
        </div>
      </header>

      <section className="kxd-partner-board" aria-label="Focus">
        <div className="kxd-partner-cta">
          <p className="kxd-partner-cta__label">Your next move</p>
          <h2 className="kxd-partner-cta__title">{snapshot.nextAction.label}</h2>
          <p className="kxd-partner-cta__hint">{snapshot.nextAction.hint}</p>
          <Link
            className="kxd-partner-btn kxd-partner-btn--cta"
            href={snapshot.nextAction.href}
          >
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

      <section className="kxd-partner-section">
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
