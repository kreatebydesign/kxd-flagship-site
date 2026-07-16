import type { ProvisioningStepId } from "./types";

export const PROVISIONING_STEPS: Array<{
  id: ProvisioningStepId;
  label: string;
  estimateSeconds: number;
}> = [
  { id: "client", label: "Client Information", estimateSeconds: 45 },
  { id: "package", label: "Platform Package", estimateSeconds: 30 },
  { id: "modules", label: "Modules", estimateSeconds: 40 },
  { id: "infrastructure", label: "Infrastructure", estimateSeconds: 40 },
  { id: "portal", label: "Portal", estimateSeconds: 35 },
  { id: "automation", label: "Automation", estimateSeconds: 25 },
  { id: "provision", label: "Provision", estimateSeconds: 60 },
];

export const PROVISIONING_ESTIMATE_TOTAL_SECONDS = PROVISIONING_STEPS.reduce(
  (sum, step) => sum + step.estimateSeconds,
  0,
);

export const PROVISIONING_SOURCE = "client-provisioning-engine";
