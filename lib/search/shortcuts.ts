import type { CommandSearchResult } from "./types";

/** Default pinned shortcuts — user can override via localStorage */
export const DEFAULT_PINNED: CommandSearchResult[] = [
  {
    id: "pin-command",
    type: "nav",
    group: "navigation",
    title: "Command Center",
    subtitle: "Operations overview",
    href: "/admin/operations/command",
    icon: "◎",
    actionLabel: "Open",
  },
  {
    id: "pin-brain",
    type: "nav",
    group: "brain",
    title: "KXD Brain",
    subtitle: "Executive intelligence",
    href: "/admin/operations/brain",
    icon: "◎",
    actionLabel: "Open",
  },
  {
    id: "pin-clients",
    type: "nav",
    group: "clients",
    title: "Client Portfolio",
    subtitle: "All clients",
    href: "/admin/operations/clients",
    icon: "◎",
    actionLabel: "Open",
  },
  {
    id: "pin-proposals",
    type: "nav",
    group: "sales",
    title: "Proposals",
    subtitle: "Sales pipeline",
    href: "/admin/sales/proposals",
    icon: "◎",
    actionLabel: "Open",
  },
];

export const PINNED_STORAGE_KEY = "kxd-command-search-pinned";
