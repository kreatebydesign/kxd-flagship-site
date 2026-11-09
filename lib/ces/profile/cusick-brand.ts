import type { ResolvedExperienceProfile } from "../types";
import { getExecutivePresentation } from "../executive-performance/presentation";

const CUSICK_SLUG = "cusick-morgan-motorsports";
const CUSICK_LOGO_SRC = "/migrated-assets/logos/cusick-morgan.svg";

export function isCusickMorganClient(input: {
  clientSlug: string | null | undefined;
  clientName?: string | null;
}): boolean {
  const slug = input.clientSlug?.trim().toLowerCase();
  if (slug === CUSICK_SLUG) return true;
  const name = input.clientName?.trim().toLowerCase() ?? "";
  return name.includes("cusick morgan");
}

/**
 * Sidebar uses the approved Cusick motorsports mark (white SVG on dark).
 * Does not affect other clients' uploaded logos.
 */
export function ensureCusickMorganBrand(profile: ResolvedExperienceProfile): void {
  if (
    !isCusickMorganClient({
      clientSlug: profile.identity.clientSlug,
      clientName: profile.identity.clientName,
    })
  ) {
    return;
  }
  const presentation = getExecutivePresentation(profile.identity.clientSlug) ?? {
    logoSrc: CUSICK_LOGO_SRC,
    logoAlt: "Cusick Morgan Motorsports",
  };
  profile.identity.logoUrl = presentation.logoSrc ?? CUSICK_LOGO_SRC;
  profile.identity.logoAlt =
    presentation.logoAlt ?? "Cusick Morgan Motorsports";
  /* Approved mark is white — needs a dark resting panel on the light CES sidebar. */
  profile.identity.logoOnDarkTreatment = "dark-panel";
}
