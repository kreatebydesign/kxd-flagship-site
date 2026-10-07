"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { KxdLogo } from "@/components/ui/KxdLogo";
import {
  PARTNER_EARNING_TYPE_LABELS,
  PARTNER_VISIBILITY_LABELS,
  PARTNER_VISIBILITY_STATES,
  type PartnerEarningType,
  type PartnerVisibilityState,
} from "@/lib/portal/partner/types";
import type {
  NetworkCommandAction,
  NetworkCommandPartnerRecord,
  NetworkCommandWorkspace,
} from "@/lib/portal/partner/network-command";

type PolicyState = {
  projectRateBps: number;
  monthlyRateBps: number;
  monthlyBonusMonths: number;
  retentionKickerEnabled: boolean;
  retentionKickerRateBps: number;
  retentionKickerMonth: number;
  performanceBonusAmountCents: number;
  performanceBonusProjectCount: number;
  performanceBonusWindowDays: number;
  eligibleRecurringServices: string;
};

function formatCents(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(dollars);
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ms));
}

function formatRateBps(bps: number): string {
  if (!Number.isFinite(bps) || bps < 0) return "0%";
  const percent = bps / 100;
  return Number.isInteger(percent) ? `${percent}%` : `${percent.toFixed(1)}%`;
}

function policySentence(policy: PolicyState): string {
  const months = policy.monthlyBonusMonths;
  const monthSpan = months <= 1 ? "month 1" : `months 1–${months}`;
  const parts = [
    `${formatRateBps(policy.projectRateBps)} project commission`,
    `${formatRateBps(policy.monthlyRateBps)} recurring for ${monthSpan}`,
  ];
  if (policy.retentionKickerEnabled) {
    parts.push(`month-${policy.retentionKickerMonth} retention kicker`);
  }
  parts.push(`${formatCents(policy.performanceBonusAmountCents)} performance bonus`);
  return `${parts.join(" · ")}.`;
}

function earningTypeLabel(value: string): string {
  if (value in PARTNER_EARNING_TYPE_LABELS) {
    return PARTNER_EARNING_TYPE_LABELS[value as PartnerEarningType];
  }
  return value.replaceAll("_", " ");
}

function paymentStatusLabel(value: string): string {
  if (value === "pending_approval") return "Pending review";
  if (value === "approved") return "Approved";
  if (value === "paid") return "Paid";
  if (value === "void") return "Void";
  return value.replaceAll("_", " ");
}

function visibilityLabel(state: string): string {
  if (state in PARTNER_VISIBILITY_LABELS) {
    return PARTNER_VISIBILITY_LABELS[state as PartnerVisibilityState];
  }
  return state.replaceAll("_", " ");
}

function bookingModeLabel(mode: string): string {
  if (mode === "calendar_slot") return "Live slot";
  if (mode === "request") return "Request";
  return mode.replaceAll("_", " ");
}

function bookingStatusLabel(status: string): string {
  if (status === "confirmed" || status === "scheduled") return "Confirmed";
  if (status === "reschedule_requested") return "Reschedule requested";
  if (status === "cancel_requested") return "Cancel requested";
  if (status === "closed") return "Closed";
  if (status === "submitted") return "Submitted";
  return status.replaceAll("_", " ");
}

function centsReading(raw: string): string | null {
  if (!raw.trim()) return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount)) return null;
  return formatCents(amount);
}

function signalLabel(signal: NetworkCommandPartnerRecord["signal"]): string {
  if (signal === "onboarding") return "Onboarding";
  if (signal === "building_momentum") return "Building momentum";
  if (signal === "needs_review") return "Needs review";
  return "Quiet";
}

function rateText(rate: NetworkCommandPartnerRecord["qualifiedRate"]): string | null {
  if (rate.percent == null) return null;
  return `${rate.percent}%`;
}

function currentPathKey(partner: NetworkCommandPartnerRecord): string {
  if (partner.submittedLeads === 0) return "introductions";
  if (partner.qualifiedLeads === 0) return "qualified";
  if (partner.bookedCalls === 0) return "discovery";
  if (partner.wonClients === 0) return "won";
  if (partner.paidEarningsCents === 0) return "paid";
  return "paid";
}

