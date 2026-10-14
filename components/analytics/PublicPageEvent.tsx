"use client";

import { useEffect, useRef } from "react";
import { trackPublicEvent } from "@/lib/analytics/track";

type PublicPageEventProps = {
  eventName: string;
  params?: Record<string, string | undefined>;
};

/** Fire a GA4 event once per mount (production hosts only). */
export function PublicPageEvent({ eventName, params }: PublicPageEventProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackPublicEvent(eventName, params);
    // Intentionally mount-once — params are fixed for the page instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventName]);

  return null;
}
