/**
 * Phase 34A — Package presets resolve to entitlements and defaults.
 * Commercial partnership names and pricing live in lib/commercial-agreements
 * (sourced from lib/partnerships). Preset ids remain stable for entitlement mapping.
 */

import type { LaunchPackagePreset } from "../types";

export const LAUNCH_PACKAGE_PRESETS: readonly LaunchPackagePreset[] = [
  {
    id: "starter",
    catalogLabel: "Starter",
    description:
      "Website collaboration foundation — one clear portal path for feedback and delivery updates.",
    intendedFit: "New website partners beginning with review and organized revision flow.",
    includedModules: ["website-review"],
    optionalModules: [],
    reportingCapabilities: [],
    executiveCapabilities: ["Client record", "Timeline launch event"],
    portalCapabilities: ["Website Review", "Welcome flow"],
    automationDefaults: {
      reportingAutomationEnabled: false,
      syncHourPacific: 5,
      entitledProviders: [],
    },
    reportingLevel: "Not included",
    executiveLevel: "Workspace record",
    portalLevel: "Website Review",
  },
  {
    id: "growth",
    catalogLabel: "Growth",
    description:
      "Website Review plus search and analytics readiness so performance can become visible over time.",
    intendedFit: "Partners who want collaboration plus a path into measurable website signal.",
    includedModules: ["website-review", "seo", "website-analytics"],
    optionalModules: ["executive-reporting"],
    reportingCapabilities: ["seo", "website-analytics"],
    executiveCapabilities: ["Client record", "Executive profile", "Timeline"],
    portalCapabilities: ["Website Review", "Connected workspace"],
    automationDefaults: {
      reportingAutomationEnabled: true,
      syncHourPacific: 5,
      entitledProviders: ["search-console", "ga4"],
    },
    reportingLevel: "Search Console + Website Analytics",
    executiveLevel: "Executive profile",
    portalLevel: "Website Review + Connected workspace",
  },
  {
    id: "premium",
    catalogLabel: "Premium",
    description:
      "Full collaboration surface with executive performance and multi-provider reporting entitlements.",
    intendedFit:
      "Leadership relationships that need Website Review, Executive Performance, and reporting readiness together.",
    includedModules: [
      "website-review",
      "executive-performance",
      "seo",
      "website-analytics",
      "google-ads",
      "executive-reporting",
    ],
    optionalModules: [],
    reportingCapabilities: [
      "seo",
      "website-analytics",
      "google-ads",
      "executive-reporting",
    ],
    executiveCapabilities: [
      "Executive Performance",
      "Executive profile",
      "Timeline",
    ],
    portalCapabilities: [
      "Website Review",
      "Executive Performance workspace",
      "Connected workspace",
    ],
    automationDefaults: {
      reportingAutomationEnabled: true,
      syncHourPacific: 5,
      entitledProviders: ["search-console", "ga4", "ads"],
    },
    reportingLevel: "Search + Analytics + Ads entitlements",
    executiveLevel: "Executive Performance",
    portalLevel: "Full operating workspace",
  },
  {
    id: "enterprise",
    catalogLabel: "Enterprise",
    description:
      "Maximum Shared Core surface available today, with roadmap capabilities marked only where registered.",
    intendedFit:
      "Complex or multi-property partners that need every currently supported capability entitled at launch.",
    includedModules: [
      "website-review",
      "executive-performance",
      "seo",
      "website-analytics",
      "google-ads",
      "executive-reporting",
    ],
    optionalModules: ["gbp", "stripe", "crm"],
    reportingCapabilities: [
      "seo",
      "website-analytics",
      "google-ads",
      "executive-reporting",
    ],
    executiveCapabilities: [
      "Executive Performance",
      "Executive profile",
      "Timeline",
      "Launch readiness follow-through",
    ],
    portalCapabilities: [
      "Website Review",
      "Executive Performance workspace",
      "Connected workspace",
      "Multi-seat portal readiness",
    ],
    automationDefaults: {
      reportingAutomationEnabled: true,
      syncHourPacific: 5,
      entitledProviders: ["search-console", "ga4", "ads"],
    },
    reportingLevel: "All supported providers entitled",
    executiveLevel: "Executive Performance + follow-through",
    portalLevel: "Multi-seat operating workspace",
  },
  {
    id: "custom",
    catalogLabel: "Custom",
    description:
      "Start from a blank entitlement sheet. Select only the modules this partner should receive.",
    intendedFit: "Special engagements where package defaults do not match the operating scope.",
    includedModules: [],
    optionalModules: [
      "website-review",
      "executive-performance",
      "seo",
      "website-analytics",
      "google-ads",
      "executive-reporting",
    ],
    reportingCapabilities: [],
    executiveCapabilities: ["Client record", "Configured entitlements"],
    portalCapabilities: ["Selected portal modules only"],
    automationDefaults: {
      reportingAutomationEnabled: false,
      syncHourPacific: 5,
      entitledProviders: [],
    },
    reportingLevel: "Selected explicitly",
    executiveLevel: "Selected explicitly",
    portalLevel: "Selected explicitly",
  },
] as const;

export function getLaunchPackagePreset(id: string): LaunchPackagePreset | null {
  return LAUNCH_PACKAGE_PRESETS.find((preset) => preset.id === id) ?? null;
}

export function listLaunchPackagePresets(): readonly LaunchPackagePreset[] {
  return LAUNCH_PACKAGE_PRESETS;
}