function decisionHref(action: NetworkCommandAction): string | null {
  if (action.kind === "sales_follow_up" && action.salesLeadId) {
    return `/admin/sales?focus=${action.salesLeadId}`;
  }
  if (action.kind === "won_mismatch" && action.salesLeadId) {
    return `/admin/sales?focus=${action.salesLeadId}`;
  }
  if (action.partnerId) {
    return `/admin/sales/partners?partner=${action.partnerId}`;
  }
  return null;
}

export function NetworkCommandDesk({
  workspace,
  selectedPartnerId,
  policy,
  calendar,
}: {
  workspace: NetworkCommandWorkspace;
  selectedPartnerId: number | null;
  policy: PolicyState;
  calendar: {
    configured: boolean;
    connected: boolean;
    writeEnabled: boolean;
    missingEnv: string[];
  };
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [policyState, setPolicyState] = useState(policy);
  const [earningForm, setEarningForm] = useState({
    partnerId: selectedPartnerId ? String(selectedPartnerId) : "",
    relatedBusinessName: "",
    relatedPartnerReferralId: "",
    amountCents: "",
    earningType: "project_commission",
    rateBps: "1000",
    eligibleCollectedCents: "",
  });
  const [ledgerSelectionId, setLedgerSelectionId] = useState(selectedPartnerId);
  const [inviteForm, setInviteForm] = useState({
    displayName: "",
    email: "",
    personalNote: "",
  });
  const [inviteBusy, setInviteBusy] = useState(false);
  const [oneTimeLink, setOneTimeLink] = useState<string | null>(null);

  if (ledgerSelectionId !== selectedPartnerId) {
    setLedgerSelectionId(selectedPartnerId);
    setEarningForm((current) => ({
      ...current,
      partnerId: selectedPartnerId ? String(selectedPartnerId) : "",
      relatedPartnerReferralId: "",
    }));
  }

  const partners = useMemo(
    () => [
      ...workspace.activePartners,
      ...workspace.invitedPartners,
      ...workspace.inactivePartners,
    ],
    [workspace],
  );

  const selected = useMemo(() => {
    if (selectedPartnerId) {
      return partners.find((row) => row.id === selectedPartnerId) ?? null;
    }
    return (
      partners.find((row) => row.id === workspace.networkDecision.partnerId) ??
      workspace.activePartners[0] ??
      null
    );
  }, [partners, selectedPartnerId, workspace]);

  const ledgerPartner =
    partners.find((row) => String(row.id) === earningForm.partnerId) ?? null;
  const ledgerIntroductions = ledgerPartner?.referrals ?? [];

  const decision = workspace.networkDecision;

  async function updateVisibility(referralId: number, visibilityState: string) {
    setMessage(null);
    const res = await fetch("/api/admin/partner/referrals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralId, visibilityState }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      setMessage(data.error || "Update failed.");
      return;
    }
    setMessage("Visibility updated.");
    router.refresh();
  }

  async function savePolicy() {
    setMessage(null);
    const res = await fetch("/api/admin/partner/policy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(policyState),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    setMessage(!res.ok || !data.ok ? data.error || "Policy save failed." : "Policy saved.");
    if (res.ok && data.ok) router.refresh();
  }

  async function createEarning() {
    setMessage(null);
    const res = await fetch("/api/admin/partner/earnings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerId: Number(earningForm.partnerId),
        relatedBusinessName: earningForm.relatedBusinessName,
        relatedPartnerReferralId: earningForm.relatedPartnerReferralId
          ? Number(earningForm.relatedPartnerReferralId)
          : undefined,
        amountCents: Number(earningForm.amountCents),
        earningType: earningForm.earningType,
        rateBps: Number(earningForm.rateBps),
        eligibleCollectedCents: earningForm.eligibleCollectedCents
          ? Number(earningForm.eligibleCollectedCents)
          : undefined,
      }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; id?: number };
    if (!res.ok || !data.ok || !data.id) {
      setMessage(data.error || "Earning create failed.");
      return;
    }
    setMessage("Ledger entry created. Pending review.");
    router.refresh();
  }

  async function invitePartner() {
    setMessage(null);
    setOneTimeLink(null);
    setInviteBusy(true);
    try {
      const res = await fetch("/api/admin/partner/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        emailSent?: boolean;
        oneTimeActivateUrl?: string | null;
        invitation?: { partnerProfileId?: number };
      };
      if (!res.ok || !data.ok) {
        setMessage(data.error || "Invitation failed.");
        return;
      }
      setInviteForm({ displayName: "", email: "", personalNote: "" });
      if (data.oneTimeActivateUrl) {
        setOneTimeLink(data.oneTimeActivateUrl);
        setMessage(
          "Invitation created. Email was not delivered — copy this one-time link now. It will not be shown again.",
        );
      } else {
        setMessage(
          data.emailSent
            ? "Invitation sent."
            : "Invitation created.",
        );
      }
      if (data.invitation?.partnerProfileId) {
        router.push(
          `/admin/sales/partners?partner=${data.invitation.partnerProfileId}`,
        );
      }
      router.refresh();
    } finally {
      setInviteBusy(false);
    }
  }

  async function resendInvitation(invitationId: number) {
    setMessage(null);
    setOneTimeLink(null);
    const res = await fetch(
      `/api/admin/partner/invitations/${invitationId}/resend`,
      { method: "POST" },
    );
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      emailSent?: boolean;
      oneTimeActivateUrl?: string | null;
    };
    if (!res.ok || !data.ok) {
      setMessage(data.error || "Resend failed.");
      return;
    }
    if (data.oneTimeActivateUrl) {
      setOneTimeLink(data.oneTimeActivateUrl);
      setMessage(
        "Invitation resent. Email was not delivered — copy this one-time link now. It will not be shown again.",
      );
    } else {
      setMessage(data.emailSent ? "Invitation resent." : "Invitation updated.");
    }
    router.refresh();
  }

  async function revokeInvitation(invitationId: number) {
    setMessage(null);
    setOneTimeLink(null);
    const res = await fetch(
      `/api/admin/partner/invitations/${invitationId}/revoke`,
      { method: "POST" },
    );
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      setMessage(data.error || "Revoke failed.");
      return;
    }
    setMessage("Invitation revoked.");
    router.refresh();
  }

  async function transitionEarning(
    earningId: number,
    status: "approved" | "paid" | "void",
  ) {
    setMessage(null);
    const res = await fetch("/api/admin/partner/earnings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ earningId, status }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      setMessage(data.error || "Earning update failed.");
      return;
    }
    setMessage(`Ledger entry marked ${paymentStatusLabel(status).toLowerCase()}.`);
    router.refresh();
  }

  const primaryHref = decisionHref(decision);
  const pathKey = selected ? currentPathKey(selected) : "";

  return (
    <div className="kxd-nc">
      <div className="kxd-nc__frame">
        <header className="kxd-nc__mast">
          <div className="kxd-nc__brand">
            <KxdLogo
              disableLink
              width={26}
              height={24}
              imageClassName=""
            />
            <div>
              <p className="kxd-nc__kicker">Owner</p>
              <h1 className="kxd-nc__title">Network</h1>
            </div>
          </div>
          <Link href="/admin/sales" className="kxd-nc__crumb">
            Sales
          </Link>
        </header>

        {message ? <p className="kxd-nc__notice">{message}</p> : null}
        {oneTimeLink ? (
          <div className="kxd-nc__notice" role="status">
            <p style={{ margin: "0 0 0.5rem" }}>One-time activate link (copy now):</p>
            <code
              style={{
                display: "block",
                wordBreak: "break-all",
                fontSize: "0.8125rem",
              }}
            >
              {oneTimeLink}
            </code>
            <button
              type="button"
              className="kxd-nc__btn kxd-nc__btn--ghost"
              style={{ marginTop: "0.75rem" }}
              onClick={() => {
                void navigator.clipboard?.writeText(oneTimeLink);
                setMessage("Link copied. It will not be shown after you leave this page.");
              }}
            >
              Copy link
            </button>
          </div>
        ) : null}

        <section className="kxd-nc__invite" aria-label="Invite partner">
          <p className="kxd-nc__roster-label">Invite partner</p>
          <div className="kxd-nc__invite-grid">
            <label>
              <span>Display name</span>
              <input
                value={inviteForm.displayName}
                onChange={(e) =>
                  setInviteForm((current) => ({
                    ...current,
                    displayName: e.target.value,
                  }))
                }
                autoComplete="off"
              />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) =>
                  setInviteForm((current) => ({
                    ...current,
                    email: e.target.value,
                  }))
                }
                autoComplete="off"
              />
            </label>
            <label className="kxd-nc__invite-note">
              <span>Personal note (optional)</span>
              <textarea
                rows={2}
                value={inviteForm.personalNote}
                onChange={(e) =>
                  setInviteForm((current) => ({
                    ...current,
                    personalNote: e.target.value,
                  }))
                }
              />
            </label>
          </div>
          <button
            type="button"
            className="kxd-nc__btn"
            disabled={
              inviteBusy ||
              !inviteForm.displayName.trim() ||
              !inviteForm.email.trim()
            }
            onClick={() => void invitePartner()}
          >
            {inviteBusy ? "Sending…" : "Invite partner"}
          </button>
        </section>

        <section className="kxd-nc__decision">
          <p className="kxd-nc__decision-kicker">Decision</p>
          <h2 className="kxd-nc__decision-title">{decision.label}</h2>
          <p className="kxd-nc__decision-body">{decision.explanation}</p>
          {decision.kind === "approve_earning" && decision.earningId ? (
            <button
              type="button"
              className="kxd-nc__btn"
              onClick={() => transitionEarning(decision.earningId!, "approved")}
            >
              Approve earning
            </button>
          ) : primaryHref && decision.kind !== "none" ? (
            <Link href={primaryHref} className="kxd-nc__btn">
              {decision.kind === "sales_follow_up" || decision.kind === "won_mismatch"
                ? "Open in Sales"
                : "Open the record"}
            </Link>
          ) : null}
        </section>

        <div className="kxd-nc__spread">
          <aside className="kxd-nc__roster">
            <p className="kxd-nc__roster-label">Active</p>
            {workspace.activePartners.length === 0 ? (
              <p className="kxd-nc__empty">No active partners yet.</p>
            ) : (
              <ul className="kxd-nc__roster-list">
                {workspace.activePartners.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={`/admin/sales/partners?partner=${row.id}`}
                      className={selected?.id === row.id ? "is-current" : undefined}
                    >
                      <span className="kxd-nc__roster-name">{row.displayName}</span>
                      <span className="kxd-nc__roster-meta">
                        {signalLabel(row.signal)}
                        {row.lastActivity
                          ? ` · ${row.lastActivity.label}`
                          : " · No activity yet"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {workspace.invitedPartners.length > 0 ? (
              <div className="kxd-nc__inactive">
                <p className="kxd-nc__roster-label">Invitations</p>
                <ul className="kxd-nc__roster-list">
                  {workspace.invitedPartners.map((row) => (
                    <li key={row.id}>
                      <Link
                        href={`/admin/sales/partners?partner=${row.id}`}
                        className={selected?.id === row.id ? "is-current" : undefined}
                      >
                        <span className="kxd-nc__roster-name">{row.displayName}</span>
                        <span className="kxd-nc__roster-meta">
                          {row.rosterState === "expired" ? "Expired" : "Invited"}
                          {row.email ? ` · ${row.email}` : ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {workspace.inactivePartners.length > 0 ? (
              <div className="kxd-nc__inactive">
                <p className="kxd-nc__roster-label">Inactive</p>
                <ul className="kxd-nc__roster-list">
                  {workspace.inactivePartners.map((row) => (
                    <li key={row.id}>
                      <Link
                        href={`/admin/sales/partners?partner=${row.id}`}
                        className={selected?.id === row.id ? "is-current" : undefined}
                      >
                        <span className="kxd-nc__roster-name">{row.displayName}</span>
                        <span className="kxd-nc__roster-meta">
                          {row.rosterState === "revoked" ? "Revoked" : "Inactive"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>

          {selected ? (
            <article className="kxd-nc__record" aria-label="Partner record">
              <p className="kxd-nc__record-kicker">
                {selected.rosterState === "active"
                  ? signalLabel(selected.signal)
                  : selected.rosterState === "invited"
                    ? "Invited"
                    : selected.rosterState === "expired"
                      ? "Expired"
                      : selected.rosterState === "revoked"
                        ? "Revoked"
                        : "Inactive"}
              </p>
              <h2 className="kxd-nc__record-name">{selected.displayName}</h2>
              <p className="kxd-nc__record-signal">
                {selected.rosterState === "active"
                  ? selected.signalExplanation
                  : selected.rosterState === "invited"
                    ? "Private invitation sent. Partner room opens after they activate."
                    : selected.rosterState === "expired"
                      ? "Invitation expired. Resend to issue a new private link."
                      : selected.rosterState === "revoked"
                        ? "Invitation revoked. No partner access."
                        : "No portal access."}
              </p>
              {selected.email ? (
                <p className="kxd-nc__approved">{selected.email}</p>
              ) : null}
              {selected.invitationId &&
              (selected.canResendInvitation || selected.canRevokeInvitation) ? (
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
                  {selected.canResendInvitation ? (
                    <button
                      type="button"
                      className="kxd-nc__btn"
                      onClick={() => void resendInvitation(selected.invitationId!)}
                    >
                      Resend invitation
                    </button>
                  ) : null}
                  {selected.canRevokeInvitation ? (
                    <button
                      type="button"
                      className="kxd-nc__btn kxd-nc__btn--ghost"
                      onClick={() => void revokeInvitation(selected.invitationId!)}
                    >
                      Revoke invitation
                    </button>
                  ) : null}
                </div>
              ) : null}
              {selected.rosterState === "active" ? (
                <>
                  <p className="kxd-nc__paid-label">Paid to date</p>
                  <p className="kxd-nc__paid">{formatCents(selected.paidEarningsCents)}</p>
                  <p className="kxd-nc__approved">
                    Approved {formatCents(selected.approvedEarningsCents)}
                    {selected.pendingApprovalCents > 0
                      ? ` · ${formatCents(selected.pendingApprovalCents)} pending review`
                      : ""}
                  </p>
                  <ol className="kxd-nc__path">
                    {(
                      [
                        ["introductions", "Introductions submitted", selected.submittedLeads],
                        [
                          "qualified",
                          "Qualified",
                          selected.qualifiedLeads,
                          rateText(selected.qualifiedRate),
                        ],
                        [
                          "discovery",
                          "Discovery booked",
                          selected.bookedCalls,
                          rateText(selected.discoveryRate),
                        ],
                        [
                          "won",
                          "Clients won",
                          selected.wonClients,
                          rateText(selected.wonRate),
                        ],
                        ["paid", "Paid", formatCents(selected.paidEarningsCents)],
                      ] as Array<[string, string, string | number, string | null | undefined]>
                    ).map(([key, label, value, rate]) => (
                      <li key={key} className={pathKey === key ? "is-current" : undefined}>
                        <span>{label}</span>
                        <span>
                          {value}
                          {rate ? ` · ${rate}` : ""}
                        </span>
                      </li>
                    ))}
                  </ol>
                  {selected.bonusProgress ? (
                    <p className="kxd-nc__bonus">{selected.bonusProgress.sentence}</p>
                  ) : null}
                  {selected.highPotential ? (
                    <p className="kxd-nc__potential">{selected.highPotential.sentence}</p>
                  ) : null}
                </>
              ) : null}
              {selected.notes ? (
                <p className="kxd-nc__bonus">Internal note. {selected.notes}</p>
              ) : null}
            </article>
          ) : (
            <article className="kxd-nc__record">
              <p className="kxd-nc__record-kicker">Record</p>
              <h2 className="kxd-nc__record-name">No partner selected</h2>
              <p className="kxd-nc__record-signal">
                Active partners will appear here as a record, not a dashboard.
              </p>
            </article>
          )}
        </div>

        <div className="kxd-nc__chapters">
          <section>
            <p className="kxd-nc__chapter-label">Introductions</p>
            {selected && selected.referrals.length > 0 ? (
              <div className="kxd-nc__intro">
                {selected.referrals.map((row) => (
                  <article key={row.id}>
                    <h3>
                      {row.businessName}
                    </h3>
                    <p>
                      {row.contactName}
                      {` · ${visibilityLabel(row.visibilityState)}`}
                      {row.createdAt ? ` · ${formatWhen(row.createdAt)}` : ""}
                    </p>
                    {row.internalNotes ? <p>{row.internalNotes}</p> : null}
                    <label>
                      Partner-safe status
                      <select
                        className="kxd-nc__select"
                        value={row.visibilityState}
                        onChange={(e) => updateVisibility(row.id, e.target.value)}
                      >
                        {PARTNER_VISIBILITY_STATES.map((state) => (
                          <option key={state} value={state}>
                            {PARTNER_VISIBILITY_LABELS[state]}
                          </option>
                        ))}
                      </select>
                    </label>
                    {row.promotedSalesLeadId ? (
                      <p>
                        <Link
                          href={`/admin/sales?focus=${row.promotedSalesLeadId}`}
                          className="kxd-nc__btn kxd-nc__btn--ghost"
                        >
                          Open in Sales
                        </Link>
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="kxd-nc__empty">No introductions on this record.</p>
            )}
          </section>

          <section>
            <p className="kxd-nc__chapter-label">Ledger</p>
            {(selected?.earnings ?? []).map((row) => (
              <div key={row.id} className="kxd-nc__ledger-row">
                <p className="kxd-nc__ledger-line">
                  <span className="kxd-nc__ledger-name">
                    {row.relatedBusinessName || earningTypeLabel(row.earningType)}
                  </span>
                  <span className="kxd-nc__ledger-meta">
                    {row.relatedBusinessName
                      ? `${earningTypeLabel(row.earningType)} · `
                      : ""}
                    {formatCents(row.amountCents)} · {paymentStatusLabel(row.paymentStatus)}
                  </span>
                </p>
                <span className="kxd-nc__actions">
                  {row.paymentStatus === "pending_approval" ? (
                    <button
                      type="button"
                      className="kxd-nc__btn kxd-nc__btn--ghost"
                      onClick={() => transitionEarning(row.id, "approved")}
                    >
                      Approve
                    </button>
                  ) : null}
                  {row.paymentStatus === "approved" ? (
                    <button
                      type="button"
                      className="kxd-nc__btn kxd-nc__btn--ghost"
                      onClick={() => transitionEarning(row.id, "paid")}
                    >
                      Mark paid
                    </button>
                  ) : null}
                  {row.paymentStatus !== "void" && row.paymentStatus !== "paid" ? (
                    <button
                      type="button"
                      className="kxd-nc__btn kxd-nc__btn--ghost"
                      onClick={() => transitionEarning(row.id, "void")}
                    >
                      Void
                    </button>
                  ) : null}
                </span>
              </div>
            ))}
            {(selected?.earnings.length ?? 0) === 0 ? (
              <p className="kxd-nc__empty">No ledger entries on this record.</p>
            ) : null}

            <details className="kxd-nc__disclose">
              <summary>Create ledger entry</summary>
              <div className="kxd-nc__form">
                <label className="kxd-nc__field">
                  <span>Partner</span>
                  <select
                    value={earningForm.partnerId}
                    onChange={(e) =>
                      setEarningForm((s) => ({
                        ...s,
                        partnerId: e.target.value,
                        relatedPartnerReferralId: "",
                      }))
                    }
                  >
                    <option value="">Choose a partner</option>
                    {partners.map((row) => (
                      <option key={row.id} value={String(row.id)}>
                        {row.displayName}
                        {row.status === "inactive" ? " · Inactive" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="kxd-nc__field">
                  <span>Related business</span>
                  <input
                    value={earningForm.relatedBusinessName}
                    onChange={(e) =>
                      setEarningForm((s) => ({
                        ...s,
                        relatedBusinessName: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="kxd-nc__field">
                  <span>Related introduction</span>
                  <select
                    value={earningForm.relatedPartnerReferralId}
                    onChange={(e) =>
                      setEarningForm((s) => ({
                        ...s,
                        relatedPartnerReferralId: e.target.value,
                      }))
                    }
                  >
                    <option value="">None</option>
                    {ledgerIntroductions.map((row) => (
                      <option key={row.id} value={String(row.id)}>
                        {row.businessName} · {row.contactName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="kxd-nc__field">
                  <span>Entry type</span>
                  <select
                    value={earningForm.earningType}
                    onChange={(e) =>
                      setEarningForm((s) => ({ ...s, earningType: e.target.value }))
                    }
                  >
                    {(
                      Object.entries(PARTNER_EARNING_TYPE_LABELS) as Array<
                        [PartnerEarningType, string]
                      >
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="kxd-nc__field">
                  <span>
                    Amount in cents
                    {centsReading(earningForm.amountCents) ? (
                      <span className="kxd-nc__hint">
                        {" "}
                        · {centsReading(earningForm.amountCents)}
                      </span>
                    ) : null}
                  </span>
                  <input
                    inputMode="numeric"
                    value={earningForm.amountCents}
                    onChange={(e) =>
                      setEarningForm((s) => ({ ...s, amountCents: e.target.value }))
                    }
                  />
                </label>
                <label className="kxd-nc__field">
                  <span>
                    Eligible amount collected, in cents
                    {centsReading(earningForm.eligibleCollectedCents) ? (
                      <span className="kxd-nc__hint">
                        {" "}
                        · {centsReading(earningForm.eligibleCollectedCents)}
                      </span>
                    ) : null}
                  </span>
                  <input
                    inputMode="numeric"
                    value={earningForm.eligibleCollectedCents}
                    onChange={(e) =>
                      setEarningForm((s) => ({
                        ...s,
                        eligibleCollectedCents: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="kxd-nc__field">
                  <span>
                    Rate in basis points
                    {earningForm.rateBps.trim() &&
                    Number.isFinite(Number(earningForm.rateBps)) ? (
                      <span className="kxd-nc__hint">
                        {" "}
                        · {formatRateBps(Number(earningForm.rateBps))}
                      </span>
                    ) : null}
                  </span>
                  <input
                    inputMode="numeric"
                    value={earningForm.rateBps}
                    onChange={(e) =>
                      setEarningForm((s) => ({ ...s, rateBps: e.target.value }))
                    }
                  />
                </label>
                <button
                  type="button"
                  className="kxd-nc__btn kxd-nc__btn--quiet"
                  onClick={createEarning}
                >
                  Add entry
                </button>
              </div>
            </details>
          </section>

          <section>
            <p className="kxd-nc__chapter-label">Bookings</p>
            <p className="kxd-nc__tool-copy">
              {calendar.writeEnabled
                ? "KXD Google Calendar is connected for partner discovery booking."
                : "Calendar is in request mode. Connect Google Calendar to offer live booking slots."}
            </p>
            {selected && selected.bookings.length > 0 ? (
              selected.bookings.map((row) => (
                <div key={row.id} className="kxd-nc__tool-row">
                  <p className="kxd-nc__ledger-line">
                    <span className="kxd-nc__ledger-name">
                      {bookingModeLabel(row.bookingMode)}
                    </span>
                    <span className="kxd-nc__ledger-meta">
                      {bookingStatusLabel(row.status)}
                      {row.slotStart ? ` · ${formatWhen(row.slotStart)}` : ""}
                    </span>
                  </p>
                  {row.preferredTimes ? (
                    <p className="kxd-nc__tool-note">{row.preferredTimes}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="kxd-nc__empty">No bookings on this record.</p>
            )}
          </section>

          <section>
            <p className="kxd-nc__chapter-label">Commission policy</p>
            <p className="kxd-nc__policy-sentence">{policySentence(policyState)}</p>
            <details className="kxd-nc__disclose">
              <summary>Edit policy</summary>
              <div className="kxd-nc__form">
                <label className="kxd-nc__field">
                  <span>
                    Project rate in basis points
                    <span className="kxd-nc__hint">
                      {" "}
                      · {formatRateBps(policyState.projectRateBps)}
                    </span>
                  </span>
                  <input
                    type="number"
                    value={policyState.projectRateBps}
                    onChange={(e) =>
                      setPolicyState((s) => ({
                        ...s,
                        projectRateBps: Number(e.target.value),
                      }))
                    }
                  />
                </label>
                <label className="kxd-nc__field">
                  <span>
                    Monthly rate in basis points
                    <span className="kxd-nc__hint">
                      {" "}
                      · {formatRateBps(policyState.monthlyRateBps)}
                    </span>
                  </span>
                  <input
                    type="number"
                    value={policyState.monthlyRateBps}
                    onChange={(e) =>
                      setPolicyState((s) => ({
                        ...s,
                        monthlyRateBps: Number(e.target.value),
                      }))
                    }
                  />
                </label>
                <label className="kxd-nc__field">
                  <span>Eligible recurring services</span>
                  <textarea
                    value={policyState.eligibleRecurringServices}
                    onChange={(e) =>
                      setPolicyState((s) => ({
                        ...s,
                        eligibleRecurringServices: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="kxd-nc__field">
                  <span>
                    Performance bonus in cents
                    <span className="kxd-nc__hint">
                      {" "}
                      · {formatCents(policyState.performanceBonusAmountCents)}
                    </span>
                  </span>
                  <input
                    type="number"
                    value={policyState.performanceBonusAmountCents}
                    onChange={(e) =>
                      setPolicyState((s) => ({
                        ...s,
                        performanceBonusAmountCents: Number(e.target.value),
                      }))
                    }
                  />
                </label>
                <button
                  type="button"
                  className="kxd-nc__btn kxd-nc__btn--quiet"
                  onClick={savePolicy}
                >
                  Save policy
                </button>
              </div>
            </details>
          </section>
        </div>
      </div>
    </div>
  );
}
