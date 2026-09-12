/**
 * Optional client content packs — authored copy only.
 * CONTENT gate by slug is allowed. STRUCTURAL compose must not require these.
 */

import type { ClientOperatingStateConfig } from "@/lib/ces/operating-state";
import { PRIMAL_POST_LAUNCH_OPERATING_CONFIG } from "./primal-post-launch";

export type ClientContentPack = {
  clientSlug: string;
  aliases?: readonly string[];
  operatingState: ClientOperatingStateConfig;
};

const PACKS: readonly ClientContentPack[] = [
  {
    clientSlug: "primal-motorsports",
    aliases: ["primal"],
    operatingState: PRIMAL_POST_LAUNCH_OPERATING_CONFIG,
  },
];

function normalizeSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const trimmed = slug.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/** CONTENT only — returns authored operating config when a pack exists for the slug. */
export function getClientContentPackOperatingState(
  clientSlug: string | null | undefined,
): ClientOperatingStateConfig | null {
  const slug = normalizeSlug(clientSlug);
  if (!slug) return null;
  const pack = PACKS.find(
    (p) =>
      p.clientSlug === slug ||
      (p.aliases?.some((alias) => alias === slug) ?? false),
  );
  return pack?.operatingState ?? null;
}
