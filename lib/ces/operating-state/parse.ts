/**
 * Parse CES operatingState JSON into a typed config. Safe defaults — never throws.
 */

import type {
  ClientOperatingContent,
  ClientOperatingStateConfig,
} from "./types";

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

function parseRecentProgress(raw: unknown): ClientOperatingContent["recentProgress"] {
  if (!Array.isArray(raw)) return null;
  const items = raw
    .map((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) return null;
      const item = row as Record<string, unknown>;
      const id = asTrimmedString(item.id);
      const label = asTrimmedString(item.label);
      if (!id || !label) return null;
      return {
        id,
        label,
        detail: asTrimmedString(item.detail),
        at: asTrimmedString(item.at),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);
  return items.length > 0 ? items : null;
}

function parseWebsiteHealth(
  raw: unknown,
): ClientOperatingContent["websiteHealth"] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const h = raw as Record<string, unknown>;
  const required = [
    "serviceValue",
    "serviceDetail",
    "speedValue",
    "speedDetail",
    "searchFoundationValue",
    "searchFoundationDetail",
    "activityValueWhenConfigured",
    "activityValueWhenPending",
    "activityDetailWhenPending",
    "releaseValue",
    "releaseDetail",
  ] as const;
  const parsed: Record<string, string> = {};
  for (const key of required) {
    const value = asTrimmedString(h[key]);
    if (!value) return null;
    parsed[key] = value;
  }
  return parsed as NonNullable<ClientOperatingContent["websiteHealth"]>;
}

function parseContent(raw: unknown): ClientOperatingContent | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const c = raw as Record<string, unknown>;
  const content: ClientOperatingContent = {
    recommendationHeadline: asTrimmedString(c.recommendationHeadline),
    recommendationRationale: asTrimmedString(c.recommendationRationale),
    primaryActionLabel: asTrimmedString(c.primaryActionLabel),
    primaryActionHref: asTrimmedString(c.primaryActionHref),
    secondaryActionLabel: asTrimmedString(c.secondaryActionLabel),
    secondaryActionHref: asTrimmedString(c.secondaryActionHref),
    momentumLabel: asTrimmedString(c.momentumLabel),
    momentumDetail: asTrimmedString(c.momentumDetail),
    websitePanelNote: asTrimmedString(c.websitePanelNote),
    adsPanelNote: asTrimmedString(c.adsPanelNote),
    searchPanelFallback: asTrimmedString(c.searchPanelFallback),
    introduction: asTrimmedString(c.introduction),
    collaborationStatusLabel: asTrimmedString(c.collaborationStatusLabel),
    collaborationExplanation: asTrimmedString(c.collaborationExplanation),
    outstandingKxdAction: asTrimmedString(c.outstandingKxdAction),
    homePerformanceNote: asTrimmedString(c.homePerformanceNote),
    recentProgress: parseRecentProgress(c.recentProgress),
    websiteHealth: parseWebsiteHealth(c.websiteHealth),
  };
  const hasAny = Object.values(content).some((v) => v != null);
  return hasAny ? content : null;
}

/**
 * Normalize unknown JSON (Payload field or content pack) into operating config.
 * Empty / invalid → null (caller uses safe existing fallbacks).
 */
export function parseOperatingStateConfig(
  value: unknown,
): ClientOperatingStateConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;

  const modeRaw = asTrimmedString(raw.mode);
  const mode =
    modeRaw === "post-launch" || modeRaw === "standard" ? modeRaw : null;

  const baselineRaw =
    raw.baseline && typeof raw.baseline === "object" && !Array.isArray(raw.baseline)
      ? (raw.baseline as Record<string, unknown>)
      : null;

  const config: ClientOperatingStateConfig = {
    phase: asTrimmedString(raw.phase),
    currentPriority: asTrimmedString(raw.currentPriority),
    watching: asTrimmedString(raw.watching),
    recentWin: asTrimmedString(raw.recentWin),
    mode,
    productionVerified: asBoolean(raw.productionVerified),
    baseline: baselineRaw
      ? {
          established: asBoolean(baselineRaw.established) ?? undefined,
          date: asTrimmedString(baselineRaw.date),
          label: asTrimmedString(baselineRaw.label),
        }
      : null,
    content: parseContent(raw.content),
  };

  const hasIntent =
    config.phase != null ||
    config.currentPriority != null ||
    config.watching != null ||
    config.recentWin != null ||
    config.mode != null ||
    config.productionVerified != null ||
    config.baseline != null ||
    config.content != null;

  return hasIntent ? config : null;
}

/** Merge pack defaults under persisted config (persisted wins). */
export function mergeOperatingStateConfig(
  base: ClientOperatingStateConfig | null,
  overlay: ClientOperatingStateConfig | null,
): ClientOperatingStateConfig | null {
  if (!base && !overlay) return null;
  if (!base) return overlay;
  if (!overlay) return base;

  return {
    phase: overlay.phase ?? base.phase,
    currentPriority: overlay.currentPriority ?? base.currentPriority,
    watching: overlay.watching ?? base.watching,
    recentWin: overlay.recentWin ?? base.recentWin,
    mode: overlay.mode ?? base.mode,
    productionVerified: overlay.productionVerified ?? base.productionVerified,
    baseline: overlay.baseline
      ? {
          established:
            overlay.baseline.established ?? base.baseline?.established ?? null,
          date: overlay.baseline.date ?? base.baseline?.date ?? null,
          label: overlay.baseline.label ?? base.baseline?.label ?? null,
        }
      : base.baseline,
    content: {
      ...(base.content ?? {}),
      ...(overlay.content ?? {}),
    },
  };
}
