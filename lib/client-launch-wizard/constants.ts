import type { LaunchWizardStepId } from "./types";

export const LAUNCH_WIZARD_STEPS: {
  id: LaunchWizardStepId;
  label: string;
  short: string;
}[] = [
  { id: "identity", label: "Identity", short: "01" },
  { id: "package", label: "Package", short: "02" },
  { id: "experience", label: "Experience", short: "03" },
  { id: "modules", label: "Modules", short: "04" },
  { id: "infrastructure", label: "Infrastructure", short: "05" },
  { id: "team", label: "Team", short: "06" },
  { id: "automation", label: "Automation", short: "07" },
  { id: "review", label: "Review", short: "08" },
  { id: "launch", label: "Launch", short: "09" },
];

export const LAUNCH_WIZARD_STEP_INDEX: Record<LaunchWizardStepId, number> =
  Object.fromEntries(
    LAUNCH_WIZARD_STEPS.map((step, index) => [step.id, index]),
  ) as Record<LaunchWizardStepId, number>;

/** Portal base used when building absolute client URLs in admin results. */
export const LAUNCH_WIZARD_PORTAL_PATH = "/portal";

export const LAUNCH_WIZARD_ADMIN_CLIENT_PATH = "/admin/operations/clients";

export const LAUNCH_WIZARD_ROUTE_BASE = "/admin/operations/clients/launch";

export const LAUNCH_WIZARD_KNOWN_CES_MODULES = [
  "website-review",
  "executive-performance",
] as const;

export const LAUNCH_WIZARD_COMING_SOON_IDS = [
  "gbp",
  "stripe",
  "meta",
  "clarity",
  "crm",
  "call-tracking",
] as const;
