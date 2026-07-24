/**
 * Pure recurring-responsibility rules (client-safe / script-safe).
 */

import type { StaffResponsibilityCadence, StaffResponsibilityTemplate } from "./types";

export const STAFF_RESPONSIBILITY_SOURCE_PREFIX = "staff-resp";

export function responsibilityDueOn(
  template: Pick<
    StaffResponsibilityTemplate,
    "active" | "ownerUserId" | "cadence" | "weekdayMask"
  >,
  day: Date = new Date(),
): boolean {
  if (!template.active || !template.ownerUserId) return false;
  const dow = day.getDay();
  switch (template.cadence as StaffResponsibilityCadence) {
    case "daily":
      return true;
    case "weekdays":
      return dow >= 1 && dow <= 5;
    case "weekly":
      if (template.weekdayMask.length === 0) return dow === 1;
      return template.weekdayMask.includes(dow);
    case "monthly":
      return day.getDate() === 1;
    default:
      return false;
  }
}

export function responsibilitySourceId(
  templateId: number,
  dateKey: string,
): string {
  return `${STAFF_RESPONSIBILITY_SOURCE_PREFIX}:${templateId}:${dateKey}`;
}
