/**
 * Phase 34A.1 — Capability preview derived only from Shared Core presets.
 */

import type { LaunchPackageId, LaunchModuleAvailability } from "../types";
import { getLaunchPackagePreset } from "./presets";
import { moduleAvailabilityForPackage } from "./resolve";

export type LaunchCapabilityAreaId =
  | "portal"
  | "website-review"
  | "reporting"
  | "reporting-automation"
  | "executive-performance"
  | "executive-briefing"
  | "executive-memory"
  | "deliverables"
  | "requests"
  | "brand-center";

export type LaunchCapabilityPreviewRow = {
  areaId: LaunchCapabilityAreaId;
  label: string;
  state: LaunchModuleAvailability | "not-included";
  detail: string;
};

const AREA_LABELS: Record<LaunchCapabilityAreaId, string> = {
  portal: "Portal",
  "website-review": "Website Review",
  reporting: "Reporting",
  "reporting-automation": "Reporting Automation",
  "executive-performance": "Executive Performance",
  "executive-briefing": "Executive Briefing",
  "executive-memory": "Executive Memory",
  deliverables: "Deliverables",
  requests: "Requests",
  "brand-center": "Brand Center",
};

function row(
  areaId: LaunchCapabilityAreaId,
  state: LaunchCapabilityPreviewRow["state"],
  detail: string,
): LaunchCapabilityPreviewRow {
  return { areaId, label: AREA_LABELS[areaId], state, detail };
}

export function buildPackageCapabilityPreview(
  packageId: LaunchPackageId,
): LaunchCapabilityPreviewRow[] {
  const preset = getLaunchPackagePreset(packageId);
  if (!preset) return [];

  const hasReview =
    moduleAvailabilityForPackage(packageId, "website-review") === "included" ||
    (packageId === "custom" &&
      moduleAvailabilityForPackage(packageId, "website-review") === "optional");
  const hasEp =
    moduleAvailabilityForPackage(packageId, "executive-performance") === "included";
  const hasReporting = preset.reportingCapabilities.length > 0;
  const automationOn = preset.automationDefaults.reportingAutomationEnabled;
  return [
    row(
      "portal",
      hasReview || packageId === "custom" ? "included" : "not-included",
      preset.portalLevel,
    ),
    row(
      "website-review",
      moduleAvailabilityForPackage(packageId, "website-review") === "included"
        ? "included"
        : moduleAvailabilityForPackage(packageId, "website-review") === "optional"
          ? "optional"
          : "not-included",
      moduleAvailabilityForPackage(packageId, "website-review") === "included"
        ? "Revision workflow entitled at launch"
        : packageId === "custom"
          ? "Available as an explicit Custom selection"
          : "Not entitled by this package",
    ),
    row(
      "reporting",
      hasReporting ? "included" : packageId === "custom" ? "optional" : "not-included",
      preset.reportingLevel,
    ),
    row(
      "reporting-automation",
      automationOn ? "included" : "not-included",
      automationOn
        ? `Daily Pacific sync scheduled (default ${preset.automationDefaults.syncHourPacific}:00)`
        : "Automation off until entitled and enabled",
    ),
    row(
      "executive-performance",
      hasEp ? "included" : "not-included",
      hasEp
        ? "Executive Performance workspace entitled"
        : "Not entitled — presentation registry may still be prepared later",
    ),
    row(
      "executive-briefing",
      hasEp ? "optional" : "not-included",
      hasEp
        ? "Briefing becomes available when EP presentation is enabled for the client"
        : "Requires Executive Performance entitlement",
    ),
    row(
      "executive-memory",
      "coming-soon",
      "Historical memory is registered per client after launch — no invented history at launch",
    ),
    row(
      "deliverables",
      "coming-soon",
      "Tracked on the platform roadmap — not entitled at launch today",
    ),
    row(
      "requests",
      hasReview ? "included" : "not-included",
      hasReview
        ? "Website Review revisions create work intake"
        : "Requires Website Review",
    ),
    row(
      "brand-center",
      "coming-soon",
      "Roadmap capability — not a launch entitlement today",
    ),
  ];
}

export function packageCapabilitySummaryLines(packageId: LaunchPackageId): string[] {
  const preset = getLaunchPackagePreset(packageId);
  if (!preset) return [];
  return [
    `Fit: ${preset.intendedFit}`,
    `Portal: ${preset.portalLevel}`,
    `Reporting: ${preset.reportingLevel}`,
    `Executive: ${preset.executiveLevel}`,
    `Automation: ${
      preset.automationDefaults.reportingAutomationEnabled
        ? "Enabled by default"
        : "Disabled by default"
    }`,
  ];
}
