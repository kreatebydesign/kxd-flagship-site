"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KxdLogo } from "@/components/ui/KxdLogo";
import type { JuniorCreatorAdminReviewData, AdminCreatorRow, AdminShiftRow } from "@/lib/junior-creators/admin-review-types";
import { formatEarningsCents, formatHoursFromMinutes } from "@/lib/junior-creators/week";

const C = {
  bgPure: "#050505",
  bgBase: "#080808",
  bgElevated: "#0B0B0B",
  bgCard: "#101010",
  gold: "#C9A962",
  goldDim: "rgba(201,169,98,0.55)",
  cream: "#F5F1E8",
  creamMuted: "rgba(245,241,232,0.72)",
  red: "#d25a5a",
  border: "rgba(255,255,255,0.08)",
  borderGold: "rgba(201,169,98,0.16)",
  serif: "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans: "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
} as const;

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontFamily: C.sans,
  fontSize: "0.75rem",
  color: C.cream,
  background: "#0B0B0B",
  border: `1px solid ${C.border}`,
  padding: "0.5rem 0.625rem",
  outline: "none",
};

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p
      style={{
        fontFamily: C.sans,
        fontSize: "0.6875rem",
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.3)",
        ...style,
      }}
    >
      {children}
    </p>
  );
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function ShiftAdminActions({ shift }: { shift: AdminShiftRow }) {
  const router = useRouter();
  const [adminNote, setAdminNote] = useState("");
  const [minutes, setMinutes] = useState(String(shift.totalMinutes));
  const [notes, setNotes] = useState(shift.notes ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/junior-creator-shifts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftId: shift.id, ...body }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Update failed.");
        return;
      }
      setAdminNote("");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (shift.status === "voided") {
    return (
      <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.28)" }}>
        Voided — no further actions.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3" style={{ borderTop: `1px solid ${C.border}`, paddingTop: "0.75rem" }}>
      <div>
        <Label style={{ marginBottom: "0.35rem" }}>Admin Notes</Label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => patch({ action: "updateNotes", notes })}
          style={{
            marginTop: "0.5rem",
            fontFamily: C.sans,
            fontSize: "0.6875rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: C.goldDim,
            background: "transparent",
            border: `1px solid ${C.borderGold}`,
            padding: "0.5rem 0.75rem",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          Save Notes
        </button>
      </div>

      {shift.status === "completed" && (
        <div>
          <Label style={{ marginBottom: "0.35rem" }}>Adjust Minutes (completed)</Label>
          <input
            type="number"
            min={0}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            style={inputStyle}
          />
          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="Required admin note for adjustment…"
            rows={2}
            style={{ ...inputStyle, marginTop: "0.5rem", resize: "vertical" }}
          />
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              patch({
                action: "adjustMinutes",
                totalMinutes: Number(minutes),
                adminNote,
              })
            }
            style={{
              marginTop: "0.5rem",
              fontFamily: C.sans,
              fontSize: "0.6875rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: C.cream,
              background: C.bgElevated,
              border: `1px solid ${C.borderGold}`,
              padding: "0.5rem 0.75rem",
              cursor: loading ? "wait" : "pointer",
            }}
          >
            Save Adjusted Minutes
          </button>
        </div>
      )}

      <div>
        <Label style={{ marginBottom: "0.35rem" }}>Void Shift</Label>
        <textarea
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="Required admin note to void…"
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => patch({ action: "void", adminNote })}
          style={{
            marginTop: "0.5rem",
            fontFamily: C.sans,
            fontSize: "0.6875rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: C.red,
            background: "transparent",
            border: `1px solid rgba(210,90,90,0.35)`,
            padding: "0.5rem 0.75rem",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          Void Shift
        </button>
      </div>

      {error && (
        <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.red }}>{error}</p>
      )}
    </div>
  );
}

