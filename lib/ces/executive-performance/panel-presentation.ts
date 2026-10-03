/**
 * Shared Core presentation vocabulary for Executive Performance panels.
 * Hospitality framing only — never invents metrics, sync, or monitoring claims.
 */

import type { ExecutivePerformancePanel } from "./types";

const PANEL_TITLES: Record<string, string> = {
  website: "Website traffic",
  search: "Search visibility",
  ads: "Paid acquisition",
  momentum: "Movement",
};

const ENABLEMENT_SUPPORT: Record<string, string> = {
  website: "Website analytics is not connected for this period.",
  search: "Search Console is not connected for this period.",
  ads: "Paid advertising reporting is not active for this period.",
  momentum: "Movement signals are not available for this period.",
};

const CONNECTED_CARE: Record<string, string> = {
  website: "From connected website analytics — never estimated.",
  search: "From Search Console for this period — never estimated.",
  ads: "From entitled advertising reporting — never estimated.",
  momentum: "Drawn from the entitled reporting picture overall.",
};

export function executivePanelTitle(panel: ExecutivePerformancePanel): string {
  return PANEL_TITLES[panel.id] ?? panel.title;
}

export function executivePanelNarrative(
  panel: ExecutivePerformancePanel,
  _periodLabel?: string | null,
): { lead: string; support: string | null } {
  if (panel.state === "not-connected") {
    return {
      lead: "Not connected",
      support: ENABLEMENT_SUPPORT[panel.id] ?? "This signal is not active.",
    };
  }

  if (panel.state === "awaiting-signal") {
    return {
      lead: panel.summary?.trim() || "No signal yet",
      support: "Observed activity appears when trustworthy data is ready — nothing is estimated.",
    };
  }

  const hasMetrics = Boolean(panel.metrics && panel.metrics.length > 0);
  const observation = panel.detail?.trim() || null;
  const status = panel.summary?.trim() || null;
  const care = CONNECTED_CARE[panel.id] ?? "From connected reporting — never estimated.";

  if (hasMetrics) {
    return {
      lead: observation || status || "What we can see for this period.",
      support: care,
    };
  }

  return {
    lead: observation || status || "A trustworthy signal is available for this period.",
    support: observation && status && observation !== status ? `${status}. ${care}` : care,
  };
}
