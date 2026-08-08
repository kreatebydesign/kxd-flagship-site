import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { resolveClientEntitlements } from "@/lib/client-plans";
import { loadClientReportingConnection } from "@/lib/reporting/providers/connection";
import { loadBillingProfileInvoiceMapping } from "@/lib/stripe/invoice-read-service";
import { isPortalBillingNavEligible } from "@/lib/portal/billing/nav-eligibility";
import {
  MEMBERSHIP_COLLECTION,
  isMembershipSchemaUnavailableError,
} from "@/lib/portal/membership-schema";
import { listPortalInvitations } from "@/lib/portal/identity/invitations";
import {
  normalizePortalModuleList,
  normalizeReportingCapabilityList,
} from "@/lib/ces/modules/canonical";
import {
  normalizeBorderRadius,
  normalizeMotionPreset,
  normalizeSupportTone,
  parseTerminology,
} from "@/lib/ces/profile/defaults";
import { getExecutivePresentation } from "@/lib/ces/executive-performance/presentation";
import {
  composeOperatorHomeShell,
  composeOperatorModuleRows,
  composeOperatorNavPreview,
  type ExperienceComposeInput,
} from "./compose";
function isTrustedClientAccent(value: string): boolean {
  const trimmed = value.trim();
  return Boolean(trimmed.startsWith("#") && trimmed.toUpperCase() !== "#C9A962");
}
import { composeOperatorExperienceWarnings } from "./warnings";
import { relMediaId, resolveMediaAssetUrl } from "./media-url";
import type {
  ExperienceProfileStatus,
  OperatorExperienceSnapshot,
  OperatorIntegrationStatusRow,
  OperatorPortalAccessStatus,
  OperatorPortalContactRow,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

function mediaUrl(value: unknown): string | null {
  return resolveMediaAssetUrl(value);
}

function asStatus(value: unknown): ExperienceProfileStatus {
  if (value === "draft" || value === "active" || value === "archived") return value;
  return "none";
}

async function loadInventoryCount(clientId: number): Promise<number> {
  const payload = await getPayload({ config });
  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-inventory-vehicles" as any,
      where: { client: { equals: clientId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    return result.totalDocs ?? result.docs.length;
  } catch {
    return 0;
  }
}

async function loadPortalAccess(
  clientId: number,
  primaryContact: string | null,
): Promise<OperatorPortalAccessStatus> {
  const payload = await getPayload({ config });
  const manageHref = `/admin/operations/portal-access?client=${clientId}`;
  const contacts: OperatorPortalContactRow[] = [];

  try {
    const memberships = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: MEMBERSHIP_COLLECTION as any,
      where: { client: { equals: clientId } },
      limit: 50,
      depth: 1,
      overrideAccess: true,
    });
    for (const doc of memberships.docs as AnyDoc[]) {
      const user = doc.portalUser;
      const userId = relId(user);
      if (userId == null) continue;
      const email =
        typeof user === "object" && user
          ? String(user.email ?? "")
          : "";
      const displayName =
        typeof user === "object" && user && user.displayName
          ? String(user.displayName)
          : null;
      const active = typeof user === "object" && user ? user.active !== false : true;
      const status = doc.status === "disabled" ? "disabled" : "active";
      let multiAccount = false;
      if (typeof user === "object" && user) {
        try {
          const others = await payload.find({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            collection: MEMBERSHIP_COLLECTION as any,
            where: {
              and: [
                { portalUser: { equals: userId } },
                { status: { equals: "active" } },
              ],
            },
            limit: 5,
            depth: 0,
            overrideAccess: true,
          });
          multiAccount = others.totalDocs > 1 || others.docs.length > 1;
        } catch {
          multiAccount = false;
        }
      }
      contacts.push({
        id: userId,
        email,
        displayName,
        active,
        role: typeof doc.role === "string" ? doc.role : "client-member",
        membershipStatus: status,
        multiAccount,
      });
    }
  } catch (err) {
    if (!isMembershipSchemaUnavailableError(err)) throw err;
  }

  if (contacts.length === 0) {
    const legacy = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      where: { client: { equals: clientId } },
      limit: 50,
      depth: 0,
      overrideAccess: true,
    });
    for (const doc of legacy.docs as AnyDoc[]) {
      contacts.push({
        id: Number(doc.id),
        email: String(doc.email ?? ""),
        displayName: doc.displayName ? String(doc.displayName) : null,
        active: doc.active !== false,
        role: null,
        membershipStatus: "legacy",
        multiAccount: false,
      });
    }
  }

  let invitations: OperatorPortalAccessStatus["invitations"] = [];
  try {
    const all = await listPortalInvitations(payload);
    invitations = all
      .filter((row) =>
        row.memberships.some((m) => m.clientId === clientId) &&
        (row.status === "draft" || row.status === "sent"),
      )
      .map((row) => ({
        id: row.id,
        email: row.email,
        status: row.status,
        expiresAt: row.expiresAt,
      }));
  } catch {
    invitations = [];
  }

  const activeMembershipCount = contacts.filter(
    (c) => c.membershipStatus === "active" || c.membershipStatus === "legacy",
  ).length;

  return {
    primaryContact,
    membershipCount: contacts.length,
    activeMembershipCount,
    hasPortalMembership: activeMembershipCount > 0,
    pendingInvitationCount: invitations.length,
    multiAccountContacts: contacts.filter((c) => c.multiAccount).length,
    manageHref,
    contacts,
    invitations,
  };
}

