"use client";

import { useEffect } from "react";
import { captureBrowserAcquisitionContext } from "@/lib/analytics/ai-referral";

/**
 * Captures the first observable marketing-site touch before a visitor reaches
 * an inquiry form. Session storage only; no cookie, identity, or fingerprint.
 */
export function AcquisitionSessionCapture() {
  useEffect(() => {
    captureBrowserAcquisitionContext();
  }, []);

  return null;
}
