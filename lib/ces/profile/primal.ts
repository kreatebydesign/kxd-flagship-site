/**
 * Primal Motorsports — CES Experience Profile defaults (Stage 3)
 * Used by seed script and documentation. Not a runtime fallback for other clients.
 */

export const PRIMAL_CLIENT_SLUG = "primal-motorsports";

export const PRIMAL_EXPERIENCE_PROFILE = {
  profileName: "Primal Motorsports Experience",
  status: "active" as const,
  primaryColor: "#0B0B0B",
  secondaryColor: "#141414",
  accentColor: "#A83424",
  surfaceTint: "rgba(168, 52, 36, 0.032)",
  borderRadiusPreset: "default" as const,
  motionPreset: "calm" as const,
  welcomeEyebrow: "Partnership",
  reassuranceLine: "Website live. Production verified. Measurement active.",
  supportTone: "direct" as const,
  portalSidebarLabel: "Partnership workspace",
  /**
   * Intended Primal portal allowlist = these CES modules only.
   * HQ surfaces (analytics, reports, projects, deliverables, requests,
   * website-health, assets, resources, team, meetings, advisor) stay off
   * until Phase 3 explicitly enables them after confirming client-facing value.
   * Do not inject HQ modules via slug-based portal switching.
   */
  enabledModules: [
    "website-review",
    "website-workspace",
    "executive-performance",
    "executive-review",
    "inventory",
  ] as const,
  showKxdPartnerMark: true,
  partnerFooterLine: "Powered by KXD OS",
  terminology: {
    "nav.executive-review": "Executive Review",
    "nav.website-review": "Website Review",
    "nav.website-workspace": "Website Workspace",
    "nav.inventory": "Inventory",
    "website-workspace.landing.eyebrow": "Website",
    "website-workspace.landing.title": "Website Workspace",
    "website-workspace.landing.lead":
      "Request precise website updates by page and section — KXD reviews every change before anything goes live.",
    "website-workspace.cta.open": "Open page",
    "website-workspace.cta.edit": "Edit request",
    "website-workspace.requests.title": "Update requests",
    "inventory.landing.eyebrow": "Listings",
    "inventory.landing.title": "Inventory",
    "inventory.landing.lead":
      "Add, update, and publish vehicles for your public website — without waiting on a developer.",
    "portal.home.workspaceLabel": "Primal Workspace",
    "portal.home.eyebrow": "Primal Workspace",
    "portal.home.lead":
      "Production website live. Measurement active. Focus: growth and optimization.",
    "portal.home.launch.eyebrow": "Where things stand",
    "portal.home.launch.title": "Post-launch priorities",
    "portal.home.launch.lead":
      "The website is live and verified. Start with the Leadership Report, then watch search, Ads efficiency, and qualified leads.",
    "portal.home.launch.leadActive":
      "Keep momentum going — review the Leadership Report, monitor performance, and use Website Review only when you have a future site note.",
    "portal.home.launch.step1": "Open the Leadership Report.",
    "portal.home.launch.step2": "Review current search and Ads priorities.",
    "portal.home.launch.step3": "Watch qualified lead performance.",
    "portal.home.launch.step4": "Use Website Review for future site notes when needed.",
    "portal.home.stat.active": "Active revisions",
    "portal.home.stat.awaiting": "Waiting on you",
    "portal.home.stat.current": "Current review",
    "portal.home.stat.clear": "You're all caught up.",
    "portal.home.currentStatus": "Current status",
    "portal.home.openRevision": "Open this revision",
    "portal.home.cta.latestRevision": "Open latest revision",
    "portal.home.recentRevisions": "Recent revisions",
    "portal.home.module.activeCount": "Revisions in progress",
    "website-review.landing.title": "Website Review",
    "website-review.landing.lead":
      "Leave precise future website notes here. Launch is complete — this is for ongoing updates, not a launch gate.",
    "website-review.landing.eyebrow": "Collaboration",
    "website-review.request.eyebrow": "New update note",
    "website-review.detail.eyebrow": "Revision details",
    "website-review.cta.request": "Leave a site note",
    "website-review.cta.visual": "Review Website",
    "portal.home.currentWork": "Current Work",
    "portal.home.website": "Website",
    "portal.home.recentActivity": "Recent Activity",
    "portal.home.deliverables": "Latest Deliverables",
    "portal.home.quickActions": "Quick Actions",
    "portal.home.quick.review-website": "Review Website",
    "portal.home.quick.start-review": "Leave a site note",
    "portal.home.quick.upload-assets": "Upload Assets",
    "portal.home.quick.message-kxd": "Message KXD",
    "portal.home.viewAllRevisions": "View all revisions",
  },
};
