/** Playbook integration — Website Launch links to Launch QA */

export const WEBSITE_LAUNCH_PLAYBOOK_SLUG = "website-launch";

export function launchQaHrefForClient(clientId: number): string {
  return `/admin/operations/launch-qa/${clientId}`;
}

export function launchQaPlaybookStepNote(): string {
  return "Complete Launch QA checklist at /admin/operations/launch-qa before DNS cutover.";
}

export function isWebsiteLaunchQaStep(stepTitle: string): boolean {
  const t = stepTitle.toLowerCase();
  return t.includes("qa") || t.includes("smoke") || t.includes("staging");
}
