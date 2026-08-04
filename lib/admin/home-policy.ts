/**
 * Phase 7 — Today | Batch C — Home policy enforcement
 *
 * Product law (Batch A + Batch B):
 * - Today is the sole founder home.
 * - Modules are destinations.
 * - Staff keep a separate landing.
 *
 * Cognitive load rule:
 * Whenever there is a choice between adding information and reducing
 * cognitive load, always choose reducing cognitive load. The founder
 * should feel more confident after spending 30 seconds in Today than
 * before opening KXD OS.
 *
 * Confidence rule (Batch D):
 * If there is ever a choice between showing more information and
 * creating more confidence, choose confidence.
 */

/** Canonical founder home path — only Today may own this role. */
export const FOUNDER_HOME_PATH = "/admin/operations/today" as const;

/** User-facing home product name. */
export const FOUNDER_HOME_LABEL = "Today" as const;

/** Paths that must never be treated as founder home / morning landing. */
export const FOUNDER_HOME_COMPETITOR_PATHS = [
  "/admin/operations/executive",
  "/admin/operations/command",
  "/admin/operations/founder",
  "/admin/operations/founder-intelligence",
  "/admin/operations/brain",
  "/admin/operations/brief",
] as const;

export function isFounderHomePath(pathname: string): boolean {
  return (
    pathname === FOUNDER_HOME_PATH ||
    pathname.startsWith(`${FOUNDER_HOME_PATH}/`)
  );
}

export function isFounderHomeCompetitorPath(pathname: string): boolean {
  return FOUNDER_HOME_COMPETITOR_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
