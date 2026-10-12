"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { KxdLogo } from "@/components/ui/KxdLogo";
import {
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
import type {
  OwnerNetworkProfileFields,
  OwnerNetworkShowcaseFields,
} from "@/lib/portal/partner/network-directory-rules";
import { NetworkDirectoryOwnerPanel } from "@/components/admin/sales/NetworkDirectoryOwnerPanel";

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

const OWNER_EARNING_OPTIONS: Array<{
  value: PartnerEarningType;
  label: string;
}> = [
  { value: "project_commission", label: "Project commission" },
  { value: "monthly_bonus", label: "Recurring commission" },
  { value: "retention_kicker", label: "Retention kicker" },
  { value: "performance_bonus", label: "Performance bonus" },
];

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

function amountFromRateBps(eligibleCollectedCents: number, rateBps: number): number {
  if (!Number.isFinite(eligibleCollectedCents) || eligibleCollectedCents < 0) {
    return 0;
  }
  if (!Number.isFinite(rateBps) || rateBps < 0) return 0;
  return Math.round((eligibleCollectedCents * rateBps) / 10_000);
}

function parseDollarsToCents(raw: string): number | null {
  const cleaned = raw.trim().replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const dollars = Number(cleaned);
  if (!Number.isFinite(dollars) || dollars < 0) return null;
  return Math.round(dollars * 100);
}

function policySentence(policy: PolicyState): string {
  const months = policy.monthlyBonusMonths;
  const monthSpan = months <= 1 ? "month 1" : `months 1–${months}`;
  const parts = [
    `${formatRateBps(policy.projectRateBps)} project commission`,
    `${formatRateBps(policy.monthlyRateBps)} recurring for ${monthSpan}`,
  ];
  if (policy.retentionKickerEnabled) {
    parts.push(
      `${formatRateBps(policy.retentionKickerRateBps)} retention kicker at month ${policy.retentionKickerMonth}`,
    );
  }
  parts.push(
    `${formatCents(policy.performanceBonusAmountCents)} performance bonus after ${policy.performanceBonusProjectCount} paid projects in ${policy.performanceBonusWindowDays} days`,
  );
  return `${parts.join(". ")}.`;
}

function earningTypeLabel(value: string): string {
  const match = OWNER_EARNING_OPTIONS.find((row) => row.value === value);
  if (match) return match.label;
  if (value === "adjustment") return "Adjustment";
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

function accessStateLabel(partner: NetworkCommandPartnerRecord): string {
  if (partner.rosterState === "active") return "Active";
  if (partner.rosterState === "invited") return "Invited";
  if (partner.rosterState === "expired") return "Invited";
  if (partner.rosterState === "revoked") return "Inactive";
  return "Inactive";
}

function accessDetail(partner: NetworkCommandPartnerRecord): string {
  if (partner.rosterState === "active") {
    if (partner.submittedLeads === 0) return "No introductions yet";
    return partner.nextAction.kind === "none"
      ? partner.signalExplanation
      : partner.nextAction.label;
  }
  if (partner.rosterState === "invited") {
    return "Invitation sent. Access opens after they activate.";
  }
  if (partner.rosterState === "expired") {
    return "Invitation expired. Resend to issue a new link.";
  }
  if (partner.rosterState === "revoked") {
    return "Invitation revoked. No partner access.";
  }
  return "No portal access.";
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

function rateForEarningType(
  earningType: string,
  policy: PolicyState,
): number {
  if (earningType === "monthly_bonus") return policy.monthlyRateBps;
  if (earningType === "retention_kicker") return policy.retentionKickerRateBps;
  if (earningType === "project_commission") return policy.projectRateBps;
  return 0;
}

export function NetworkCommandDesk({
  workspace,
  selectedPartnerId,
  networkProfile = null,
  networkShowcase = [],
  policy,
  calendar,
}: {
  workspace: NetworkCommandWorkspace;
  selectedPartnerId: number | null;
  networkProfile?: OwnerNetworkProfileFields | null;
  networkShowcase?: OwnerNetworkShowcaseFields[];
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [earningOpen, setEarningOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [openChapter, setOpenChapter] = useState<
    "introductions" | "earnings" | "bookings" | "policy" | null
  >("introductions");
  const [earningForm, setEarningForm] = useState({
    partnerId: selectedPartnerId ? String(selectedPartnerId) : "",
    relatedBusinessName: "",
    relatedPartnerReferralId: "",
    earningType: "project_commission" as PartnerEarningType,
    collectedDollars: "",
    ratePercentOverride: "",
    commissionDollarsOverride: "",
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
    setEarningOpen(false);
    setAdjustOpen(false);
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

  const introductions = selected?.referrals ?? [];
  const policyRateBps = rateForEarningType(earningForm.earningType, policyState);
  const isPerformanceBonus = earningForm.earningType === "performance_bonus";
  const collectedCents = parseDollarsToCents(earningForm.collectedDollars);
  const overridePercent = earningForm.ratePercentOverride.trim()
    ? Number(earningForm.ratePercentOverride)
    : null;
  const effectiveRateBps =
    adjustOpen &&
    overridePercent != null &&
    Number.isFinite(overridePercent) &&
    overridePercent >= 0
      ? Math.round(overridePercent * 100)
      : policyRateBps;
  const calculatedCommissionCents = isPerformanceBonus
    ? policyState.performanceBonusAmountCents
    : collectedCents != null
      ? amountFromRateBps(collectedCents, effectiveRateBps)
      : null;
  const overrideCommissionCents =
    adjustOpen && earningForm.commissionDollarsOverride.trim()
      ? parseDollarsToCents(earningForm.commissionDollarsOverride)
      : null;
  const commissionDueCents =
    overrideCommissionCents != null
      ? overrideCommissionCents
      : calculatedCommissionCents;

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
    const partnerId = selected?.id ?? Number(earningForm.partnerId);
    if (!Number.isFinite(partnerId) || partnerId <= 0) {
      setMessage("Select a partner first.");
      return;
    }
    if (commissionDueCents == null) {
      setMessage(
        isPerformanceBonus
          ? "Commission due is unavailable."
          : "Enter the amount collected.",
      );
      return;
    }
    if (!isPerformanceBonus && collectedCents == null) {
      setMessage("Enter the amount collected.");
      return;
    }

    const res = await fetch("/api/admin/partner/earnings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerId,
        relatedBusinessName: earningForm.relatedBusinessName,
        relatedPartnerReferralId: earningForm.relatedPartnerReferralId
          ? Number(earningForm.relatedPartnerReferralId)
          : undefined,
        amountCents: commissionDueCents,
        earningType: earningForm.earningType,
        rateBps: isPerformanceBonus ? undefined : effectiveRateBps,
        eligibleCollectedCents:
          collectedCents != null ? collectedCents : undefined,
      }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; id?: number };
    if (!res.ok || !data.ok || !data.id) {
      setMessage(data.error || "Earning create failed.");
      return;
    }
    setMessage("Earning added. Pending review.");
    setEarningForm((current) => ({
      ...current,
      relatedBusinessName: "",
      relatedPartnerReferralId: "",
      collectedDollars: "",
      ratePercentOverride: "",
      commissionDollarsOverride: "",
    }));
    setEarningOpen(false);
    setAdjustOpen(false);
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
      setInviteOpen(false);
      if (data.oneTimeActivateUrl) {
        setOneTimeLink(data.oneTimeActivateUrl);
        setMessage(
          "Invitation created. Email was not delivered — copy this one-time link now. It will not be shown again.",
        );
      } else {
        setMessage(
          data.emailSent ? "Invitation sent." : "Invitation created.",
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
    setMessage(`Earning marked ${paymentStatusLabel(status).toLowerCase()}.`);
    router.refresh();
  }

  function toggleChapter(
    chapter: "introductions" | "earnings" | "bookings" | "policy",
  ) {
    setOpenChapter((current) => (current === chapter ? null : chapter));
  }

  const pathSteps = selected
    ? [
        { label: "Introductions", value: String(selected.submittedLeads) },
        { label: "Qualified", value: String(selected.qualifiedLeads) },
        { label: "Discovery", value: String(selected.bookedCalls) },
        { label: "Clients", value: String(selected.wonClients) },
        { label: "Paid", value: formatCents(selected.paidEarningsCents) },
      ]
    : [];

  return (
    <div className="kxd-nc">
      <div className="kxd-nc__frame">
        <header className="kxd-nc__mast">
          <div className="kxd-nc__brand">
            <KxdLogo disableLink width={22} height={20} imageClassName="" />
            <div>
              <h1 className="kxd-nc__title">Network</h1>
              <p className="kxd-nc__subtitle">
                Partners, introductions, and earnings.
              </p>
            </div>
          </div>
          <div className="kxd-nc__mast-actions">
            <button
              type="button"
              className="kxd-nc__btn"
              onClick={() => setInviteOpen((open) => !open)}
              aria-expanded={inviteOpen}
            >
              Invite partner
            </button>
          </div>
        </header>

        {message ? <p className="kxd-nc__notice">{message}</p> : null}
        {oneTimeLink ? (
          <div className="kxd-nc__notice kxd-nc__notice--panel" role="status">
            <p>One-time activate link (copy now):</p>
            <code>{oneTimeLink}</code>
            <button
              type="button"
              className="kxd-nc__text-action"
              onClick={() => {
                void navigator.clipboard?.writeText(oneTimeLink);
                setMessage(
                  "Link copied. It will not be shown after you leave this page.",
                );
              }}
            >
              Copy link
            </button>
          </div>
        ) : null}

        {inviteOpen ? (
          <section className="kxd-nc__invite" aria-label="Invite partner">
            <div className="kxd-nc__invite-grid">
              <label>
                <span>Name</span>
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
            <div className="kxd-nc__invite-actions">
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
                {inviteBusy ? "Sending…" : "Send invite"}
              </button>
              <button
                type="button"
                className="kxd-nc__text-action"
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </button>
            </div>
          </section>
        ) : null}

        <div className="kxd-nc__spread">
          <aside className="kxd-nc__roster" aria-label="Partners">
            <div className="kxd-nc__roster-group">
              <p className="kxd-nc__roster-label">
                Active
                <span>{workspace.activePartners.length}</span>
              </p>
              {workspace.activePartners.length === 0 ? (
                <p className="kxd-nc__empty">No active partners yet.</p>
              ) : (
                <ul className="kxd-nc__roster-list">
                  {workspace.activePartners.map((row) => (
                    <li key={row.id}>
                      <Link
                        href={`/admin/sales/partners?partner=${row.id}`}
                        className={
                          selected?.id === row.id ? "is-current" : undefined
                        }
                      >
                        <span className="kxd-nc__roster-name">
                          {row.displayName}
                        </span>
                        <span className="kxd-nc__roster-meta">
                          {row.submittedLeads === 0
                            ? "No introductions yet"
                            : `${row.submittedLeads} introduction${row.submittedLeads === 1 ? "" : "s"}`}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="kxd-nc__roster-group">
              <p className="kxd-nc__roster-label">
                Invited
                <span>{workspace.invitedPartners.length}</span>
              </p>
              {workspace.invitedPartners.length === 0 ? (
                <p className="kxd-nc__empty">No open invitations.</p>
              ) : (
                <ul className="kxd-nc__roster-list">
                  {workspace.invitedPartners.map((row) => (
                    <li key={row.id}>
                      <Link
                        href={`/admin/sales/partners?partner=${row.id}`}
                        className={
                          selected?.id === row.id ? "is-current" : undefined
                        }
                      >
                        <span className="kxd-nc__roster-name">
                          {row.displayName}
                        </span>
                        <span className="kxd-nc__roster-meta">
                          {row.rosterState === "expired" ? "Expired" : "Invited"}
                          {row.email ? ` · ${row.email}` : ""}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {workspace.inactivePartners.length > 0 ? (
              <div className="kxd-nc__roster-group">
                <p className="kxd-nc__roster-label">
                  Inactive
                  <span>{workspace.inactivePartners.length}</span>
                </p>
                <ul className="kxd-nc__roster-list">
                  {workspace.inactivePartners.map((row) => (
                    <li key={row.id}>
                      <Link
                        href={`/admin/sales/partners?partner=${row.id}`}
                        className={
                          selected?.id === row.id ? "is-current" : undefined
                        }
                      >
                        <span className="kxd-nc__roster-name">
                          {row.displayName}
                        </span>
                        <span className="kxd-nc__roster-meta">
                          {row.rosterState === "revoked"
                            ? "Revoked"
                            : "Inactive"}
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
              <div className="kxd-nc__record-top">
                <div>
                  <h2 className="kxd-nc__record-name">{selected.displayName}</h2>
                  <p className="kxd-nc__record-state">
                    {accessStateLabel(selected)}
                  </p>
                </div>
                {selected.rosterState === "active" ? (
                  <p className="kxd-nc__record-paid">
                    <span>Paid to date</span>
                    <strong>{formatCents(selected.paidEarningsCents)}</strong>
                  </p>
                ) : null}
              </div>

              <p className="kxd-nc__record-next">{accessDetail(selected)}</p>

              {selected.email ? (
                <p className="kxd-nc__record-email">{selected.email}</p>
              ) : null}

              {selected.invitationId &&
              (selected.canResendInvitation || selected.canRevokeInvitation) ? (
                <div className="kxd-nc__record-actions">
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
                      className="kxd-nc__text-action"
                      onClick={() => void revokeInvitation(selected.invitationId!)}
                    >
                      Revoke invitation
                    </button>
                  ) : null}
                </div>
              ) : null}

              {selected.rosterState === "active" &&
              selected.nextAction.kind === "approve_earning" &&
              selected.nextAction.earningId ? (
                <div className="kxd-nc__record-actions">
                  <button
                    type="button"
                    className="kxd-nc__btn"
                    onClick={() =>
                      void transitionEarning(
                        selected.nextAction.earningId!,
                        "approved",
                      )
                    }
                  >
                    Approve earning
                  </button>
                </div>
              ) : null}

              {selected.rosterState === "active" &&
              selected.nextAction.kind !== "none" &&
              selected.nextAction.kind !== "approve_earning" ? (
                (() => {
                  const href = decisionHref(selected.nextAction);
                  return href ? (
                    <p className="kxd-nc__record-link">
                      <Link href={href}>
                        {selected.nextAction.kind === "sales_follow_up" ||
                        selected.nextAction.kind === "won_mismatch"
                          ? "Open in Sales"
                          : "Open related record"}
                      </Link>
                    </p>
                  ) : null;
                })()
              ) : null}

              {selected.rosterState === "active" ? (
                <>
                  <p className="kxd-nc__path" aria-label="Partner path">
                    {pathSteps.map((step, index) => (
                      <span key={step.label}>
                        {index > 0 ? (
                          <span className="kxd-nc__path-sep" aria-hidden>
                            →
                          </span>
                        ) : null}
                        <span className="kxd-nc__path-step">
                          {step.label}{" "}
                          <span className="kxd-nc__path-count">{step.value}</span>
                        </span>
                      </span>
                    ))}
                  </p>
                  {selected.pendingApprovalCents > 0 ? (
                    <p className="kxd-nc__record-meta">
                      {formatCents(selected.pendingApprovalCents)} pending review
                      {selected.approvedEarningsCents > 0
                        ? ` · ${formatCents(selected.approvedEarningsCents)} approved`
                        : ""}
                    </p>
                  ) : selected.approvedEarningsCents > 0 &&
                    selected.paidEarningsCents !==
                      selected.approvedEarningsCents ? (
                    <p className="kxd-nc__record-meta">
                      {formatCents(selected.approvedEarningsCents)} approved
                    </p>
                  ) : null}
                  {selected.bonusProgress ? (
                    <p className="kxd-nc__record-meta">
                      {selected.bonusProgress.sentence}
                    </p>
                  ) : null}
                </>
              ) : null}

              {selected.notes ? (
                <p className="kxd-nc__record-meta">Note. {selected.notes}</p>
              ) : null}
            </article>
          ) : (
            <article className="kxd-nc__record">
              <h2 className="kxd-nc__record-name">No partner selected</h2>
              <p className="kxd-nc__record-next">
                Choose a partner from the list to see their record.
              </p>
            </article>
          )}
        </div>

        <NetworkDirectoryOwnerPanel
          selectedPartnerId={selectedPartnerId}
          selectedPartnerName={selected?.displayName ?? null}
          partnerOptions={partners.map((row) => ({
            id: row.id,
            displayName: row.displayName,
          }))}
          initialProfile={networkProfile}
          initialShowcase={networkShowcase}
        />

        <div className="kxd-nc__chapters">
          <section className="kxd-nc__chapter">
            <button
              type="button"
              className="kxd-nc__chapter-toggle"
              aria-expanded={openChapter === "introductions"}
              onClick={() => toggleChapter("introductions")}
            >
              <span>Introductions</span>
              <span className="kxd-nc__chapter-count">
                {selected?.referrals.length ?? 0}
              </span>
            </button>
            {openChapter === "introductions" ? (
              <div className="kxd-nc__chapter-body">
                {selected && selected.referrals.length > 0 ? (
                  <div className="kxd-nc__intro">
                    {selected.referrals.map((row) => (
                      <article key={row.id}>
                        <h3>{row.businessName}</h3>
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
                            onChange={(e) =>
                              void updateVisibility(row.id, e.target.value)
                            }
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
                              className="kxd-nc__text-action"
                            >
                              Open in Sales
                            </Link>
                          </p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="kxd-nc__empty">No introductions yet.</p>
                )}
              </div>
            ) : null}
          </section>

          <section className="kxd-nc__chapter">
            <button
              type="button"
              className="kxd-nc__chapter-toggle"
              aria-expanded={openChapter === "earnings"}
              onClick={() => toggleChapter("earnings")}
            >
              <span>Earnings</span>
              <span className="kxd-nc__chapter-count">
                {selected?.earnings.length ?? 0}
              </span>
            </button>
            {openChapter === "earnings" ? (
              <div className="kxd-nc__chapter-body">
                {(selected?.earnings ?? []).map((row) => (
                  <div key={row.id} className="kxd-nc__ledger-row">
                    <p className="kxd-nc__ledger-line">
                      <span className="kxd-nc__ledger-name">
                        {row.relatedBusinessName ||
                          earningTypeLabel(row.earningType)}
                      </span>
                      <span className="kxd-nc__ledger-meta">
                        {row.relatedBusinessName
                          ? `${earningTypeLabel(row.earningType)} · `
                          : ""}
                        {formatCents(row.amountCents)} ·{" "}
                        {paymentStatusLabel(row.paymentStatus)}
                      </span>
                    </p>
                    <span className="kxd-nc__actions">
                      {row.paymentStatus === "pending_approval" ? (
                        <button
                          type="button"
                          className="kxd-nc__text-action"
                          onClick={() =>
                            void transitionEarning(row.id, "approved")
                          }
                        >
                          Approve
                        </button>
                      ) : null}
                      {row.paymentStatus === "approved" ? (
                        <button
                          type="button"
                          className="kxd-nc__text-action"
                          onClick={() => void transitionEarning(row.id, "paid")}
                        >
                          Mark paid
                        </button>
                      ) : null}
                      {row.paymentStatus !== "void" &&
                      row.paymentStatus !== "paid" ? (
                        <button
                          type="button"
                          className="kxd-nc__text-action"
                          onClick={() => void transitionEarning(row.id, "void")}
                        >
                          Void
                        </button>
                      ) : null}
                    </span>
                  </div>
                ))}
                {(selected?.earnings.length ?? 0) === 0 ? (
                  <p className="kxd-nc__empty">No earnings recorded yet.</p>
                ) : null}

                {selected?.rosterState === "active" ? (
                  earningOpen ? (
                    <div className="kxd-nc__earning">
                      <div className="kxd-nc__earning-head">
                        <p className="kxd-nc__earning-title">Add earning</p>
                        <button
                          type="button"
                          className="kxd-nc__text-action"
                          onClick={() => {
                            setEarningOpen(false);
                            setAdjustOpen(false);
                          }}
                        >
                          Close
                        </button>
                      </div>
                      <p className="kxd-nc__earning-partner">
                        For {selected.displayName}
                      </p>
                      <div className="kxd-nc__form">
                        {introductions.length > 0 ? (
                          <label className="kxd-nc__field">
                            <span>Related introduction</span>
                            <select
                              value={earningForm.relatedPartnerReferralId}
                              onChange={(e) =>
                                setEarningForm((s) => ({
                                  ...s,
                                  relatedPartnerReferralId: e.target.value,
                                  relatedBusinessName:
                                    e.target.value &&
                                    !s.relatedBusinessName.trim()
                                      ? introductions.find(
                                          (row) =>
                                            String(row.id) === e.target.value,
                                        )?.businessName ??
                                        s.relatedBusinessName
                                      : s.relatedBusinessName,
                                }))
                              }
                            >
                              <option value="">None</option>
                              {introductions.map((row) => (
                                <option key={row.id} value={String(row.id)}>
                                  {row.businessName} · {row.contactName}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                        <label className="kxd-nc__field">
                          <span>Business name</span>
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
                          <span>What was paid?</span>
                          <select
                            value={earningForm.earningType}
                            onChange={(e) =>
                              setEarningForm((s) => ({
                                ...s,
                                earningType: e.target
                                  .value as PartnerEarningType,
                                ratePercentOverride: "",
                                commissionDollarsOverride: "",
                              }))
                            }
                          >
                            {OWNER_EARNING_OPTIONS.map((row) => (
                              <option key={row.value} value={row.value}>
                                {row.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        {!isPerformanceBonus ? (
                          <label className="kxd-nc__field">
                            <span>Amount collected</span>
                            <input
                              inputMode="decimal"
                              placeholder="$5,000.00"
                              value={earningForm.collectedDollars}
                              onChange={(e) =>
                                setEarningForm((s) => ({
                                  ...s,
                                  collectedDollars: e.target.value,
                                }))
                              }
                            />
                          </label>
                        ) : null}
                        <div className="kxd-nc__commission">
                          <span>Commission due</span>
                          <strong>
                            {commissionDueCents != null
                              ? formatCents(commissionDueCents)
                              : "—"}
                          </strong>
                          {!isPerformanceBonus && collectedCents != null ? (
                            <em>
                              {formatRateBps(effectiveRateBps)} of amount
                              collected
                            </em>
                          ) : null}
                          {isPerformanceBonus ? (
                            <em>From current performance bonus policy</em>
                          ) : null}
                        </div>
                        <details
                          className="kxd-nc__adjust"
                          open={adjustOpen}
                          onToggle={(e) =>
                            setAdjustOpen(
                              (e.currentTarget as HTMLDetailsElement).open,
                            )
                          }
                        >
                          <summary>Adjust calculation</summary>
                          <p className="kxd-nc__adjust-warn">
                            Only use this when the standard policy rate should
                            not apply. Changes here still create a normal
                            pending earning for review.
                          </p>
                          {!isPerformanceBonus ? (
                            <label className="kxd-nc__field">
                              <span>
                                Rate override (%)
                                <span className="kxd-nc__hint">
                                  {" "}
                                  · default {formatRateBps(policyRateBps)}
                                </span>
                              </span>
                              <input
                                inputMode="decimal"
                                placeholder={String(policyRateBps / 100)}
                                value={earningForm.ratePercentOverride}
                                onChange={(e) =>
                                  setEarningForm((s) => ({
                                    ...s,
                                    ratePercentOverride: e.target.value,
                                  }))
                                }
                              />
                            </label>
                          ) : null}
                          <label className="kxd-nc__field">
                            <span>Commission due override</span>
                            <input
                              inputMode="decimal"
                              placeholder={
                                calculatedCommissionCents != null
                                  ? formatCents(calculatedCommissionCents)
                                  : "$0.00"
                              }
                              value={earningForm.commissionDollarsOverride}
                              onChange={(e) =>
                                setEarningForm((s) => ({
                                  ...s,
                                  commissionDollarsOverride: e.target.value,
                                }))
                              }
                            />
                          </label>
                        </details>
                        <button
                          type="button"
                          className="kxd-nc__btn"
                          onClick={() => void createEarning()}
                          disabled={commissionDueCents == null}
                        >
                          Add earning
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="kxd-nc__text-action kxd-nc__text-action--block"
                      onClick={() => setEarningOpen(true)}
                    >
                      Add earning
                    </button>
                  )
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="kxd-nc__chapter">
            <button
              type="button"
              className="kxd-nc__chapter-toggle"
              aria-expanded={openChapter === "bookings"}
              onClick={() => toggleChapter("bookings")}
            >
              <span>Bookings</span>
              <span className="kxd-nc__chapter-count">
                {selected?.bookings.length ?? 0}
              </span>
            </button>
            {openChapter === "bookings" ? (
              <div className="kxd-nc__chapter-body">
                <p className="kxd-nc__calendar-line">
                  {calendar.writeEnabled
                    ? "Calendar connected for discovery booking."
                    : "Calendar is in request mode."}
                </p>
                {selected && selected.bookings.length > 0 ? (
                  selected.bookings.map((row) => (
                    <div key={row.id} className="kxd-nc__ledger-row">
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
                  <p className="kxd-nc__empty">No bookings yet.</p>
                )}
              </div>
            ) : null}
          </section>

          <section className="kxd-nc__chapter">
            <button
              type="button"
              className="kxd-nc__chapter-toggle"
              aria-expanded={openChapter === "policy"}
              onClick={() => toggleChapter("policy")}
            >
              <span>Commission policy</span>
            </button>
            {openChapter === "policy" ? (
              <div className="kxd-nc__chapter-body">
                <p className="kxd-nc__policy-sentence">
                  {policySentence(policyState)}
                </p>
                <details className="kxd-nc__disclose">
                  <summary>Edit policy</summary>
                  <div className="kxd-nc__form">
                    <label className="kxd-nc__field">
                      <span>
                        Project commission rate (%)
                        <span className="kxd-nc__hint">
                          {" "}
                          · {formatRateBps(policyState.projectRateBps)}
                        </span>
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        value={policyState.projectRateBps / 100}
                        onChange={(e) =>
                          setPolicyState((s) => ({
                            ...s,
                            projectRateBps: Math.round(
                              Number(e.target.value) * 100,
                            ),
                          }))
                        }
                      />
                    </label>
                    <label className="kxd-nc__field">
                      <span>
                        Recurring commission rate (%)
                        <span className="kxd-nc__hint">
                          {" "}
                          · {formatRateBps(policyState.monthlyRateBps)}
                        </span>
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        value={policyState.monthlyRateBps / 100}
                        onChange={(e) =>
                          setPolicyState((s) => ({
                            ...s,
                            monthlyRateBps: Math.round(
                              Number(e.target.value) * 100,
                            ),
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
                        Performance bonus
                        <span className="kxd-nc__hint">
                          {" "}
                          · {formatCents(policyState.performanceBonusAmountCents)}
                        </span>
                      </span>
                      <input
                        type="number"
                        value={policyState.performanceBonusAmountCents / 100}
                        onChange={(e) =>
                          setPolicyState((s) => ({
                            ...s,
                            performanceBonusAmountCents: Math.round(
                              Number(e.target.value) * 100,
                            ),
                          }))
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="kxd-nc__btn"
                      onClick={() => void savePolicy()}
                    >
                      Save policy
                    </button>
                  </div>
                </details>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
