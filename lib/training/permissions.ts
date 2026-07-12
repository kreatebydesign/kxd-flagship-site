import type { TrainingPermissions } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyUser = Record<string, any> | null | undefined;

/**
 * Internal KXD only — never portal.
 * Admin role manages curriculum; every authenticated Payload user may learn.
 */
export function getTrainingPermissions(user: AnyUser): TrainingPermissions {
  const authenticated = Boolean(user);
  const role = typeof user?.role === "string" ? user.role : "editor";
  const canManage = authenticated && role === "admin";

  return {
    canRead: authenticated,
    canTrackProgress: authenticated,
    canComplete: authenticated,
    canManage,
    canAssign: canManage,
  };
}

export function learnerKeyFromUser(user: AnyUser): string {
  if (user && typeof user.email === "string" && user.email.trim()) {
    return user.email.trim().toLowerCase();
  }
  return "studio";
}

export function learnerLabelFromUser(user: AnyUser): string {
  if (user && typeof user.displayName === "string" && user.displayName.trim()) {
    return user.displayName.trim();
  }
  if (user && typeof user.email === "string" && user.email.trim()) {
    return user.email.trim();
  }
  return "Learner";
}
