export type OperationsNavId =
  | "executive"
  | "command"
  | "today"
  | "clients"
  | "accounts"
  | "onboarding"
  | "founder"
  | "creative"
  | "reels"
  | "audits"
  | "playbooks"
  | "growth";

export const NAV_ITEMS = [
  { id: "executive", label: "Executive", href: "/admin/operations/executive" },
  { id: "command", label: "Operations", href: "/admin/operations/command" },
  { id: "today", label: "Today", href: "/admin/operations/today" },
  { id: "clients", label: "Clients", href: "/admin/operations/clients" },
  { id: "accounts", label: "Accounts", href: "/admin/operations/accounts" },
  { id: "onboarding", label: "Onboarding", href: "/admin/operations/onboarding" },
  { id: "founder", label: "Founder", href: "/admin/operations/founder" },
  { id: "creative", label: "Creative", href: "/admin/operations/creative" },
  { id: "reels", label: "Reels", href: "/admin/operations/reels" },
  { id: "audits", label: "Audits", href: "/admin/operations/audits" },
  { id: "playbooks", label: "Playbooks", href: "/admin/operations/playbooks" },
  { id: "growth", label: "Growth", href: "/admin/operations/growth" },
] as const satisfies ReadonlyArray<{
  id: OperationsNavId;
  label: string;
  href: string;
}>;
