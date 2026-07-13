import type { ResolvedExperienceProfile } from "@/lib/ces";
import { isCesModuleEnabled } from "@/lib/ces";
import type { PartnershipBriefing } from "@/lib/ces/partnership";
import type { WebsiteReviewLandingData } from "@/lib/ces/modules/website-review/types";
import type { ConnectedWorkspaceData } from "@/lib/portal/connected-workspace";
import { isCesFlagshipPortal } from "@/lib/portal/ces-launch-safety";
import { portalFirstName, portalTimeGreeting } from "@/lib/portal/greeting";
import { CesPage } from "@/components/ces/primitives";
import { CesPartnershipBriefing } from "@/components/ces/partnership";

export interface CesPortalHomeProps {
  displayName: string;
  profile: ResolvedExperienceProfile;
  websiteReview: WebsiteReviewLandingData;
  connected: ConnectedWorkspaceData;
  briefing: PartnershipBriefing;
}

export function CesPortalHome({ displayName, profile, briefing }: CesPortalHomeProps) {
  const firstName = portalFirstName(displayName);
  const greeting = portalTimeGreeting(firstName);
  const flagship = isCesFlagshipPortal(profile);

  return (
    <CesPage
      className={`kxd-ces-portal-home kxd-ces-portal-home--briefing kxd-ces-page--enter${
        flagship ? " kxd-ces-portal-home--flagship" : ""
      }`}
    >
      <CesPartnershipBriefing briefing={briefing} greeting={greeting} />
    </CesPage>
  );
}

export function shouldUseCesPortalHome(
  profile: ResolvedExperienceProfile | null | undefined,
): boolean {
  return Boolean(profile && isCesModuleEnabled(profile, "website-review"));
}
