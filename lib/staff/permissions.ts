/**
 * Staff capability model — deny-by-default for restricted internal roles.
 * Mirrors the scheduling capability pattern (lib/scheduling/permissions.ts).
 */

import type { StaffActor, StaffCapability, StaffRoleId } from "./types";

export const STAFF_HOME_PATH = "/admin/operations/staff";
export const STAFF_WELCOME_PATH = "/admin/operations/staff/welcome";
export const STAFF_OVERSIGHT_PATH = "/admin/operations/staff/oversight";
export const STAFF_FOUNDATION_PATH_SLUG = "executive-ops-foundation";

const FULL_ADMIN_CAPABILITIES: readonly StaffCapability[] = [
  "staff.home",
  "staff.assigned-work.read",
  "staff.assigned-work.update",
  "staff.draft.prepare",
  "staff.draft.submit-for-approval",
  "staff.notes.internal",
  "staff.inbox.triage",
  "staff.scheduling.propose",
  "staff.training",
  "staff.help.request",
  "staff.guidance",
  "staff.client-context.limited",
  "staff.onboarding.assist",
  "staff.billing.verify",
  "staff.documents.read",
  "staff.documents.acknowledge",
  "staff.documents.sign",
  "admin.staff-documents.manage",
  "admin.staff-documents.countersign",
  "admin.oversight",
  "admin.preview-staff",
  "admin.full-operations",
  "staff.time.clock",
  "staff.time.read.self",
  "admin.time.oversight.read",
  "admin.time.correct",
] as const;

/** Business Development & Digital — client-scoped; no billing or company financials. */
const BUSINESS_DEVELOPMENT_SPECIALIST_CAPABILITIES: readonly StaffCapability[] = [
  "staff.home",
  "staff.assigned-work.read",
  "staff.assigned-work.update",
  "staff.draft.prepare",
  "staff.draft.submit-for-approval",
  "staff.notes.internal",
  "staff.inbox.triage",
  "staff.training",
  "staff.help.request",
  "staff.guidance",
  "staff.client-context.limited",
  "staff.documents.read",
  "staff.documents.acknowledge",
  "staff.documents.sign",
  "staff.sales.read",
  "staff.sales.manage",
  "staff.time.clock",
  "staff.time.read.self",
] as const;

/** Initial authority for operations_coordinator (Heather path). */
const OPERATIONS_COORDINATOR_CAPABILITIES: readonly StaffCapability[] = [
  "staff.home",
  "staff.assigned-work.read",
  "staff.assigned-work.update",
  "staff.draft.prepare",
  "staff.draft.submit-for-approval",
  "staff.notes.internal",
  "staff.inbox.triage",
  "staff.scheduling.propose",
  "staff.training",
  "staff.help.request",
  "staff.guidance",
  "staff.client-context.limited",
  "staff.onboarding.assist",
  "staff.billing.verify",
  "staff.documents.read",
  "staff.documents.acknowledge",
  "staff.documents.sign",
  "staff.time.clock",
  "staff.time.read.self",
] as const;

/**
 * Page prefixes restricted staff may open. Deny-by-default otherwise.
 *
 * Phase 3 relationship surfaces stay off this allowlist (Batch D):
 * - `/admin/operations/events` (+ `/new`, `/[id]`)
 * - `/admin/operations/clients` portfolio/workspace (except `clients/launch`)
 * Hidden navigation is not access control — `requireStaffAwarePage` enforces this.
 */
export const STAFF_ALLOWED_PAGE_PREFIXES: readonly string[] = [
  "/admin/operations/staff",
  "/admin/operations/settings",
  "/admin/operations/review-inbox",
  "/admin/operations/clients/launch",
  "/admin/training",
  "/admin/work/", // assigned work detail only — further filtered in loader
  "/admin/login",
] as const;

/** Wrap-up is under /admin/operations/staff — already covered by prefix. */

/**
 * API prefixes restricted staff may call. Deny-by-default otherwise.
 *
 * Phase 3 `/api/admin/client-relationship/**` remains denied (Batch D).
 */
export const STAFF_ALLOWED_API_PREFIXES: readonly string[] = [
  "/api/admin/staff",
  "/api/admin/auth/logout",
  "/api/admin/training/progress",
  "/api/admin/training/intelligence",
  "/api/admin/scheduling/proposals", // suggest only; approve blocked in service
  "/api/admin/review-inbox",
  "/api/admin/client-requests",
] as const;

/**
 * Work Engine API — restricted staff may only touch numeric work item routes
 * (status/update). Create/seed/composer and list endpoints are denied.
 */
export function isStaffAllowedWorkApiPath(pathname: string): boolean {
  return /^\/api\/admin\/work\/\d+(\/|$)/.test(pathname);
}

