"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  KXD_OFFICIAL_GOLD_LOGO_PATH,
  KXD_PORTAL_INTRO_DURATION_MS,
  KXD_PORTAL_INTRO_SESSION_KEY,
} from "@/lib/ces/portal/brand-signature";

function markIntroSeen(): void {
  try {
    sessionStorage.setItem(KXD_PORTAL_INTRO_SESSION_KEY, "1");
  } catch {
    /* private mode — skip persistence */
  }
}

function introAlreadySeen(): boolean {
  try {
    return sessionStorage.getItem(KXD_PORTAL_INTRO_SESSION_KEY) === "1";
  } catch {
    return true;
  }
}

type IntroPhase = "pending" | "playing" | "hidden";

/**
 * Cinematic KXD mark on first portal shell load per session. Does not gate hydration or data.
 */
export function KxdPortalLoginIntro({ enabled }: { enabled: boolean }) {
  const [phase, setPhase] = useState<IntroPhase>("pending");

  useEffect(() => {
    if (!enabled) {
      setPhase("hidden");
      return;
    }
    if (introAlreadySeen()) {
      setPhase("hidden");
      return;
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      markIntroSeen();
      setPhase("hidden");
      return;
    }
    setPhase("playing");
    const timer = window.setTimeout(() => {
      markIntroSeen();
      setPhase("hidden");
    }, KXD_PORTAL_INTRO_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  if (phase !== "playing") return null;

  return (
    <div className="kxd-portal-intro" role="presentation" aria-hidden="true">
      <div className="kxd-portal-intro__stage">
        <div className="kxd-portal-intro__mark">
          <Image
            src={KXD_OFFICIAL_GOLD_LOGO_PATH}
            alt=""
            width={104}
            height={98}
            className="kxd-portal-intro__logo"
            priority
            sizes="104px"
          />
          <span className="kxd-portal-intro__sweep" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}