function CreatorSection({ creator }: { creator: AdminCreatorRow }) {
  return (
    <section style={{ marginBottom: "2rem" }}>
      <div
        style={{
          background: C.bgCard,
          border: `1px solid ${C.borderGold}`,
          padding: "1.25rem 1.375rem",
          marginBottom: "1px",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p style={{ fontFamily: C.serif, fontSize: "1.25rem", color: C.cream }}>{creator.displayName}</p>
            <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted, marginTop: "0.25rem" }}>
              {creator.email} · {formatEarningsCents(creator.hourlyRateCents)}/hr
              {!creator.active && " · Inactive"}
            </p>
          </div>
          <div className="text-right">
            <Label>This Week</Label>
            <p style={{ fontFamily: C.serif, fontSize: "1.125rem", color: C.gold, marginTop: "0.35rem" }}>
              {creator.weekHoursLabel}
            </p>
            <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted }}>
              Est. {creator.weekEarningsLabel}
            </p>
          </div>
        </div>
        {creator.activeShift && (
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.goldDim, marginTop: "0.75rem" }}>
            Active shift in progress — {formatHoursFromMinutes(creator.activeShift.totalMinutes)} elapsed
          </p>
        )}
      </div>

      {creator.shifts.length === 0 ? (
        <div style={{ background: C.bgElevated, border: `1px solid ${C.border}`, padding: "1rem 1.25rem" }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.3)" }}>No shifts logged.</p>
        </div>
      ) : (
        <div style={{ border: `1px solid ${C.border}` }}>
          {creator.shifts.map((shift, i) => (
            <div
              key={shift.id}
              style={{
                background: C.bgElevated,
                padding: "1rem 1.25rem",
                borderBottom: i < creator.shifts.length - 1 ? `1px solid ${C.border}` : "none",
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p
                    style={{
                      fontFamily: C.sans,
                      fontSize: "0.6875rem",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color:
                        shift.status === "active"
                          ? C.goldDim
                          : shift.status === "voided"
                            ? "rgba(255,255,255,0.28)"
                            : C.creamMuted,
                    }}
                  >
                    {shift.status}
                  </p>
                  <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.cream, marginTop: "0.35rem" }}>
                    {fmtDateTime(shift.startedAt)}
                    {shift.endedAt ? ` → ${fmtDateTime(shift.endedAt)}` : ""}
                  </p>
                  <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.28)", marginTop: "0.25rem" }}>
                    Week {shift.weekKey} · {formatHoursFromMinutes(shift.totalMinutes)} · Est.{" "}
                    {formatEarningsCents(shift.estimatedCents)}
                  </p>
                </div>
                <Link
                  href={`/admin/collections/junior-creator-shifts/${shift.id}`}
                  style={{
                    fontFamily: C.sans,
                    fontSize: "0.6875rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: C.goldDim,
                    textDecoration: "none",
                  }}
                >
                  Payload →
                </Link>
              </div>
              {shift.notes && (
                <p
                  style={{
                    fontFamily: C.sans,
                    fontSize: "0.8125rem",
                    color: C.creamMuted,
                    marginTop: "0.75rem",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {shift.notes}
                </p>
              )}
              <ShiftAdminActions shift={shift} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

type Props = {
  data: JuniorCreatorAdminReviewData;
};

export function JuniorCreatorAdminReview({ data }: Props) {
  return (
    <div style={{ background: C.bgBase, minHeight: "100vh", color: C.cream, fontFamily: C.sans }}>
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: C.bgPure, borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
        <div className="mx-auto max-w-screen-xl" style={{ padding: "1.125rem 1.5rem" }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <KxdLogo />
              <div>
                <p style={{ fontFamily: C.sans, fontWeight: 500, fontSize: "0.8125rem", letterSpacing: "0.16em", textTransform: "uppercase", color: C.creamMuted }}>
                  KXD Academy
                </p>
                <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.24)", marginTop: "0.35rem" }}>
                  Junior Creator Admin
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/os" style={{ fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>
                KXD OS
              </Link>
              <Link href="/admin/collections/junior-creator-shifts" style={{ fontFamily: C.sans, fontSize: "0.8125rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.gold, textDecoration: "none" }}>
                Payload Shifts →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl" style={{ padding: "2.5rem 1.5rem 5rem" }}>
        <div style={{ marginBottom: "2.5rem", paddingBottom: "2rem", borderBottom: `1px solid ${C.border}` }}>
          <Label style={{ color: C.goldDim, marginBottom: "0.875rem" }}>KXD OS · KXD Academy</Label>
          <h1 style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "clamp(1.875rem, 5vw, 3rem)", color: C.cream, lineHeight: 1.05 }}>
            Junior Creator Review
          </h1>
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted, marginTop: "0.75rem", maxWidth: "40rem", lineHeight: 1.6 }}>
            Review shift time, weekly hours, and estimated earnings. Void shifts or adjust completed minutes with a
            required admin note — estimates only, not payroll.
          </p>
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.28)", marginTop: "0.5rem" }}>
            Week of {data.weekKey} (Monday start)
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: "1px", background: C.border, border: `1px solid ${C.border}`, marginBottom: "2.5rem" }}>
          {[
            { label: "Team Hours (Week)", value: data.totals.weekHoursLabel },
            { label: "Est. Earnings (Week)", value: data.totals.weekEarningsLabel },
            { label: "Junior Creators", value: String(data.creators.length) },
            { label: "Active Shifts", value: String(data.totals.activeShifts) },
          ].map((k) => (
            <div key={k.label} style={{ background: C.bgElevated, padding: "1.25rem 1.375rem" }}>
              <Label>{k.label}</Label>
              <p style={{ fontFamily: C.serif, fontWeight: 300, fontSize: "1.35rem", color: C.cream, marginTop: "0.5rem" }}>
                {k.value}
              </p>
            </div>
          ))}
        </div>

        {data.creators.length === 0 ? (
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "rgba(255,255,255,0.3)" }}>
            No junior creator users yet. Add accounts in Payload.
          </p>
        ) : (
          data.creators.map((creator) => <CreatorSection key={creator.id} creator={creator} />)
        )}
      </div>
    </div>
  );
}
