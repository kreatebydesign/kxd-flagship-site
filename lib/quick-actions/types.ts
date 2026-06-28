/** Phase 7G — Global Quick Actions */

export type QuickActionId =
  | "create-proposal"
  | "create-executive-note"
  | "generate-report"
  | "launch-playbook"
  | "run-website-audit"
  | "open-client-command-center"
  | "open-notifications"
  | "open-brain"
  | "open-sales-pipeline"
  | "open-client-success"
  | "open-integrations"
  | "open-command-center"
  | "open-client-hq"
  | "open-timeline"
  | "open-infrastructure"
  | "generate-monthly-report"
  | "launch-website-playbook"
  | "launch-quarterly-review"
  | "create-success-check-in";

export interface QuickAction {
  id: QuickActionId;
  label: string;
  sub: string;
  href: string;
  icon?: string;
  keywords?: string[];
}

export interface QuickActionCommandMatch {
  actionId: QuickActionId;
  verb: string;
  clientToken: string;
}
