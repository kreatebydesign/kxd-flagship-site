import type { ResolvedExperienceProfile } from "@/lib/ces";
import type { PartnershipBriefing } from "@/lib/ces/partnership";
import type { ExecutivePerformanceBriefing } from "@/lib/ces/executive-performance";
import type { WebsiteReviewLandingData } from "@/lib/ces/modules/website-review/types";
import type { ConnectedWorkspaceData } from "@/lib/portal/connected-workspace";
import type { WorkspacePersonalizationModel } from "@/lib/portal/workspace-personalization";
import type { WorkPerformanceModel } from "@/lib/portal/work-performance";
import type { ActiveEngagementSnapshot } from "@/lib/portal/active-engagement";
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
import { CesPresentationHomeHero } from "@/components/ces/presentation/CesPresentationHomeHero";
import { WorkspaceFocusStrip } from "@/components/portal/WorkspaceFocusStrip";
import { CesClientCommandHome } from "./CesClientCommandHome";
import { WebsiteEditorPortalAction } from "@/components/portal/WebsiteEditorPortalAction";

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
  /** Reusable Active Engagement summary from commercial records. */
  engagement?: ActiveEngagementSnapshot | null;
  /** Optional external website editor doorway. */
  websiteEditorUrl?: string | null;
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
  engagement = null,
  websiteEditorUrl = null,
}: CesPortalHomeProps) {
  const flagship = isCesFlagshipPortal(profile);
  const homeSurface = resolveCesHomeSurface({
    homeComposition,
    hasExecutivePerformance: Boolean(performance),
    hasWorkPerformance: Boolean(workPerformance),
  });
  const useExecutive = homeSurface === "executive-performance";
  const presentation = profile.presentation;
  const showPresentationHero = Boolean(
    !useExecutive && presentation?.heroImageSrc?.trim(),
  );
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

  const engagementEyebrow =
    profile.terminology["portal.engagement.eyebrow"] ?? "Active engagement";
  const engagementTitle =
    profile.terminology["portal.engagement.title"] ?? "Your support";

  return (
    <CesPage
      className={`kxd-ces-portal-home kxd-ces-portal-home--briefing kxd-ces-page--enter${
        flagship ? " kxd-ces-portal-home--flagship" : ""
      }${useExecutive ? " kxd-ces-portal-home--executive" : ""}${
        clientHome ? " kxd-ces-portal-home--command" : ""
      }${showPresentationHero ? " kxd-ces-portal-home--presented" : ""}`}
    >
      <div>
        {websiteEditorUrl ? <WebsiteEditorPortalAction url={websiteEditorUrl} /> : null}
        {showPresentationHero && presentation ? (
          <CesPresentationHomeHero
            presentation={presentation}
            logoSrc={profile.identity.logoUrl}
            logoAlt={profile.identity.logoAlt}
          />
        ) : null}
        {clientHome ? (
          <CesClientCommandHome
            home={clientHome}
            showWork={isHomeZoneVisible(homeComposition, "work-performance")}
            showPartnership={isHomeZoneVisible(homeComposition, "partnership-briefing")}
            engagement={engagement}
            engagementEyebrow={engagementEyebrow}
            engagementTitle={engagementTitle}
            suppressWelcome={showPresentationHero}
          />
        ) : useExecutive && performance ? (
          <CesExecutivePerformanceWorkspace
            performance={performance}
            websiteReview={websiteReview}
          />
        ) : (
          <CesPartnershipBriefing
            briefing={briefing}
            greeting={greeting}
            engagement={engagement}
            engagementEyebrow={engagementEyebrow}
            engagementTitle={engagementTitle}
            suppressHero={showPresentationHero}
          />
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
