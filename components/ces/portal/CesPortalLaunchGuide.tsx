import Link from "next/link";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import { portalCopy, PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";
import { isCesFlagshipPortal } from "@/lib/portal/ces-launch-safety";

export interface CesPortalLaunchGuideProps {
  profile: ResolvedExperienceProfile;
  websiteUrl: string | null;
  hasRevisions: boolean;
}

const LAUNCH_STEP_KEYS = [
  "portal.home.launch.step1",
  "portal.home.launch.step2",
  "portal.home.launch.step3",
  "portal.home.launch.step4",
] as const;

const LAUNCH_STEP_FALLBACKS = PORTAL_CLIENT_LANGUAGE.launchSteps;

/** Show getting-started guidance for CES flagship clients (Website Review launch mode). */
export function shouldShowPortalLaunchGuide(profile: ResolvedExperienceProfile): boolean {
  return isCesFlagshipPortal(profile);
}

export function CesPortalLaunchGuide({
  profile,
  websiteUrl,
  hasRevisions,
}: CesPortalLaunchGuideProps) {
  if (!shouldShowPortalLaunchGuide(profile)) return null;

  const t = profile.terminology;
  const title = portalCopy(t, "portal.home.launch.title", PORTAL_CLIENT_LANGUAGE.launchTitle);
  const lead = portalCopy(
    t,
    hasRevisions ? "portal.home.launch.leadActive" : "portal.home.launch.lead",
    hasRevisions ? PORTAL_CLIENT_LANGUAGE.launchLeadActive : PORTAL_CLIENT_LANGUAGE.launchLead,
  );

  const steps = LAUNCH_STEP_KEYS.map((key, index) =>
    portalCopy(t, key, LAUNCH_STEP_FALLBACKS[index] ?? ""),
  ).filter(Boolean);

  return (
    <section className="kxd-ces-launch-guide" aria-labelledby="ces-launch-guide-heading">
      <div className="kxd-ces-launch-guide__head">
        <p className="kxd-ces-launch-guide__eyebrow">
          {portalCopy(t, "portal.home.launch.eyebrow", PORTAL_CLIENT_LANGUAGE.launchEyebrow)}
        </p>
        <h2 id="ces-launch-guide-heading" className="kxd-ces-launch-guide__title">
          {title}
        </h2>
        <p className="kxd-ces-launch-guide__lead">{lead}</p>
      </div>
      <ol className="kxd-ces-launch-guide__steps">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {!hasRevisions && websiteUrl ? (
        <div className="kxd-ces-launch-guide__actions">
          <Link href="/portal/website-review/session/new" className="kxd-ces-btn kxd-ces-btn--primary">
            {portalCopy(t, "website-review.cta.visual", PORTAL_CLIENT_LANGUAGE.reviewCtaVisual)}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
