import { PROJECTS } from "@/lib/projects";

export interface WorkspaceAtmosphere {
  imageSrc: string | null;
  /** Subtle brand wash — never loud */
  tint: string | null;
}

/** Client slug → portfolio project slug when they differ */
const CLIENT_TO_PROJECT_SLUG: Record<string, string> = {
  "spur-restaurant-bar": "spur-restaurant",
  otp: "on-track-performance",
};

/** Optional atmospheric tint per client — barely perceptible */
const ATMOSPHERE_TINTS: Record<string, string> = {
  "primal-motorsports": "rgba(168, 52, 36, 0.032)",
  "hair-mafia": "rgba(196, 132, 108, 0.028)",
  "plate-the-umpqua": "rgba(148, 118, 88, 0.028)",
  "spur-restaurant-bar": "rgba(132, 88, 56, 0.028)",
  "spur-restaurant": "rgba(132, 88, 56, 0.028)",
  autodv8ions: "rgba(88, 108, 128, 0.028)",
  "la-cocina": "rgba(168, 96, 48, 0.028)",
  "cusick-morgan-motorsports": "rgba(148, 40, 32, 0.03)",
};

function resolveProjectSlug(clientSlug: string): string {
  return CLIENT_TO_PROJECT_SLUG[clientSlug] ?? clientSlug;
}

function findProjectImage(projectSlug: string): string | null {
  const project = PROJECTS.find((p) => p.slug === projectSlug);
  return project?.image ?? null;
}

/**
 * Ambient workspace identity — blurred, dark, macOS-wallpaper mood.
 * Uses existing portfolio imagery only. No fetch, no new assets.
 */
export function getWorkspaceAtmosphere(
  clientSlug: string | null | undefined,
): WorkspaceAtmosphere {
  if (!clientSlug) {
    return { imageSrc: null, tint: null };
  }

  const projectSlug = resolveProjectSlug(clientSlug);
  const imageSrc = findProjectImage(projectSlug);
  const tint =
    ATMOSPHERE_TINTS[clientSlug] ?? ATMOSPHERE_TINTS[projectSlug] ?? null;

  return { imageSrc, tint };
}
