import { staffActorFromUser } from "@/lib/staff/actor";
import { isRestrictedStaff } from "@/lib/staff/permissions";
import type { StaffRoleId } from "@/lib/staff/types";
import { getCatalogPath } from "./catalog";
import type { TrainingPathDefinition } from "./types";

export const EXECUTIVE_OPS_FOUNDATION_SLUG = "executive-ops-foundation";
export const BDS_FOUNDATION_SLUG = "business-development-foundation";

/** Coordinator / ops leadership — not for BDS. */
const COORDINATOR_ONLY_PATH_SLUGS = new Set<string>([
  EXECUTIVE_OPS_FOUNDATION_SLUG,
  "billing-finance",
]);

/** BDS primary path + shared operational paths (no billing / coordinator foundation). */
const BDS_SHARED_PATH_SLUGS = new Set<string>([
  BDS_FOUNDATION_SLUG,
  "welcome-to-kxd",
  "how-kxd-operates",
  "daily-operations",
  "website-review",
  "work-engine",
  "privacy-security",
  "quality-control",
  "documentation-standards",
  "future-ai-workflows",
  "internal-communication",
]);

const COORDINATOR_ROLES: StaffRoleId[] = [
  "operations_coordinator",
  "executive_operations_coordinator",
  "operations_manager",
];

function isStudioTrainingAdmin(user: object | null | undefined): boolean {
  if (!user || typeof user !== "object") return false;
  const role = Reflect.get(user, "role");
  return role === "admin";
}

export function resolveStaffRoleForTraining(user: object | null | undefined): StaffRoleId {
  const actor = staffActorFromUser(user);
  if (!actor) return "none";
  return actor.staffRole;
}

export function isPathEligibleForStaffRole(
  pathSlug: string,
  staffRole: StaffRoleId,
  studioAdmin: boolean,
): boolean {
  if (studioAdmin) return true;
  if (staffRole === "business_development_specialist") {
    return BDS_SHARED_PATH_SLUGS.has(pathSlug);
  }
  if (COORDINATOR_ROLES.includes(staffRole)) {
    return !pathSlug.startsWith("archived");
  }
  if (staffRole === "none") {
    return pathSlug === "welcome-to-kxd";
  }
  return pathSlug === "welcome-to-kxd";
}

export function filterCatalogForUser(
  curriculum: TrainingPathDefinition[],
  user: object | null | undefined,
): TrainingPathDefinition[] {
  const studioAdmin = isStudioTrainingAdmin(user);
  if (studioAdmin) return curriculum;
  const staffRole = resolveStaffRoleForTraining(user);
  return curriculum.filter((path) =>
    isPathEligibleForStaffRole(path.slug, staffRole, false),
  );
}

export function primaryTrainingPathSlugForRole(staffRole: StaffRoleId): string {
  if (staffRole === "business_development_specialist") {
    return BDS_FOUNDATION_SLUG;
  }
  if (COORDINATOR_ROLES.includes(staffRole)) {
    return EXECUTIVE_OPS_FOUNDATION_SLUG;
  }
  return "welcome-to-kxd";
}

export function assertTrainingPathAccess(
  user: object | null | undefined,
  pathSlug: string,
): boolean {
  if (!user) return false;
  const studioAdmin = isStudioTrainingAdmin(user);
  const staffRole = resolveStaffRoleForTraining(user);
  const actor = staffActorFromUser(user);
  if (!actor && !studioAdmin) return false;
  if (studioAdmin) return true;
  if (!isRestrictedStaff(actor!)) return true;
  return isPathEligibleForStaffRole(pathSlug, staffRole, false);
}

export function assertTrainingLessonAccess(
  user: object | null | undefined,
  pathSlug: string,
  lessonSlug: string,
): boolean {
  if (!assertTrainingPathAccess(user, pathSlug)) return false;
  const path = curriculumFindPath(pathSlug);
  if (!path) return false;
  return path.lessons.some((l) => l.slug === lessonSlug && l.status !== "archived");
}

function curriculumFindPath(pathSlug: string): TrainingPathDefinition | undefined {
  return getCatalogPath(pathSlug) ?? undefined;
}
