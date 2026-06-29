export type QuickActionOperation =
  | "dismiss"
  | "complete"
  | "schedule-tomorrow"
  | "snooze-week"
  | "escalate"
  | "archive"
  | "assign"
  | "start";

export interface IntelQuickButton {
  operation: QuickActionOperation | "navigate";
  label: string;
  href?: string;
}

/** Contextual one-click buttons for Intelligence recommendations. */
export function intelQuickButtonsForAction(
  actionId: string,
  clientId: number,
  email?: string | null,
): IntelQuickButton[] {
  const base = `/admin/operations/client-command/${clientId}`;
  const mailto = email ? `mailto:${email}` : `${base}?tab=emails`;

  if (actionId.includes("needs-reply") || actionId.includes("overdue") || actionId.includes("recap")) {
    return [
      { operation: "navigate", label: "Reply now", href: `${base}?tab=emails` },
      { operation: "schedule-tomorrow", label: "Schedule tomorrow" },
      { operation: "dismiss", label: "Dismiss" },
      { operation: "complete", label: "Completed" },
    ];
  }

  if (actionId.includes("request") || actionId.includes("launch") || actionId.includes("blocked")) {
    return [
      { operation: "schedule-tomorrow", label: "Create follow-up" },
      { operation: "assign", label: "Assign designer" },
      { operation: "escalate", label: "Escalate" },
      { operation: "complete", label: "Mark resolved" },
    ];
  }

  if (actionId.includes("retainer") || actionId.includes("upsell") || actionId.includes("newsletter")) {
    return [
      {
        operation: "navigate",
        label: "Generate proposal",
        href: `/admin/collections/proposals/create?client=${clientId}`,
      },
      { operation: "start", label: "Create upsell opportunity" },
      { operation: "dismiss", label: "Ignore" },
      { operation: "complete", label: "Completed" },
    ];
  }

  if (actionId.includes("checkin") || actionId.includes("stale") || actionId.includes("portal")) {
    return [
      {
        operation: "navigate",
        label: "Schedule check-in",
        href: `/admin/collections/success-check-ins/create?client=${clientId}`,
      },
      { operation: "navigate", label: "Send email", href: mailto },
      { operation: "schedule-tomorrow", label: "Phone reminder" },
      { operation: "dismiss", label: "Dismiss" },
    ];
  }

  if (actionId.includes("project") || actionId.includes("infra") || actionId.includes("audit")) {
    return [
      { operation: "start", label: "Create internal task" },
      { operation: "assign", label: "Assign" },
      { operation: "complete", label: "Resolve" },
      { operation: "dismiss", label: "Dismiss" },
    ];
  }

  return [
    { operation: "schedule-tomorrow", label: "Schedule tomorrow" },
    { operation: "assign", label: "Assign" },
    { operation: "complete", label: "Complete" },
    { operation: "dismiss", label: "Dismiss" },
  ];
}
