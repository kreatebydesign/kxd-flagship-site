export function buildBriefingGreeting(now = new Date()): {
  greeting: string;
  dateDisplay: string;
  timeDisplay: string;
} {
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const dateDisplay = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const timeDisplay = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return { greeting, dateDisplay, timeDisplay };
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
