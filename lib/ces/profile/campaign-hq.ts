/**
 * Reusable Campaign HQ CES experience preset.
 *
 * Campaign clients (political/short-term) consume this shared architecture via
 * client-experience-profiles configuration — not a forked portal shell.
 *
 * Client-specific brand colors, logos, and commercial records stay on the
 * client / brand-kit / contract records.
 */

export const CAMPAIGN_HQ_EXPERIENCE_KIND = "campaign-hq";

/** Terminology key marking a CES profile as Campaign HQ. */
export const CAMPAIGN_HQ_KIND_TERMINOLOGY_KEY = "ces.experienceKind";

/**
 * Recommended portal + reporting capability keys for Campaign HQ.
 * Stored in client-experience-profiles.enabledModules (mixed CES + HQ + reporting).
 */
export const CAMPAIGN_HQ_RECOMMENDED_MODULES = [
  "website-review",
  "website-analytics",
  "seo",
  "resources",
] as const;

/**
 * Keys that must remain authoritative when applying Campaign HQ to an existing
 * profile. Non-listed existing keys (including rich website-review.* copy) are
 * preserved; HQ defaults fill gaps only.
 */
export const CAMPAIGN_HQ_AUTHORITATIVE_TERMINOLOGY_KEYS = [
  CAMPAIGN_HQ_KIND_TERMINOLOGY_KEY,
  "nav.website-review",
  "nav.resources",
  "nav.analytics",
  "nav.website-health",
  "portal.home.workspaceLabel",
  "portal.home.eyebrow",
  "portal.home.lead",
  "portal.engagement.eyebrow",
  "portal.engagement.title",
  "resources.eyebrow",
  "resources.lead",
] as const;

export const CAMPAIGN_HQ_EXPERIENCE_DEFAULTS = {
  status: "active" as const,
  welcomeEyebrow: "Campaign HQ",
  reassuranceLine: "Your campaign workspace — clear, calm, and up to date.",
  supportTone: "direct" as const,
  portalSidebarLabel: "Campaign HQ",
  showKxdPartnerMark: true,
  partnerFooterLine: "Powered by KXD OS",
  borderRadiusPreset: "default" as const,
  motionPreset: "calm" as const,
  enabledModules: [...CAMPAIGN_HQ_RECOMMENDED_MODULES],
  terminology: {
    [CAMPAIGN_HQ_KIND_TERMINOLOGY_KEY]: CAMPAIGN_HQ_EXPERIENCE_KIND,
    "nav.website-review": "Website",
    "nav.resources": "Brand Kit & Resources",
    "nav.analytics": "Performance",
    "nav.website-health": "Website Health",
    "portal.home.workspaceLabel": "Campaign HQ",
    "portal.home.eyebrow": "Campaign HQ",
    "portal.home.lead":
      "Everything Kreate by Design is actively delivering for your campaign — website, creative support, and visibility.",
    "portal.home.launch.eyebrow": "Getting started",
    "portal.home.launch.title": "What to do first",
    "portal.home.launch.lead":
      "Your Campaign HQ is ready. Review the site, share updates, and keep brand materials in one place.",
    "portal.home.launch.leadActive":
      "Keep momentum — review the site, submit notes, and find approved brand materials here.",
    "portal.home.launch.step1": "Open your campaign website and review key pages.",
    "portal.home.launch.step2": "Submit feedback through Website Review.",
    "portal.home.launch.step3": "Use Brand Kit & Resources for approved marks and references.",
    "portal.home.launch.step4": "We'll review your notes and keep this workspace updated.",
    "portal.home.stat.active": "Active updates",
    "portal.home.stat.awaiting": "Waiting on you",
    "portal.home.stat.current": "Current review",
    "portal.home.stat.clear": "You're all caught up.",
    "portal.home.currentStatus": "Current website review",
    "portal.home.openRevision": "Open this update",
    "portal.home.cta.latestRevision": "Open latest update",
    "portal.home.recentRevisions": "Recent updates",
    "portal.home.module.activeCount": "Updates in progress",
    "website-review.landing.title": "Website",
    "website-review.landing.lead":
      "Review the campaign site, leave precise feedback, and follow every update with clarity.",
    "website-review.landing.eyebrow": "Campaign website",
    "website-review.request.eyebrow": "New update",
    "website-review.detail.eyebrow": "Update details",
    "website-review.cta.request": "Request an update",
    "website-review.cta.visual": "Review website",
    "portal.home.currentWork": "Current campaign work",
    "portal.home.website": "Website",
    "portal.home.recentActivity": "Recent activity",
    "portal.home.deliverables": "Latest deliverables",
    "portal.home.quickActions": "Quick actions",
    "portal.home.quick.review-website": "Review website",
    "portal.home.quick.start-review": "Request an update",
    "portal.home.quick.upload-assets": "Brand Kit & Resources",
    "portal.home.quick.message-kxd": "Message KXD",
    "portal.home.viewAllRevisions": "View all updates",
    "portal.engagement.eyebrow": "Active engagement",
    "portal.engagement.title": "Your campaign support",
    "resources.eyebrow": "Library",
    "resources.lead":
      "Approved campaign Brand Kit materials and references for your workspace.",
  } as Record<string, string>,
};

