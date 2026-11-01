"use client";

import { useCallback, useEffect, useState } from "react";
import { KxdButton } from "@/components/os";
import { OpsCard, OpsSectionHead, OpsStatusBadge } from "@/components/admin/operations/shared/OpsBriefing";
import type { StaffTimePayRequestView } from "@/lib/staff-pay/employee-view-types";

type OwnerRequest = StaffTimePayRequestView & { staffUserId: number };

export function StaffTimePayRequestsCard({
  onMessage,
  onError,
}: {
  onMessage: (text: string) => void;
  onError: (text: string) => void;
}) {
  const [requests, setRequests] = useState<OwnerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/staff/time/pay-requests");
      const data = (await res.json()) as {
        success?: boolean;
        requests?: OwnerRequest[];
        error?: string;
      };
      if (!res.ok || !data.success || !data.requests) {
        throw new Error(data.error ?? "Could not load employee pay requests.");
      }
      setRequests(data.requests);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not load pay requests.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function resolve(
    requestId: number,
    status: "under_review" | "resolved",
    resolutionKind?: string,
  ) {
    setBusyId(requestId);
    try {
      const res = await fetch(`/api/admin/staff/time/pay-requests/${requestId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ownerNote: notes[requestId]?.trim() || null,
          resolutionKind: resolutionKind ?? null,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string; disclaimer?: string };
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Could not update request.");
      }
      onMessage(data.disclaimer ?? "Request updated. No payroll data was changed automatically.");
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not update request.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <OpsCard>
      <OpsSectionHead label="Employee time & pay requests" count={requests.length} />
      <p className="kxd-os-meta">
        Review Tyler&apos;s acknowledgments, disputes, and historical notes. Resolve here only; import
        backfill and operator shift corrections are separate explicit steps.
      </p>
      {loading ? <p className="kxd-os-meta">Loading…</p> : null}
      {!loading && requests.length === 0 ? (
        <p className="kxd-os-meta">No open employee pay requests.</p>
      ) : null}
      {requests.map((req) => (
        <div
          key={req.id}
          style={{
            borderTop: "1px solid var(--kxd-os-border-subtle, #eee)",
            paddingTop: "0.75rem",
            marginTop: "0.75rem",
          }}
        >
          <p className="kxd-os-ops-list-row__title">
            Request #{req.id} · staff user {req.staffUserId} · {req.requestKind}
          </p>
          <p className="kxd-os-meta">
            {req.localDateKey}
            {req.shiftId ? ` · shift #${req.shiftId}` : ""} ·{" "}
            <OpsStatusBadge label={req.status} variant="warning" />
          </p>
          <p className="kxd-os-meta">{req.employeeNote}</p>
          {req.proposedStartAt || req.proposedEndAt ? (
            <p className="kxd-os-meta">
              Proposed: {req.proposedStartAt ?? "—"} → {req.proposedEndAt ?? "—"}
            </p>
          ) : null}
          <textarea
            className="kxd-os-input"
            rows={2}
            placeholder="Owner note (optional)"
            value={notes[req.id] ?? ""}
            onChange={(e) => setNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
          />
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
            <KxdButton
              type="button"
              variant="secondary"
              disabled={busyId === req.id}
              onClick={() => void resolve(req.id, "under_review")}
            >
              Mark under review
            </KxdButton>
            <KxdButton
              type="button"
              disabled={busyId === req.id}
              onClick={() => void resolve(req.id, "resolved", "owner_review_scheduled")}
            >
              Resolve (schedule review)
            </KxdButton>
            <KxdButton
              type="button"
              variant="secondary"
              disabled={busyId === req.id}
              onClick={() => void resolve(req.id, "resolved", "no_payroll_change")}
            >
              Resolve (no payroll change)
            </KxdButton>
          </div>
        </div>
      ))}
    </OpsCard>
  );
}
