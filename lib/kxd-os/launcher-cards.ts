/**
 * KXD OS launcher card registry.
 * Structured for future role-based visibility — filter by `permission` per Payload user.
 */

export type LauncherCardPermission =
  | "executive"
  | "research"
  | "academy"
  | "onboarding"
  | "creative"
  | "audits"
  | "playbooks"
  | "payload"
  | "portal"
  | "juniorAdmin";

export type LauncherCardSection = "studio" | "client";

export type LauncherCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  tag: string;
  section: LauncherCardSection;
  /** Future: gate card visibility by Payload user role / permission. */
  permission: LauncherCardPermission;
};

export const LAUNCHER_CARDS: LauncherCard[] = [
  {
    id: "executive",
    title: "Executive Overview",
    description: "Studio-wide snapshot — clients, delivery pipeline, onboarding, and growth metrics.",
    href: "/admin/operations/executive",
    tag: "Executive",
    section: "studio",
    permission: "executive",
  },
  {
    id: "research",
    title: "Research Desk",
    description: "Lead research intake, qualification queue, and opportunity tracking.",
    href: "/admin/operations/research",
    tag: "Growth infrastructure",
    section: "studio",
    permission: "research",
  },
  {
    id: "junior-creators",
    title: "Junior Creators",
    description: "KXD Academy research desk — shifts, pipeline progress, and lead submissions.",
    href: "/junior-creators",
    tag: "KXD Academy",
    section: "studio",
    permission: "academy",
  },
  {
    id: "junior-creators-admin",
    title: "Junior Creator Admin",
    description: "Review shifts, weekly hours, estimated earnings, and admin adjustments.",
    href: "/admin/operations/junior-creators",
    tag: "KXD Academy",
    section: "studio",
    permission: "juniorAdmin",
  },
  {
    id: "onboarding",
    title: "Client Onboarding",
    description: "New client readiness, intake workflows, and launch preparation.",
    href: "/admin/operations/onboarding",
    tag: "Client infrastructure",
    section: "studio",
    permission: "onboarding",
  },
  {
    id: "creative",
    title: "Creative Operations",
    description: "Campaigns, brand kits, social, flyers, and creative production systems.",
    href: "/admin/operations/creative",
    tag: "Studio systems",
    section: "studio",
    permission: "creative",
  },
  {
    id: "audits",
    title: "Website Audits",
    description: "Public audit submissions, scores, grades, and sales follow-up pipeline.",
    href: "/admin/operations/audits",
    tag: "Growth infrastructure",
    section: "studio",
    permission: "audits",
  },
  {
    id: "playbooks",
    title: "Playbooks",
    description: "Internal SOP library — launch protocols, DNS, analytics, and client success.",
    href: "/admin/operations/playbooks",
    tag: "Studio systems",
    section: "studio",
    permission: "playbooks",
  },
  {
    id: "payload",
    title: "Payload Admin",
    description: "Full CMS — collections, records, media, and system configuration.",
    href: "/admin",
    tag: "Platform",
    section: "studio",
    permission: "payload",
  },
  {
    id: "portal",
    title: "Client Portal",
    description: "Client-facing workspace for projects, requests, deliverables, and assets.",
    href: "/portal",
    tag: "Client infrastructure",
    section: "client",
    permission: "portal",
  },
];

/**
 * Returns launcher cards visible to the current user.
 * TODO: filter by Payload user role / permissions once RBAC is defined.
 * For now, Payload admins see all cards.
 */
export function getLauncherCardsForUser(): LauncherCard[] {
  return LAUNCHER_CARDS;
}

export function getStudioLauncherCards(cards: LauncherCard[]): LauncherCard[] {
  return cards.filter((c) => c.section === "studio");
}

export function getClientLauncherCards(cards: LauncherCard[]): LauncherCard[] {
  return cards.filter((c) => c.section === "client");
}
