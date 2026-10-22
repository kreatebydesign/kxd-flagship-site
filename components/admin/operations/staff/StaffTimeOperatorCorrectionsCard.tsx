"use client";

import { useState } from "react";
import { KxdButton } from "@/components/os";
import { OpsCard, OpsSectionHead } from "@/components/admin/operations/shared/OpsBriefing";
import type { StaffOversightData } from "@/lib/staff/types";

type Member = StaffOversightData["members"][number];

export function StaffTimeOperatorCorrectionsCard({
  members,
  onMessage,
  onError,
  onDone,
}: {
  members: Member[];
  onMessage: (text: string) => void;
  onError: (text: string) => void;
  onDone: () => void;
}) {
  const firstId = members[0]?.userId ?? "";
  const [mode, setMode] = useState<"historical" | "correct">("historical");
  const [staffUserId, setStaffUserId] = useState(String(firstId));
  const [shiftId, setShiftId] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [endedAt, setEndedAt] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!reason.trim() || reason.trim().length < 8) {
      onError("Enter a correction reason (at least 8 characters).");
      return;
    }
    setBusy(true);
    try {
      if (mode === "historical") {
        if (!staffUserId || !startedAt || !endedAt) {
          throw new Error("Staff member, start, and end are required.");
        }
        const res = await fetch("/api/admin/staff/time/operator/historical-shift", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staffUserId: Number(staffUserId),
            workTimezone: "America/Los_Angeles",
            startedAt: new Date(startedAt).toISOString(),
            endedAt: new Date(endedAt).toISOString(),
            reason: reason.trim(),
            workIntent: { category: "internal_operations" },
          }),
        });
        const payload = (await res.json()) as {
          success?: boolean;
          error?: string;
          shift?: { id: number };
        };
        if (!res.ok || payload.success === false) {
          throw new Error(payload.error ?? "Historical shift could not be created.");
        }
        onMessage(
          payload.shift
            ? `Historical shift #${payload.shift.id} recorded with audit trail.`
            : "Historical shift recorded.",
        );
      } else {
        const id = Number(shiftId);
        if (!Number.isFinite(id) || id <= 0) {
          throw new Error("Enter a valid shift id.");
        }
        if (!startedAt && !endedAt) {
          throw new Error("Provide a corrected start or end time.");
        }
        const res = await fetch(
          `/api/admin/staff/time/operator/shifts/${id}/correct`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reason: reason.trim(),
              startedAt: startedAt ? new Date(startedAt).toISOString() : null,
              endedAt: endedAt ? new Date(endedAt).toISOString() : null,
            }),
          },
        );
        const payload = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || payload.success === false) {
          throw new Error(payload.error ?? "Shift could not be corrected.");
        }
        onMessage(`Shift #${id} corrected; prior values preserved in audit history.`);
      }
      setReason("");
      setStartedAt("");
      setEndedAt("");
      setShiftId("");
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Correction failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ marginTop: "1.5rem" }} aria-label="Operator time corrections">
      <OpsSectionHead label="Time corrections" />
      <OpsCard className="kxd-os-ops-card-padding">
        <p className="kxd-os-meta" style={{ marginBottom: "0.75rem" }}>
          Founder-only. Creates audited historical shifts or adjusts shift boundaries. Does not
          run payroll or change rates.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <KxdButton
            type="button"
            size="sm"
            variant={mode === "historical" ? "primary" : "ghost"}
            onClick={() => setMode("historical")}
          >
            Historical entry
          </KxdButton>
          <KxdButton
            type="button"
            size="sm"
            variant={mode === "correct" ? "primary" : "ghost"}
            onClick={() => setMode("correct")}
          >
            Correct shift
          </KxdButton>
        </div>
        {mode === "historical" ? (
          <label className="kxd-os-meta" style={{ display: "block", marginBottom: "0.5rem" }}>
            Staff member
            <select
              className="kxd-os-input"
              style={{ display: "block", width: "100%", marginTop: "0.35rem" }}
              value={staffUserId}
              onChange={(e) => setStaffUserId(e.target.value)}
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="kxd-os-meta" style={{ display: "block", marginBottom: "0.5rem" }}>
            Shift id
            <input
              className="kxd-os-input"
              style={{ display: "block", width: "100%", marginTop: "0.35rem" }}
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              placeholder="e.g. 2"
            />
          </label>
        )}
        <label className="kxd-os-meta" style={{ display: "block", marginBottom: "0.5rem" }}>
          {mode === "correct" ? "Corrected start (optional)" : "Start (Pacific)"}
          <input
            type="datetime-local"
            className="kxd-os-input"
            style={{ display: "block", width: "100%", marginTop: "0.35rem" }}
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
          />
        </label>
        {mode === "historical" || mode === "correct" ? (
          <label className="kxd-os-meta" style={{ display: "block", marginBottom: "0.5rem" }}>
            {mode === "correct" ? "Corrected end (optional)" : "End (Pacific)"}
            <input
              type="datetime-local"
              className="kxd-os-input"
              style={{ display: "block", width: "100%", marginTop: "0.35rem" }}
              value={endedAt}
              onChange={(e) => setEndedAt(e.target.value)}
            />
          </label>
        ) : null}
        <label className="kxd-os-meta" style={{ display: "block", marginBottom: "0.75rem" }}>
          Reason (required)
          <textarea
            className="kxd-os-input"
            style={{ display: "block", width: "100%", minHeight: "3.5rem", marginTop: "0.35rem" }}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why this correction is accurate and authorized…"
          />
        </label>
        <KxdButton type="button" loading={busy} onClick={submit}>
          {mode === "historical" ? "Record historical shift" : "Apply correction"}
        </KxdButton>
      </OpsCard>
    </section>
  );
}
