"use client";

import { useCallback, useEffect, useState } from "react";
import { KxdButton } from "@/components/os";
import { OpsCard, OpsSectionHead } from "@/components/admin/operations/shared/OpsBriefing";
import type { StaffEmploymentComplianceRecord } from "@/lib/staff-employment/compliance-types";
import { HARLOW_DOUGLAS_COUNTY_PLANNING_HOURLY_RATE_CENTS } from "@/lib/staff/harlow-staff-constants";

const PLANNING_RATE_LABEL = `$${(HARLOW_DOUGLAS_COUNTY_PLANNING_HOURLY_RATE_CENTS / 100).toFixed(2)}/hr planning baseline`;

export function StaffMinorEmploymentComplianceCard({
  staffUserId,
  staffLabel,
  onMessage,
  onError,
}: {
  staffUserId: number;
  staffLabel: string;
  onMessage: (text: string) => void;
  onError: (text: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [record, setRecord] = useState<StaffEmploymentComplianceRecord | null>(null);
  const [categories, setCategories] = useState("training, internal_operations, assigned_kxd_work");
  const [permitConfirmed, setPermitConfirmed] = useState(false);
  const [payrollConfirmed, setPayrollConfirmed] = useState(false);
  const [rateConfirmed, setRateConfirmed] = useState(false);
  const [paidActivation, setPaidActivation] = useState<"blocked" | "allowed">("blocked");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/staff/payroll/compliance?staffUserId=${staffUserId}`,
        { credentials: "same-origin" },
      );
      const data = (await res.json()) as {
        success?: boolean;
        record?: StaffEmploymentComplianceRecord | null;
        error?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Could not load compliance record.");
      }
      const r = data.record;
      setRecord(r ?? null);
      if (r) {
        setCategories(r.approvedWorkCategories.join(", "));
        setPermitConfirmed(r.oregonPermitConfirmed);
        setPayrollConfirmed(r.payrollSetupConfirmed);
        setRateConfirmed(r.ownerHourlyRateConfirmed);
        setPaidActivation(r.paidShiftActivation);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not load compliance.");
    } finally {
      setLoading(false);
    }
  }, [onError, staffUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/staff/payroll/compliance", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffUserId,
          employmentAuthorizationStatus:
            paidActivation === "allowed" && permitConfirmed && payrollConfirmed && rateConfirmed
              ? "authorized"
              : "pending",
          oregonPermitConfirmed: permitConfirmed,
          approvedWorkCategories: categories
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          schoolDayMaxMinutes: 180,
          nonSchoolDayMaxMinutes: 480,
          weeklyMaxMinutes: 960,
          paidShiftActivation: paidActivation,
          payrollSetupConfirmed: payrollConfirmed,
          ownerHourlyRateConfirmed: rateConfirmed,
          ownerComplianceNote: `Planning rate reference: ${PLANNING_RATE_LABEL}. Owner confirms legal applicability.`,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Could not save compliance.");
      }
      onMessage("Employment compliance record saved.");
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save compliance.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <OpsCard className="kxd-os-staff-docs-operator__section">
      <OpsSectionHead label={`Minor employment compliance · ${staffLabel}`} />
      <p className="kxd-os-meta">
        Owner-managed. Paid shifts default to blocked until authorization, permit confirmation,
        payroll setup, and hourly rate confirmation are complete. {PLANNING_RATE_LABEL} is planning
        only until you confirm the legally applicable rate.
      </p>
      {loading ? (
        <p className="kxd-os-meta">Loading…</p>
      ) : (
        <div className="kxd-os-staff-time__form" style={{ marginTop: "0.75rem" }}>
          <label className="kxd-os-field">
            <span className="kxd-os-meta">Approved work categories (comma-separated)</span>
            <input className="kxd-os-input" value={categories} onChange={(e) => setCategories(e.target.value)} />
          </label>
          <label className="kxd-os-field">
            <input type="checkbox" checked={permitConfirmed} onChange={(e) => setPermitConfirmed(e.target.checked)} />{" "}
            Oregon permit / certificate confirmed
          </label>
          <label className="kxd-os-field">
            <input type="checkbox" checked={payrollConfirmed} onChange={(e) => setPayrollConfirmed(e.target.checked)} />{" "}
            Payroll setup confirmed (no exemption assumptions)
          </label>
          <label className="kxd-os-field">
            <input type="checkbox" checked={rateConfirmed} onChange={(e) => setRateConfirmed(e.target.checked)} />{" "}
            Legally applicable hourly rate confirmed ({PLANNING_RATE_LABEL})
          </label>
          <label className="kxd-os-field">
            <span className="kxd-os-meta">Paid shift activation</span>
            <select
              className="kxd-os-input"
              value={paidActivation}
              onChange={(e) => setPaidActivation(e.target.value === "allowed" ? "allowed" : "blocked")}
            >
              <option value="blocked">Blocked</option>
              <option value="allowed">Allowed</option>
            </select>
          </label>
          {record ? (
            <p className="kxd-os-meta">
              Last updated {new Date(record.updatedAt).toLocaleString()} · status{" "}
              {record.employmentAuthorizationStatus}
            </p>
          ) : (
            <p className="kxd-os-meta">No compliance record yet. Saving creates an auditable record.</p>
          )}
          <KxdButton type="button" variant="primary" disabled={busy} onClick={() => void save()}>
            Save compliance record
          </KxdButton>
        </div>
      )}
    </OpsCard>
  );
}