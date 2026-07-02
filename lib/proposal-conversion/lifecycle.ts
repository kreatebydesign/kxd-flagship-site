import type { ConversionMode } from "./types";

export const CONVERSION_MODES: ConversionMode[] = [
  "new-client",
  "existing-client",
  "project-expansion",
  "retainer-only",
  "one-time",
  "hybrid",
];

export const CONVERSION_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  completed: "Completed",
  failed: "Failed",
};

export const LAUNCH_STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  "in-progress": "In Progress",
  completed: "Completed",
};

export function displayConversionStatus(status: string): string {
  return CONVERSION_STATUS_LABELS[status] ?? status.replace(/-/g, " ");
}

export function displayLaunchStatus(status: string): string {
  return LAUNCH_STATUS_LABELS[status] ?? status.replace(/-/g, " ");
}

export function formatConversionMode(mode: string | null): string {
  if (!mode) return "—";
  return mode.replace(/-/g, " ");
}
