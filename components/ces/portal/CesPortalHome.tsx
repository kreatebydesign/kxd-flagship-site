import type { ResolvedExperienceProfile } from "@/lib/ces";
import { isCesModuleEnabled } from "@/lib/ces";
import type { PartnershipBriefing } from "@/lib/ces/partnership";
import type { ExecutivePerformanceBriefing } from "@/lib/ces/executive-performance";
import type { WebsiteReviewLandingData } from "@/lib/ces/modules/website-review/types";
import type { ConnectedWorkspaceData } from "@/lib/portal/connected-workspace";
import type { WorkspacePersonalizationModel } from "@/lib/portal/workspace-personalization";
import type { WorkPerformanceModel } from "@/lib/portal/work-performance";
import { isCesFlagshipPortal } from "@/lib/portal/ces-launch-safety";
import { portalFirstName, portalTimeGreeting } from "@/lib/portal/greeting";
import { CesPage } from "@/components/ces/primitives";
import { CesPartnershipBriefing } from "@/components/ces/partnership";
import { CesExecutivePerformanceWorkspace } from "@/components/ces/executive-performance";
import { WorkspaceFocusStrip } from "@/components/portal/WorkspaceFocusStrip";
import { WorkPerformanceWorkspace } from "@/components/portal/WorkPerformanceWorkspace";
import { PortalUpgradeOpportunities } from "./PortalUpgradeOpportunities";

export interface CesPortalHomeProps {
  displayName: string;
  profile: ResolvedExperienceProfile;
  websiteReview: WebsiteReviewLandingData;
  connected: ConnectedWorkspaceData;
  briefing: PartnershipBriefing;
  /** Phase 31A — when present, replaces classic partnership briefing. */
  performance?: ExecutivePerformanceBriefing | null;
  /** Batch C — server-resolved workspace personalization for the active client. */
  personalization?: WorkspacePersonalizationModel | null;
  /** Batch D — monthly work & performance workspace for the active client. */
  workPerformance?: WorkPerformanceModel | null;
}

export function CesPortalHome({
  displayName,
  profile,
  briefing,
  websiteReview,
  performance,
  personalization = null,
  workPerformance = null,
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
      <div
        data-workspace-client={
          workPerformance?.clientId ??
          personalization?.clientId ??
          profile.identity.clientId
        }
        data-workspace-profile={personalization?.profileKey ?? "default"}
      >
        {useExecutive && performance ? (
          <CesExecutivePerformanceWorkspace
            performance={performance}
            websiteReview={websiteReview}
          />
        ) : (
          <CesPartnershipBriefing briefing={briefing} greeting={greeting} />
        )}
        {workPerformance ? (
          <div className="kxd-ws-perf-wrap">
            <WorkPerformanceWorkspace model={workPerformance} />
          </div>
        ) : personalization && !useExecutive ? (
          <WorkspaceFocusStrip personalization={personalization} />
        ) : null}
        <PortalUpgradeOpportunities />
      </div>
    </CesPage>
  );
}

export function shouldUseCesPortalHome(
  profile: ResolvedExperienceProfile | null | undefined,
): boolean {
  return Boolean(profile && isCesModuleEnabled(profile, "website-review"));
}
