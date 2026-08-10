import type { ResolvedExperienceProfile } from "@/lib/ces";
import type { PartnershipBriefing } from "@/lib/ces/partnership";
import type { ExecutivePerformanceBriefing } from "@/lib/ces/executive-performance";
import type { WebsiteReviewLandingData } from "@/lib/ces/modules/website-review/types";
import type { ConnectedWorkspaceData } from "@/lib/portal/connected-workspace";
import type { WorkspacePersonalizationModel } from "@/lib/portal/workspace-personalization";
import type { WorkPerformanceModel } from "@/lib/portal/work-performance";
import { isCesFlagshipPortal } from "@/lib/portal/ces-launch-safety";
import {
  composeClientHomePresentation,
  isHomeZoneVisible,
  resolveCesHomeSurface,
  shouldUseCesPortalHome as resolveCesHomeShell,
  type ClientHomeBusinessImpact,
  type PortalHomeComposition,
} from "@/lib/ces/modules/home";
import { CesPage } from "@/components/ces/primitives";
import { CesPartnershipBriefing } from "@/components/ces/partnership";
import { CesExecutivePerformanceWorkspace } from "@/components/ces/executive-performance";
import { WorkspaceFocusStrip } from "@/components/portal/WorkspaceFocusStrip";
import { CesClientCommandHome } from "./CesClientCommandHome";

export interface CesPortalHomeProps {
  greeting: string;
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
  /** Canonical entitlement-aware home-zone composition. */
  homeComposition: PortalHomeComposition;
  /** Future confirmed lead aggregates only — omit when unavailable. */
  businessImpact?: ClientHomeBusinessImpact | null;
}

export function CesPortalHome({
  greeting,
  profile,
  briefing,
  websiteReview,
  performance,
  personalization = null,
  workPerformance = null,
  homeComposition,
  businessImpact = null,
}: CesPortalHomeProps) {
  const flagship = isCesFlagshipPortal(profile);
  const homeSurface = resolveCesHomeSurface({
    homeComposition,
    hasExecutivePerformance: Boolean(performance),
    hasWorkPerformance: Boolean(workPerformance),
  });
  const useExecutive = homeSurface === "executive-performance";
  const clientHome =
    homeSurface === "client-command" && workPerformance
      ? composeClientHomePresentation({
          greeting,
          profile,
          briefing,
          workPerformance,
          businessImpact,
        })
      : null;

  return (
    <CesPage
      className={`kxd-ces-portal-home kxd-ces-portal-home--briefing kxd-ces-page--enter${
        flagship ? " kxd-ces-portal-home--flagship" : ""
      }${useExecutive ? " kxd-ces-portal-home--executive" : ""}${
        clientHome ? " kxd-ces-portal-home--command" : ""
      }`}
    >
      <div>
        {clientHome ? (
          <CesClientCommandHome
            home={clientHome}
            showWork={isHomeZoneVisible(homeComposition, "work-performance")}
            showPartnership={isHomeZoneVisible(homeComposition, "partnership-briefing")}
          />
        ) : useExecutive && performance ? (
          <CesExecutivePerformanceWorkspace
            performance={performance}
            websiteReview={websiteReview}
          />
        ) : (
          <CesPartnershipBriefing briefing={briefing} greeting={greeting} />
        )}
        {!clientHome && personalization && !useExecutive ? (
          <WorkspaceFocusStrip personalization={personalization} />
        ) : null}
      </div>
    </CesPage>
  );
}

export function shouldUseCesPortalHome(
  profile: ResolvedExperienceProfile | null | undefined,
): boolean {
  return resolveCesHomeShell(profile);
}
