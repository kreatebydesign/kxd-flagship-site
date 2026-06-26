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
  | "playbooks"
  | "growth"
  | "client-import"
  | "client-launch";

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
      { id: "today", label: "Today", href: "/admin/operations/today" },
      { id: "command", label: "Operations", href: "/admin/operations/command" },
      { id: "founder", label: "Founder", href: "/admin/operations/founder" },
    ],
  },
  {
    label: "Clients",
    items: [
      { id: "clients", label: "Portfolio", href: "/admin/operations/clients" },
      { id: "accounts", label: "Accounts", href: "/admin/operations/accounts" },
      { id: "onboarding", label: "Onboarding", href: "/admin/operations/onboarding" },
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
      { id: "playbooks", label: "Playbooks", href: "/admin/operations/playbooks" },
      { id: "growth", label: "Growth", href: "/admin/operations/growth" },
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
