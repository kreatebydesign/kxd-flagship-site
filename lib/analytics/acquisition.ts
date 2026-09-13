/**
 * KXD first-party acquisition truth.
 *
 * Raw browser evidence is bounded and preserved on the intake record.
 * Channel/source/medium are deterministic classifications of that evidence.
 * Missing evidence is "unknown" — never inferred as direct.
 */

export const ACQUISITION_VERSION = "kxd-acquisition-v1" as const;

export type AiReferralClass =
  | "chatgpt"
  | "perplexity"
  | "claude"
  | "gemini"
  | "copilot"
  | "other-ai";

export type AcquisitionChannel =
  | "organic-search"
  | "paid-search"
  | "ai-referral"
  | "social"
  | "referral"
  | "email"
  | "campaign"
  | "unknown";

export type AcquisitionTouchInput = {
  capturedAt?: unknown;
  landingPath?: unknown;
  referrer?: unknown;
  utmSource?: unknown;
  utmMedium?: unknown;
  utmCampaign?: unknown;
  utmTerm?: unknown;
  utmContent?: unknown;
  gclid?: unknown;
  gbraid?: unknown;
  wbraid?: unknown;
  aiReferralClass?: unknown;
  channel?: unknown;
  source?: unknown;
  medium?: unknown;
  campaign?: unknown;
};

export type AcquisitionTouch = {
  capturedAt?: string;
  landingPath?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  aiReferralClass?: AiReferralClass;
  channel: AcquisitionChannel;
  /** Deterministic source derived from UTM/referrer/click evidence. */
  source?: string;
  /** Deterministic medium derived from UTM/referrer/click evidence. */
  medium?: string;
  /** Exact bounded utmCampaign when supplied; never invented. */
  campaign?: string;
};

export type AcquisitionEnvelopeInput = {
  version?: unknown;
  firstTouch?: unknown;
  submissionTouch?: unknown;
  recordedAt?: unknown;
};

export type PersistedAcquisition = {
  version: typeof ACQUISITION_VERSION;
  recordedAt: string;
  firstTouch?: AcquisitionTouch;
  submissionTouch?: AcquisitionTouch;
};

export type AcquisitionParseResult =
  | { ok: true; value?: PersistedAcquisition }
  | { ok: false; error: string };

const MAX_PAYLOAD_BYTES = 12_000;
const MAX_PATH_LENGTH = 500;
const MAX_REFERRER_LENGTH = 300;
const MAX_UTM_SHORT_LENGTH = 100;
const MAX_UTM_LONG_LENGTH = 200;
const MAX_CLICK_ID_LENGTH = 256;

const AI_CLASSES = new Set<AiReferralClass>([
  "chatgpt",
  "perplexity",
  "claude",
  "gemini",
  "copilot",
  "other-ai",
]);

const CHANNELS = new Set<AcquisitionChannel>([
  "organic-search",
  "paid-search",
  "ai-referral",
  "social",
  "referral",
  "email",
  "campaign",
  "unknown",
]);

const INPUT_TOP_LEVEL_KEYS = new Set([
  "version",
  "firstTouch",
  "submissionTouch",
  "recordedAt",
]);

const INPUT_TOUCH_KEYS = new Set([
  "capturedAt",
  "landingPath",
  "referrer",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmTerm",
  "utmContent",
  "gclid",
  "gbraid",
  "wbraid",
  // Derived values may return from trusted browser helpers, but the server recomputes them.
  "aiReferralClass",
  "channel",
  "source",
  "medium",
  "campaign",
]);

const KXD_HOSTS = new Set(["kreatebydesign.com", "www.kreatebydesign.com"]);

const SEARCH_HOSTS: Record<string, string> = {
  "google.com": "google",
  "www.google.com": "google",
  "bing.com": "bing",
  "www.bing.com": "bing",
  "search.yahoo.com": "yahoo",
  "duckduckgo.com": "duckduckgo",
  "www.ecosia.org": "ecosia",
  "search.brave.com": "brave",
};

const SOCIAL_HOSTS: Record<string, string> = {
  "instagram.com": "instagram",
  "www.instagram.com": "instagram",
  "linkedin.com": "linkedin",
  "www.linkedin.com": "linkedin",
  "facebook.com": "facebook",
  "www.facebook.com": "facebook",
  "t.co": "x",
  "x.com": "x",
  "www.x.com": "x",
};

