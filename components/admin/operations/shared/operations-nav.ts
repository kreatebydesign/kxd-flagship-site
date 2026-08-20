/**
 * Phase 7 Batch C — founder navigation as a workflow map.
 *
 * Hierarchy: Today · Work · Clients · Business · Studio · Tools · System
 * Today is the only home. Competing aggregators remain reachable but demoted.
 */

export type OperationsNavId =
  | "executive"
  | "intelligence"
  | "command"
  | "today"
  | "focus"
  | "review"
  | "clients"
  | "events"
  | "accounts"
  | "onboarding"
  | "founder"
  | "founder-intelligence"
  | "creative"
  | "reels"
  | "audits"
  | "infrastructure"
  | "timeline"
  | "automation"
  | "playbooks"
  | "work"
  | "review-inbox"
  | "upgrade-requests"
  | "commercial-agreements"
  | "portal-access"
  | "client-success"
  | "growth"
  | "client-import"
  | "client-launch"
  | "client-launch-wizard"
  | "client-provisioning"
  | "genesis"
  | "launch-qa"
  | "opportunities"
  | "sales-pipeline"
  | "sales-leads"
  | "sales-proposals"
  | "sales-templates"
  | "sales-activities"
  | "sales-forecast"
  | "reports"
  | "reporting-ops"
  | "strategy"
  | "brain"
  | "integrations"
  | "platform"
  | "settings"
  | "training"
  | "staff"
  | "qr-generator";

export type OperationsNavItem = {
  id: OperationsNavId;
  label: string;
  href: string;
};

export type OperationsNavGroup = {
  label: string;
  items: OperationsNavItem[];
};

export const NAV_GROUPS: OperationsNavGroup[] = [
  {
    label: "Today",
    items: [
      { id: "today", label: "Today", href: "/admin/operations/today" },
      { id: "focus", label: "Focus", href: "/admin/operations/focus" },
      { id: "review", label: "Weekly Review", href: "/admin/operations/review" },
      {
        id: "intelligence",
        label: "Intelligence",
        href: "/admin/operations/intelligence",
      },
    ],
  },
  {
    label: "Work",
    items: [
      { id: "work", label: "Work", href: "/admin/work" },
      {
        id: "review-inbox",
        label: "Review Inbox",
        href: "/admin/operations/review-inbox",
      },
      {
        id: "upgrade-requests",
        label: "Upgrade Requests",
        href: "/admin/operations/upgrade-requests",
      },
      { id: "playbooks", label: "Playbooks", href: "/admin/operations/playbooks" },
      { id: "launch-qa", label: "Launch QA", href: "/admin/operations/launch-qa" },
      {
        id: "automation",
        label: "Automation",
        href: "/admin/operations/automation",
      },
      { id: "audits", label: "Audits", href: "/admin/operations/audits" },
      {
        id: "infrastructure",
        label: "Infrastructure",
        href: "/admin/operations/infrastructure",
      },
      { id: "timeline", label: "Timeline", href: "/admin/operations/timeline" },
    ],
  },
  {
    label: "Clients",
    items: [
      { id: "genesis", label: "Genesis", href: "/admin/operations/genesis" },
      { id: "clients", label: "Portfolio", href: "/admin/operations/clients" },
      // Relationship Events workspace (distinct from Intelligence → Timeline).
      { id: "events", label: "Events", href: "/admin/operations/events" },
      {
        id: "client-launch-wizard",
        label: "Launch Wizard",
        href: "/admin/operations/clients/launch",
      },
      {
        id: "client-provisioning",
        label: "Provisioning",
        href: "/admin/operations/client-provisioning",
      },
      { id: "strategy", label: "Strategy Vault", href: "/admin/operations/strategy" },
      { id: "onboarding", label: "Onboarding", href: "/admin/operations/onboarding" },
      { id: "portal-access", label: "Portal Access", href: "/admin/operations/portal-access" },
      {
        id: "client-success",
        label: "Client Success",
        href: "/admin/operations/client-success",
      },
    ],
  },
  {
    label: "Business",
    items: [
      { id: "accounts", label: "Accounts", href: "/admin/operations/accounts" },
      {
        id: "commercial-agreements",
        label: "Commercial Agreements",
        href: "/admin/operations/commercial-agreements",
      },
      {
        id: "opportunities",
        label: "Opportunities",
        href: "/admin/operations/research",
      },
      { id: "sales-pipeline", label: "Pipeline", href: "/admin/sales" },
      { id: "sales-leads", label: "Leads", href: "/admin/sales/leads" },
      { id: "sales-proposals", label: "Proposals", href: "/admin/sales/proposals" },
      { id: "sales-templates", label: "Templates", href: "/admin/sales/templates" },
      { id: "sales-activities", label: "Activities", href: "/admin/sales/activities" },
      { id: "sales-forecast", label: "Forecast", href: "/admin/sales/forecast" },
      { id: "growth", label: "Growth", href: "/admin/operations/growth" },
      { id: "reports", label: "Reports", href: "/admin/operations/reports" },
      {
        id: "reporting-ops",
        label: "Reporting Ops",
        href: "/admin/operations/reporting",
      },
      // Demoted portfolio view — destination only, never home.
      {
        id: "executive",
        label: "Portfolio Overview",
        href: "/admin/operations/executive",
      },
    ],
  },
  {
    label: "Studio",
    items: [
      { id: "creative", label: "Creative", href: "/admin/operations/creative" },
      { id: "reels", label: "Reels", href: "/admin/operations/reels" },
    ],
  },
  {
    label: "Tools",
    items: [
      {
        id: "qr-generator",
        label: "QR Generator",
        href: "/admin/operations/tools/qr-generator",
      },
    ],
  },
  {
    label: "System",
    items: [
      { id: "settings", label: "Settings", href: "/admin/operations/settings" },
      {
        id: "integrations",
        label: "Integrations",
        href: "/admin/operations/integrations",
      },
      { id: "platform", label: "Platform", href: "/admin/operations/platform" },
      { id: "training", label: "Training", href: "/admin/training" },
      { id: "staff", label: "Staff Home", href: "/admin/operations/staff" },
      { id: "client-import", label: "Import", href: "/admin/operations/client-import" },
      // Demoted former home competitors — reachable, never morning start.
      {
        id: "command",
        label: "Operations Board",
        href: "/admin/operations/command",
      },
      {
        id: "founder",
        label: "Owner Snapshot",
        href: "/admin/operations/founder",
      },
      {
        id: "founder-intelligence",
        label: "Priority Brief",
        href: "/admin/operations/founder-intelligence",
      },
      {
        id: "brain",
        label: "Portfolio Synthesis",
        href: "/admin/operations/brain",
      },
    ],
  },
];

/** Flat list — backwards compatible */
export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

/** Administrator oversight entry — linked from staff oversight page and Tools. */
export const STAFF_OVERSIGHT_NAV_ITEM = {
  id: "staff" as const,
  label: "Staff Oversight",
  href: "/admin/operations/staff/oversight",
};