export function normalizeStaffRole(value: unknown): StaffRoleId {
  if (value === "operations_coordinator") return "operations_coordinator";
  if (value === "executive_operations_coordinator") {
    return "executive_operations_coordinator";
  }
  if (value === "operations_manager") return "operations_manager";
  if (value === "business_development_specialist") {
    return "business_development_specialist";
  }
  return "none";
}

export function staffRoleTitle(role: StaffRoleId): string {
  switch (role) {
    case "operations_coordinator":
      return "HR / Admin Assistant";
    case "executive_operations_coordinator":
      return "Executive Operations Coordinator";
    case "operations_manager":
      return "KXD Operations Manager";
    case "business_development_specialist":
      return "Business Development & Digital Specialist";
    default:
      return "Studio teammate";
  }
}

export function isFounderOrAdmin(actor: StaffActor): boolean {
  if (actor.role === "admin") return true;
  const email = actor.email.trim().toLowerCase();
  const raw =
    process.env.KXD_SCHEDULING_FOUNDER_EMAILS?.trim() ||
    process.env.KXD_INQUIRY_EMAIL?.trim() ||
    "matt@kreatebydesign.com";
  const founders = new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
  return Boolean(email && founders.has(email));
}

/** Restricted staff = any non-admin internal user (deny-by-default KXD OS). */
export function isRestrictedStaff(actor: StaffActor): boolean {
  if (isFounderOrAdmin(actor)) return false;
  if (actor.role === "admin") return false;
  return true;
}

export function resolveStaffCapabilities(
  actor: StaffActor,
): ReadonlySet<StaffCapability> {
  if (isFounderOrAdmin(actor)) {
    return new Set(FULL_ADMIN_CAPABILITIES);
  }
  if (actor.staffRole === "business_development_specialist") {
    return new Set(BUSINESS_DEVELOPMENT_SPECIALIST_CAPABILITIES);
  }
  if (
    actor.staffRole === "operations_coordinator" ||
    actor.staffRole === "executive_operations_coordinator" ||
    actor.staffRole === "operations_manager"
  ) {
    // Growth titles change presentation; initial authority stays coordinator-safe
    // until Matt elevates via role policies.
    return new Set(OPERATIONS_COORDINATOR_CAPABILITIES);
  }
  // Editor without staffRole — restricted shell, no capabilities until role assigned.
  return new Set();
}

export function actorHasStaffCapability(
  actor: StaffActor,
  capability: StaffCapability,
): boolean {
  return resolveStaffCapabilities(actor).has(capability);
}

export function assertStaffCapability(
  actor: StaffActor,
  capability: StaffCapability,
): void {
  if (!actorHasStaffCapability(actor, capability)) {
    throw new Error(`Staff permission denied: missing ${capability}.`);
  }
}

export function isStaffAllowedPagePath(
  pathname: string,
  actor: StaffActor,
): boolean {
  if (!isRestrictedStaff(actor)) return true;

  // Raw Payload Admin surfaces — never allowlisted for restricted staff.
  if (
    pathname === "/admin" ||
    pathname === "/admin/" ||
    pathname.startsWith("/admin/collections") ||
    pathname.startsWith("/admin/globals") ||
    pathname.startsWith("/admin/account") ||
    pathname.startsWith("/admin/create-first-user")
  ) {
    return false;
  }

  if (pathname === "/admin/operations" || pathname === "/admin/operations/") {
    return false; // redirected to staff home
  }

  if (
    pathname === "/admin/operations/onboarding" ||
    pathname.startsWith("/admin/operations/onboarding/")
  ) {
    return actorHasStaffCapability(actor, "staff.onboarding.assist");
  }

  return STAFF_ALLOWED_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(prefix),
  );
}

/**
 * Post-login / Payload-isolation landing for restricted staff.
 * Welcome when onboarding incomplete; otherwise Staff Home.
 */
export function staffLandingPathForActor(actor: StaffActor): string {
  if (!isRestrictedStaff(actor)) return STAFF_HOME_PATH;
  if (!actor.onboardingCompletedAt) return STAFF_WELCOME_PATH;
  return STAFF_HOME_PATH;
}

export function isStaffAllowedApiPath(
  pathname: string,
  actor: StaffActor,
): boolean {
  if (!isRestrictedStaff(actor)) return true;
  if (pathname.startsWith("/api/admin/work")) {
    return isStaffAllowedWorkApiPath(pathname);
  }
  return STAFF_ALLOWED_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

/**
 * Exact page allow for /admin/work list — staff may only open assigned detail.
 * Non-/admin/work paths are left to the page allowlist (must return true here).
 */
export function isStaffWorkListAllowed(
  pathname: string,
  actor: StaffActor,
): boolean {
  if (!isRestrictedStaff(actor)) return true;
  if (!pathname.startsWith("/admin/work")) return true;
  if (pathname === "/admin/work" || pathname === "/admin/work/") return false;
  return /^\/admin\/work\/\d+/.test(pathname);
}
