import {
  formatDisplayDate,
  formatDisplayTime,
  getZonedHour,
  KXD_BUSINESS_TIMEZONE,
} from "@/lib/platform/timezone";

export function buildBriefingGreeting(
  now = new Date(),
  timeZone: string = KXD_BUSINESS_TIMEZONE,
): {
  greeting: string;
  dateDisplay: string;
  timeDisplay: string;
} {
  const hour = getZonedHour(now, timeZone);
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return {
    greeting,
    dateDisplay: formatDisplayDate(now, timeZone),
    timeDisplay: formatDisplayTime(now, timeZone),
  };
}

export function buildBriefingOverview(input: {
  businessHealthLevel: string;
  priorityCount: number;
  riskCount: number;
  opportunityCount: number;
}): string {
  const { businessHealthLevel, priorityCount, riskCount, opportunityCount } = input;

  if (priorityCount === 0 && riskCount === 0) {
    return `Business health is ${businessHealthLevel}. No urgent priorities or risks require immediate attention.`;
  }

  const parts: string[] = [`Business health is ${businessHealthLevel}.`];

  if (priorityCount > 0) {
    parts.push(
      `${priorityCount} priorit${priorityCount === 1 ? "y" : "ies"} need attention.`,
    );
  }

  if (riskCount > 0) {
    parts.push(`${riskCount} risk${riskCount === 1 ? "" : "s"} surfaced.`);
  }

  if (opportunityCount > 0) {
    parts.push(`${opportunityCount} opportunit${opportunityCount === 1 ? "y" : "ies"} worth noting.`);
  }

  return parts.join(" ");
}
