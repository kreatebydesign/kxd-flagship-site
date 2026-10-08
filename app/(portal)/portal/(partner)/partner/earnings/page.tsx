import { redirect } from "next/navigation";
import {
  isLocalQaBusinessName,
  partnerDisplayBusinessName,
} from "@/components/partner/leadPresentation";
import { PartnerPaidCountUp } from "@/components/partner/PartnerPaidCountUp";
import { getPartnerSession } from "@/lib/portal/partner/access";
import {
  computePartnerPerformanceBonusProgress,
  partnerFacingBonusProgressSentence,
} from "@/lib/portal/partner/bonus-progress";
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

  const bonusProgress = computePartnerPerformanceBonusProgress(
    summary.approvedEntries,
    policy,
  );
  const bonusSentence = bonusProgress
    ? partnerFacingBonusProgressSentence(bonusProgress, formatPartnerCents)
    : null;

  const paidEntries = summary.approvedEntries.filter(
    (entry) => entry.paymentStatus === "paid",
  );
  const approvedOnly = summary.approvedEntries.filter(
    (entry) => entry.paymentStatus === "approved",
  );

  return (
    <div className="kxd-partner-page">
      <p className="kxd-partner-network">KXD Network · Private access</p>
      <h1 className="kxd-partner-title">Earnings</h1>
      <p className="kxd-partner-lead">
        Approved and paid only. Nothing appears here until KXD clears it.
      </p>

      <section className="kxd-partner-paid kxd-partner-paid--hero" aria-label="Paid to date">
        <p className="kxd-partner-paid__label">Paid to date</p>
        <PartnerPaidCountUp
          partnerId={session.partnerId}
          paidToDateCents={summary.paidToDateCents}
        />
        <p className="kxd-partner-paid__note">
          Approved outstanding {formatPartnerCents(summary.approvedOutstandingCents)}
        </p>
      </section>

      {bonusSentence ? (
        <section
          className="kxd-partner-bonus"
          aria-label="Performance bonus progress"
        >
          <p className="kxd-partner-bonus__copy">{bonusSentence}</p>
        </section>
      ) : null}

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
        <h2 className="kxd-partner-section__title">Paid</h2>
        {paidEntries.length === 0 ? (
          <p className="kxd-partner-empty">
            No paid entries yet. When KXD clears a commission and marks it paid,
            it appears here as a receipt.
          </p>
        ) : (
          <div className="kxd-partner-list kxd-partner-list--receipts">
            {paidEntries.map((entry) => {
              const business = partnerDisplayBusinessName(entry.relatedBusinessName);
              return (
                <article key={entry.id} className="kxd-partner-receipt">
                  <div className="kxd-partner-receipt__main">
                    <h2 className="kxd-partner-receipt__business">
                      {business}
                      {isLocalQaBusinessName(entry.relatedBusinessName) ? (
                        <span className="kxd-partner-local-tag">Local QA</span>
                      ) : null}
                    </h2>
                    <p className="kxd-partner-receipt__type">
                      {entry.earningTypeLabel}
                    </p>
                    <p className="kxd-partner-receipt__date">
                      {entry.paidAt
                        ? new Date(entry.paidAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Paid"}
                    </p>
                  </div>
                  <p className="kxd-partner-receipt__amount">
                    {formatPartnerCents(entry.amountCents)}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {approvedOnly.length > 0 ? (
        <section className="kxd-partner-section">
          <h2 className="kxd-partner-section__title">Approved</h2>
          <div className="kxd-partner-list kxd-partner-list--entries">
            {approvedOnly.map((entry) => {
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
                    </p>
                  </div>
                  <p className="kxd-partner-entry__amount">
                    {formatPartnerCents(entry.amountCents)}
                  </p>
                  <span className="kxd-partner-pill kxd-partner-pill--muted">
                    {entry.paymentStatusLabel}
                  </span>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
