import Link from "next/link";
import { redirect } from "next/navigation";
import {
  isLocalQaBusinessName,
  partnerDisplayBusinessName,
  partnerLeadNextAction,
} from "@/components/partner/leadPresentation";
import { getPartnerSession } from "@/lib/portal/partner/access";
import { listPartnerReferrals } from "@/lib/portal/partner/referrals";

export const dynamic = "force-dynamic";

function formatWhen(value: string | null): string | null {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default async function PartnerLeadsPage() {
  const session = await getPartnerSession();
  if (!session) redirect("/portal/login");

  const leads = await listPartnerReferrals(session.partnerId);

  return (
    <div className="kxd-partner-page">
      <p className="kxd-partner-network">KXD Network · Private access</p>
      <h1 className="kxd-partner-title">Introductions</h1>
      <p className="kxd-partner-lead">
        Your introductions, as they stand. Open one to add a note or book discovery.
      </p>

      {leads.length === 0 ? (
        <div className="kxd-partner-empty-path">
          <p className="kxd-partner-empty">
            No introductions yet. When a conversation is real, submit it here.
          </p>
          <Link className="kxd-partner-btn" href="/portal/partner/submit-lead">
            Submit an introduction
          </Link>
        </div>
      ) : (
        <div className="kxd-partner-list">
          {leads.map((lead) => {
            const next = partnerLeadNextAction(lead.visibilityState);
            const name = partnerDisplayBusinessName(lead.businessName);
            return (
              <article key={lead.id} className="kxd-partner-card">
                <Link
                  href={`/portal/partner/leads/${lead.id}`}
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  <h2 className="kxd-partner-card__title">
                    {name}
                    {isLocalQaBusinessName(lead.businessName) ? (
                      <span className="kxd-partner-local-tag">Local QA</span>
                    ) : null}
                  </h2>
                  <p className="kxd-partner-card__meta">
                    {lead.contactName}
                    {lead.industry ? ` · ${lead.industry}` : ""}
                    {lead.submittedAt
                      ? ` · ${new Date(lead.submittedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}`
                      : ""}
                  </p>
                </Link>
                <div className="kxd-partner-card__row">
                  <span className="kxd-partner-pill">{lead.visibilityLabel}</span>
                  {lead.nextCallAt ? (
                    <span className="kxd-partner-card__meta">
                      Next call · {formatWhen(lead.nextCallAt)}
                    </span>
                  ) : null}
                </div>
                <p className="kxd-partner-card__next">
                  <strong>{next.label}</strong>
                  {" — "}
                  {next.hint}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