export function isCampaignHqExperience(input: {
  terminology?: Record<string, string> | null;
}): boolean {
  const kind = input.terminology?.[CAMPAIGN_HQ_KIND_TERMINOLOGY_KEY]?.trim().toLowerCase();
  return kind === CAMPAIGN_HQ_EXPERIENCE_KIND;
}

/**
 * Deliberate Campaign HQ terminology merge:
 * 1. Preserve existing non-overlapping client copy
 * 2. Fill gaps from Campaign HQ defaults
 * 3. Force authoritative HQ experience/nav/home keys
 * 4. Always set experience kind
 */
export function mergeCampaignHqTerminology(
  existing?: Record<string, string> | null,
  overrides?: Record<string, string> | null,
): Record<string, string> {
  const existingClean = sanitizeTerminology(existing);
  const overrideClean = sanitizeTerminology(overrides);
  const defaults = CAMPAIGN_HQ_EXPERIENCE_DEFAULTS.terminology;

  const merged: Record<string, string> = { ...existingClean };

  for (const [key, value] of Object.entries(defaults)) {
    if (!(key in merged)) merged[key] = value;
  }

  for (const key of CAMPAIGN_HQ_AUTHORITATIVE_TERMINOLOGY_KEYS) {
    const fromOverride = overrideClean[key];
    const fromDefault = defaults[key];
    if (fromOverride) merged[key] = fromOverride;
    else if (fromDefault) merged[key] = fromDefault;
  }

  for (const [key, value] of Object.entries(overrideClean)) {
    if (
      !(CAMPAIGN_HQ_AUTHORITATIVE_TERMINOLOGY_KEYS as readonly string[]).includes(key)
    ) {
      merged[key] = value;
    }
  }

  merged[CAMPAIGN_HQ_KIND_TERMINOLOGY_KEY] = CAMPAIGN_HQ_EXPERIENCE_KIND;
  return merged;
}

function sanitizeTerminology(
  value?: Record<string, string> | null,
): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "string" && raw.trim()) out[key] = raw.trim();
  }
  return out;
}

/**
 * Merge Campaign HQ defaults with client-specific overrides.
 * Brand colors belong on the brand kit / profile visual fields — not hardcoded here.
 */
export function buildCampaignHqProfileConfig(input: {
  profileName: string;
  portalSidebarLabel?: string;
  terminology?: Record<string, string>;
  /** Extra terminology overlays applied after existing (non-authoritative keys only unless listed). */
  terminologyOverrides?: Record<string, string>;
  enabledModules?: readonly string[];
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  surfaceTint?: string | null;
}): {
  profileName: string;
  status: "active";
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  surfaceTint?: string | null;
  borderRadiusPreset: "default";
  motionPreset: "calm";
  welcomeEyebrow: string;
  reassuranceLine: string;
  supportTone: "direct";
  portalSidebarLabel: string;
  enabledModules: string[];
  showKxdPartnerMark: boolean;
  partnerFooterLine: string;
  terminology: Record<string, string>;
} {
  return {
    profileName: input.profileName,
    status: CAMPAIGN_HQ_EXPERIENCE_DEFAULTS.status,
    ...(input.primaryColor ? { primaryColor: input.primaryColor } : {}),
    ...(input.secondaryColor ? { secondaryColor: input.secondaryColor } : {}),
    ...(input.accentColor ? { accentColor: input.accentColor } : {}),
    ...(input.surfaceTint !== undefined ? { surfaceTint: input.surfaceTint } : {}),
    borderRadiusPreset: CAMPAIGN_HQ_EXPERIENCE_DEFAULTS.borderRadiusPreset,
    motionPreset: CAMPAIGN_HQ_EXPERIENCE_DEFAULTS.motionPreset,
    welcomeEyebrow: CAMPAIGN_HQ_EXPERIENCE_DEFAULTS.welcomeEyebrow,
    reassuranceLine: CAMPAIGN_HQ_EXPERIENCE_DEFAULTS.reassuranceLine,
    supportTone: CAMPAIGN_HQ_EXPERIENCE_DEFAULTS.supportTone,
    portalSidebarLabel:
      input.portalSidebarLabel?.trim() ||
      CAMPAIGN_HQ_EXPERIENCE_DEFAULTS.portalSidebarLabel,
    enabledModules: [...(input.enabledModules ?? CAMPAIGN_HQ_EXPERIENCE_DEFAULTS.enabledModules)],
    showKxdPartnerMark: CAMPAIGN_HQ_EXPERIENCE_DEFAULTS.showKxdPartnerMark,
    partnerFooterLine: CAMPAIGN_HQ_EXPERIENCE_DEFAULTS.partnerFooterLine,
    terminology: mergeCampaignHqTerminology(
      input.terminology,
      input.terminologyOverrides,
    ),
  };
}
