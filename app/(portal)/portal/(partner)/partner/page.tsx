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
  const paidLabel = formatPartnerCents(snapshot.paidEarningsCents);

  return (
    <div className="kxd-partner-page kxd-partner-page--home">
      <header className="kxd-partner-arrival">
        <p className="kxd-partner-network">KXD Network · Private access</p>
        <h1 className="kxd-partner-arrival__title">Welcome, {firstName}.</h1>
        <p className="kxd-partner-arrival__lead">
          You bring the right introduction. KXD qualifies, discovers, and closes.
        </p>
        <Link className="kxd-partner-btn" href="/portal/partner/submit-lead">
          {early ? "Bring your first introduction" : "Bring an introduction"}
        </Link>
      </header>

      <section aria-label="Operating path">
        <ol className="kxd-partner-course">
          <li className={snapshot.submittedLeads === 0 ? "is-empty" : undefined}>
            <span className="kxd-partner-course__label">Introduction</span>
            <span className="kxd-partner-course__value">{snapshot.submittedLeads}</span>
            <span className="kxd-partner-course__to" aria-hidden="true">
              →
            </span>
          </li>
          <li className={snapshot.qualifiedLeads === 0 ? "is-empty" : undefined}>
            <span className="kxd-partner-course__label">Qualified</span>
            <span className="kxd-partner-course__value">{snapshot.qualifiedLeads}</span>
            <span className="kxd-partner-course__to" aria-hidden="true">
              →
            </span>
          </li>
          <li className={snapshot.bookedCalls === 0 ? "is-empty" : undefined}>
            <span className="kxd-partner-course__label">Discovery</span>
            <span className="kxd-partner-course__value">{snapshot.bookedCalls}</span>
            <span className="kxd-partner-course__to" aria-hidden="true">
              →
            </span>
          </li>
          <li className={snapshot.wonClients === 0 ? "is-empty" : undefined}>
            <span className="kxd-partner-course__label">Client won</span>
            <span className="kxd-partner-course__value">{snapshot.wonClients}</span>
            <span className="kxd-partner-course__to" aria-hidden="true">
              →
            </span>
          </li>
          <li className={snapshot.paidEarningsCents === 0 ? "is-empty" : undefined}>
            <span className="kxd-partner-course__label">Paid</span>
            <span className="kxd-partner-course__value">{paidLabel}</span>
          </li>
        </ol>
      </section>

      <section className="kxd-partner-honor" aria-label="Earnings">
        <h2 className="kxd-partner-section__title">Earnings</h2>
        {early ? (
          <>
            <p className="kxd-partner-paid__value">{paidLabel}</p>
            <p className="kxd-partner-paid__note">
              Nothing is paid until KXD closes work you sourced. An introduction
              becomes earnings only after qualification, discovery, a won client,
              and KXD approval.
            </p>
          </>
        ) : (
          <div className="kxd-partner-paid">
            <p className="kxd-partner-paid__value">{paidLabel}</p>
            <p className="kxd-partner-paid__note">
              Approved {formatPartnerCents(snapshot.approvedEarningsCents)}
            </p>
          </div>
        )}
      </section>

      <section className="kxd-partner-section kxd-partner-section--later">
        <h2 className="kxd-partner-section__title">KXD standard</h2>
        <p className="kxd-partner-section__text kxd-partner-section__text--emphasis">
          Bring a decision-maker, a live moment, and a business that actually
          needs this work. Judgment over volume.
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
