/**
 * lib/playbooks.ts
 * Static KXD OS internal SOP / playbook library
 */

export type PlaybookBadge = "Core SOP" | "Launch" | "SEO" | "Client Success" | "Emergency";

export type Playbook = {
  id: string;
  title: string;
  description: string;
  badge: PlaybookBadge;
  checklist: string[];
};

export const PLAYBOOKS: Playbook[] = [
  {
    id: "website-launch",
    title: "New Client Website Launch Checklist",
    description:
      "End-to-end launch protocol from final QA through DNS cutover, analytics verification, and client handoff.",
    badge: "Launch",
    checklist: [
      "Confirm staging sign-off from client",
      "Run mobile, tablet, and desktop QA pass",
      "Verify forms, CTAs, and tracking pixels",
      "Check page speed and image optimization",
      "Confirm SSL and redirect rules",
      "Schedule launch window with client",
      "Post-launch smoke test on production URL",
      "Send launch confirmation and handoff email",
    ],
  },
  {
    id: "domain-dns",
    title: "Domain + DNS Setup Checklist",
    description:
      "Secure domain access, configure DNS records, and validate propagation before launch or migration.",
    badge: "Launch",
    checklist: [
      "Confirm registrar login or delegated access",
      "Document current DNS records snapshot",
      "Set A / CNAME records for hosting target",
      "Configure www and apex redirect policy",
      "Add MX records if email is migrating",
      "Verify TTL and propagation status",
      "Confirm SSL certificate issuance",
      "Archive DNS change log in client record",
    ],
  },
  {
    id: "google-workspace",
    title: "Google Workspace Email Setup",
    description:
      "Provision professional email for clients using Google Workspace with correct MX and SPF/DKIM alignment.",
    badge: "Client Success",
    checklist: [
      "Confirm domain ownership in Google Admin",
      "Create primary admin and user accounts",
      "Configure MX records at registrar",
      "Set SPF, DKIM, and DMARC records",
      "Verify email delivery and reply routing",
      "Configure aliases and shared inboxes if needed",
      "Document credentials in secure client vault",
      "Send client login instructions",
    ],
  },
  {
    id: "ga4-search-console",
    title: "GA4 + Search Console Setup",
    description:
      "Connect analytics and search visibility tools so KXD and the client can measure performance from day one.",
    badge: "SEO",
    checklist: [
      "Create or access GA4 property",
      "Install gtag / GTM container on site",
      "Configure key conversion events",
      "Link GA4 to Search Console",
      "Verify site property in Search Console",
      "Submit sitemap.xml",
      "Confirm real-time data in GA4",
      "Grant client view-only access",
    ],
  },
  {
    id: "google-business-profile",
    title: "Google Business Profile Setup",
    description:
      "Establish local presence with optimized GBP listing, categories, and verification workflow.",
    badge: "SEO",
    checklist: [
      "Claim or request access to business profile",
      "Verify business address or service area",
      "Upload logo and cover imagery",
      "Set primary and secondary categories",
      "Write optimized business description",
      "Add website, phone, and hours",
      "Configure appointment or contact links",
      "Schedule first post or photo update",
    ],
  },
  {
    id: "client-handoff",
    title: "Client Handoff Checklist",
    description:
      "Formal transition from build to ongoing relationship — portal access, assets, and support expectations.",
    badge: "Client Success",
    checklist: [
      "Confirm portal account provisioning",
      "Deliver final asset package and credentials doc",
      "Walk client through portal requests workflow",
      "Review retainer scope and response SLAs",
      "Share support contact and escalation path",
      "Schedule 30-day check-in",
      "Archive project in KXD OS",
      "Mark onboarding approved in Payload",
    ],
  },
  {
    id: "retainer-review",
    title: "Monthly Retainer Review",
    description:
      "Monthly rhythm for retainer clients — deliverables, relationship health, and renewal readiness.",
    badge: "Core SOP",
    checklist: [
      "Review open requests and deliverable queue",
      "Confirm billing status and invoice timing",
      "Audit completed work against scope",
      "Flag blockers or scope creep",
      "Update client health notes in KXD OS",
      "Identify upsell or expansion opportunities",
      "Confirm next-month deliverable plan",
      "Send monthly summary if applicable",
    ],
  },
  {
    id: "emergency-fix",
    title: "Emergency Website Fix Protocol",
    description:
      "Rapid response protocol for production outages, broken forms, or critical client-facing failures.",
    badge: "Emergency",
    checklist: [
      "Acknowledge client within 1 business hour",
      "Assess severity: outage vs degraded vs cosmetic",
      "Check hosting, DNS, and SSL status",
      "Review recent deploys or CMS changes",
      "Apply hotfix or rollback if needed",
      "Verify fix on production across devices",
      "Document root cause and resolution",
      "Schedule follow-up hardening if required",
    ],
  },
];

export const BADGE_COLORS: Record<PlaybookBadge, { color: string; bg: string; border: string }> = {
  "Core SOP": { color: "#C5A65C", bg: "rgba(197,166,92,0.08)", border: "rgba(197,166,92,0.25)" },
  Launch: { color: "#96d2c8", bg: "rgba(150,210,200,0.08)", border: "rgba(150,210,200,0.25)" },
  SEO: { color: "#8a9bd2", bg: "rgba(138,155,210,0.08)", border: "rgba(138,155,210,0.25)" },
  "Client Success": { color: "#5ec68c", bg: "rgba(94,198,140,0.08)", border: "rgba(94,198,140,0.25)" },
  Emergency: { color: "#d25a5a", bg: "rgba(210,90,90,0.08)", border: "rgba(210,90,90,0.25)" },
};
