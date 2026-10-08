import Link from "next/link";
import { redirect } from "next/navigation";
import { PartnerMemberRecord } from "@/components/partner/PartnerMemberRecord";
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
  const approvedLabel = formatPartnerCents(snapshot.approvedEarningsCents);

  return (
    <div className="kxd-partner-page kxd-partner-page--home">
      <div className="kxd-partner-folio">
        <header className="kxd-partner-folio__leaf">
          <p className="kxd-partner-network">KXD Network · Private access</p>
          <span className="kxd-partner-folio__echo" aria-hidden />
          <h1 className="kxd-partner-arrival__title">Welcome, {firstName}.</h1>
          <p className="kxd-partner-arrival__lead">
            You bring the introduction. KXD qualifies, discovers, and closes.
          </p>
          <Link className="kxd-partner-btn" href={snapshot.nextAction.href}>
            {snapshot.nextAction.label}
          </Link>
        </header>

        <PartnerMemberRecord
          partnerId={session.partnerId}
          paidLabel={paidLabel}
          paidEarningsCents={snapshot.paidEarningsCents}
          approvedLabel={approvedLabel}
          early={early}
          nextHint={snapshot.nextAction.hint}
          submittedLeads={snapshot.submittedLeads}
          qualifiedLeads={snapshot.qualifiedLeads}
          bookedCalls={snapshot.bookedCalls}
          wonClients={snapshot.wonClients}
        />
      </div>

      <section className="kxd-partner-brief" aria-labelledby="kxd-standard-heading">
        <div className="kxd-partner-brief__statement">
          <p className="kxd-partner-brief__kicker" id="kxd-standard-heading">
            KXD standard
          </p>
          <p className="kxd-partner-brief__lead">
            Bring a decision-maker, a live moment, and a business that actually
            needs this work. Judgment over volume.
          </p>
        </div>
        <ol className="kxd-partner-brief__criteria">
          <li>
            <span className="kxd-partner-brief__num">01</span>
            A reachable owner or decision-maker
          </li>
          <li>
            <span className="kxd-partner-brief__num">02</span>
            A visible gap between the brand and the digital presence
          </li>
          <li>
            <span className="kxd-partner-brief__num">03</span>
            A clear reason this matters now
          </li>
          <li>
            <span className="kxd-partner-brief__num">04</span>
            Openness to a short discovery with KXD
          </li>
        </ol>
      </section>
    </div>
  );
}
