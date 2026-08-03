import type { CommandSearchResult } from "./types";

/** Default pinned shortcuts — user can override via localStorage */
export const DEFAULT_PINNED: CommandSearchResult[] = [
  {
    id: "pin-today",
    type: "nav",
    group: "navigation",
    title: "Today",
    subtitle: "Where the day begins",
    href: "/admin/operations/today",
    icon: "◎",
    actionLabel: "Open",
  },
  {
    id: "pin-work",
    type: "nav",
    group: "navigation",
    title: "Work",
    subtitle: "Execution desk",
    href: "/admin/work",
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
