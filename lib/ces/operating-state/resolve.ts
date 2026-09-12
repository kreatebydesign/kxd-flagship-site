/**
 * FALLBACK LAW — capability presentation from evidence, never from entitlement alone.
 *
 * CONNECTED: real persisted facts exist for the capability/period.
 * ACTIVE / IMPLEMENTED / VERIFIED: infrastructure/config supports the capability
 *   but live ReportingFacts are not present for the period.
 * REVIEWED: manually reviewed performance where no live connection exists.
 * UNAVAILABLE / NOT CONNECTED: no trustworthy source.
 *
 * Never convert authored status into fake live data.
 * Never treat an entitlement as proof that data exists.
 */

import type {
  CapabilityEvidenceState,
  ClientOperatingContent,
  ClientOperatingStateConfig,
  OperatingCapabilityEvidence,
  OperatingInfrastructureSignals,
  ResolvedCapabilityPresentation,
  ResolvedClientOperatingState,
  ResolvedWebsiteOperatingPresentation,
} from "./types";

function resolveWebsitePresentation(
  config: ClientOperatingStateConfig | null,
  infra: OperatingInfrastructureSignals | null,
): ResolvedWebsiteOperatingPresentation {
  const deployment = String(infra?.deploymentStatus ?? "unknown").toLowerCase();
  const isLive = deployment === "live" || Boolean(infra?.productionUrl?.trim());
  const isProductionVerified = Boolean(config?.productionVerified) || isLive;

  const websiteStatusLabel = isLive ? "Live" : deployment === "building" ? "Building" : "Not live";
  const productionStatusLabel = isProductionVerified
    ? "Verified"
    : isLive
      ? "Live"
      : "Pending";

  return {
    websiteStatusLabel,
    productionStatusLabel,
    websiteStageLine: isLive
      ? `Website ${websiteStatusLabel} · Production ${productionStatusLabel}`
      : infra?.productionUrl
        ? "Website on file"
        : "Website details are being confirmed",
    isLive,
    isProductionVerified,
  };
}

function connectedPresentation(
  summary = "Looking healthy",
  detail: string | null = null,
): ResolvedCapabilityPresentation {
  return { state: "connected", summary, detail };
}

function resolveWebsiteCapability(
  evidence: OperatingCapabilityEvidence,
  infra: OperatingInfrastructureSignals | null,
  content: ClientOperatingContent,
  postLaunchMode: boolean,
): ResolvedCapabilityPresentation {
  if (evidence.websiteFactsPresent) {
    return connectedPresentation();
  }
  if (evidence.websiteAnalyticsEntitled) {
    return {
      state: "awaiting-signal",
      summary: "Waiting on the first trustworthy signal",
      detail: null,
    };
  }
  // Infra configured (GA4 property) but entitlement off — honest active, not Connected.
  if (infra?.ga4PropertyId?.trim() && postLaunchMode) {
    return {
      state: "active",
      summary: "Measurement active",
      detail: content.websitePanelNote ?? null,
    };
  }
  return {
    state: "not-connected",
    summary: "",
    detail: null,
  };
}

function resolveSearchCapability(
  evidence: OperatingCapabilityEvidence,
  infra: OperatingInfrastructureSignals | null,
  content: ClientOperatingContent,
  postLaunchMode: boolean,
  baselineEstablished: boolean,
): ResolvedCapabilityPresentation {
  if (evidence.searchFactsPresent) {
    return connectedPresentation();
  }
  if (evidence.seoEntitled) {
    if (baselineEstablished || postLaunchMode) {
      return {
        state: "awaiting-signal",
        summary: baselineEstablished ? "Baseline established" : "Waiting on the first trustworthy signal",
        detail: content.searchPanelFallback ?? null,
      };
    }
    return {
      state: "awaiting-signal",
      summary: "Waiting on the first trustworthy signal",
      detail: null,
    };
  }
  if (infra?.searchConsoleSiteUrl?.trim() && postLaunchMode) {
    return {
      state: "implemented",
      summary: "Search foundation active",
      detail: content.searchPanelFallback ?? null,
    };
  }
  return {
    state: "not-connected",
    summary: "",
    detail: null,
  };
}

