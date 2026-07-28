/**
 * Allowlisted terminology merge — presentation labels only.
 */

import { NEUTRAL_WORKSPACE_TERMINOLOGY } from "./defaults";
import type { WorkspaceTerminologyKey } from "./types";

const TERMINOLOGY_KEYS = new Set<WorkspaceTerminologyKey>([
  "workspace",
  "requests",
  "deliverables",
  "reports",
  "websiteReview",
  "websiteWorkspace",
  "inventory",
  "communications",
  "activity",
]);

function sanitizeLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 48) return null;
  // Presentation text only — strip angle brackets to avoid HTML injection in UI.
  if (/[<>]/.test(trimmed)) return null;
  return trimmed;
}

export function mergeWorkspaceTerminology(
  overrides: Partial<Record<WorkspaceTerminologyKey, string>> | null | undefined,
): Partial<Record<WorkspaceTerminologyKey, string>> {
  const result: Partial<Record<WorkspaceTerminologyKey, string>> = {
    ...NEUTRAL_WORKSPACE_TERMINOLOGY,
  };

  if (!overrides) return result;

  for (const [key, value] of Object.entries(overrides)) {
    if (!TERMINOLOGY_KEYS.has(key as WorkspaceTerminologyKey)) continue;
    const safe = sanitizeLabel(value);
    if (!safe) continue;
    result[key as WorkspaceTerminologyKey] = safe;
  }

  return result;
}

export function terminologyLabel(
  terminology: Partial<Record<WorkspaceTerminologyKey, string>>,
  key: WorkspaceTerminologyKey,
  fallback: string,
): string {
  return terminology[key] ?? fallback;
}

export { TERMINOLOGY_KEYS };
