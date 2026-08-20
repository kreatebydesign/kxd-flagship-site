/**
 * Conservative AI referral / source classification for KXD public analytics.
 * Does not overwrite GA4 source/medium — used only as custom event parameters.
 */

export type AiReferralClass =
  | "chatgpt"
  | "perplexity"
  | "claude"
  | "gemini"
  | "copilot"
  | "other-ai";

export type AcquisitionContext = {
  landing_path?: string;
  captured_utm_source?: string;
  captured_utm_medium?: string;
  captured_utm_campaign?: string;
  referrer_host?: string;
  ai_referral_class?: AiReferralClass;
};

const SESSION_KEY = "kxd_acq_ctx_v1";

function hostFromUrl(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return value.toLowerCase().replace(/^https?:\/\//, "").split("/")[0] ?? "";
  }
}

/**
 * Classify known AI discovery sources only.
 * Ordinary Bing/Google search traffic is never labeled as AI.
 */
export function classifyAiReferralSource(input: {
  utmSource?: string | null;
  referrerHost?: string | null;
}): AiReferralClass | null {
  const utm = (input.utmSource || "").trim().toLowerCase();
  const host = (input.referrerHost || "").trim().toLowerCase();
  const haystack = `${utm} ${host}`.trim();
  if (!haystack) return null;

  if (
    utm === "chatgpt.com" ||
    utm === "chatgpt" ||
    host === "chatgpt.com" ||
    host.endsWith(".chatgpt.com") ||
    host === "chat.openai.com"
  ) {
    return "chatgpt";
  }

  if (utm.includes("perplexity") || host.includes("perplexity")) {
    return "perplexity";
  }

  if (
    utm.includes("claude") ||
    host === "claude.ai" ||
    host.endsWith(".claude.ai") ||
    host.includes("anthropic.com")
  ) {
    return "claude";
  }

  if (
    utm.includes("gemini") ||
    host === "gemini.google.com" ||
    host.endsWith(".gemini.google.com") ||
    host === "bard.google.com"
  ) {
    return "gemini";
  }

  if (
    utm.includes("copilot") ||
    host === "copilot.microsoft.com" ||
    host.endsWith(".copilot.microsoft.com")
  ) {
    return "copilot";
  }

  if (
    host.includes("you.com") ||
    host.includes("phind.com") ||
    utm === "you.com" ||
    utm === "phind"
  ) {
    return "other-ai";
  }

  return null;
}

function readStoredContext(): AcquisitionContext {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AcquisitionContext;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredContext(ctx: AcquisitionContext): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(ctx));
  } catch {
    // Ignore quota / private-mode failures — attribution simply stays ephemeral.
  }
}

/**
 * Capture landing UTMs / referrer once per session.
 * Later navigations keep the first non-empty values; fresh URL UTMs still win.
 * Does not mutate GA4 automatic source/medium.
 */
export function getBrowserAcquisitionContext(): AcquisitionContext {
  if (typeof window === "undefined") return {};

  const stored = readStoredContext();
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source") || stored.captured_utm_source || "";
  const utmMedium = params.get("utm_medium") || stored.captured_utm_medium || "";
  const utmCampaign =
    params.get("utm_campaign") || stored.captured_utm_campaign || "";

  let referrerHost = stored.referrer_host || "";
  if (!referrerHost && document.referrer) {
    referrerHost = hostFromUrl(document.referrer);
    // Ignore self-referrals on the marketing site.
    if (
      referrerHost === "kreatebydesign.com" ||
      referrerHost === "www.kreatebydesign.com"
    ) {
      referrerHost = "";
    }
  }

  const landingPath =
    stored.landing_path ||
    `${window.location.pathname}${window.location.search}` ||
    undefined;

  const aiClass = classifyAiReferralSource({
    utmSource,
    referrerHost,
  });

  const next: AcquisitionContext = {
    landing_path: landingPath,
    captured_utm_source: utmSource || undefined,
    captured_utm_medium: utmMedium || undefined,
    captured_utm_campaign: utmCampaign || undefined,
    referrer_host: referrerHost || undefined,
    ai_referral_class: aiClass || undefined,
  };

  writeStoredContext(next);
  return next;
}

/** Flatten acquisition context into GA4 custom event params (omit empties). */
export function acquisitionContextToEventParams(
  ctx: AcquisitionContext,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (ctx.landing_path) out.landing_path = ctx.landing_path;
  if (ctx.captured_utm_source) out.captured_utm_source = ctx.captured_utm_source;
  if (ctx.captured_utm_medium) out.captured_utm_medium = ctx.captured_utm_medium;
  if (ctx.captured_utm_campaign) {
    out.captured_utm_campaign = ctx.captured_utm_campaign;
  }
  if (ctx.referrer_host) out.referrer_host = ctx.referrer_host;
  if (ctx.ai_referral_class) out.ai_referral_class = ctx.ai_referral_class;
  return out;
}
