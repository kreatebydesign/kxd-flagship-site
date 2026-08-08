/**
 * Pure experience recommendation — client-agnostic, no slug branching, no writes.
 */

import {
  getCanonicalCapability,
  isCesExperienceModuleId,
  isInternalOnlyCapability,
  type PortalModuleId,
} from "@/lib/ces/modules/canonical";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";
import {
  composeOperatorHomeShell,
  composeOperatorNavPreview,
  sanitizeSelectedPortalModules,
} from "../compose";
import {
  isOperatorToggleablePortalModule,
  listOperatorPortalModuleIds,
  operatorModuleKind,
  planAllowsPortalModule,
} from "../module-catalog";
import {
  composeExperienceReadiness,
  isTrustedClientAccent,
} from "./readiness";
import type {
  ExperienceBrandingRecommendation,
  ExperienceModuleRecommendation,
  ExperienceRecommendation,
  ExperienceSignals,
  ModuleRecommendationDecision,
} from "./types";

const CONSERVATIVE_PRIMARY = "#0B0B0B";
const CONSERVATIVE_SECONDARY = "#141414";
/** Neutral charcoal — never KXD gold as an inferred client brand. */
const CONSERVATIVE_ACCENT = "#3A3A3A";
const KXD_GOLD = "#C9A962";