function resolveAdsCapability(
  evidence: OperatingCapabilityEvidence,
  infra: OperatingInfrastructureSignals | null,
  content: ClientOperatingContent,
  postLaunchMode: boolean,
): ResolvedCapabilityPresentation {
  if (evidence.adsFactsPresent) {
    return connectedPresentation();
  }
  if (evidence.googleAdsEntitled) {
    return {
      state: "awaiting-signal",
      summary: "Waiting on the first trustworthy signal",
      detail: null,
    };
  }
  // Reviewed without live entitlement/facts — authored note only, never Connected.
  if (postLaunchMode && (content.adsPanelNote || infra?.googleAdsCustomerId?.trim())) {
    return {
      state: "reviewed",
      summary: "Performance reviewed",
      detail: content.adsPanelNote ?? null,
    };
  }
  return {
    state: "not-connected",
    summary: "",
    detail: null,
  };
}

function resolveMomentumCapability(
  evidence: OperatingCapabilityEvidence,
  content: ClientOperatingContent,
  postLaunchMode: boolean,
  baselineEstablished: boolean,
): ResolvedCapabilityPresentation {
  const anyFacts =
    evidence.searchFactsPresent ||
    evidence.websiteFactsPresent ||
    evidence.adsFactsPresent;
  const anyEntitled =
    evidence.seoEntitled ||
    evidence.websiteAnalyticsEntitled ||
    evidence.googleAdsEntitled;

  if (anyFacts) {
    return connectedPresentation();
  }
  if (baselineEstablished || (postLaunchMode && anyEntitled)) {
    return {
      state: "awaiting-signal",
      summary: content.momentumLabel ?? "Baseline established",
      detail: content.momentumDetail ?? null,
    };
  }
  if (anyEntitled) {
    return {
      state: "awaiting-signal",
      summary: "Waiting on the first trustworthy signal",
      detail: null,
    };
  }
  return {
    state: "not-connected",
    summary: "",
    detail: null,
  };
}

export function resolveClientOperatingState(input: {
  config: ClientOperatingStateConfig | null;
  infrastructure?: OperatingInfrastructureSignals | null;
  evidence: OperatingCapabilityEvidence;
}): ResolvedClientOperatingState {
  const config = input.config;
  const infra = input.infrastructure ?? null;
  const content = config?.content ?? {};
  const postLaunchMode = config?.mode === "post-launch";
  const baselineEstablished = Boolean(config?.baseline?.established);
  const website = resolveWebsitePresentation(config, infra);

  return {
    postLaunchMode,
    phase: config?.phase ?? null,
    currentPriority: config?.currentPriority ?? null,
    watching: config?.watching ?? null,
    recentWin: config?.recentWin ?? null,
    baselineEstablished,
    baselineDate: config?.baseline?.date ?? null,
    baselineLabel: config?.baseline?.label ?? null,
    website,
    content,
    capabilities: {
      website: resolveWebsiteCapability(
        input.evidence,
        infra,
        content,
        postLaunchMode,
      ),
      search: resolveSearchCapability(
        input.evidence,
        infra,
        content,
        postLaunchMode,
        baselineEstablished,
      ),
      ads: resolveAdsCapability(input.evidence, infra, content, postLaunchMode),
      momentum: resolveMomentumCapability(
        input.evidence,
        content,
        postLaunchMode,
        baselineEstablished,
      ),
    },
  };
}

/**
 * Map FALLBACK LAW states onto EP panel connection vocabulary.
 * active / implemented / verified / reviewed are NEVER "connected"
 * (no fake live data).
 */
export function toPerformanceConnectionState(
  state: CapabilityEvidenceState,
): "connected" | "awaiting-signal" | "not-connected" {
  if (state === "connected") return "connected";
  if (state === "awaiting-signal") return "awaiting-signal";
  if (
    state === "active" ||
    state === "implemented" ||
    state === "verified" ||
    state === "reviewed"
  ) {
    return "not-connected";
  }
  return "not-connected";
}
