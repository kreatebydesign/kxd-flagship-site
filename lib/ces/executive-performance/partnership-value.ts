/**
 * Phase 31A.2 / 32A — Partnership progress (Shared Core, slug-configured).
 * Prefers Executive Memory when authored; falls back to local defaults.
 * Relationship language — not project management.
 */

import { memoryToPartnershipItems } from "@/lib/executive-memory";
import type { ExecutivePartnershipItem } from "./types";

const DEFAULT_PARTNERSHIP: ExecutivePartnershipItem[] = [
  {
    id: "workspace",
    label: "Your private partnership workspace",
    detail: "A calm place for leadership to follow the work with us.",
    complete: true,
    priority: true,
  },
  {
    id: "website-review",
    label: "A private place to refine the site together",
    detail: "Feedback stays organized so we can refine with confidence.",
    complete: true,
    priority: true,
  },
];

export function getExecutivePartnershipValue(
  clientSlug: string | null,
): ExecutivePartnershipItem[] {
  const fromMemory = memoryToPartnershipItems(clientSlug);
  if (fromMemory && fromMemory.length > 0) return fromMemory;
  return DEFAULT_PARTNERSHIP;
}

export function splitPartnershipPriority(items: ExecutivePartnershipItem[]): {
  primary: ExecutivePartnershipItem[];
  secondary: ExecutivePartnershipItem[];
} {
  const prioritized = items.filter((i) => i.priority !== false);
  const primary = (prioritized.length ? prioritized : items).slice(0, 7);
  const primaryIds = new Set(primary.map((i) => i.id));
  const secondary = items.filter((i) => !primaryIds.has(i.id));
  return { primary, secondary };
}
