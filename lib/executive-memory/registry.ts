/**
 * Executive Memory registry — configuration per client slug (Shared Core).
 * Add a client by registering a lens; no component forks.
 */

import { PRIMAL_MOTORSPORTS_MEMORY } from "./clients/primal-motorsports";
import { EMPTY_CLIENT_MEMORY } from "./clients/stubs";
import type { ExecutiveMemoryItem, ExecutiveMemoryLens } from "./types";

type MemorySeed = {
  clientSlug: string;
  clientName: string;
  items: ExecutiveMemoryItem[];
};

const SEEDS: MemorySeed[] = [
  {
    clientSlug: "primal-motorsports",
    clientName: "Primal Motorsports",
    items: PRIMAL_MOTORSPORTS_MEMORY,
  },
  /* Registered for multi-client foundation — empty until authored. */
  {
    clientSlug: "cusick-morgan-motorsports",
    clientName: "Cusick Morgan Motorsports",
    items: EMPTY_CLIENT_MEMORY,
  },
  { clientSlug: "otp", clientName: "On Track Performance", items: EMPTY_CLIENT_MEMORY },
  { clientSlug: "plate-the-umpqua", clientName: "Plate The Umpqua", items: EMPTY_CLIENT_MEMORY },
  {
    clientSlug: "e-davis-enterprises",
    clientName: "E. Davis Enterprises",
    items: EMPTY_CLIENT_MEMORY,
  },
  { clientSlug: "autodv8ions", clientName: "AutoDV8ions", items: EMPTY_CLIENT_MEMORY },
];

const BY_SLUG: Record<string, MemorySeed> = Object.fromEntries(
  SEEDS.map((seed) => [seed.clientSlug, seed]),
);

export function listExecutiveMemoryClientSlugs(): string[] {
  return SEEDS.map((s) => s.clientSlug);
}

export function getExecutiveMemoryLens(
  clientSlug: string | null | undefined,
): ExecutiveMemoryLens | null {
  if (!clientSlug) return null;
  const seed = BY_SLUG[clientSlug];
  if (!seed) return null;
  return {
    clientSlug: seed.clientSlug,
    clientName: seed.clientName,
    items: seed.items,
    source: "configuration",
  };
}

export function hasExecutiveMemory(
  clientSlug: string | null | undefined,
): boolean {
  const lens = getExecutiveMemoryLens(clientSlug);
  return Boolean(lens && lens.items.length > 0);
}
