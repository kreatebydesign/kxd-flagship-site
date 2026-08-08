import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { getExecutivePresentation } from "@/lib/ces/executive-performance/presentation";
import { WEBSITE_REVIEW_EXPERIENCE_MODULE } from "@/lib/ces/modules/website-review/constants";
import { WEBSITE_WORKSPACE_EXPERIENCE_MODULE } from "@/lib/ces/modules/website-workspace/constants";
import { loadOperatorExperienceSnapshot } from "../load";
import type { ExperienceSignals } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

async function countWhere(
  collection: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  where: any,
): Promise<number> {
  const payload = await getPayload({ config });
  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: collection as any,
      where,
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    return result.totalDocs ?? result.docs.length;
  } catch {
    return 0;
  }
}

export async function loadExperienceSignals(
  clientId: number,
): Promise<ExperienceSignals | null> {
  const snapshot = await loadOperatorExperienceSnapshot(clientId);
  if (!snapshot) return null;

  const payload = await getPayload({ config });
  let client: AnyDoc = {};
  try {
    client = (await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    client = {};
  }

  let currentServices: string | null = null;
  let industry: string | null = null;
  try {
    const profiles = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "executive-client-profiles" as any,
      where: { client: { equals: clientId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const doc = profiles.docs[0] as AnyDoc | undefined;
    if (typeof doc?.currentServices === "string" && doc.currentServices.trim()) {
      currentServices = doc.currentServices.trim();
    }
    if (typeof doc?.industry === "string" && doc.industry.trim()) {
      industry = doc.industry.trim();
    }
  } catch {
    currentServices = null;
  }

  let hasHostingInfra = false;
  let primaryDomain: string | null = null;
  try {
    const infra = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-infrastructure" as any,
      where: { client: { equals: clientId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const doc = infra.docs[0] as AnyDoc | undefined;
    primaryDomain =
      typeof doc?.primaryDomain === "string" && doc.primaryDomain.trim()
        ? doc.primaryDomain.trim()
        : null;
    hasHostingInfra = Boolean(
      doc?.hostingProvider || doc?.dnsProvider || primaryDomain,
    );
  } catch {
    hasHostingInfra = false;
  }

  const ga4 = snapshot.integrations.find((row) => row.id === "ga4");
  const gsc = snapshot.integrations.find((row) => row.id === "search-console");

  const [
    websiteReviewCount,
    websiteWorkspaceCount,
    projectCount,
    openRequestCount,
    deliverableCount,
    publishedReportCount,
    assetCount,
    meetingCount,
    brandKitAssets,
  ] = await Promise.all([
    countWhere("client-requests", {
      and: [
        { client: { equals: clientId } },
        { experienceModule: { equals: WEBSITE_REVIEW_EXPERIENCE_MODULE } },
      ],
    }),
    countWhere("client-requests", {
      and: [
        { client: { equals: clientId } },
        { experienceModule: { equals: WEBSITE_WORKSPACE_EXPERIENCE_MODULE } },
      ],
    }),
    countWhere("client-projects", { client: { equals: clientId } }),
    countWhere("client-requests", {
      and: [
        { client: { equals: clientId } },
        { status: { in: ["new", "triaged", "in-progress", "waiting"] } },
      ],
    }),
    countWhere("monthly-deliverables", { client: { equals: clientId } }),
    countWhere("monthly-reports", {
      and: [{ client: { equals: clientId } }, { status: { equals: "published" } }],
    }).catch(async () =>
      countWhere("monthly-reports", { client: { equals: clientId } }),
    ),
    countWhere("creative-assets", { client: { equals: clientId } }),
    countWhere("success-check-ins", { client: { equals: clientId } }),
    countWhere("brand-kits", { client: { equals: clientId } }),
  ]);

  const presentation = getExecutivePresentation(snapshot.clientSlug);

  return {
    clientId,
    clientName: snapshot.branding.clientName,
    clientSlug: snapshot.clientSlug,
    clientStatus: String(client.status ?? "active"),
    websiteUrl: snapshot.websiteUrl,
    brandTier: typeof client.brandTier === "string" ? client.brandTier : null,
    monthlyRetainerAmount:
      typeof client.monthlyRetainerAmount === "number"
        ? client.monthlyRetainerAmount
        : null,
    commercialAgreementId:
      typeof client.commercialAgreementId === "string"
        ? client.commercialAgreementId
        : null,
    currentServices,
    industry,
    hasHostingInfra,
    primaryDomain,
    ga4PropertyId: ga4?.status === "configured" ? ga4.detail : null,
    searchConsoleSiteUrl: gsc?.status === "configured" ? gsc.detail : null,
    reportingCapabilities: snapshot.reportingCapabilities,
    entitlements: {
      isLegacy: snapshot.plan.isLegacy,
      isPaused: snapshot.plan.isPaused,
      planKey: snapshot.plan.planKey,
      effectiveModules: snapshot.plan.effectiveModules,
    },
    profileStatus: snapshot.profileStatus,
    existingSelectedModules: snapshot.selectedPortalModules,
    existingBranding: {
      portalSidebarLabel: snapshot.branding.portalSidebarLabel,
      welcomeEyebrow: snapshot.branding.welcomeEyebrow,
      reassuranceLine: snapshot.branding.reassuranceLine,
      supportTone: snapshot.branding.supportTone,
      primaryColor: snapshot.branding.primaryColor,
      secondaryColor: snapshot.branding.secondaryColor,
      accentColor: snapshot.branding.accentColor,
      borderRadiusPreset: snapshot.branding.borderRadiusPreset,
      motionPreset: snapshot.branding.motionPreset,
      showKxdPartnerMark: snapshot.branding.showKxdPartnerMark,
      partnerFooterLine: snapshot.branding.partnerFooterLine,
    },
    logoHasFile: snapshot.logo.hasLogo,
    logoSource: snapshot.logo.source,
    inventoryCount: snapshot.inventoryRecordCount,
    websiteReviewCount,
    websiteWorkspaceCount,
    projectCount,
    openRequestCount,
    deliverableCount,
    publishedReportCount,
    assetCount: assetCount + brandKitAssets,
    meetingCount,
    billingNavAvailable: snapshot.billingNavAvailable,
    portfolioNavAvailable: snapshot.portfolioNavAvailable,
    hasPortalMembership: snapshot.portalAccess.hasPortalMembership,
    hasEnabledPresentation: Boolean(presentation?.enabled),
    integrations: snapshot.integrations,
    portalAccess: snapshot.portalAccess,
  };
}