function servicesHaystack(signals: ExperienceSignals): string {
  return [signals.currentServices, signals.industry, signals.commercialAgreementId]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function mentions(hay: string, ...needles: string[]): boolean {
  return needles.some((n) => hay.includes(n));
}

function alreadyEnabled(signals: ExperienceSignals, id: PortalModuleId): boolean {
  return signals.existingSelectedModules.includes(id);
}

export function recommendBranding(
  signals: ExperienceSignals,
): ExperienceBrandingRecommendation {
  const existing = signals.existingBranding;
  const hasProfileCopy =
    Boolean(existing.welcomeEyebrow.trim()) && Boolean(existing.reassuranceLine.trim());
  const storedAccent = existing.accentColor.trim().toUpperCase();
  const accentLooksLikeKxdDefault =
    storedAccent === KXD_GOLD && signals.profileStatus !== "active";

  let colorSource: ExperienceBrandingRecommendation["colorSource"] = "authoritative";
  let colorNote = "Using stored experience / brand-kit colors.";
  let accent = existing.accentColor || CONSERVATIVE_ACCENT;
  let primary = existing.primaryColor || CONSERVATIVE_PRIMARY;
  let secondary = existing.secondaryColor || CONSERVATIVE_SECONDARY;

  if (!existing.accentColor.trim() || accentLooksLikeKxdDefault) {
    const kit = signals.brandKit;
    if (kit && isTrustedClientAccent(kit.accentColor)) {
      colorSource = "authoritative";
      accent = kit.accentColor;
      primary = isTrustedClientAccent(kit.primaryColor)
        ? kit.primaryColor
        : CONSERVATIVE_PRIMARY;
      secondary = isTrustedClientAccent(kit.secondaryColor)
        ? kit.secondaryColor
        : CONSERVATIVE_SECONDARY;
      colorNote = "Using brand-kit colors already stored for this client.";
    } else if (isTrustedClientAccent(signals.presentationAccent)) {
      colorSource = "authoritative";
      accent = signals.presentationAccent as string;
      primary = CONSERVATIVE_PRIMARY;
      secondary = CONSERVATIVE_SECONDARY;
      colorNote = "Using presentation registry accent already stored for this client.";
    } else {
      colorSource = signals.logoHasFile ? "inferred" : "missing";
      accent = CONSERVATIVE_ACCENT;
      primary = CONSERVATIVE_PRIMARY;
      secondary = CONSERVATIVE_SECONDARY;
      colorNote = accentLooksLikeKxdDefault
        ? "Existing accent matches KXD OS gold and is not treated as client brand. Conservative charcoal recommended until a client color is stored."
        : "No client brand color on file. Conservative neutrals recommended — do not ship KXD gold as the client brand.";
    }
  }

  const welcomeAuthoritative = Boolean(existing.welcomeEyebrow.trim());
  const reassuranceAuthoritative = Boolean(existing.reassuranceLine.trim());

  return {
    clientName: signals.clientName,
    clientNameSource: "authoritative",
    portalSidebarLabel: existing.portalSidebarLabel.trim() || signals.clientName,
    portalSidebarLabelSource: existing.portalSidebarLabel.trim()
      ? "authoritative"
      : "inferred",
    welcomeEyebrow: welcomeAuthoritative
      ? existing.welcomeEyebrow
      : PORTAL_CLIENT_LANGUAGE.homeEyebrow,
    welcomeEyebrowSource: welcomeAuthoritative ? "authoritative" : "inferred",
    reassuranceLine: reassuranceAuthoritative
      ? existing.reassuranceLine
      : PORTAL_CLIENT_LANGUAGE.reviewReassuranceLine1,
    reassuranceLineSource: reassuranceAuthoritative ? "authoritative" : "inferred",
    supportTone: existing.supportTone || "warm-professional",
    supportToneSource: hasProfileCopy ? "authoritative" : "inferred",
    primaryColor: primary,
    secondaryColor: secondary,
    accentColor: accent,
    colorSource,
    colorNote,
    borderRadiusPreset: existing.borderRadiusPreset || "default",
    motionPreset: existing.motionPreset || "calm",
    showKxdPartnerMark: existing.showKxdPartnerMark !== false,
    partnerFooterLine:
      existing.partnerFooterLine.trim() || "Powered by Kreate by Design",
    logoHasFile: signals.logoHasFile || Boolean(signals.presentationLogoUrl),
    logoSource:
      signals.logoHasFile
        ? signals.logoSource
        : signals.presentationLogoUrl
          ? "presentation"
          : signals.logoSource,
    logoNote:
      signals.logoHasFile || signals.presentationLogoUrl
        ? `Logo on file (${signals.logoHasFile ? signals.logoSource : "presentation"}).`
        : "No client logo in onboarding, CES profile, or presentation registry. Add a logo before client launch.",
  };
}

function decideFromCommercialScope(
  id: PortalModuleId,
  signals: ExperienceSignals,
): Pick<
  ExperienceModuleRecommendation,
  "decision" | "acceptedDefault" | "reason" | "blocker"
> | null {
  if (!signals.serviceScope.hasAuthoritativeScope) return null;
  const granted = signals.serviceScope.grantedModules.includes(id);
  if (!granted) {
    return {
      decision: "exclude",
      acceptedDefault: false,
      reason: "Not in this client's active commercial service scope.",
      blocker: null,
    };
  }

  if (id === "analytics" && !signals.ga4PropertyId) {
    return {
      decision: "needs-setup",
      acceptedDefault: false,
      reason: "Active commercial analytics scope. GA4 is not connected yet.",
      blocker: "GA4 not configured.",
    };
  }
  if (id === "website-health" && !signals.searchConsoleSiteUrl && !signals.ga4PropertyId) {
    return {
      decision: "needs-setup",
      acceptedDefault: false,
      reason: "Active commercial website/search scope. Search Console is not connected yet.",
      blocker: "Search Console not configured.",
    };
  }
  if (id === "inventory" && signals.inventoryCount <= 0) {
    return {
      decision: "needs-setup",
      acceptedDefault: false,
      reason: "Active commercial inventory scope. No listings exist yet.",
      blocker: "Add inventory listings before activating this module.",
    };
  }
  if (id === "reports" && signals.publishedReportCount <= 0) {
    return {
      decision: "needs-setup",
      acceptedDefault: false,
      reason: "Active commercial reporting scope. No published client reports yet.",
      blocker: "Publish or connect reporting before activating Reports.",
    };
  }
  if (id === "website-review" && !signals.websiteUrl && !signals.primaryDomain) {
    return {
      decision: "needs-setup",
      acceptedDefault: false,
      reason: "Active managed-website scope. Website / domain is not on file yet.",
      blocker: "Add the managed website URL.",
    };
  }

  return {
    decision: "include",
    acceptedDefault: true,
    reason: "Granted by active commercial services.",
    blocker: null,
  };
}

function decideToggleable(
  id: PortalModuleId,
  signals: ExperienceSignals,
  planAllows: boolean,
): Pick<
  ExperienceModuleRecommendation,
  "decision" | "acceptedDefault" | "reason" | "blocker"
> {
  const hay = servicesHaystack(signals);
  const preserved = alreadyEnabled(signals, id) && signals.profileStatus === "active";

  if (!planAllows && isCesExperienceModuleId(id)) {
    return {
      decision: "exclude",
      acceptedDefault: false,
      reason: "Plan or paused entitlements do not allow this CES module.",
      blocker: "Update Plans & Access before this module can be enabled.",
    };
  }

  if (preserved) {
    return {
      decision: "include",
      acceptedDefault: true,
      reason: "Already enabled on the active Client Experience Profile — kept stable.",
      blocker: null,
    };
  }

  const fromScope = decideFromCommercialScope(id, signals);
  if (fromScope) return fromScope;

  switch (id) {
    case "website-review": {
      if (
        signals.websiteReviewCount > 0 ||
        signals.websiteUrl ||
        signals.primaryDomain ||
        mentions(hay, "website", "web design", "site")
      ) {
        return {
          decision: "include",
          acceptedDefault: true,
          reason:
            signals.websiteReviewCount > 0
              ? "Website Review requests already exist for this client."
              : signals.websiteUrl || signals.primaryDomain
                ? "Client website / domain is on file — Website Review has client-facing value."
                : "Website service context is present.",
          blocker: null,
        };
      }
      return {
        decision: "exclude",
        acceptedDefault: false,
        reason: "No website, domain, or Website Review activity detected.",
        blocker: null,
      };
    }
    case "website-workspace": {
      const managedSite =
        signals.hasHostingInfra ||
        signals.websiteWorkspaceCount > 0 ||
        mentions(hay, "website management", "managed website", "hosting");
      if (managedSite) {
        return {
          decision: "include",
          acceptedDefault: true,
          reason:
            signals.websiteWorkspaceCount > 0
              ? "Website Workspace update requests already exist."
              : "Managed website / hosting infrastructure is on file.",
          blocker: null,
        };
      }
      return {
        decision: "exclude",
        acceptedDefault: false,
        reason:
          "No evidence KXD actively manages page-level website updates for this client.",
        blocker: null,
      };
    }
    case "inventory": {
      if (signals.inventoryCount > 0) {
        return {
          decision: "include",
          acceptedDefault: true,
          reason: `Client inventory capability detected (${signals.inventoryCount} listing${signals.inventoryCount === 1 ? "" : "s"}).`,
          blocker: null,
        };
      }
      if (mentions(hay, "inventory", "showroom", "vehicles", "listings")) {
        return {
          decision: "needs-setup",
          acceptedDefault: false,
          reason: "Inventory / showroom service context found, but no listings exist yet.",
          blocker: "Add inventory listings before activating this module.",
        };
      }
      return {
        decision: "exclude",
        acceptedDefault: false,
        reason: "No inventory records or showroom capability detected.",
        blocker: null,
      };
    }
    case "analytics": {
      const capability =
        signals.reportingCapabilities.includes("website-analytics") ||
        signals.reportingCapabilities.includes("seo") ||
        signals.reportingCapabilities.includes("google-ads") ||
        mentions(hay, "analytics", "seo", "ga4");
      if (signals.ga4PropertyId) {
        return {
          decision: "include",
          acceptedDefault: true,
          reason: "GA4 property is configured on client infrastructure.",
          blocker: null,
        };
      }
      if (capability || signals.websiteUrl) {
        return {
          decision: "needs-setup",
          acceptedDefault: false,
          reason: capability
            ? "Analytics / SEO capability is indicated, but GA4 is not configured."
            : "Website performance is in scope, but no analytics connection exists yet.",
          blocker: "GA4 not configured.",
        };
      }
      return {
        decision: "exclude",
        acceptedDefault: false,
        reason: "No analytics capability, connection, or website-performance context detected.",
        blocker: null,
      };
    }
    case "reports": {
      if (signals.publishedReportCount > 0) {
        return {
          decision: "include",
          acceptedDefault: true,
          reason: "Published client reports already exist.",
          blocker: null,
        };
      }
      if (
        signals.reportingCapabilities.includes("executive-reporting") ||
        mentions(hay, "reporting", "monthly report")
      ) {
        return {
          decision: "needs-setup",
          acceptedDefault: false,
          reason: "Reporting capability is indicated, but no published client reports exist yet.",
          blocker: "Publish or connect reporting before activating Reports.",
        };
      }
      return {
        decision: "exclude",
        acceptedDefault: false,
        reason: "No reporting capability or published reports detected.",
        blocker: null,
      };
    }
    case "website-health": {
      if (signals.searchConsoleSiteUrl || signals.ga4PropertyId) {
        return {
          decision: "include",
          acceptedDefault: true,
          reason: signals.searchConsoleSiteUrl
            ? "Search Console is configured."
            : "Website analytics infrastructure is present.",
          blocker: null,
        };
      }
      if (signals.primaryDomain || signals.websiteUrl) {
        return {
          decision: "needs-setup",
          acceptedDefault: false,
          reason: "Website / domain is on file, but Search Console is not configured.",
          blocker: "Search Console not configured.",
        };
      }
      return {
        decision: "exclude",
        acceptedDefault: false,
        reason: "No website infrastructure or search presence detected.",
        blocker: null,
      };
    }
    case "executive-review": {
      if (
        (signals.monthlyRetainerAmount != null && signals.monthlyRetainerAmount > 0) ||
        signals.publishedReportCount > 0 ||
        signals.hasEnabledPresentation
      ) {
        return {
          decision: "include",
          acceptedDefault: true,
          reason: signals.hasEnabledPresentation
            ? "Executive presentation is enabled for this client."
            : signals.publishedReportCount > 0
              ? "Client reporting exists to support Executive Review."
              : "Active retained partnership supports a focused executive review.",
          blocker: null,
        };
      }
      return {
        decision: "exclude",
        acceptedDefault: false,
        reason: "No retained partnership or executive-review content detected.",
        blocker: null,
      };
    }
    case "executive-performance": {
      if (signals.hasEnabledPresentation) {
        return {
          decision: "include",
          acceptedDefault: true,
          reason: "Partnership presentation is enabled.",
          blocker: null,
        };
      }
      if (signals.monthlyRetainerAmount && signals.monthlyRetainerAmount > 0) {
        return {
          decision: "include",
          acceptedDefault: true,
          reason: "Active retained partnership — Partnership home has client-facing value.",
          blocker: null,
        };
      }
      return {
        decision: "exclude",
        acceptedDefault: false,
        reason: "No partnership presentation or retained service model detected.",
        blocker: null,
      };
    }
    case "projects": {
      if (signals.projectCount > 0) {
        return {
          decision: "include",
          acceptedDefault: true,
          reason: `Active partnership projects exist (${signals.projectCount}).`,
          blocker: null,
        };
      }
      return {
        decision: "exclude",
        acceptedDefault: false,
        reason: "No client projects on file — Projects would be an empty HQ surface.",
        blocker: null,
      };
    }
    case "deliverables": {
      if (signals.deliverableCount > 0) {
        return {
          decision: "include",
          acceptedDefault: true,
          reason: "Shared deliverables exist for this client.",
          blocker: null,
        };
      }
      return {
        decision: "exclude",
        acceptedDefault: false,
        reason: "No deliverables on file.",
        blocker: null,
      };
    }
    case "requests": {
      if (signals.openRequestCount > 0 || signals.websiteReviewCount > 0) {
        return {
          decision: "include",
          acceptedDefault: true,
          reason:
            signals.openRequestCount > 0
              ? "Open client requests exist."
              : "Website Review activity implies a requests surface is useful.",
          blocker: null,
        };
      }
      return {
        decision: "exclude",
        acceptedDefault: false,
        reason: "No client-facing requests detected.",
        blocker: null,
      };
    }
    case "assets": {
      if (signals.assetCount > 0) {
        return {
          decision: "include",
          acceptedDefault: true,
          reason: "Client-accessible files or brand assets exist.",
          blocker: null,
        };
      }
      if (signals.websiteReviewCount > 0 || alreadyEnabled(signals, "website-review")) {
        return {
          decision: "include",
          acceptedDefault: true,
          reason: "Website collaboration is in play — an asset hub has client-facing value.",
          blocker: null,
        };
      }
      return {
        decision: "exclude",
        acceptedDefault: false,
        reason: "No shared files and no collaboration surface that needs an asset hub.",
        blocker: null,
      };
    }
    case "meetings":
    case "team":
    case "resources":
      return {
        decision: "exclude",
        acceptedDefault: false,
        reason: `No client-facing ${id} use case detected. Not enabled merely because Client HQ supports it.`,
        blocker: null,
      };
    default:
      return {
        decision: "exclude",
        acceptedDefault: false,
        reason: "No client-facing signal detected.",
        blocker: null,
      };
  }
}

export function recommendModules(
  signals: ExperienceSignals,
): ExperienceModuleRecommendation[] {
  return listOperatorPortalModuleIds().map((id) => {
    const kind = operatorModuleKind(id);
    const planAllows = planAllowsPortalModule(id, signals.entitlements);
    const label = getCanonicalCapability(id)?.label ?? id;
    const editionAllows = true;

    if (isInternalOnlyCapability(id)) {
      return {
        id,
        label,
        decision: "locked" as ModuleRecommendationDecision,
        acceptedDefault: false,
        reason: "Internal KXD OS capability — never a portal module.",
        blocker: "Security gate.",
        planAllows,
        editionAllows,
      };
    }

    if (id === "advisor" || kind === "locked") {
      return {
        id,
        label,
        decision: "locked",
        acceptedDefault: false,
        reason: "AI Advisor remains fail-closed until explicitly promoted in a later phase.",
        blocker: "Stub — not operator-activatable.",
        planAllows,
        editionAllows,
      };
    }

    if (kind === "always") {
      return {
        id,
        label,
        decision: "always",
        acceptedDefault: true,
        reason: "Always available when the client can sign in.",
        blocker: null,
        planAllows,
        editionAllows,
      };
    }

    if (id === "invoices") {
      if (signals.billingNavAvailable) {
        return {
          id,
          label,
          decision: "gated",
          acceptedDefault: true,
          reason: "Eligible test-mode Stripe mapping exists — Billing nav can appear.",
          blocker: null,
          planAllows,
          editionAllows,
        };
      }
      return {
        id,
        label,
        decision: "gated",
        acceptedDefault: false,
        reason: "Billing stays hidden until Stripe mapping is eligible.",
        blocker: "No eligible Stripe customer mapping.",
        planAllows,
        editionAllows,
      };
    }

    if (id === "portfolio") {
      if (signals.portfolioNavAvailable) {
        return {
          id,
          label,
          decision: "gated",
          acceptedDefault: true,
          reason: "Portal user has multiple authorized client memberships.",
          blocker: null,
          planAllows,
          editionAllows,
        };
      }
      return {
        id,
        label,
        decision: "gated",
        acceptedDefault: false,
        reason: "Portfolio only appears through authorized multi-client memberships.",
        blocker: null,
        planAllows,
        editionAllows,
      };
    }

    if (!isOperatorToggleablePortalModule(id)) {
      return {
        id,
        label,
        decision: "exclude",
        acceptedDefault: false,
        reason: "Not an operator-toggleable client-facing module.",
        blocker: null,
        planAllows,
        editionAllows,
      };
    }

    const decided = decideToggleable(id, signals, planAllows);
    return {
      id,
      label,
      editionAllows,
      planAllows,
      ...decided,
    };
  });
}

export function composeExperienceRecommendation(
  signals: ExperienceSignals,
  acceptedOverrides?: readonly string[],
): ExperienceRecommendation {
  const branding = recommendBranding(signals);
  const modules = recommendModules(signals);
  const overrideSet = acceptedOverrides
    ? new Set(sanitizeSelectedPortalModules(acceptedOverrides))
    : null;

  const activationModules = sanitizeSelectedPortalModules(
    modules
      .filter((row) => {
        if (row.decision === "locked") return false;
        if (row.decision === "always") return false;
        if (row.decision === "gated") return row.acceptedDefault;
        if (overrideSet) return overrideSet.has(row.id);
        return row.acceptedDefault && row.decision === "include";
      })
      .map((row) => row.id),
  );

  const recommended = modules.filter(
    (m) => m.decision === "include" || m.decision === "needs-setup",
  ).length;
  const ready = modules.filter((m) => m.decision === "include").length;
  const needsSetup = modules.filter((m) => m.decision === "needs-setup").length;
  const hidden = modules.filter(
    (m) => m.decision === "exclude" || m.decision === "locked",
  ).length;
  const readiness = composeExperienceReadiness({
    signals,
    branding,
    modules,
    acceptedModules: activationModules,
  });
  const composeInput = {
    clientId: signals.clientId,
    clientName: branding.clientName,
    clientSlug: signals.clientSlug,
    profileStatus: "active" as const,
    selectedPortalModules: activationModules,
    reportingCapabilities: [
      ...new Set([...signals.reportingCapabilities, ...signals.serviceScope.grantedReporting]),
    ],
    entitlements: signals.entitlements,
    billingNavAvailable: signals.billingNavAvailable,
    portfolioNavAvailable: signals.portfolioNavAvailable,
    websiteUrl: signals.websiteUrl,
    visual: {
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      accentColor: branding.accentColor,
      borderRadiusPreset: branding.borderRadiusPreset,
      motionPreset: branding.motionPreset,
    },
    hospitality: {
      welcomeEyebrow: branding.welcomeEyebrow,
      reassuranceLine: branding.reassuranceLine,
      supportTone: branding.supportTone,
      portalSidebarLabel: branding.portalSidebarLabel,
      partnerFooterLine: branding.partnerFooterLine,
      showPartnerMark: branding.showKxdPartnerMark,
    },
  };

  const notes: string[] = [];
  if (!signals.hasPortalMembership) {
    notes.push("No portal membership yet — invite stays on Manage Portal Access.");
  }
  if (!branding.logoHasFile) {
    notes.push("Logo missing — client-facing launch should wait on a logo.");
  }
  if (branding.colorSource !== "authoritative") {
    notes.push(branding.colorNote);
  }
  if (signals.serviceScope.hasAuthoritativeScope) {
    notes.push(
      signals.serviceScope.relationshipLabel
        ? `Experience composed from active services for ${signals.serviceScope.relationshipLabel}.`
        : "Experience composed from active commercial services.",
    );
  }
  if (signals.profileStatus === "active") {
    notes.push(
      "Active CES modules are preserved by default. Approve & Activate is still required to apply additions.",
    );
  }
  notes.push("This recommendation does not write the experience profile.");

  return {
    clientId: signals.clientId,
    generatedAt: new Date().toISOString(),
    readinessPercent: readiness.launchReadinessPercent,
    counts: {
      recommended,
      ready,
      needsSetup,
      hidden,
    },
    branding,
    modules,
    activationModules,
    navPreview: composeOperatorNavPreview(composeInput),
    homeShell: composeOperatorHomeShell(composeInput),
    integrations: signals.integrations,
    portalAccess: signals.portalAccess,
    readiness,
    notes,
    mutatesProfile: false,
  };
}