function integrationRows(input: {
  clientId: number;
  ga4: string | null;
  gsc: string | null;
  reportingCapabilities: string[];
  billingEligible: boolean;
  websiteUrl: string | null;
}): OperatorIntegrationStatusRow[] {
  const entitledAnalytics =
    input.reportingCapabilities.includes("website-analytics") ||
    input.reportingCapabilities.includes("seo") ||
    input.reportingCapabilities.includes("executive-reporting");
  const infraHref = `/admin/operations/infrastructure/${input.clientId}`;
  const billingHref = `/admin/operations/client-command/${input.clientId}/commercial/overview`;

  const ga4Status: OperatorIntegrationStatusRow["status"] = input.ga4
    ? "configured"
    : entitledAnalytics
      ? "entitled-unconfigured"
      : "not-configured";
  const gscStatus: OperatorIntegrationStatusRow["status"] = input.gsc
    ? "configured"
    : input.reportingCapabilities.includes("seo")
      ? "entitled-unconfigured"
      : "not-configured";

  return [
    {
      id: "ga4",
      label: "GA4",
      status: ga4Status,
      detail: input.ga4 ? "Property on file." : "No GA4 property on infrastructure.",
      href: infraHref,
    },
    {
      id: "search-console",
      label: "Search Console",
      status: gscStatus,
      detail: input.gsc ? "Site URL on file." : "No Search Console site on infrastructure.",
      href: infraHref,
    },
    {
      id: "reporting",
      label: "Reporting capabilities",
      status: input.reportingCapabilities.length
        ? input.ga4 || input.gsc
          ? "configured"
          : "entitled-unconfigured"
        : "not-entitled",
      detail: input.reportingCapabilities.length
        ? input.reportingCapabilities.join(", ")
        : "None on the experience profile.",
      href: `/admin/operations/client-command/${input.clientId}?tab=analytics`,
    },
    {
      id: "stripe",
      label: "Stripe billing mapping",
      status: input.billingEligible ? "configured" : "not-configured",
      detail: input.billingEligible
        ? "Test-mode Stripe customer mapping eligible for Billing nav."
        : "No eligible test-mode Stripe mapping.",
      href: billingHref,
    },
    {
      id: "website",
      label: "Website / domain",
      status: input.websiteUrl ? "configured" : "not-configured",
      detail: input.websiteUrl ?? "No company website on the client record.",
      href: `/admin/collections/clients/${input.clientId}`,
    },
  ];
}

