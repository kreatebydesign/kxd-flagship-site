"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  KXD_OFFICIAL_GOLD_LOGO_PATH,
  KXD_PORTAL_ATTRIBUTION_COPY,
  KXD_SIGNATURE_EXPERIENCE_DURATION_MS,
  KXD_SIGNATURE_HEADLINE,
} from "@/lib/ces/portal/brand-signature";
import {
  armSignatureVeilIfNeeded,
  clearSignatureVeil,
  KXD_SIGNATURE_FAILSAFE_MS,
  markSignatureSeen,
  shouldPlaySignature,
} from "@/lib/ces/portal/signature-session";

type PlayState = "hidden" | "playing";

function finishExperience(clientId: number): void {
  markSignatureSeen(clientId);
  clearSignatureVeil();
}

/**
 * KXD Signature Experience V2 — cinematic intro once per client per tab session.
 * Dashboard loads underneath; veil prevents flash. Does not block data or auth.
 */
export function KxdSignatureExperience({
  enabled,
  clientId,
}: {
  enabled: boolean;
  clientId: number;
}) {
  const [state, setState] = useState<PlayState>(() => {
    if (!enabled || clientId <= 0) return "hidden";
    if (typeof window === "undefined") return "playing";
    return shouldPlaySignature(clientId, enabled) ? "playing" : "hidden";
  });

  useEffect(() => {
    if (!enabled || clientId <= 0) {
      setState("hidden");
      clearSignatureVeil();
      return;
    }

    armSignatureVeilIfNeeded(clientId, enabled);

    if (!shouldPlaySignature(clientId, enabled)) {
      setState("hidden");
      clearSignatureVeil();
      return;
    }

    setState("playing");

    const completeTimer = window.setTimeout(() => {
      finishExperience(clientId);
      setState("hidden");
    }, KXD_SIGNATURE_EXPERIENCE_DURATION_MS);

    const failsafeTimer = window.setTimeout(() => {
      finishExperience(clientId);
      setState("hidden");
    }, KXD_SIGNATURE_FAILSAFE_MS);

    return () => {
      window.clearTimeout(completeTimer);
      window.clearTimeout(failsafeTimer);
    };
  }, [enabled, clientId]);

  if (state !== "playing") return null;

  return (
    <div
      className="kxd-signature-experience"
      role="presentation"
      aria-hidden="true"
      data-kxd-signature-live="true"
    >
      <div className="kxd-signature-experience__inner">
        <span className="kxd-signature-experience__line" aria-hidden="true" />
        <div className="kxd-signature-experience__logo-wrap">
          <Image
            src={KXD_OFFICIAL_GOLD_LOGO_PATH}
            alt=""
            width={104}
            height={98}
            className="kxd-signature-experience__logo"
            priority
            sizes="(max-width: 430px) 88px, 104px"
          />
          <span className="kxd-signature-experience__logo-sheen" aria-hidden="true" />
        </div>
        <div className="kxd-signature-experience__copy">
          <p className="kxd-signature-experience__headline">{KXD_SIGNATURE_HEADLINE}</p>
          <p className="kxd-signature-experience__attribution">{KXD_PORTAL_ATTRIBUTION_COPY}</p>
        </div>
      </div>
    </div>
  );
}