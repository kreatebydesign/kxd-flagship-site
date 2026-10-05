"use client";

import { useState } from "react";
import { PARTNER_VISIBILITY_STATES } from "@/lib/portal/partner/types";

type ReferralRow = {
  id: number;
  businessName: string;
  contactName: string;
  partnerVisibilityState: string;
  sourcedByPartnerName: string;
  partnerId: number | null;
  promotedSalesLeadId: number | null;
  internalNotes: string | null;
  createdAt: string;
};

type BookingRow = {
  id: number;
  status: string;
  bookingMode: string;
  partnerName: string;
  preferredTimes: string | null;
  slotStart: string | null;
  hasGoogleEvent: boolean;
  createdAt: string;
};

type EarningRow = {
  id: number;
  relatedBusinessName: string;
  earningType: string;
  amountCents: number;
  paymentStatus: string;
  partnerId: number | null;
};

type Policy = {
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

export function PartnerOperatorDesk({
  referrals,
  bookings,
  earnings,
  policy,
  calendar,
}: {
  referrals: ReferralRow[];
  bookings: BookingRow[];
  earnings: EarningRow[];
  policy: Policy;
  calendar: {
    configured: boolean;
    connected: boolean;
    writeEnabled: boolean;
    missingEnv: string[];
  };
}) {
  const [rows, setRows] = useState(referrals);
  const [earningRows, setEarningRows] = useState(earnings);
  const [policyState, setPolicyState] = useState(policy);
  const [message, setMessage] = useState<string | null>(null);
  const [earningForm, setEarningForm] = useState({
    partnerId: "",
    relatedBusinessName: "",
    relatedPartnerReferralId: "",
    amountCents: "",
    earningType: "project_commission",
    rateBps: "1000",
    eligibleCollectedCents: "",
  });

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
    setRows((prev) =>
      prev.map((r) =>
        r.id === referralId ? { ...r, partnerVisibilityState: visibilityState } : r,
      ),
    );
    setMessage("Visibility updated.");
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
    setEarningRows((prev) => [
      {
        id: data.id!,
        relatedBusinessName: earningForm.relatedBusinessName,
        earningType: earningForm.earningType,
        amountCents: Number(earningForm.amountCents),
        paymentStatus: "pending_approval",
        partnerId: Number(earningForm.partnerId),
      },
      ...prev,
    ]);
    setMessage(`Earning #${data.id} created (pending review).`);
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
    setEarningRows((prev) =>
      prev.map((e) => (e.id === earningId ? { ...e, paymentStatus: status } : e)),
    );
    setMessage(`Earning #${earningId} marked ${status}.`);
  }

  return (
    <div style={{ display: "grid", gap: "1.75rem" }}>
      {message ? <p style={{ margin: 0 }}>{message}</p> : null}

      <section>
        <h2 style={{ fontSize: "1.1rem" }}>Calendar connection</h2>
        <p style={{ opacity: 0.75 }}>
          {calendar.writeEnabled
            ? "KXD Google Calendar is connected for partner discovery booking."
            : `Calendar booking falls back to request mode. Missing: ${
                calendar.missingEnv.join(", ") || "refresh token / credentials"
              }.`}
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: "1.1rem" }}>Referrals</h2>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {rows.map((row) => (
            <article
              key={row.id}
              style={{
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 8,
                padding: "0.9rem 1rem",
              }}
            >
              <strong>
                #{row.id} · {row.businessName}
              </strong>
              <div style={{ opacity: 0.7, fontSize: "0.9rem", marginTop: 4 }}>
                {row.contactName} · Partner {row.sourcedByPartnerName}
                {row.partnerId ? ` (#${row.partnerId})` : ""}
                {row.promotedSalesLeadId
                  ? ` · Sales lead #${row.promotedSalesLeadId}`
                  : ""}
              </div>
              {row.internalNotes ? (
                <div style={{ marginTop: 8, fontSize: "0.85rem" }}>
                  Internal notes: {row.internalNotes}
                </div>
              ) : null}
              <label style={{ display: "block", marginTop: 10, fontSize: "0.85rem" }}>
                Partner-safe status
                <select
                  value={row.partnerVisibilityState}
                  onChange={(e) => updateVisibility(row.id, e.target.value)}
                  style={{ display: "block", marginTop: 4 }}
                >
                  {PARTNER_VISIBILITY_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </label>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: "1.1rem" }}>Earnings ledger</h2>
        <div style={{ display: "grid", gap: "0.65rem", marginBottom: "1rem" }}>
          {earningRows.map((e) => (
            <div
              key={e.id}
              style={{
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 8,
                padding: "0.75rem 0.9rem",
                fontSize: "0.9rem",
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>
                #{e.id} · {e.relatedBusinessName} · {e.earningType} · $
                {(e.amountCents / 100).toFixed(2)} · {e.paymentStatus}
              </span>
              <span style={{ display: "flex", gap: 6 }}>
                {e.paymentStatus === "pending_approval" ? (
                  <button type="button" onClick={() => transitionEarning(e.id, "approved")}>
                    Approve
                  </button>
                ) : null}
                {e.paymentStatus === "approved" ? (
                  <button type="button" onClick={() => transitionEarning(e.id, "paid")}>
                    Mark paid
                  </button>
                ) : null}
                {e.paymentStatus !== "void" && e.paymentStatus !== "paid" ? (
                  <button type="button" onClick={() => transitionEarning(e.id, "void")}>
                    Void
                  </button>
                ) : null}
              </span>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: "1rem" }}>Create earning (pending review)</h3>
        <div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
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
              setEarningForm((s) => ({ ...s, relatedBusinessName: e.target.value }))
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
          <button type="button" onClick={createEarning}>
            Create ledger entry
          </button>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: "1.1rem" }}>Bookings</h2>
        <div style={{ display: "grid", gap: "0.65rem" }}>
          {bookings.map((b) => (
            <div
              key={b.id}
              style={{
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 8,
                padding: "0.75rem 0.9rem",
                fontSize: "0.9rem",
              }}
            >
              #{b.id} · {b.partnerName} · {b.bookingMode} · {b.status}
              {b.slotStart ? ` · ${b.slotStart}` : ""}
              {b.hasGoogleEvent ? " · Google event linked" : " · No Google event"}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: "1.1rem" }}>Commission policy defaults</h2>
        <div style={{ display: "grid", gap: 8, maxWidth: 480 }}>
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
          <button type="button" onClick={savePolicy}>
            Save policy
          </button>
        </div>
      </section>
    </div>
  );
}
