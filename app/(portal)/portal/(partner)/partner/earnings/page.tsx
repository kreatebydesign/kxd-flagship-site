import { redirect } from "next/navigation";
import {
  isLocalQaBusinessName,
  partnerDisplayBusinessName,
} from "@/components/partner/leadPresentation";
import { getPartnerSession } from "@/lib/portal/partner/access";
import {
  loadPartnerCommissionPolicy,
  partnerFacingCommissionExplanations,
} from "@/lib/portal/partner/commission";
import {
  formatPartnerCents,
  loadPartnerEarningsSummary,
} from "@/lib/portal/partner/earnings";

export const dynamic = "force-dynamic";

export default async function PartnerEarningsPage() {
  const session = await getPartnerSession();
  if (!session) redirect("/portal/login");

  const summary = await loadPartnerEarningsSummary(session.partnerId);
  const policy = await loadPartnerCommissionPolicy();
  const explanations = partnerFacingCommissionExplanations(policy);
  const amounts: Record<string, number> = {
    "Project commission": summary.projectCommissionsCents,
    "Recurring bonus": summary.monthlyBonusesCents,
    "Retention kicker": summary.retentionKickersCents,
    "Performance bonus": summary.performanceBonusesCents,
  };
  const path = explanations.map((step) => ({
    ...step,
    amount: amounts[step.title] ?? 0,
  }));

  return (
    <div className="kxd-partner-page">
      <p className="kxd-partner-network">KXD Network</p>
      <h1 className="kxd-partner-title">Earnings</h1>
      <p className="kxd-partner-lead">
        Approved and paid only. Nothing appears here until KXD clears it.
      </p>

      <section className="kxd-partner-paid kxd-partner-paid--hero" aria-label="Paid to date">
        <p className="kxd-partner-paid__label">Paid to date</p>
        <p className="kxd-partner-paid__value">
          {formatPartnerCents(summary.paidToDateCents)}
        </p>
        <p className="kxd-partner-paid__note">
          Approved outstanding {formatPartnerCents(summary.approvedOutstandingCents)}
        </p>
      </section>

      <section className="kxd-partner-section">
        <h2 className="kxd-partner-section__title">How earnings work</h2>
        <ol className="kxd-partner-earn-path">
          {path.map((step, index) => (
            <li key={step.title}>
              <span className="kxd-partner-earn-path__num">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="kxd-partner-earn-path__copy">
                <strong>{step.title}</strong>
                <p>{step.body}</p>
              </div>
              <span className="kxd-partner-earn-path__amount">
                {formatPartnerCents(step.amount)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="kxd-partner-section">
        <h2 className="kxd-partner-section__title">Entries</h2>
        {summary.approvedEntries.length === 0 ? (
          <p className="kxd-partner-empty">
            Nothing approved yet. When a sourced project or retainer pays and KXD
            clears the commission, it lands here.
          </p>
        ) : (
          <div className="kxd-partner-list kxd-partner-list--entries">
            {summary.approvedEntries.map((entry) => {
              const business = partnerDisplayBusinessName(entry.relatedBusinessName);
              return (
                <article key={entry.id} className="kxd-partner-entry">
                  <div className="kxd-partner-entry__main">
                    <h2 className="kxd-partner-entry__title">
                      {business}
                      {isLocalQaBusinessName(entry.relatedBusinessName) ? (
                        <span className="kxd-partner-local-tag">Local QA</span>
                      ) : null}
                    </h2>
                    <p className="kxd-partner-entry__meta">
                      {entry.earningTypeLabel}
                      {entry.relevantMonth ? ` · ${entry.relevantMonth}` : ""}
                      {entry.paidAt
                        ? ` · Paid ${new Date(entry.paidAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}`
                        : ""}
                    </p>
                  </div>
                  <p className="kxd-partner-entry__amount">
                    {formatPartnerCents(entry.amountCents)}
                  </p>
                  <span
                    className={`kxd-partner-pill${
                      entry.paymentStatus === "paid" ? "" : " kxd-partner-pill--muted"
                    }`}
                  >
                    {entry.paymentStatusLabel}
                  </span>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
