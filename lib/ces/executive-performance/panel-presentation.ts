/**
 * Shared Core presentation vocabulary for Executive Performance panels.
 * Hospitality framing only — never invents metrics, sync, or monitoring claims.
 */

import type { ExecutivePerformancePanel } from "./types";

const PANEL_TITLES: Record<string, string> = {
  website: "Website",
  search: "Search",
  ads: "Google Ads",
  momentum: "Momentum",
};

const ENABLEMENT_SUPPORT: Record<string, string> = {
  website: "Once website analytics is connected, activity will appear here.",
  search: "Once Search Console is connected, activity will appear here.",
  ads: "Once advertising reporting is ready, activity will appear here.",
  momentum: "A fuller view appears once trustworthy signals are active.",
};

const CONNECTED_CARE: Record<string, string> = {
  website: "From your connected reporting — never estimated.",
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
      lead: "Available when this part of the partnership is in place.",
      support: ENABLEMENT_SUPPORT[panel.id] ?? null,
    };
  }

  if (panel.state === "awaiting-signal") {
    return {
      lead: panel.summary?.trim() || "Waiting on the first trustworthy signal.",
      support: "Nothing is estimated here — observed activity appears when it is ready.",
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
