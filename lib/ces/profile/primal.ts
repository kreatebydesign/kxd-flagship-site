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
  welcomeEyebrow: "Private Review Space",
  reassuranceLine: "Every revision is tracked. Nothing gets lost.",
  supportTone: "direct" as const,
  portalSidebarLabel: "Private workspace",
  enabledModules: ["website-review"] as const,
  showKxdPartnerMark: true,
  partnerFooterLine: "Powered by KXD OS",
  terminology: {
    "nav.website-review": "Website Review",
    "portal.home.eyebrow": "Your workspace",
    "portal.home.lead":
      "Everything related to your website and creative work is organized here.",
    "website-review.landing.title": "Website Review",
    "website-review.landing.lead":
      "Review your site, leave feedback, and follow every revision with clarity.",
    "website-review.landing.eyebrow": "Website Review",
    "website-review.request.eyebrow": "New revision",
    "website-review.detail.eyebrow": "Revision details",
    "website-review.cta.request": "Start a revision",
    "website-review.cta.visual": "Review visually",
  },
};