const PAID_MEDIA = new Set([
  "cpc",
  "ppc",
  "paid",
  "paid-search",
  "paid_search",
  "search-ads",
]);

const SOCIAL_MEDIA = new Set([
  "social",
  "social-media",
  "social_media",
  "organic-social",
  "paid-social",
]);

const SEARCH_SOURCES = new Set([
  "google",
  "bing",
  "yahoo",
  "duckduckgo",
  "ecosia",
  "brave",
]);

const SOCIAL_SOURCES = new Set([
  "instagram",
  "linkedin",
  "facebook",
  "x",
  "twitter",
]);

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
): boolean {
  return Object.keys(value).every((key) => allowed.has(key));
}

function cleanText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
  if (!cleaned) return undefined;
  // Never persist obvious personal identifiers in acquisition labels.
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(cleaned)) return undefined;
  return cleaned;
}

export function sanitizeLandingPath(value: unknown): string | undefined {
  const raw = cleanText(value, MAX_PATH_LENGTH * 2);
  if (!raw || raw.startsWith("//")) return undefined;
  try {
    const parsed = new URL(raw, "https://www.kreatebydesign.com");
    if (!["http:", "https:"].includes(parsed.protocol)) return undefined;
    if (
      /^https?:/i.test(raw) &&
      !KXD_HOSTS.has(parsed.hostname.toLowerCase())
    ) {
      return undefined;
    }
    const pathname = parsed.pathname.replace(/\/{2,}/g, "/");
    if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(pathname)) return undefined;
    return pathname.startsWith("/")
      ? pathname.slice(0, MAX_PATH_LENGTH)
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Preserve referral origin only. Query strings, fragments, credentials, and
 * potentially sensitive path segments never enter the acquisition record.
 */
export function sanitizeReferrer(value: unknown): string | undefined {
  const raw = cleanText(value, 2_000);
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol)) return undefined;
    const host = parsed.hostname.toLowerCase();
    if (!host || KXD_HOSTS.has(host)) return undefined;
    return parsed.origin.slice(0, MAX_REFERRER_LENGTH);
  } catch {
    return undefined;
  }
}

function sanitizeCapturedAt(value: unknown): string | undefined {
  const raw = cleanText(value, 40);
  if (!raw) return undefined;
  const timestamp = new Date(raw);
  if (Number.isNaN(timestamp.getTime())) return undefined;
  const earliest = Date.UTC(2020, 0, 1);
  const latest = Date.now() + 5 * 60 * 1_000;
  if (timestamp.getTime() < earliest || timestamp.getTime() > latest) {
    return undefined;
  }
  return timestamp.toISOString();
}

function sanitizeClickId(value: unknown): string | undefined {
  const raw = cleanText(value, MAX_CLICK_ID_LENGTH + 1);
  if (
    !raw ||
    raw.length > MAX_CLICK_ID_LENGTH ||
    !/^[A-Za-z0-9._~-]+$/.test(raw)
  ) {
    return undefined;
  }
  return raw;
}

