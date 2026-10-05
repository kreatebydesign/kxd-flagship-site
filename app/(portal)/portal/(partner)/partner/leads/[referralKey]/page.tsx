import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PartnerNoteForm } from "@/components/partner";
import {
  isLocalQaBusinessName,
  partnerDisplayBusinessName,
  partnerLeadNextAction,
} from "@/components/partner/leadPresentation";
import { getPartnerSession } from "@/lib/portal/partner/access";
import { formatPartnerCents } from "@/lib/portal/partner/earnings";
import { getPartnerReferralDetail } from "@/lib/portal/partner/referrals";

export const dynamic = "force-dynamic";

function formatWhen(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default async function PartnerLeadDetailPage({
  params,
}: {
  params: Promise<{ referralKey: string }>;
}) {
  const session = await getPartnerSession();
  if (!session) redirect("/portal/login");

  const { referralKey } = await params;
  const referralId = Number(referralKey);
  if (!Number.isFinite(referralId) || referralId <= 0) notFound();

  const detail = await getPartnerReferralDetail({
    partnerId: session.partnerId,
    referralId,
  });
  if (!detail) notFound();

  const nextCall = detail.bookings.find(
    (b) =>
      b.slotStart &&
      (b.status === "confirmed" || b.status === "scheduled"),
  );
  const next = partnerLeadNextAction(detail.visibilityState);
  const name = partnerDisplayBusinessName(detail.businessName);

  return (
    <div className="kxd-partner-page kxd-partner-page--narrow">
      <p className="kxd-partner-network">KXD Network · Private access</p>
      <h1 className="kxd-partner-title">
        {name}
        {isLocalQaBusinessName(detail.businessName) ? (
          <span className="kxd-partner-local-tag">Local QA</span>
        ) : null}
      </h1>
      <p className="kxd-partner-lead">
        {detail.contactName}
        {detail.industry ? ` · ${detail.industry}` : ""}
      </p>

      <div className="kxd-partner-status-block">
        <span className="kxd-partner-pill">{detail.visibilityLabel}</span>
        <p className="kxd-partner-section__text">{detail.visibilityMeaning}</p>
        <p className="kxd-partner-card__next">
          <strong>{next.label}</strong> — {next.hint}
        </p>
      </div>

      <div className="kxd-partner-actions-inline">
        <Link
          className="kxd-partner-btn"
          href={`/portal/partner/book?referral=${detail.id}`}
        >
          Book KXD in
        </Link>
        <Link className="kxd-partner-btn kxd-partner-btn--ghost" href="/portal/partner/leads">
          Back to introductions
        </Link>
      </div>

      <section className="kxd-partner-section">
        <h2 className="kxd-partner-section__title">Opportunity</h2>
        <dl className="kxd-partner-detail-grid">
          <div className="kxd-partner-detail-item">
            <dt>Contact role</dt>
            <dd>{detail.contactRole || "—"}</dd>
          </div>
          <div className="kxd-partner-detail-item">
            <dt>Decision maker</dt>
            <dd>{detail.decisionMakerConfirmed ? "Confirmed" : "Not confirmed"}</dd>
          </div>
          <div className="kxd-partner-detail-item">
            <dt>Phone</dt>
            <dd>{detail.phone || "—"}</dd>
          </div>
          <div className="kxd-partner-detail-item">
            <dt>Email</dt>
            <dd>{detail.email || "—"}</dd>
          </div>
          <div className="kxd-partner-detail-item">
            <dt>Website</dt>
            <dd>{detail.website || "—"}</dd>
          </div>
          <div className="kxd-partner-detail-item">
            <dt>Social</dt>
            <dd>{detail.instagramSocial || "—"}</dd>
          </div>
        </dl>
        <div className="kxd-partner-journal">
          <div className="kxd-partner-journal__block">
            <p className="kxd-partner-journal__label">What they want more of</p>
            <p className="kxd-partner-journal__body">
              {detail.whatTheyWantMoreOf || "—"}
            </p>
          </div>
          <div className="kxd-partner-journal__block">
            <p className="kxd-partner-journal__label">Visible problem / opportunity</p>
            <p className="kxd-partner-journal__body">
              {detail.visibleProblemOpportunity || "—"}
            </p>
          </div>
          <div className="kxd-partner-journal__block">
            <p className="kxd-partner-journal__label">Why now</p>
            <p className="kxd-partner-journal__body">{detail.whyNow || "—"}</p>
          </div>
        </div>
      </section>

      <section className="kxd-partner-section">
        <h2 className="kxd-partner-section__title">Call status</h2>
        {nextCall?.slotStart ? (
          <div className="kxd-partner-card">
            <p className="kxd-partner-card__title">{nextCall.statusLabel}</p>
            <p className="kxd-partner-card__meta">
              {formatWhen(nextCall.slotStart)}
              {nextCall.timezone ? ` · ${nextCall.timezone}` : ""}
            </p>
          </div>
        ) : (
          <p className="kxd-partner-section__text">
            No discovery call scheduled yet.
            {detail.bestTimeForDiscoveryCall
              ? ` Preferred timing noted: ${detail.bestTimeForDiscoveryCall}`
              : ""}
          </p>
        )}
      </section>

      <section className="kxd-partner-section">
        <h2 className="kxd-partner-section__title">Your notes</h2>
        <p className="kxd-partner-section__text">
          Your follow-up timeline. KXD internal notes never appear here.
        </p>
        {detail.initialPartnerNotes ? (
          <div className="kxd-partner-timeline__item" style={{ marginTop: "1rem" }}>
            <p className="kxd-partner-timeline__meta">
              Submitted with lead · {formatWhen(detail.submittedAt)}
            </p>
            <p className="kxd-partner-timeline__body">{detail.initialPartnerNotes}</p>
          </div>
        ) : null}
        <div className="kxd-partner-timeline">
          {detail.notes.map((note) => (
            <article key={note.id} className="kxd-partner-timeline__item">
              <p className="kxd-partner-timeline__meta">
                {note.actorDisplayName} · {formatWhen(note.createdAt)}
              </p>
              <p className="kxd-partner-timeline__body">{note.body}</p>
            </article>
          ))}
        </div>
        <div style={{ marginTop: "1.25rem" }}>
          <PartnerNoteForm referralId={detail.id} />
        </div>
      </section>

      <section className="kxd-partner-section">
        <h2 className="kxd-partner-section__title">Approved earnings</h2>
        {detail.earnings.length === 0 ? (
          <p className="kxd-partner-section__text">
            No approved earnings for this introduction yet.
          </p>
        ) : (
          <div className="kxd-partner-list">
            {detail.earnings.map((entry) => (
              <article key={entry.id} className="kxd-partner-card">
                <h3 className="kxd-partner-card__title">{entry.earningTypeLabel}</h3>
                <p className="kxd-partner-card__meta">
                  {formatPartnerCents(entry.amountCents)}
                  {entry.relevantMonth ? ` · ${entry.relevantMonth}` : ""}
                  {" · "}
                  {entry.paymentStatusLabel}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
