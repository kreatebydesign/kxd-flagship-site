"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { formatEarningsCents, formatHoursFromMinutes, minutesBetween } from "@/lib/junior-creators/week";
import {
  JUNIOR_TIMER_SAFETY,
  shouldShowInactivityWarning,
} from "@/lib/junior-creators/timer-safety";

const C = {
  bgCard: "#101010",
  bgElevated: "#0B0B0B",
  gold: "#C9A962",
  goldDim: "rgba(201,169,98,0.55)",
  cream: "#F5F1E8",
  creamMuted: "rgba(245,241,232,0.72)",
  border: "rgba(255,255,255,0.08)",
  borderGold: "rgba(201,169,98,0.16)",
  sans: "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
  serif: "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
} as const;

const STORAGE_SHIFT_KEY = "kxd.junior.activeShiftId";
const STORAGE_AUTOSTOP_KEY = "kxd.junior.autoStopNotice";

type ActiveShift = {
  id: number;
  startedAt: string;
  hourlyRateCents: number;
  lastActivityAt?: string;
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
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [lastActivityAt, setLastActivityAt] = useState<string | null>(
    activeShift?.lastActivityAt ?? activeShift?.startedAt ?? null,
  );
  const [showStillWorking, setShowStillWorking] = useState(false);
  const [autoStopNotice, setAutoStopNotice] = useState<string | null>(null);
  const lastHeartbeatSentAt = useRef(0);
  const safetyStopInFlight = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync server lastActivityAt when active shift changes
    setLastActivityAt(activeShift?.lastActivityAt ?? activeShift?.startedAt ?? null);
    if (activeShift) {
      try {
        sessionStorage.setItem(STORAGE_SHIFT_KEY, String(activeShift.id));
      } catch {
        /* ignore */
      }
    }
  }, [activeShift]);

  useEffect(() => {
    try {
      const notice = sessionStorage.getItem(STORAGE_AUTOSTOP_KEY);
      if (notice) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time recovery banner from sessionStorage
        setAutoStopNotice(notice);
        sessionStorage.removeItem(STORAGE_AUTOSTOP_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!activeShift) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset live timer UI when shift clears
      setElapsedMinutes(0);
      setShowStillWorking(false);
      return;
    }
    const tick = () => {
      setElapsedMinutes(minutesBetween(new Date(activeShift.startedAt), new Date()));
      const activity = lastActivityAt ?? activeShift.startedAt;
      setShowStillWorking(
        shouldShowInactivityWarning({
          startedAt: activeShift.startedAt,
          lastActivityAt: activity,
        }),
      );
    };
    tick();
    const id = window.setInterval(tick, 5000);
    return () => window.clearInterval(id);
  }, [activeShift, lastActivityAt]);

  const sendHeartbeat = useCallback(async () => {
    if (!activeShift) return;
    const now = Date.now();
    if (now - lastHeartbeatSentAt.current < JUNIOR_TIMER_SAFETY.clientHeartbeatThrottleMs) {
      return;
    }
    lastHeartbeatSentAt.current = now;
    try {
      const res = await fetch("/api/junior-creators/shifts/heartbeat", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) return;
      if (data.active === false && data.autoStopped) {
        try {
          sessionStorage.setItem(
            STORAGE_AUTOSTOP_KEY,
            "Your previous shift was stopped automatically because there was no activity in KXD OS. You can start a new shift when you are ready.",
          );
          sessionStorage.removeItem(STORAGE_SHIFT_KEY);
        } catch {
          /* ignore */
        }
        router.refresh();
        return;
      }
      if (typeof data.lastActivityAt === "string") {
        setLastActivityAt(data.lastActivityAt);
      }
    } catch {
      /* ignore transient heartbeat failures */
    }
  }, [activeShift, router]);

  const triggerSafetyStop = useCallback(async () => {
    if (!activeShift || safetyStopInFlight.current) return;
    safetyStopInFlight.current = true;
    try {
      const res = await fetch("/api/junior-creators/shifts/safety-stop", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.ok) {
        try {
          sessionStorage.setItem(
            STORAGE_AUTOSTOP_KEY,
            "Your shift was stopped automatically due to inactivity in KXD OS. You can start a new shift when you are ready.",
          );
          sessionStorage.removeItem(STORAGE_SHIFT_KEY);
        } catch {
          /* ignore */
        }
        setShowStillWorking(false);
        router.refresh();
      }
    } catch {
      /* cron failsafe will catch abandoned shifts */
    } finally {
      safetyStopInFlight.current = false;
    }
  }, [activeShift, router]);

  // Activity listeners — update lastActivityAt via throttled heartbeat only (no raw event data).
  useEffect(() => {
    if (!activeShift) return;

    const onActivity = () => {
      void sendHeartbeat();
    };

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "focus",
    ];
    for (const event of events) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onActivity);

    return () => {
      for (const event of events) {
        window.removeEventListener(event, onActivity);
      }
      document.removeEventListener("visibilitychange", onActivity);
    };
  }, [activeShift, sendHeartbeat]);

  // Route changes count as activity.
  useEffect(() => {
    if (!activeShift) return;
    const id = window.setTimeout(() => {
      void sendHeartbeat();
    }, 0);
    return () => window.clearTimeout(id);
  }, [pathname, activeShift, sendHeartbeat]);

  // After grace expires client-side, request safety stop (server re-validates).
  useEffect(() => {
    if (!activeShift || !lastActivityAt) return;
    const warningAt =
      new Date(lastActivityAt).getTime() + JUNIOR_TIMER_SAFETY.inactivityWarningMs;
    const graceEnd = warningAt + JUNIOR_TIMER_SAFETY.inactivityGraceMs;
    const msUntilStop = graceEnd - Date.now();
    const id = window.setTimeout(
      () => {
        void triggerSafetyStop();
      },
      Math.max(0, msUntilStop) + 250,
    );
    return () => window.clearTimeout(id);
  }, [activeShift, lastActivityAt, triggerSafetyStop]);

  async function handleStart() {
    setLoading(true);
    setError("");
    setAutoStopNotice(null);
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
      try {
        sessionStorage.removeItem(STORAGE_SHIFT_KEY);
      } catch {
        /* ignore */
      }
      setShowStillWorking(false);
      router.refresh();
    } catch {
      setError("Could not end shift.");
    } finally {
      setLoading(false);
    }
  }

  async function handleKeepWorking() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/junior-creators/shifts/confirm-activity", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (data.code === "NO_ACTIVE_SHIFT") {
          setShowStillWorking(false);
          router.refresh();
          return;
        }
        setError(data.message ?? "Could not confirm activity.");
        return;
      }
      if (data.shift?.lastActivityAt) {
        setLastActivityAt(String(data.shift.lastActivityAt));
      }
      setShowStillWorking(false);
    } catch {
      setError("Could not confirm activity.");
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
        position: "relative",
      }}
    >
      <p
        style={{
          fontFamily: C.sans,
          fontSize: "0.6875rem",
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.3)",
          marginBottom: "0.75rem",
        }}
      >
        Research Shift
      </p>

      {autoStopNotice && !activeShift && (
        <p
          style={{
            fontFamily: C.sans,
            fontSize: "0.8125rem",
            color: C.gold,
            lineHeight: 1.5,
            marginBottom: "0.85rem",
            padding: "0.75rem 0.85rem",
            border: `1px solid ${C.borderGold}`,
            background: "rgba(201,169,98,0.06)",
          }}
        >
          {autoStopNotice}
        </p>
      )}

      {activeShift ? (
        <div>
          <p style={{ fontFamily: C.serif, fontWeight: 400, fontSize: "1.375rem", color: C.gold }}>
            Session in progress
          </p>
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.creamMuted, marginTop: "0.5rem" }}>
            Started {fmtTime(activeShift.startedAt)} · {formatHoursFromMinutes(elapsedMinutes)} elapsed
          </p>
          <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: C.goldDim, marginTop: "0.35rem" }}>
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
              fontSize: "0.8125rem",
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
              fontSize: "0.8125rem",
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
        <p style={{ fontFamily: C.sans, fontSize: "0.8125rem", color: "#e88a8a", marginTop: "0.75rem" }}>
          {error}
        </p>
      )}

      {showStillWorking && activeShift && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="jc-still-working-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: "#121212",
              border: `1px solid ${C.borderGold}`,
              padding: "1.5rem 1.5rem 1.35rem",
            }}
          >
            <p
              id="jc-still-working-title"
              style={{
                fontFamily: C.serif,
                fontSize: "1.5rem",
                color: C.gold,
                marginBottom: "0.65rem",
              }}
            >
              Are you still working?
            </p>
            <p style={{ fontFamily: C.sans, fontSize: "0.875rem", color: C.creamMuted, lineHeight: 1.55 }}>
              We have not seen activity in KXD OS for a while. Confirm to keep your timer running, or stop
              your shift.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={handleKeepWorking}
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.75rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  padding: "0.7rem 1rem",
                  background: `linear-gradient(135deg, ${C.gold} 0%, #d4ba7a 100%)`,
                  color: "#0a0a0a",
                  border: "none",
                  fontWeight: 600,
                  cursor: loading ? "wait" : "pointer",
                }}
              >
                Yes, keep timer running
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleEnd}
                style={{
                  fontFamily: C.sans,
                  fontSize: "0.75rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  padding: "0.7rem 1rem",
                  background: "transparent",
                  color: C.cream,
                  border: `1px solid ${C.border}`,
                  cursor: loading ? "wait" : "pointer",
                }}
              >
                Stop my shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
