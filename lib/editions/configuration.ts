import type { EditionId } from "./types";

const EDITION_IDS: EditionId[] = [
  "kxd-core",
  "contractor-os",
  "motorsports-os",
  "restaurant-os",
  "hospitality-os",
  "political-campaign-os",
  "creative-studio-os",
  "manufacturing-os",
];

export function isEditionId(value: string): value is EditionId {
  return EDITION_IDS.includes(value as EditionId);
}

/** Active edition — env override for future multi-tenant installs */
export function getConfiguredEditionId(): EditionId {
  const raw =
    process.env.KXD_EDITION?.trim() ||
    process.env.NEXT_PUBLIC_KXD_EDITION?.trim() ||
    "";
  if (raw && isEditionId(raw)) return raw;
  return "kxd-core";
}

export const EDITION_CONFIGURATION = {
  defaultEditionId: "kxd-core" as EditionId,
  envKeys: ["KXD_EDITION", "NEXT_PUBLIC_KXD_EDITION"] as const,
};
