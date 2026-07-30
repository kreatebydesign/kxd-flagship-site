/**
 * Official KXD logo resolution for client-facing reports.
 * Prefer the transparent gold monogram used by the public brand mark.
 * Do not invent or redraw logo artwork.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

/** Public URL path for HTML preview (served from /public). */
export const KXD_REPORT_LOGO_PUBLIC_PATH =
  "/migrated-assets/brand/kxd-logo-transparent.png";

/** Relative path from repo root (PDF / filesystem). */
export const KXD_REPORT_LOGO_RELATIVE_PATH =
  "public/migrated-assets/brand/kxd-logo-transparent.png";

export type KxdReportLogoAsset = {
  publicPath: string;
  absolutePath: string;
  exists: boolean;
  kind: "official-png-monogram";
  notes: string;
};

export function resolveKxdReportLogoAsset(
  cwd: string = process.cwd(),
): KxdReportLogoAsset {
  const absolutePath = join(cwd, KXD_REPORT_LOGO_RELATIVE_PATH);
  return {
    publicPath: KXD_REPORT_LOGO_PUBLIC_PATH,
    absolutePath,
    exists: existsSync(absolutePath),
    kind: "official-png-monogram",
    notes:
      "Official gold KXD monogram (PNG) used by KxdLogo / site brand. Suitable for black cover and small footer mark.",
  };
}
