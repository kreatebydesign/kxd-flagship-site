/**
 * Allowlisted portal destinations for personalization actions.
 * Presentation only — route ownership checks remain authoritative.
 */

export const WORKSPACE_SAFE_PORTAL_HREFS = [
  "/portal",
  "/portal/projects",
  "/portal/deliverables",
  "/portal/requests",
  "/portal/assets",
  "/portal/reports",
  "/portal/analytics",
  "/portal/website-health",
  "/portal/website-review",
  "/portal/website-review/request",
  "/portal/website-workspace",
  "/portal/executive-review",
  "/portal/inventory",
  "/portal/inventory/new",
  "/portal/settings",
  "/portal/resources",
  "/portal/team",
  "/portal/meetings",
  "/portal/invoices",
] as const;

export type WorkspaceSafePortalHref = (typeof WORKSPACE_SAFE_PORTAL_HREFS)[number];

/** Forbidden destinations — never recommended from personalization. */
export const WORKSPACE_FORBIDDEN_HREF_PATTERNS = [
  "/admin",
  "/api/",
  "client-relationship",
  "relationship/contacts",
  "credential",
  "vault",
  "/portal/portfolio",
  "account/switch",
] as const;

export function isSafePortalHref(href: string): href is WorkspaceSafePortalHref {
  if (!href.startsWith("/portal")) return false;
  if (href.startsWith("//")) return false;
  if (href.includes("://")) return false;
  if (WORKSPACE_FORBIDDEN_HREF_PATTERNS.some((p) => href.includes(p))) return false;
  return (WORKSPACE_SAFE_PORTAL_HREFS as readonly string[]).includes(href);
}

export function sanitizePortalHref(href: string): WorkspaceSafePortalHref | null {
  const trimmed = href.trim();
  return isSafePortalHref(trimmed) ? trimmed : null;
}
