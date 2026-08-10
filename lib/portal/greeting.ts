/**
 * Warm, time-aware portal greetings — hospitality identity, not audit labels.
 */

import { getZonedHour } from "@/lib/platform/timezone";

const BLOCKED_GREETING_NAMES = /^(operator|preview|admin|system|there)$/i;

export function portalFirstName(displayName: string): string {
  return displayName.split(/\s+/)[0]?.trim() || displayName.trim() || "";
}

export function sanitizePortalGreetingName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || BLOCKED_GREETING_NAMES.test(trimmed)) return "";
  if (/^operator$/i.test(trimmed.split(/\s+/)[0] ?? "")) return "";
  return trimmed;
}

/**
 * Hospitality first name for greetings.
 * Preview audit labels such as "Operator Preview · Client" must never greet as "Operator".
 */
export function resolvePortalGreetingName(input: {
  displayName: string;
  greetingName?: string | null;
  isOperatorPreview?: boolean;
}): string {
  if (input.isOperatorPreview) {
    return sanitizePortalGreetingName(input.greetingName ?? "");
  }
  if (input.greetingName?.trim()) {
    return sanitizePortalGreetingName(portalFirstName(input.greetingName));
  }
  return sanitizePortalGreetingName(portalFirstName(input.displayName));
}

export function portalTimeGreeting(
  firstName: string,
  options?: { now?: Date; timeZone?: string },
): string {
  const now = options?.now ?? new Date();
  const hour = options?.timeZone
    ? getZonedHour(now, options.timeZone)
    : now.getHours();
  const name = sanitizePortalGreetingName(firstName);

  if (hour < 12) return name ? `Good morning, ${name}.` : "Good morning.";
  if (hour < 17) return name ? `Good afternoon, ${name}.` : "Good afternoon.";
  return name ? `Good evening, ${name}.` : "Good evening.";
}
