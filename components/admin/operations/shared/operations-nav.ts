export type OperationsNavId =
  | "executive"
  | "command"
  | "today"
  | "clients"
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
  | "client-success"
  | "growth"
  | "client-import"
  | "client-launch"
  | "genesis"
  | "sales-pipeline"
  | "sales-leads"
  | "sales-proposals"
  | "sales-templates"
  | "sales-activities"
  | "sales-forecast"
  | "reports"
  | "strategy"
  | "brain"
  | "integrations";

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
    label: "Briefing",
    items: [
      { id: "executive", label: "Executive", href: "/admin/operations/executive" },
      { id: "founder-intelligence", label: "Founder Intelligence", href: "/admin/operations/founder-intelligence" },
      { id: "brain", label: "KXD Brain", href: "/admin/operations/brain" },
      { id: "today", label: "Today", href: "/admin/operations/today" },
      { id: "command", label: "Operations", href: "/admin/operations/command" },
      { id: "integrations", label: "Integrations", href: "/admin/operations/integrations" },
      { id: "founder", label: "Founder", href: "/admin/operations/founder" },
    ],
  },
  {
    label: "Clients",
    items: [
      { id: "genesis", label: "Genesis", href: "/admin/operations/genesis" },
      { id: "clients", label: "Portfolio", href: "/admin/operations/clients" },
      { id: "strategy", label: "Strategy Vault", href: "/admin/operations/strategy" },
      { id: "accounts", label: "Accounts", href: "/admin/operations/accounts" },
      { id: "onboarding", label: "Onboarding", href: "/admin/operations/onboarding" },
      { id: "client-success", label: "Client Success", href: "/admin/operations/client-success" },
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
    label: "Intelligence",
    items: [
      { id: "audits", label: "Audits", href: "/admin/operations/audits" },
      { id: "infrastructure", label: "Infrastructure", href: "/admin/operations/infrastructure" },
      { id: "timeline", label: "Timeline", href: "/admin/operations/timeline" },
      { id: "automation", label: "Automation", href: "/admin/operations/automation" },
      { id: "work", label: "Work", href: "/admin/operations/work" },
      { id: "playbooks", label: "Playbooks", href: "/admin/operations/playbooks" },
      { id: "growth", label: "Growth", href: "/admin/operations/growth" },
      { id: "reports", label: "Reports", href: "/admin/operations/reports" },
    ],
  },
  {
    label: "Sales",
    items: [
      { id: "sales-pipeline", label: "Pipeline", href: "/admin/sales" },
      { id: "sales-leads", label: "Leads", href: "/admin/sales/leads" },
      { id: "sales-proposals", label: "Proposals", href: "/admin/sales/proposals" },
      { id: "sales-templates", label: "Templates", href: "/admin/sales/templates" },
      { id: "sales-activities", label: "Activities", href: "/admin/sales/activities" },
      { id: "sales-forecast", label: "Forecast", href: "/admin/sales/forecast" },
    ],
  },
  {
    label: "Tools",
    items: [
      { id: "client-import", label: "Import", href: "/admin/operations/client-import" },
      { id: "client-launch", label: "Launch", href: "/admin/operations/client-launch" },
    ],
  },
];

/** Flat list — backwards compatible */
export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);
