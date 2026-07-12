/**
 * Business status — calm sync default for client chrome.
 * Live Pulse-backed status: `loadExecutiveWorkspaceIntelligence()` in
 * `@/lib/kxd-intelligence` (server). Do not import server intelligence here.
 */

import type { ExecutiveBusinessStatus } from "./types";

export function getExecutiveBusinessStatus(): ExecutiveBusinessStatus {
  return {
    label: "Operating",
    detail: "Studio systems online",
    tone: "calm",
  };
}
