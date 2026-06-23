"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatEarningsCents, formatHoursFromMinutes, minutesBetween } from "@/lib/junior-creators/week";

const C = {
  bgCard: "#101010",
  bgElevated: "#111111",
  gold: "#C9A962",
  goldDim: "rgba(201,169,98,0.55)",
  cream: "#F5F1E8",
  creamMuted: "rgba(245,241,232,0.72)",
  border: "rgba(255,255,255,0.08)",
  borderGold: "rgba(201,169,98,0.14)",
  sans: "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
  serif: "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
} as const;

type ActiveShift = {
  id: number;
  startedAt: string;
  hourlyRateCents: number;
};

type Props = {
  activeShift: ActiveShift | null;
};

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function JuniorShiftCard({ activeShift }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    if (!activeShift) {
      setElapsedMinutes(0);
      return;
    }
    const tick = () => {
      setElapsedMinutes(minutesBetween(new Date(activeShift.startedAt), new Date()));
    };
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, [activeShift]);

  async function handleStart() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/junior-creators/shifts/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Could not start shift.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not start shift.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnd() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/junior-creators/shifts/end", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Could not end shift.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not end shift.");
    } finally {
      setLoading(false);
    }
  }

  const estimatedLiveCents = activeShift
    ? Math.round((elapsedMinutes * activeShift.hourlyRateCents) / 60)
    : 0;

  return (
    <div
      style={{
        background: C.bgCard,
        border: `1px solid ${C.borderGold}`,
        padding: "1.5rem 1.625rem",
        marginBottom: "2rem",
      }}
    >
      <p
        style={{
          fontFamily: C.sans,
          fontSize: "0.4375rem",
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.3)",
          marginBottom: "0.75rem",
        }}
      >
        Research Shift
      </p>

      {activeShift ? (
        <div>
          <p style={{ fontFamily: C.serif, fontWeight: 400, fontSize: "1.375rem", color: C.gold }}>
            Session in progress
          </p>
          <p style={{ fontFamily: C.sans, fontSize: "0.5625rem", color: C.creamMuted, marginTop: "0.5rem" }}>
            Started {fmtTime(activeShift.startedAt)} · {formatHoursFromMinutes(elapsedMinutes)} elapsed
          </p>
          <p style={{ fontFamily: C.sans, fontSize: "0.5rem", color: C.goldDim, marginTop: "0.35rem" }}>
            Estimated this session · {formatEarningsCents(estimatedLiveCents)} at{" "}
            {formatEarningsCents(activeShift.hourlyRateCents)}/hr
          </p>
        </div>
      ) : (
        <p style={{ fontFamily: C.sans, fontSize: "0.625rem", color: C.creamMuted, lineHeight: 1.5 }}>
          Ready to start your next research session.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        {!activeShift && (
          <button
            type="button"
            disabled={loading}
            onClick={handleStart}
            style={{
              fontFamily: C.sans,
              fontSize: "0.5rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "0.75rem 1.25rem",
              background: `linear-gradient(135deg, ${C.gold} 0%, #d4ba7a 100%)`,
              color: "#0a0a0a",
              border: "none",
              cursor: loading ? "wait" : "pointer",
              fontWeight: 600,
            }}
          >
            Start Shift
          </button>
        )}
        {activeShift && (
          <button
            type="button"
            disabled={loading}
            onClick={handleEnd}
            style={{
              fontFamily: C.sans,
              fontSize: "0.5rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "0.75rem 1.25rem",
              background: C.bgElevated,
              color: C.cream,
              border: `1px solid ${C.borderGold}`,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            End Shift
          </button>
        )}
      </div>

      {error && (
        <p style={{ fontFamily: C.sans, fontSize: "0.5rem", color: "#e88a8a", marginTop: "0.75rem" }}>
          {error}
        </p>
      )}
    </div>
  );
}
