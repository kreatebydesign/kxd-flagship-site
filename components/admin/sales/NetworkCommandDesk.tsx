"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { KxdLogo } from "@/components/ui/KxdLogo";
import { PARTNER_VISIBILITY_STATES } from "@/lib/portal/partner/types";
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

  const selected = useMemo(() => {
    const all = [...workspace.activePartners, ...workspace.inactivePartners];
    if (selectedPartnerId) {
      return all.find((row) => row.id === selectedPartnerId) ?? null;
    }
    return (
      all.find((row) => row.id === workspace.networkDecision.partnerId) ??
      workspace.activePartners[0] ??
      null
    );
  }, [workspace, selectedPartnerId]);

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
    setMessage(`Earning #${data.id} created (pending review).`);
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
    setMessage(`Earning #${earningId} marked ${status}.`);
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
          <p className="kxd-nc__calendar" style={{ marginTop: "1.1rem" }}>
            {calendar.writeEnabled
              ? "KXD Google Calendar is connected for partner discovery booking."
              : `Calendar booking stays on request mode. Missing: ${
                  calendar.missingEnv.join(", ") || "refresh token / credentials"
                }.`}
          </p>
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
            {workspace.inactivePartners.length > 0 ? (
              <div className="kxd-nc__inactive">
                <p className="kxd-nc__roster-label">Inactive</p>
                <ul className="kxd-nc__roster-list">
                  {workspace.inactivePartners.map((row) => (
                    <li key={row.id}>
                      <Link href={`/admin/sales/partners?partner=${row.id}`}>
                        <span className="kxd-nc__roster-name">{row.displayName}</span>
                        <span className="kxd-nc__roster-meta">Inactive</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>

          {selected ? (
            <article className="kxd-nc__record" aria-label="Partner record">
              <p className="kxd-nc__record-kicker">{signalLabel(selected.signal)}</p>
              <h2 className="kxd-nc__record-name">{selected.displayName}</h2>
              <p className="kxd-nc__record-signal">{selected.signalExplanation}</p>
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
                      {` · ${row.visibilityState.replaceAll("_", " ")}`}
                      {row.promotedSalesLeadId
                        ? ` · Sales #${row.promotedSalesLeadId}`
                        : ""}
                      {` · ${formatWhen(row.createdAt)}`}
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
                            {state.replaceAll("_", " ")}
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
                <span>
                  #{row.id} · {row.relatedBusinessName} ·{" "}
                  {row.earningType.replaceAll("_", " ")} · {formatCents(row.amountCents)}{" "}
                  · {row.paymentStatus.replaceAll("_", " ")}
                </span>
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
            {selected && selected.earnings.length === 0 ? (
              <p className="kxd-nc__empty">No ledger entries on this record.</p>
            ) : null}

            <div className="kxd-nc__form">
              <input
                placeholder="Partner profile id"
                value={earningForm.partnerId}
                onChange={(e) =>
                  setEarningForm((s) => ({ ...s, partnerId: e.target.value }))
                }
              />
              <input
                placeholder="Related business"
                value={earningForm.relatedBusinessName}
                onChange={(e) =>
                  setEarningForm((s) => ({
                    ...s,
                    relatedBusinessName: e.target.value,
                  }))
                }
              />
              <input
                placeholder="Referral id (optional)"
                value={earningForm.relatedPartnerReferralId}
                onChange={(e) =>
                  setEarningForm((s) => ({
                    ...s,
                    relatedPartnerReferralId: e.target.value,
                  }))
                }
              />
              <select
                value={earningForm.earningType}
                onChange={(e) =>
                  setEarningForm((s) => ({ ...s, earningType: e.target.value }))
                }
              >
                <option value="project_commission">Project commission</option>
                <option value="monthly_bonus">Monthly bonus</option>
                <option value="retention_kicker">Retention kicker</option>
                <option value="performance_bonus">Performance bonus</option>
                <option value="adjustment">Adjustment</option>
              </select>
              <input
                placeholder="Amount cents"
                value={earningForm.amountCents}
                onChange={(e) =>
                  setEarningForm((s) => ({ ...s, amountCents: e.target.value }))
                }
              />
              <input
                placeholder="Eligible collected cents"
                value={earningForm.eligibleCollectedCents}
                onChange={(e) =>
                  setEarningForm((s) => ({
                    ...s,
                    eligibleCollectedCents: e.target.value,
                  }))
                }
              />
              <input
                placeholder="Rate bps"
                value={earningForm.rateBps}
                onChange={(e) =>
                  setEarningForm((s) => ({ ...s, rateBps: e.target.value }))
                }
              />
              <button type="button" className="kxd-nc__btn kxd-nc__btn--quiet" onClick={createEarning}>
                Create ledger entry
              </button>
            </div>
          </section>

          <section>
            <p className="kxd-nc__chapter-label">Bookings</p>
            {selected && selected.bookings.length > 0 ? (
              selected.bookings.map((row) => (
                <p key={row.id} className="kxd-nc__empty">
                  #{row.id} · {row.bookingMode.replaceAll("_", " ")} ·{" "}
                  {row.status.replaceAll("_", " ")}
                  {row.slotStart ? ` · ${formatWhen(row.slotStart)}` : ""}
                </p>
              ))
            ) : (
              <p className="kxd-nc__empty">No bookings on this record.</p>
            )}
          </section>

          <section>
            <p className="kxd-nc__chapter-label">Commission policy</p>
            <div className="kxd-nc__form">
              <label>
                Project rate bps
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
              <label>
                Monthly rate bps
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
              <label>
                Eligible recurring services
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
              <label>
                Performance bonus cents
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
              <button type="button" className="kxd-nc__btn kxd-nc__btn--quiet" onClick={savePolicy}>
                Save policy
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