function hostFromReferrer(referrer?: string): string {
  if (!referrer) return "";
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function normalizedHostSource(host: string): string | undefined {
  if (!host) return undefined;
  return host.replace(/^www\./, "").slice(0, MAX_UTM_SHORT_LENGTH);
}

/**
 * Classify known AI discovery sources only.
 * Ordinary Bing/Google traffic is never labeled as AI.
 */
export function classifyAiReferralSource(input: {
  utmSource?: string | null;
  referrerHost?: string | null;
}): AiReferralClass | null {
  const utm = (input.utmSource || "").trim().toLowerCase();
  const host = (input.referrerHost || "").trim().toLowerCase();

  if (
    utm === "chatgpt.com" ||
    utm === "chatgpt" ||
    host === "chatgpt.com" ||
    host.endsWith(".chatgpt.com") ||
    host === "chat.openai.com"
  ) {
    return "chatgpt";
  }
  if (
    utm.includes("perplexity") ||
    host === "perplexity.ai" ||
    host.endsWith(".perplexity.ai")
  ) {
    return "perplexity";
  }
  if (
    utm.includes("claude") ||
    host === "claude.ai" ||
    host.endsWith(".claude.ai") ||
    host === "anthropic.com" ||
    host.endsWith(".anthropic.com")
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
    host === "you.com" ||
    host.endsWith(".you.com") ||
    host === "phind.com" ||
    host.endsWith(".phind.com") ||
    utm === "you.com" ||
    utm === "phind"
  ) {
    return "other-ai";
  }
  return null;
}

function deriveClassification(input: {
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
}): {
  channel: AcquisitionChannel;
  source?: string;
  medium?: string;
  campaign?: string;
  aiReferralClass?: AiReferralClass;
} {
  const host = hostFromReferrer(input.referrer);
  const utmSource = input.utmSource?.toLowerCase();
  const utmMedium = input.utmMedium?.toLowerCase();
  const aiReferralClass = classifyAiReferralSource({
    utmSource,
    referrerHost: host,
  });
  const campaign = input.utmCampaign;

  if (input.gclid || input.gbraid || input.wbraid) {
    return {
      channel: "paid-search",
      source:
        utmSource ||
        (host && SEARCH_HOSTS[host]) ||
        (input.gclid || input.gbraid || input.wbraid ? "google" : undefined),
      medium: utmMedium || "paid-search",
      campaign,
      aiReferralClass: aiReferralClass || undefined,
    };
  }

  if (aiReferralClass) {
    return {
      channel: "ai-referral",
      source: utmSource || aiReferralClass,
      medium: utmMedium || "ai-referral",
      campaign,
      aiReferralClass,
    };
  }

  if (utmMedium === "email") {
    return {
      channel: "email",
      source: utmSource,
      medium: utmMedium,
      campaign,
    };
  }

  if (
    (utmMedium && SOCIAL_MEDIA.has(utmMedium)) ||
    (utmSource && SOCIAL_SOURCES.has(utmSource)) ||
    (host && SOCIAL_HOSTS[host])
  ) {
    return {
      channel: "social",
      source: utmSource || SOCIAL_HOSTS[host],
      medium: utmMedium || "social",
      campaign,
    };
  }

  if (
    utmMedium &&
    PAID_MEDIA.has(utmMedium) &&
    ((utmSource && SEARCH_SOURCES.has(utmSource)) ||
      (host && SEARCH_HOSTS[host]))
  ) {
    return {
      channel: "paid-search",
      source: utmSource || SEARCH_HOSTS[host],
      medium: utmMedium,
      campaign,
    };
  }

  if (host && SEARCH_HOSTS[host]) {
    return {
      channel: "organic-search",
      source: utmSource || SEARCH_HOSTS[host],
      medium: utmMedium || "organic",
      campaign,
    };
  }

  if (utmSource || utmMedium || campaign) {
    return {
      channel: "campaign",
      source: utmSource,
      medium: utmMedium,
      campaign,
    };
  }

  if (host) {
    return {
      channel: "referral",
      source: normalizedHostSource(host),
      medium: "referral",
    };
  }

  return { channel: "unknown" };
}

export function sanitizeAcquisitionTouch(
  value: unknown,
): AcquisitionTouch | undefined {
  const input = asObject(value);
  if (!input) return undefined;

  const capturedAt = sanitizeCapturedAt(input.capturedAt);
  const landingPath = sanitizeLandingPath(input.landingPath);
  const referrer = sanitizeReferrer(input.referrer);
  const utmSource = cleanText(input.utmSource, MAX_UTM_SHORT_LENGTH);
  const utmMedium = cleanText(input.utmMedium, MAX_UTM_SHORT_LENGTH);
  const utmCampaign = cleanText(input.utmCampaign, MAX_UTM_LONG_LENGTH);
  const utmTerm = cleanText(input.utmTerm, MAX_UTM_LONG_LENGTH);
  const utmContent = cleanText(input.utmContent, MAX_UTM_LONG_LENGTH);
  const gclid = sanitizeClickId(input.gclid);
  const gbraid = sanitizeClickId(input.gbraid);
  const wbraid = sanitizeClickId(input.wbraid);

  const hasEvidence = Boolean(
    capturedAt ||
    landingPath ||
    referrer ||
    utmSource ||
    utmMedium ||
    utmCampaign ||
    utmTerm ||
    utmContent ||
    gclid ||
    gbraid ||
    wbraid,
  );
  if (!hasEvidence) return undefined;

  const derived = deriveClassification({
    referrer,
    utmSource,
    utmMedium,
    utmCampaign,
    gclid,
    gbraid,
    wbraid,
  });

  return {
    capturedAt,
    landingPath,
    referrer,
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    gclid,
    gbraid,
    wbraid,
    aiReferralClass: derived.aiReferralClass,
    channel: derived.channel,
    source: derived.source,
    medium: derived.medium,
    campaign: derived.campaign,
  };
}

export function parseAcquisitionEnvelope(
  value: unknown,
  now = new Date(),
): AcquisitionParseResult {
  if (value === undefined || value === null) return { ok: true };

  let byteLength = 0;
  try {
    byteLength = new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return { ok: false, error: "Invalid acquisition context." };
  }
  if (byteLength > MAX_PAYLOAD_BYTES) {
    return { ok: false, error: "Acquisition context is too large." };
  }

  const input = asObject(value);
  if (!input || !hasOnlyKeys(input, INPUT_TOP_LEVEL_KEYS)) {
    return { ok: false, error: "Invalid acquisition context." };
  }
  if (input.version !== undefined && input.version !== ACQUISITION_VERSION) {
    return { ok: false, error: "Unsupported acquisition context version." };
  }

  for (const touch of [input.firstTouch, input.submissionTouch]) {
    if (touch === undefined || touch === null) continue;
    const touchObject = asObject(touch);
    if (!touchObject || !hasOnlyKeys(touchObject, INPUT_TOUCH_KEYS)) {
      return { ok: false, error: "Invalid acquisition touch." };
    }
  }

  const firstTouch = sanitizeAcquisitionTouch(input.firstTouch);
  const submissionTouch = sanitizeAcquisitionTouch(input.submissionTouch);
  if (!firstTouch && !submissionTouch) return { ok: true };

  return {
    ok: true,
    value: {
      version: ACQUISITION_VERSION,
      recordedAt: now.toISOString(),
      firstTouch,
      submissionTouch,
    },
  };
}

export function validatePersistedAcquisition(value: unknown): true | string {
  if (value === undefined || value === null) return true;
  const parsed = parseAcquisitionEnvelope(value);
  if (!parsed.ok) return parsed.error;

  const input = asObject(value);
  if (!input || input.version !== ACQUISITION_VERSION) {
    return "Acquisition context version is required.";
  }
  if (!sanitizeCapturedAt(input.recordedAt)) {
    return "Acquisition recordedAt must be a valid timestamp.";
  }

  for (const touchName of ["firstTouch", "submissionTouch"] as const) {
    const touch = asObject(input[touchName]);
    if (!touch) continue;
    const normalized = sanitizeAcquisitionTouch(touch);
    if (!normalized) return `Invalid ${touchName} evidence.`;
    if (!CHANNELS.has(touch.channel as AcquisitionChannel)) {
      return `Invalid ${touchName} channel.`;
    }
    if (
      touch.aiReferralClass !== undefined &&
      !AI_CLASSES.has(touch.aiReferralClass as AiReferralClass)
    ) {
      return `Invalid ${touchName} AI referral class.`;
    }

    for (const key of Object.keys(normalized) as Array<
      keyof AcquisitionTouch
    >) {
      if ((touch[key] ?? undefined) !== (normalized[key] ?? undefined)) {
        return `${touchName} must contain canonical bounded acquisition evidence.`;
      }
    }
  }

  return true;
}

const CHANNEL_LABELS: Record<AcquisitionChannel, string> = {
  "organic-search": "Organic Search",
  "paid-search": "Paid Search",
  "ai-referral": "AI Referral",
  social: "Social",
  referral: "Referral",
  email: "Email",
  campaign: "Campaign",
  unknown: "Unknown / Not captured",
};

export function summarizeAcquisition(value: unknown): {
  label: string;
  landingPath: string | null;
  firstSeenAt: string | null;
} {
  const input = asObject(value);
  const firstTouch = sanitizeAcquisitionTouch(input?.firstTouch);
  if (!firstTouch) {
    return {
      label: CHANNEL_LABELS.unknown,
      landingPath: null,
      firstSeenAt: null,
    };
  }
  const source = firstTouch.source ? ` · ${firstTouch.source}` : "";
  return {
    label: `${CHANNEL_LABELS[firstTouch.channel]}${source}`,
    landingPath: firstTouch.landingPath ?? null,
    firstSeenAt: firstTouch.capturedAt ?? null,
  };
}
