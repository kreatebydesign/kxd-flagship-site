import type { ResolvedExperienceProfile } from "@/lib/ces/types";
import { isCesModuleEnabled } from "@/lib/ces";
import { isPortalModuleVisible } from "@/lib/ces/modules/visibility";
import type { ClientHqNavId } from "./nav";
import type { PortalNavId } from "./nav";

/**
 * @deprecated Phase 2 — flagship hide-all is retired.
 * Kept as an empty list so historic verifiers can assert the constant exists
 * without restoring the Client HQ vs CES product split.
 * Billing remains eligibility-gated via billingNavAvailable.
 */
export const CES_LAUNCH_HIDDEN_NAV_IDS: readonly ClientHqNavId[] = [] as const;

export type CesLaunchQuickActionId =
  | "review-website"
  | "start-review"
  | "upload-assets"
  | "message-kxd";

const INTERNAL_ACTIVITY_PATTERN =
  /\b(triage|ticket|internal|client command|playbook|payload|founder intelligence|executive note|ops queue|admin only|backfill|qa pass)\b/i;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

/**
 * @deprecated Phase 2 — not a portal-product switch.
 * True only when Website Review is entitled. Used for launch-guide copy / CSS.
 */
export function isCesFlagshipPortal(
  profile: ResolvedExperienceProfile | null | undefined,
): boolean {
  return Boolean(profile && isCesModuleEnabled(profile, "website-review"));
}

export type PortalNavVisibilityOptions = {
  /**
   * Phase 5 Batch 5C — show Billing/Invoices only when the active client has a
   * valid test-mode Stripe customer mapping (no entitlement mutation).
   */
  billingNavAvailable?: boolean;
  portfolioNavAvailable?: boolean;
};

/**
 * Portal nav visibility — delegates to unified module visibility.
 * Website Review no longer hides other client-facing modules.
 */
export function isPortalNavVisibleForCesLaunch(
  navId: PortalNavId,
  profile?: ResolvedExperienceProfile | null,
  options?: PortalNavVisibilityOptions,
): boolean {
  if (!profile) {
    if (navId === "invoices") return options?.billingNavAvailable === true;
    if (navId === "portfolio") return options?.portfolioNavAvailable === true;
    return true;
  }

  const moduleKey =
    navId === "partnership" ? "executive-performance" : navId;

  return isPortalModuleVisible(moduleKey, {
    profile,
    billingNavAvailable: options?.billingNavAvailable,
    portfolioNavAvailable: options?.portfolioNavAvailable,
  });
}

export function isCesLaunchDeliverablesPageReady(
  profile?: ResolvedExperienceProfile | null,
): boolean {
  if (!profile) return true;
  return isPortalModuleVisible("deliverables", { profile });
}

export function isClientSafeTimelineDoc(doc: AnyDoc): boolean {
  const eventType = String(doc.eventType ?? "");
  if (eventType.startsWith("website-review.")) return true;
  if (eventType.startsWith("website-workspace.")) return true;

  const sourceModule = String(doc.sourceModule ?? "");
  if (sourceModule === "Portal") return !containsInternalLanguage(doc);

  return false;
}

export function containsInternalLanguage(doc: AnyDoc): boolean {
  const title = String(doc.title ?? "");
  const summary = doc.summary ? String(doc.summary) : "";
  const description = doc.description ? String(doc.description) : "";
  const combined = `${title} ${summary} ${description}`;
  return INTERNAL_ACTIVITY_PATTERN.test(combined);
}

export function isPlaceholderDeliverableTitle(title: string): boolean {
  const normalized = title.trim().toLowerCase();
  return (
    !normalized ||
    normalized === "deliverable" ||
    normalized === "untitled" ||
    normalized === "new deliverable" ||
    normalized === "monthly deliverable"
  );
}

export function clientDeliverableCategoryLabel(category: string | null): string | null {
  if (!category) return null;
  const normalized = category.toLowerCase();
  if (normalized === "admin") return null;
  return category;
}
