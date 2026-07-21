import type { ResolvedExperienceProfile } from "@/lib/ces";
import { isCesModuleEnabled } from "@/lib/ces";
import type { PartnershipBriefing } from "@/lib/ces/partnership";
import type { ExecutivePerformanceBriefing } from "@/lib/ces/executive-performance";
import type { WebsiteReviewLandingData } from "@/lib/ces/modules/website-review/types";
import type { ConnectedWorkspaceData } from "@/lib/portal/connected-workspace";
import { isCesFlagshipPortal } from "@/lib/portal/ces-launch-safety";
import { portalFirstName, portalTimeGreeting } from "@/lib/portal/greeting";
import { CesPage } from "@/components/ces/primitives";
import { CesPartnershipBriefing } from "@/components/ces/partnership";
import { CesExecutivePerformanceWorkspace } from "@/components/ces/executive-performance";
import { PortalUpgradeOpportunities } from "./PortalUpgradeOpportunities";

export interface CesPortalHomeProps {
  displayName: string;
  profile: ResolvedExperienceProfile;
  websiteReview: WebsiteReviewLandingData;
  connected: ConnectedWorkspaceData;
  briefing: PartnershipBriefing;
  /** Phase 31A — when present, replaces classic partnership briefing. */
  performance?: ExecutivePerformanceBriefing | null;
}

export function CesPortalHome({
  displayName,
  profile,
  briefing,
  websiteReview,
  performance,
}: CesPortalHomeProps) {
  const firstName = portalFirstName(displayName);
  const greeting = portalTimeGreeting(firstName);
  const flagship = isCesFlagshipPortal(profile);
  const useExecutive = Boolean(performance);

  return (
    <CesPage
      className={`kxd-ces-portal-home kxd-ces-portal-home--briefing kxd-ces-page--enter${
        flagship ? " kxd-ces-portal-home--flagship" : ""
      }${useExecutive ? " kxd-ces-portal-home--executive" : ""}`}
    >
      {useExecutive && performance ? (
        <CesExecutivePerformanceWorkspace
          performance={performance}
          websiteReview={websiteReview}
        />
      ) : (
        <CesPartnershipBriefing briefing={briefing} greeting={greeting} />
      )}
      <PortalUpgradeOpportunities />
    </CesPage>
  );
}

export function shouldUseCesPortalHome(
  profile: ResolvedExperienceProfile | null | undefined,
): boolean {
  return Boolean(profile && isCesModuleEnabled(profile, "website-review"));
}
