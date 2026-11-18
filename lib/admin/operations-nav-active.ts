/**
 * Resolve operator navigation chrome from the current URL.
 * Shared by persistent studio layout and Founder Hybrid primary-nav compatibility.
 */

import type { OperationsNavId } from "@/components/admin/operations/shared/operations-nav";
import { NAV_GROUPS } from "@/components/admin/operations/shared/operations-nav";
import { FOUNDER_HYBRID_SHELL_ENABLED } from "@/lib/admin/founder-hybrid/flags";
import { FOUNDER_PRIMARY_NAV } from "@/lib/admin/founder-hybrid/nav";

const STUDIO_RITUAL_PREFIXES = [
  "/admin/operations/today",
  "/admin/operations/focus",
  "/admin/operations/review",
  "/admin/operations/brief",
] as const;

function ritualPrefixesForChrome(): readonly string[] {
  if (FOUNDER_HYBRID_SHELL_ENABLED) {
    return STUDIO_RITUAL_PREFIXES.filter((p) => p !== "/admin/operations/today");
  }
  return STUDIO_RITUAL_PREFIXES;
}

export function isStudioRitualRoute(pathname: string): boolean {
  return ritualPrefixesForChrome().some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Operations `(studio)` routes with persistent shell (Batch 1). */
export function isStudioPersistentChromeRoute(pathname: string): boolean {
  if (FOUNDER_HYBRID_SHELL_ENABLED) {
    return isFounderPersistentChromeRoute(pathname);
  }
  if (!pathname.startsWith("/admin/operations/")) return false;
  if (pathname.startsWith("/admin/operations/staff")) return false;
  return !isStudioRitualRoute(pathname);
}

/**
 * Founder hybrid chrome across operations, work, and sales trees.
 * Focus / Review / Brief remain ritual (no persistent sidebar).
 */
export function isFounderPersistentChromeRoute(pathname: string): boolean {
  if (!FOUNDER_HYBRID_SHELL_ENABLED) return false;
  if (pathname.startsWith("/admin/operations/staff")) return false;
  if (isStudioRitualRoute(pathname)) return false;

  if (pathname.startsWith("/admin/operations/")) return true;
  if (pathname === "/admin/work" || pathname.startsWith("/admin/work/")) return true;
  if (pathname === "/admin/sales" || pathname.startsWith("/admin/sales/")) return true;

  return false;
}

function resolveFounderPrimaryNavId(pathname: string): OperationsNavId | null {
  if (!FOUNDER_HYBRID_SHELL_ENABLED) return null;

  if (pathname.startsWith("/admin/operations/client-command/")) {
    return "clients";
  }

  for (const item of FOUNDER_PRIMARY_NAV) {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return item.id;
    }
  }

  const alsoActiveIds = new Map<OperationsNavId, OperationsNavId>();
  for (const item of FOUNDER_PRIMARY_NAV) {
    for (const alias of item.alsoActiveFor ?? []) {
      alsoActiveIds.set(alias, item.id);
    }
  }

  let match: { href: string; id: OperationsNavId } | null = null;
  for (const group of NAV_GROUPS) {
    for (const nav of group.items) {
      const primaryId = alsoActiveIds.get(nav.id) ?? null;
      if (!primaryId) continue;
      const exact = pathname === nav.href;
      const nested = pathname.startsWith(`${nav.href}/`);
      if (!exact && !nested) continue;
      if (!match || nav.href.length > match.href.length) {
        match = { href: nav.href, id: primaryId };
      }
    }
  }

  return match?.id ?? null;
}

/**
 * Longest-prefix match against edition nav hrefs.
 * Aligns with Founder Hybrid `alsoActiveFor` groupings via href overlap.
 */
export function resolveOperationsNavIdFromPathname(pathname: string): OperationsNavId {
  const founderId = resolveFounderPrimaryNavId(pathname);
  if (founderId) return founderId;

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