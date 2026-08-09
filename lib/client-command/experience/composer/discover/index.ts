/**
 * Client Experience discovery — read-only.
 * DISCOVER → PROPOSE. Writes happen only through explicit provision import.
 */

import "server-only";

import { hostnameFromWebsite } from "../readiness";
import { loadExperienceSignals } from "../signals";
import type { ExperienceDiscoverKind } from "../types";
import { discoverManagedWebsiteBranding, type BrandingDiscoveryResult } from "./branding";
import { discoverGa4Properties, discoverSearchConsoleProperties } from "./google";
import type { Ga4DiscoveryResult, GscDiscoveryResult } from "./google";

export type ExperienceDiscoveryResult = {
  ok: true;
  writes: false;
  mutatesProfile: false;
  invites: false;
  clientId: number;
  kind: ExperienceDiscoverKind | "all";
  branding: BrandingDiscoveryResult | null;
  ga4: Ga4DiscoveryResult | null;
  searchConsole: GscDiscoveryResult | null;
};

export async function discoverExperienceDependencies(
  clientId: number,
  kind: ExperienceDiscoverKind | "all" = "all",
): Promise<ExperienceDiscoveryResult | { ok: false; message: string }> {
  const signals = await loadExperienceSignals(clientId);
  if (!signals) return { ok: false, message: "Client not found." };

  const host = hostnameFromWebsite(signals.websiteUrl, signals.primaryDomain);
  const includeBranding = kind === "all" || kind === "branding";
  const includeGa4 = kind === "all" || kind === "ga4" || kind === "google";
  const includeGsc = kind === "all" || kind === "search-console" || kind === "google";

  const siteFacts =
    includeBranding || includeGa4
      ? await discoverManagedWebsiteBranding({
          websiteUrl: signals.websiteUrl,
          primaryDomain: signals.primaryDomain,
          clientName: signals.clientName,
        })
      : null;

  const ga4 = includeGa4
    ? await discoverGa4Properties({
        clientName: signals.clientName,
        host,
        siteMeasurementIds: siteFacts?.measurementIds ?? [],
      })
    : null;

  const searchConsole = includeGsc
    ? await discoverSearchConsoleProperties({ host })
    : null;

  return {
    ok: true,
    writes: false,
    mutatesProfile: false,
    invites: false,
    clientId,
    kind,
    branding: includeBranding ? siteFacts : null,
    ga4,
    searchConsole,
  };
}

export {
  discoverManagedWebsiteBranding,
  discoverGa4Properties,
  discoverSearchConsoleProperties,
};
