import type { PlaybookAutomationTrigger, PlaybookCategory, PlaybookRunStatus } from "./types";

export const PLAYBOOK_RUN_STATUS_LABELS: Record<PlaybookRunStatus, string> = {
  "not-started": "Not Started",
  "in-progress": "In Progress",
  blocked: "Blocked",
  completed: "Completed",
  archived: "Archived",
};

export const PLAYBOOK_CATEGORY_LABELS: Record<PlaybookCategory, string> = {
  launch: "Launch",
  onboarding: "Onboarding",
  seo: "SEO",
  reporting: "Reporting",
  sales: "Sales",
  audit: "Audit",
  strategy: "Strategy",
  vertical: "Vertical",
  operations: "Operations",
};

export const AUTOMATION_TRIGGER_LABELS: Record<PlaybookAutomationTrigger, string> = {
  none: "None",
  create_deliverable: "Create Deliverable",
  create_request: "Create Request",
  generate_report: "Generate Report",
  schedule_meeting: "Schedule Meeting",
  create_executive_note: "Create Executive Note",
  run_website_audit: "Run Website Audit",
  launch_client: "Launch Client",
  generate_proposal: "Generate Proposal",
  send_portal_invite: "Send Portal Invite",
};
