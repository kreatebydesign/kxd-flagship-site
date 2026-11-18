/**
 * Resolve operator navigation chrome from the current URL.
 * Shared by persistent studio layout and Founder Hybrid primary-nav compatibility.
 */

import type { OperationsNavId } from "@/components/admin/operations/shared/operations-nav";
import { NAV_GROUPS } from "@/components/admin/operations/shared/operations-nav";

/** Ritual routes keep full-bleed arrival UX (no persistent sidebar layout). */
const STUDIO_RITUAL_PREFIXES = [
  "/admin/operations/today",
  "/admin/operations/focus",
  "/admin/operations/review",
  "/admin/operations/brief",
] as const;

export function isStudioRitualRoute(pathname: string): boolean {
  return STUDIO_RITUAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Founder studio routes that benefit from a single persistent OperationsShell. */
export function isStudioPersistentChromeRoute(pathname: string): boolean {
  if (!pathname.startsWith("/admin/operations/")) return false;
  if (pathname.startsWith("/admin/operations/staff")) return false;
  return !isStudioRitualRoute(pathname);
}

/**
 * Longest-prefix match against edition nav hrefs.
 * Aligns with Founder Hybrid `alsoActiveFor` groupings via href overlap.
 */
export function resolveOperationsNavIdFromPathname(pathname: string): OperationsNavId {
  let match: { href: string; id: OperationsNavId } | null = null;

  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      const exact = pathname === item.href;
      const nested = pathname.startsWith(`${item.href}/`);
      if (!exact && !nested) continue;
      if (!match || item.href.length > match.href.length) {
        match = { href: item.href, id: item.id };
      }
    }
  }

  if (pathname.startsWith("/admin/operations/client-command/")) {
    return "clients";
  }

  return match?.id ?? "today";
}

export function resolveClientIdFromPathname(pathname: string): number | undefined {
  const match = pathname.match(/^\/admin\/operations\/client-command\/(\d+)(?:\/|$)/);
  if (!match) return undefined;
  const clientId = Number(match[1]);
  return Number.isFinite(clientId) ? clientId : undefined;
}