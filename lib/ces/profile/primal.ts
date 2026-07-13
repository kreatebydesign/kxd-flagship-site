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
  reassuranceLine: "Every revision is tracked. Nothing gets lost.",
  supportTone: "direct" as const,
  portalSidebarLabel: "Primal Motorsports",
  enabledModules: ["website-review"] as const,
  showKxdPartnerMark: true,
  partnerFooterLine: "Powered by KXD OS",
  terminology: {
    "nav.website-review": "Website Review",
    "portal.home.workspaceLabel": "Primal Workspace",
    "portal.home.eyebrow": "Primal Workspace",
    "portal.home.lead":
      "Everything Kreate by Design is actively delivering, planning, and recommending for Primal Motorsports.",
    "portal.home.launch.eyebrow": "Getting started",
    "portal.home.launch.title": "What to do first",
    "portal.home.launch.lead":
      "Your workspace is ready. Here is the clearest path to share website feedback with us.",
    "portal.home.launch.leadActive":
      "Keep momentum going — review your site, submit notes, and track every revision here.",
    "portal.home.launch.step1": "Review the current site.",
    "portal.home.launch.step2": "Submit notes through Website Review.",
    "portal.home.launch.step3": "Attach screenshots if helpful.",
    "portal.home.launch.step4": "We'll review your feedback and keep you updated here.",
    "portal.home.stat.active": "Active revisions",
    "portal.home.stat.awaiting": "Waiting on you",
    "portal.home.stat.current": "Current review",
    "portal.home.stat.clear": "You're all caught up.",
    "portal.home.currentStatus": "Current review status",
    "portal.home.openRevision": "Open this revision",
    "portal.home.cta.latestRevision": "Open latest revision",
    "portal.home.recentRevisions": "Recent revisions",
    "portal.home.module.activeCount": "Revisions in progress",
    "website-review.landing.title": "Website Review",
    "website-review.landing.lead":
      "Review the site, leave precise feedback, and follow every revision with clarity.",
    "website-review.landing.eyebrow": "Collaboration",
    "website-review.request.eyebrow": "New revision",
    "website-review.detail.eyebrow": "Revision details",
    "website-review.cta.request": "Start a revision",
    "website-review.cta.visual": "Review Website",
    "portal.home.currentWork": "Current Work",
    "portal.home.website": "Website",
    "portal.home.recentActivity": "Recent Activity",
    "portal.home.deliverables": "Latest Deliverables",
    "portal.home.quickActions": "Quick Actions",
    "portal.home.quick.review-website": "Review Website",
    "portal.home.quick.start-review": "Start Website Review",
    "portal.home.quick.upload-assets": "Upload Assets",
    "portal.home.quick.message-kxd": "Message KXD",
    "portal.home.viewAllRevisions": "View all revisions",
  },
};
