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
  const branding =
    kind === "all" || kind === "branding"
      ? await discoverManagedWebsiteBranding({
          websiteUrl: signals.websiteUrl,
          primaryDomain: signals.primaryDomain,
          clientName: signals.clientName,
        })
      : null;

  const siteMeasurementIds = branding?.measurementIds ?? [];
  const ga4 =
    kind === "all" || kind === "ga4"
      ? await discoverGa4Properties({
          clientName: signals.clientName,
          host,
          siteMeasurementIds:
            kind === "ga4"
              ? (
                  await discoverManagedWebsiteBranding({
                    websiteUrl: signals.websiteUrl,
                    primaryDomain: signals.primaryDomain,
                    clientName: signals.clientName,
                  })
                ).measurementIds
              : siteMeasurementIds,
        })
      : null;

  const searchConsole =
    kind === "all" || kind === "search-console"
      ? await discoverSearchConsoleProperties({ host })
      : null;

  return {
    ok: true,
    writes: false,
    mutatesProfile: false,
    invites: false,
    clientId,
    kind,
    branding,
    ga4,
    searchConsole,
  };
}

export {
  discoverManagedWebsiteBranding,
  discoverGa4Properties,
  discoverSearchConsoleProperties,
};
