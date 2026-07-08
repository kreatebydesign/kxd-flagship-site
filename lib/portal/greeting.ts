/**
 * Warm, time-aware portal greetings — not robotic.
 */

export function portalTimeGreeting(firstName: string, now = new Date()): string {
  const hour = now.getHours();
  const name = firstName.trim() || "there";

  if (hour < 12) return `Good morning, ${name}.`;
  if (hour < 17) return `Good afternoon, ${name}.`;
  return `Good evening, ${name}.`;
}

export function portalFirstName(displayName: string): string {
  return displayName.split(/\s+/)[0]?.trim() || displayName.trim() || "there";
}
