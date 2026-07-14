/**
 * Shared Core presentation vocabulary for Executive Performance panels.
 * Hospitality framing only — never invents metrics, sync, or monitoring claims.
 */

import type { ExecutivePerformancePanel } from "./types";

const PANEL_TITLES: Record<string, string> = {
  website: "Website Intelligence",
  search: "Search Intelligence",
  ads: "Advertising Intelligence",
  momentum: "Partnership Momentum",
};

const ENABLEMENT_SUPPORT: Record<string, string> = {
  website:
    "Once Website Analytics is connected, meaningful updates can appear here.",
  search:
    "Once Search Console is connected, meaningful updates can appear here.",
  ads: "Once Google Ads reporting is enabled, meaningful updates can appear here.",
  momentum:
    "A fuller momentum view appears once trustworthy reporting is active.",
};

const CONNECTED_CARE: Record<string, string> = {
  website: "Shown from connected reporting for this period — never estimated.",
  search: "Shown from connected Search Console for this period — never estimated.",
  ads: "Shown from entitled advertising reporting when available — never estimated.",
  momentum: "Drawn from the overall picture of entitled reporting signals.",
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
      lead: "This capability becomes available as your partnership expands.",
      support: ENABLEMENT_SUPPORT[panel.id] ?? null,
    };
  }

  if (panel.state === "awaiting-signal") {
    return {
      lead: panel.summary?.trim() || "Waiting on the first trustworthy signal.",
      support:
        "Nothing is estimated here. Observed activity will appear when it is available.",
    };
  }

  const observation = panel.detail?.trim() || null;
  const status = panel.summary?.trim() || null;
  const care = CONNECTED_CARE[panel.id] ?? "Shown from connected reporting — never estimated.";

  return {
    lead: observation || status || "A trustworthy signal is available for this period.",
    support: observation && status && observation !== status ? `${status}. ${care}` : care,
  };
}
