import type { ResolvedExperienceProfile } from "@/lib/ces/types";
import { isCesModuleEnabled } from "@/lib/ces";
import type { ClientHqNavId } from "./nav";
import type { PortalNavId } from "./nav";

/** CES flagship launch — only Website Review surfaces are client-ready. */
export const CES_LAUNCH_HIDDEN_NAV_IDS: readonly ClientHqNavId[] = [
  "projects",
  "deliverables",
  "requests",
  "assets",
  "invoices",
  "meetings",
  "analytics",
  "reports",
  "website-health",
  "resources",
  "team",
  "settings",
  "advisor",
] as const;

export type CesLaunchQuickActionId =
  | "review-website"
  | "start-review"
  | "upload-assets"
  | "message-kxd";

const INTERNAL_ACTIVITY_PATTERN =
  /\b(triage|ticket|internal|client command|playbook|payload|founder intelligence|executive note|ops queue|admin only|backfill|qa pass)\b/i;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export function isCesFlagshipPortal(
  profile: ResolvedExperienceProfile | null | undefined,
): boolean {
  return Boolean(profile && isCesModuleEnabled(profile, "website-review"));
}

export function isPortalNavVisibleForCesLaunch(
  navId: PortalNavId,
  profile?: ResolvedExperienceProfile | null,
): boolean {
  if (!isCesFlagshipPortal(profile)) return true;
  if (navId === "overview" || navId === "website-review") return true;
  /* Inventory — CES module entitlement (Primal first). */
  if (
    navId === "inventory" &&
    profile &&
    isCesModuleEnabled(profile, "inventory")
  ) {
    return true;
  }
  /* Partnership briefing — only when presentation + memory make it available. */
  if (navId === "partnership") return true;
  if (CES_LAUNCH_HIDDEN_NAV_IDS.includes(navId as ClientHqNavId)) return false;
  return false;
}

export function isCesLaunchDeliverablesPageReady(
  profile?: ResolvedExperienceProfile | null,
): boolean {
  return !isCesFlagshipPortal(profile);
}

export function isClientSafeTimelineDoc(doc: AnyDoc): boolean {
  const eventType = String(doc.eventType ?? "");
  if (eventType.startsWith("website-review.")) return true;

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
