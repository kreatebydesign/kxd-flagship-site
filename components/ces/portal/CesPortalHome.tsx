import Link from "next/link";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import { isCesModuleEnabled } from "@/lib/ces";
import { portalCopy, PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";
import type { WebsiteReviewLandingData } from "@/lib/ces/modules/website-review/types";
import type { ConnectedWorkspaceData } from "@/lib/portal/connected-workspace";
import { isCesFlagshipPortal } from "@/lib/portal/ces-launch-safety";
import { portalFirstName, portalTimeGreeting } from "@/lib/portal/greeting";
import { CesHero, CesPage } from "@/components/ces/primitives";
import { WebsiteReviewEmptyGuide } from "@/components/ces/modules/website-review/WebsiteReviewReassurance";
import { CesPortalLaunchGuide } from "./CesPortalLaunchGuide";
import { CesConnectedWorkspace } from "./CesConnectedWorkspace";

export interface CesPortalHomeProps {
  displayName: string;
  profile: ResolvedExperienceProfile;
  websiteReview: WebsiteReviewLandingData;
  connected: ConnectedWorkspaceData;
}

function workspaceEyebrow(
  profile: ResolvedExperienceProfile,
  terminology: Record<string, string>,
): string {
  return portalCopy(
    terminology,
    "portal.home.workspaceLabel",
    portalCopy(
      terminology,
      "portal.home.eyebrow",
      profile.hospitality.welcomeEyebrow ?? PORTAL_CLIENT_LANGUAGE.homeEyebrow,
    ),
  );
}

export function CesPortalHome({
  displayName,
  profile,
  websiteReview,
  connected,
}: CesPortalHomeProps) {
  const t = profile.terminology;
  const hasRevisions =
    websiteReview.activeReviews.length + websiteReview.completedReviews.length > 0;
  const firstName = portalFirstName(displayName);
  const eyebrow = workspaceEyebrow(profile, t);
  const title = portalTimeGreeting(firstName);
  const lead = portalCopy(t, "portal.home.lead", PORTAL_CLIENT_LANGUAGE.homeLead);
  const flagship = isCesFlagshipPortal(profile);

  return (
    <CesPage
      className={`kxd-ces-portal-home kxd-ces-page--enter${
        flagship ? " kxd-ces-portal-home--flagship" : ""
      }`}
    >
      <CesHero eyebrow={eyebrow} title={title} lead={lead} presence />

      <CesPortalLaunchGuide
        profile={profile}
        websiteUrl={websiteReview.websiteUrl}
        hasRevisions={hasRevisions}
      />

      <CesConnectedWorkspace profile={profile} connected={connected} />

      {!hasRevisions ? (
        <section className="kxd-ces-section kxd-ces-section--supporting">
          <WebsiteReviewEmptyGuide websiteUrl={websiteReview.websiteUrl} />
        </section>
      ) : null}

      {websiteReview.websiteUrl ? (
        <p className="kxd-ces-portal-home__site-link">
          <a href={websiteReview.websiteUrl} target="_blank" rel="noopener noreferrer">
            {PORTAL_CLIENT_LANGUAGE.reviewCtaSecondary}
          </a>
        </p>
      ) : null}
    </CesPage>
  );
}

export function shouldUseCesPortalHome(
  profile: ResolvedExperienceProfile | null | undefined,
): boolean {
  return Boolean(profile && isCesModuleEnabled(profile, "website-review"));
}