export async function loadOperatorExperienceSnapshot(
  clientId: number,
): Promise<OperatorExperienceSnapshot | null> {
  if (!Number.isFinite(clientId) || clientId <= 0) return null;
  const payload = await getPayload({ config });

  let client: AnyDoc;
  try {
    client = (await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    return null;
  }

  const clientName = String(client.name ?? `Client #${clientId}`);
  const clientSlug = client.slug ? String(client.slug) : null;
  const websiteUrl = client.companyWebsite ? String(client.companyWebsite) : null;
  const primaryContact =
      typeof client.primaryContactName === "string" && client.primaryContactName.trim()
      ? client.primaryContactName.trim()
      : typeof client.primaryContactEmail === "string" && client.primaryContactEmail.trim()
        ? client.primaryContactEmail.trim()
        : null;

  const profiles = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-experience-profiles" as any,
    where: { client: { equals: clientId } },
    limit: 1,
    depth: 2,
    overrideAccess: true,
  });
  const profile = (profiles.docs[0] as AnyDoc | undefined) ?? null;
  const profileStatus = profile ? asStatus(profile.status) : "none";
  const enabledRaw = Array.isArray(profile?.enabledModules) ? profile.enabledModules : [];
  const selectedPortalModules = normalizePortalModuleList(enabledRaw);
  const reportingCapabilities = normalizeReportingCapabilityList(enabledRaw);

  const logoOverride = mediaUrl(profile?.logoOverride);
  let onboardingLogo: string | null = null;
  let onboardingId: number | null = null;
  try {
    const onboarding = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-onboarding" as any,
      where: { client: { equals: clientId } },
      limit: 1,
      depth: 2,
      overrideAccess: true,
    });
    const doc = onboarding.docs[0] as AnyDoc | undefined;
    onboardingId = doc?.id != null ? Number(doc.id) : null;
    const files = doc?.logoFiles;
    if (Array.isArray(files) && files[0]) {
      onboardingLogo = mediaUrl(files[0]);
      if (!onboardingLogo) {
        const mediaId = relMediaId(files[0]);
        if (mediaId != null) {
          try {
            const mediaDoc = await payload.findByID({
              collection: "media",
              id: mediaId,
              depth: 0,
              overrideAccess: true,
            });
            onboardingLogo = mediaUrl(mediaDoc);
          } catch {
            onboardingLogo = null;
          }
        }
      }
    }
  } catch {
    onboardingLogo = null;
  }

  let brandKit =
    profile?.brandKit && typeof profile.brandKit === "object"
      ? (profile.brandKit as AnyDoc)
      : null;
  if (!brandKit) {
    try {
      const kits = await payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "brand-kits" as any,
        where: { client: { equals: clientId } },
        limit: 1,
        depth: 0,
        sort: "-updatedAt",
        overrideAccess: true,
      });
      brandKit = (kits.docs[0] as AnyDoc | undefined) ?? null;
    } catch {
      brandKit = null;
    }
  }

  const presentation = getExecutivePresentation(clientSlug);
  const presentationLogo =
    typeof presentation?.logoSrc === "string" && presentation.logoSrc.trim()
      ? presentation.logoSrc.trim()
      : null;
  const logoUrl = logoOverride ?? onboardingLogo ?? presentationLogo;
  const logoSource = logoOverride
    ? "profile-override"
    : onboardingLogo
      ? "onboarding"
      : presentationLogo
        ? "presentation"
        : "none";

  const kitPrimary =
    typeof brandKit?.primaryColor === "string" ? brandKit.primaryColor : "";
  const kitSecondary =
    typeof brandKit?.secondaryColor === "string" ? brandKit.secondaryColor : "";
  const kitAccent =
    typeof brandKit?.accentColor === "string" ? brandKit.accentColor : "";
  const presentationAccent =
    typeof presentation?.actionAccent === "string" ? presentation.actionAccent : "";
  const profileAccent =
    typeof profile?.accentColor === "string" ? profile.accentColor : "";
  const resolvedAccent = isTrustedClientAccent(profileAccent)
    ? profileAccent
    : isTrustedClientAccent(kitAccent)
      ? kitAccent
      : isTrustedClientAccent(presentationAccent)
        ? presentationAccent
        : "#3A3A3A";
  const resolvedPrimary = String(
    profile?.primaryColor ||
      (isTrustedClientAccent(kitPrimary) ? kitPrimary : "") ||
      "#0B0B0B",
  );
  const resolvedSecondary = String(
    profile?.secondaryColor ||
      (isTrustedClientAccent(kitSecondary) ? kitSecondary : "") ||
      "#141414",
  );

  const [entitlements, reporting, mapping, inventoryCount, portalAccess] =
    await Promise.all([
      resolveClientEntitlements(clientId),
      loadClientReportingConnection(clientId),
      loadBillingProfileInvoiceMapping(clientId),
      loadInventoryCount(clientId),
      loadPortalAccess(clientId, primaryContact),
    ]);

  const billingNavAvailable = isPortalBillingNavEligible(mapping, clientId);
  const portfolioNavAvailable = portalAccess.multiAccountContacts > 0;

  const composeInput: ExperienceComposeInput = {
    clientId,
    clientName,
    clientSlug,
    profileStatus,
    selectedPortalModules,
    reportingCapabilities,
    entitlements: {
      isLegacy: entitlements.isLegacy,
      isPaused: entitlements.isPaused,
      effectiveModules: entitlements.effectiveModules,
    },
    billingNavAvailable,
    portfolioNavAvailable,
    websiteUrl,
    logoUrl,
    visual: {
      primaryColor: resolvedPrimary,
      secondaryColor: resolvedSecondary,
      accentColor: resolvedAccent,
      borderRadiusPreset: normalizeBorderRadius(profile?.borderRadiusPreset),
      motionPreset: normalizeMotionPreset(profile?.motionPreset),
    },
    hospitality: {
      welcomeEyebrow: String(profile?.welcomeEyebrow ?? ""),
      reassuranceLine: String(profile?.reassuranceLine ?? ""),
      supportTone: normalizeSupportTone(profile?.supportTone),
      portalSidebarLabel: String(profile?.portalSidebarLabel ?? clientName),
      partnerFooterLine: String(
        profile?.partnerFooterLine ?? "Powered by Kreate by Design",
      ),
      showPartnerMark: profile ? profile.showKxdPartnerMark !== false : true,
    },
    terminology: parseTerminology(profile?.terminology),
  };

  const integrations = integrationRows({
    clientId,
    ga4: reporting?.ga4PropertyId ?? null,
    gsc: reporting?.searchConsoleSiteUrl ?? null,
    reportingCapabilities,
    billingEligible: billingNavAvailable,
    websiteUrl,
  });

  const warnings = composeOperatorExperienceWarnings({
    hasLogo: Boolean(logoUrl),
    profileStatus,
    selectedPortalModules,
    welcomeEyebrow: composeInput.hospitality?.welcomeEyebrow ?? "",
    reassuranceLine: composeInput.hospitality?.reassuranceLine ?? "",
    accentColor: composeInput.visual?.accentColor ?? "",
    hasPortalMembership: portalAccess.hasPortalMembership,
    inventoryRecordCount: inventoryCount,
    integrations,
  });

  return {
    clientId,
    clientSlug,
    websiteUrl,
    profileId: profile?.id != null ? Number(profile.id) : null,
    profileName: profile?.profileName ? String(profile.profileName) : null,
    profileStatus,
    payloadProfileHref: profile
      ? `/admin/collections/client-experience-profiles/${profile.id}`
      : null,
    payloadClientHref: `/admin/collections/clients/${clientId}`,
    branding: {
      clientName,
      portalSidebarLabel: composeInput.hospitality?.portalSidebarLabel ?? clientName,
      welcomeEyebrow: composeInput.hospitality?.welcomeEyebrow ?? "",
      reassuranceLine: composeInput.hospitality?.reassuranceLine ?? "",
      supportTone: composeInput.hospitality?.supportTone ?? "warm-professional",
      primaryColor: composeInput.visual?.primaryColor ?? "#0B0B0B",
      secondaryColor: composeInput.visual?.secondaryColor ?? "#141414",
      accentColor: composeInput.visual?.accentColor ?? "#3A3A3A",
      borderRadiusPreset: composeInput.visual?.borderRadiusPreset ?? "default",
      motionPreset: composeInput.visual?.motionPreset ?? "calm",
      showKxdPartnerMark: composeInput.hospitality?.showPartnerMark !== false,
      partnerFooterLine:
        composeInput.hospitality?.partnerFooterLine ?? "Powered by Kreate by Design",
      terminology: composeInput.terminology ?? {},
    },
    logo: {
      hasLogo: Boolean(logoUrl),
      source: logoSource,
      url: logoUrl,
      profileEditHref: profile
        ? `/admin/collections/client-experience-profiles/${profile.id}`
        : "/admin/collections/client-experience-profiles/create",
      brandKitHref: brandKit?.id
        ? `/admin/collections/brand-kits/${brandKit.id}`
        : null,
      onboardingHref: onboardingId
        ? `/admin/collections/client-onboarding/${onboardingId}`
        : null,
    },
    selectedPortalModules,
    reportingCapabilities,
    modules: composeOperatorModuleRows(composeInput),
    navPreview: composeOperatorNavPreview(composeInput),
    homeShell: composeOperatorHomeShell(composeInput),
    integrations,
    portalAccess,
    warnings,
    plan: {
      isLegacy: entitlements.isLegacy,
      isPaused: entitlements.isPaused,
      planKey: entitlements.planKey,
      effectiveModules: entitlements.effectiveModules,
    },
    billingNavAvailable,
    portfolioNavAvailable,
    inventoryRecordCount: inventoryCount,
  };
}
