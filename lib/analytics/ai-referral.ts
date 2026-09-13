/**
 * Conservative AI referral / source classification for KXD public analytics.
 * Does not overwrite GA4 source/medium — used only as custom event parameters.
 */

import {
  ACQUISITION_VERSION,
  classifyAiReferralSource,
  sanitizeAcquisitionTouch,
  type AcquisitionEnvelopeInput,
  type AcquisitionTouch,
  type AiReferralClass,
} from "./acquisition";

export { classifyAiReferralSource };
export type { AiReferralClass };

export type AcquisitionContext = {
  landing_path?: string;
  captured_utm_source?: string;
  captured_utm_medium?: string;
  captured_utm_campaign?: string;
  captured_utm_term?: string;
  captured_utm_content?: string;
  referrer_host?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  ai_referral_class?: AiReferralClass;
  acquisition_channel?: string;
  acquisition_source?: string;
  acquisition_medium?: string;
};

const SESSION_KEY = "kxd_acq_ctx_v2";
const LEGACY_SESSION_KEY = "kxd_acq_ctx_v1";

type StoredAcquisition = {
  version: typeof ACQUISITION_VERSION;
  firstTouch?: AcquisitionTouch;
};

function hostFromUrl(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return (
      value
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .split("/")[0] ?? ""
    );
  }
}

function readStoredContext(): StoredAcquisition | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAcquisition;
    const firstTouch = sanitizeAcquisitionTouch(parsed?.firstTouch);
    if (parsed?.version !== ACQUISITION_VERSION || !firstTouch) return null;
    return { version: ACQUISITION_VERSION, firstTouch };
  } catch {
    return null;
  }
}

function readLegacyContext(): AcquisitionTouch | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(LEGACY_SESSION_KEY);
    if (!raw) return undefined;
    const legacy = JSON.parse(raw) as AcquisitionContext;
    const referrerHost = legacy.referrer_host?.trim();
    return sanitizeAcquisitionTouch({
      capturedAt: new Date().toISOString(),
      landingPath: legacy.landing_path,
      referrer: referrerHost ? `https://${referrerHost}` : undefined,
      utmSource: legacy.captured_utm_source,
      utmMedium: legacy.captured_utm_medium,
      utmCampaign: legacy.captured_utm_campaign,
    });
  } catch {
    return undefined;
  }
}

function writeStoredContext(ctx: StoredAcquisition): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(ctx));
  } catch {
    // Ignore quota / private-mode failures — attribution simply stays ephemeral.
  }
}

function currentBrowserTouch(): AcquisitionTouch | undefined {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  return sanitizeAcquisitionTouch({
    capturedAt: new Date().toISOString(),
    landingPath: window.location.pathname,
    referrer: document.referrer || undefined,
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
    utmTerm: params.get("utm_term"),
    utmContent: params.get("utm_content"),
    gclid: params.get("gclid"),
    gbraid: params.get("gbraid"),
    wbraid: params.get("wbraid"),
  });
}

/**
 * Capture the first observable marketing-site touch once per browser session.
 * Existing v1 session evidence is retained through the v2 transition.
 */
export function captureBrowserAcquisitionContext():
  | AcquisitionTouch
  | undefined {
  if (typeof window === "undefined") return undefined;

  const stored = readStoredContext();
  if (stored?.firstTouch) return stored.firstTouch;

  const firstTouch = readLegacyContext() || currentBrowserTouch();
  if (!firstTouch) return undefined;

  writeStoredContext({ version: ACQUISITION_VERSION, firstTouch });
  return firstTouch;
}

/**
 * Produce the bounded first-touch + current submission context sent to KXD.
 * The server validates all fields and recomputes derived classification.
 */
export function getBrowserAcquisitionEnvelope(): AcquisitionEnvelopeInput {
  return {
    version: ACQUISITION_VERSION,
    firstTouch: captureBrowserAcquisitionContext(),
    submissionTouch: currentBrowserTouch(),
  };
}

/** Backward-compatible flattened first-touch context for existing GA4 events. */
export function getBrowserAcquisitionContext(): AcquisitionContext {
  const touch = captureBrowserAcquisitionContext();
  if (!touch) return {};
  return {
    landing_path: touch.landingPath,
    captured_utm_source: touch.utmSource,
    captured_utm_medium: touch.utmMedium,
    captured_utm_campaign: touch.utmCampaign,
    captured_utm_term: touch.utmTerm,
    captured_utm_content: touch.utmContent,
    referrer_host: hostFromUrl(touch.referrer),
    gclid: touch.gclid,
    gbraid: touch.gbraid,
    wbraid: touch.wbraid,
    ai_referral_class: touch.aiReferralClass,
    acquisition_channel: touch.channel,
    acquisition_source: touch.source,
    acquisition_medium: touch.medium,
  };
}

/** Flatten acquisition context into GA4 custom event params (omit empties). */
export function acquisitionContextToEventParams(
  ctx: AcquisitionContext,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (ctx.landing_path) out.landing_path = ctx.landing_path;
  if (ctx.captured_utm_source)
    out.captured_utm_source = ctx.captured_utm_source;
  if (ctx.captured_utm_medium)
    out.captured_utm_medium = ctx.captured_utm_medium;
  if (ctx.captured_utm_campaign) {
    out.captured_utm_campaign = ctx.captured_utm_campaign;
  }
  if (ctx.captured_utm_term) out.captured_utm_term = ctx.captured_utm_term;
  if (ctx.captured_utm_content) {
    out.captured_utm_content = ctx.captured_utm_content;
  }
  if (ctx.referrer_host) out.referrer_host = ctx.referrer_host;
  if (ctx.gclid) out.gclid = ctx.gclid;
  if (ctx.gbraid) out.gbraid = ctx.gbraid;
  if (ctx.wbraid) out.wbraid = ctx.wbraid;
  if (ctx.ai_referral_class) out.ai_referral_class = ctx.ai_referral_class;
  if (ctx.acquisition_channel) {
    out.acquisition_channel = ctx.acquisition_channel;
  }
  if (ctx.acquisition_source) out.acquisition_source = ctx.acquisition_source;
  if (ctx.acquisition_medium) out.acquisition_medium = ctx.acquisition_medium;
  return out;
}
