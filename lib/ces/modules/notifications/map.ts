import type { ExecutiveActivityItem } from "@/lib/activity-engine/types";
import { resolveNotificationKind } from "./registry";
import type { ClientNotificationItem } from "./types";

function portalSafeHref(href: string | null, fallback: string | undefined): string | null {
  // Absolute portal paths only — reject protocol-relative and admin/operator URLs.
  if (
    href &&
    href.startsWith("/portal") &&
    !href.startsWith("//") &&
    !href.includes(":")
  ) {
    return href;
  }
  if (
    fallback &&
    fallback.startsWith("/portal") &&
    !fallback.startsWith("//") &&
    !fallback.includes(":")
  ) {
    return fallback;
  }
  return null;
}

/**
 * Map Activity Engine items into CES notification cards.
 * Prefer hospitality titles already written on the activity record.
 */
export function mapActivityToClientNotification(
  item: ExecutiveActivityItem,
): ClientNotificationItem {
  const def = resolveNotificationKind(item.eventType);
  const href = portalSafeHref(item.href, def.fallbackHref);

  const activityTitle = item.title?.trim() || "";
  const activitySummary = item.summary?.trim() || "";
  const useRegistryTitle = def.kind !== "general";

  return {
    id: item.id,
    kind: def.kind,
    category: def.category,
    icon: def.icon,
    title: useRegistryTitle ? def.defaultTitle : activityTitle || def.defaultTitle,
    description:
      activitySummary ||
      (!useRegistryTitle ? "" : activityTitle) ||
      "An update is ready for you.",
    occurredAt: item.occurredAt,
    read: item.read,
    href,
    viewLabel: href ? def.viewLabel : null,
  };
}

export function portalNotificationReaderKey(portalUserId: number): string {
  return `portal:${portalUserId}`;
}
