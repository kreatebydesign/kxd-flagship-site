"use client";

import { useEffect, useRef, useState } from "react";
import { formatPartnerCents } from "@/lib/portal/partner/format-cents";
import { partnerPaidSeenStorageKey } from "@/lib/portal/partner/member-browser-state";

type PartnerPaidCountUpProps = {
  partnerId: number;
  paidToDateCents: number;
  className?: string;
};

function readSeen(partnerId: number): number | null {
  try {
    const raw = localStorage.getItem(partnerPaidSeenStorageKey(partnerId));
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
  } catch {
    return null;
  }
}

function writeSeen(partnerId: number, cents: number) {
  try {
    localStorage.setItem(partnerPaidSeenStorageKey(partnerId), String(cents));
  } catch {
    /* private mode */
  }
}

export function PartnerPaidCountUp({
  partnerId,
  paidToDateCents,
  className,
}: PartnerPaidCountUpProps) {
  const safePaid = Math.max(0, Math.floor(paidToDateCents));
  const [displayCents, setDisplayCents] = useState(safePaid);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    if (!Number.isFinite(partnerId) || partnerId <= 0) return;

    let frame = 0;
    const startTimer = window.setTimeout(() => {
      started.current = true;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches;
      const seen = readSeen(partnerId);

      if (safePaid <= 0 || seen == null || seen >= safePaid || reduce) {
        setDisplayCents(safePaid);
        writeSeen(partnerId, safePaid);
        return;
      }

      const from = seen;
      const to = safePaid;
      const duration = 520;
      const start = performance.now();

      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - (1 - t) * (1 - t);
        setDisplayCents(Math.round(from + (to - from) * eased));
        if (t < 1) {
          frame = window.requestAnimationFrame(tick);
        } else {
          writeSeen(partnerId, to);
        }
      };
      frame = window.requestAnimationFrame(tick);
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
      window.cancelAnimationFrame(frame);
    };
  }, [partnerId, safePaid]);

  return (
    <p className={className ?? "kxd-partner-paid__value"}>
      {formatPartnerCents(displayCents)}
    </p>
  );
}
