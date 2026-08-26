/**
 * Shared CES presentation home hero — cinematic banner for any client with
 * ExperiencePresentation.heroImageSrc. Does not unlock Executive Performance.
 */

import type { CSSProperties } from "react";
import type { ExperiencePresentation } from "@/lib/ces/executive-performance/types";
import { executivePresentationToCssVars } from "@/lib/ces/executive-performance/presentation";

export function CesPresentationHomeHero({
  presentation,
  logoSrc,
  logoAlt,
}: {
  presentation: ExperiencePresentation;
  /** Optional resolved identity logo (falls back to presentation.logoSrc). */
  logoSrc?: string | null;
  logoAlt?: string | null;
}) {
  if (!presentation.heroImageSrc?.trim()) return null;

  const mark = logoSrc?.trim() || presentation.logoSrc?.trim() || null;
  const markAlt = logoAlt?.trim() || presentation.logoAlt || "Client";
  const style = executivePresentationToCssVars(presentation) as CSSProperties;

  return (
    <header
      className={[
        "kxd-ces-present-hero",
        `kxd-ces-present-hero--${presentation.heroOverlay}`,
        "kxd-ces-present-hero--imaged",
      ].join(" ")}
      style={style}
      aria-label={presentation.heroImageAlt}
    >
      <div className="kxd-ces-present-hero__veil" aria-hidden="true" />
      <div className="kxd-ces-present-hero__vignette" aria-hidden="true" />
      <div className="kxd-ces-present-hero__inner">
        {mark ? (
          // eslint-disable-next-line @next/next/no-img-element -- static migrated brand mark
          <img
            className="kxd-ces-present-hero__logo"
            src={mark}
            alt={markAlt}
          />
        ) : null}
        <p className="kxd-ces-present-hero__eyebrow">{presentation.workspaceEyebrow}</p>
        <h1 className="kxd-ces-present-hero__title">{presentation.workspaceTitle}</h1>
        <p className="kxd-ces-present-hero__lead">{presentation.introduction}</p>
      </div>
    </header>
  );
}
