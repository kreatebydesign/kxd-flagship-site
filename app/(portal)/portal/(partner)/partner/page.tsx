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
  const approvedLabel = formatPartnerCents(snapshot.approvedEarningsCents);

  const path = [
    {
      label: "Introduction",
      value: String(snapshot.submittedLeads),
      empty: snapshot.submittedLeads === 0,
    },
    {
      label: "Qualified",
      value: String(snapshot.qualifiedLeads),
      empty: snapshot.qualifiedLeads === 0,
    },
    {
      label: "Discovery",
      value: String(snapshot.bookedCalls),
      empty: snapshot.bookedCalls === 0,
    },
    {
      label: "Client won",
      value: String(snapshot.wonClients),
      empty: snapshot.wonClients === 0,
    },
    {
      label: "Paid",
      value: paidLabel,
      empty: snapshot.paidEarningsCents === 0,
    },
  ];

  return (
    <div className="kxd-partner-page kxd-partner-page--home">
      <div className="kxd-partner-folio">
        <header className="kxd-partner-folio__leaf">
          <p className="kxd-partner-network">KXD Network · Private access</p>
          <h1 className="kxd-partner-arrival__title">Welcome, {firstName}.</h1>
          <p className="kxd-partner-arrival__lead">
            You bring the right introduction. KXD qualifies, discovers, and closes.
          </p>
          <Link className="kxd-partner-btn" href={snapshot.nextAction.href}>
            {snapshot.nextAction.label}
          </Link>
        </header>

        <aside className="kxd-partner-folio__plate" aria-label="Member record">
          <p className="kxd-partner-folio__paid-label">Paid to date</p>
          <p className="kxd-partner-folio__paid">{paidLabel}</p>
          {early ? (
            <p className="kxd-partner-folio__status">
              Nothing is paid until KXD closes work you sourced. Start with a
              qualified introduction.
            </p>
          ) : (
            <p className="kxd-partner-folio__status">Approved {approvedLabel}</p>
          )}

          <div className="kxd-partner-folio__chapter">
            <p className="kxd-partner-folio__chapter-kicker">Next</p>
            <p className="kxd-partner-folio__chapter-name">{snapshot.nextAction.hint}</p>
          </div>

          <ol className="kxd-partner-folio__rest" aria-label="Operating path">
            {path.map((step) => (
              <li key={step.label} className={step.empty ? "is-empty" : undefined}>
                <span>{step.label}</span>
                <span>{step.value}</span>
              </li>
            ))}
          </ol>
        </aside>
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
