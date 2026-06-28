import type { LaunchQaCategoryId, LaunchQaChecklistItem } from "./types";

export interface LaunchQaCategoryDef {
  id: LaunchQaCategoryId;
  label: string;
  description: string;
}

export const LAUNCH_QA_CATEGORIES: LaunchQaCategoryDef[] = [
  { id: "pre-launch", label: "Pre-Launch", description: "Staging review and launch prerequisites" },
  { id: "design-qa", label: "Design QA", description: "Visual polish, navigation, and brand consistency" },
  { id: "responsive-qa", label: "Responsive QA", description: "Mobile, tablet, and desktop breakpoints" },
  { id: "content-qa", label: "Content QA", description: "Copy, CTAs, and contact links" },
  { id: "seo-qa", label: "SEO QA", description: "Metadata, sitemap, schema, and social tags" },
  { id: "technical-qa", label: "Technical QA", description: "Links, 404, and technical integrity" },
  { id: "analytics-qa", label: "Analytics QA", description: "GA4, GTM, and Search Console" },
  { id: "forms-qa", label: "Forms QA", description: "Form submission, routing, and notifications" },
  { id: "domain-dns-qa", label: "Domain / DNS QA", description: "Domain, SSL, and redirect configuration" },
  { id: "performance-qa", label: "Performance QA", description: "Speed, images, and core web vitals basics" },
  { id: "accessibility-qa", label: "Accessibility QA", description: "Baseline accessibility checks" },
  { id: "legal-trust-qa", label: "Legal / Trust QA", description: "Privacy, terms, and trust signals" },
  { id: "post-launch", label: "Post-Launch", description: "Smoke tests and post-launch verification" },
];

type TemplateSeed = Omit<LaunchQaChecklistItem, "status" | "notes" | "completedAt">;

const SEEDS: TemplateSeed[] = [
  // Pre-Launch
  { id: "pre-staging-review", categoryId: "pre-launch", title: "Staging environment reviewed", description: "Full site walkthrough on staging URL before production.", required: true, severity: "critical", relatedModule: "Projects" },
  { id: "pre-client-signoff", categoryId: "pre-launch", title: "Client staging sign-off", description: "Written or recorded client approval on staging.", required: true, severity: "critical", relatedModule: "Client HQ" },
  { id: "pre-launch-window", categoryId: "pre-launch", title: "Launch window scheduled", description: "Go-live date and time confirmed with client.", required: true, severity: "warning", relatedModule: "Timeline" },
  { id: "pre-backup-plan", categoryId: "pre-launch", title: "Rollback plan documented", description: "DNS rollback and backup access confirmed.", required: false, severity: "warning", relatedModule: "Infrastructure" },

  // Design QA
  { id: "design-navigation", categoryId: "design-qa", title: "Navigation QA", description: "Primary nav, footer links, and mobile menu function correctly.", required: true, severity: "critical", relatedModule: "Creative" },
  { id: "design-favicon", categoryId: "design-qa", title: "Favicon present", description: "Favicon and app icons load on all pages.", required: true, severity: "warning", relatedModule: "Creative" },
  { id: "design-brand-consistency", categoryId: "design-qa", title: "Brand consistency", description: "Logo, colors, and typography match approved brand kit.", required: true, severity: "warning", relatedModule: "Creative" },

  // Responsive QA
  { id: "responsive-mobile", categoryId: "responsive-qa", title: "Mobile QA", description: "iPhone and Android viewport testing — layout, tap targets, menus.", required: true, severity: "critical", relatedModule: "Projects" },
  { id: "responsive-tablet", categoryId: "responsive-qa", title: "Tablet QA", description: "Tablet breakpoints verified for key pages.", required: true, severity: "warning", relatedModule: "Projects" },
  { id: "responsive-desktop", categoryId: "responsive-qa", title: "Desktop QA", description: "Large screen layout, hero, and grid systems verified.", required: true, severity: "warning", relatedModule: "Projects" },

  // Content QA
  { id: "content-ctas", categoryId: "content-qa", title: "Calls to action", description: "Primary CTAs visible, labeled correctly, and link to intended destinations.", required: true, severity: "critical", relatedModule: "Creative" },
  { id: "content-phone-links", categoryId: "content-qa", title: "Phone links", description: "Click-to-call links use correct tel: format and numbers.", required: true, severity: "critical", relatedModule: "Projects" },
  { id: "content-email-links", categoryId: "content-qa", title: "Email links", description: "mailto links open correctly with intended addresses.", required: true, severity: "warning", relatedModule: "Projects" },
  { id: "content-copy-review", categoryId: "content-qa", title: "Copy and spelling review", description: "No placeholder text, lorem ipsum, or obvious typos on key pages.", required: true, severity: "warning", relatedModule: "Creative" },

  // SEO QA
  { id: "seo-metadata", categoryId: "seo-qa", title: "SEO metadata", description: "Title tags and meta descriptions on all indexable pages.", required: true, severity: "critical", relatedModule: "Infrastructure" },
  { id: "seo-sitemap", categoryId: "seo-qa", title: "Sitemap", description: "XML sitemap generated, accessible, and submitted if applicable.", required: true, severity: "critical", relatedModule: "Infrastructure" },
  { id: "seo-robots", categoryId: "seo-qa", title: "Robots.txt", description: "Robots.txt allows indexing of production pages, blocks staging if needed.", required: true, severity: "critical", relatedModule: "Infrastructure" },
  { id: "seo-open-graph", categoryId: "seo-qa", title: "Open Graph tags", description: "OG title, description, and image set for social sharing.", required: true, severity: "warning", relatedModule: "Infrastructure" },
  { id: "seo-schema", categoryId: "seo-qa", title: "Schema markup", description: "Organization, LocalBusiness, or relevant schema validated.", required: false, severity: "warning", relatedModule: "Infrastructure" },

  // Technical QA
  { id: "tech-broken-links", categoryId: "technical-qa", title: "Broken links check", description: "Manual scan of nav, footer, and key internal links — no 404s.", required: true, severity: "critical", relatedModule: "Projects" },
  { id: "tech-404-page", categoryId: "technical-qa", title: "404 page", description: "Custom 404 page exists with navigation back to site.", required: true, severity: "warning", relatedModule: "Projects" },
  { id: "tech-ssl-redirects", categoryId: "technical-qa", title: "HTTPS enforcement", description: "HTTP redirects to HTTPS; no mixed content warnings.", required: true, severity: "critical", relatedModule: "Infrastructure" },

  // Analytics QA
  { id: "analytics-ga4", categoryId: "analytics-qa", title: "Google Analytics (GA4)", description: "GA4 tag firing on production; realtime events visible.", required: true, severity: "critical", relatedModule: "Infrastructure" },
  { id: "analytics-gtm", categoryId: "analytics-qa", title: "Google Tag Manager", description: "GTM container loads; key events configured.", required: false, severity: "warning", relatedModule: "Infrastructure" },
  { id: "analytics-search-console", categoryId: "analytics-qa", title: "Google Search Console", description: "Property verified; sitemap submitted.", required: true, severity: "warning", relatedModule: "Infrastructure" },

  // Forms QA
  { id: "forms-submission", categoryId: "forms-qa", title: "Form submissions", description: "All production forms submit successfully end-to-end.", required: true, severity: "critical", relatedModule: "Automation" },
  { id: "forms-notifications", categoryId: "forms-qa", title: "Form notifications", description: "Email notifications or CRM routing confirmed for each form.", required: true, severity: "critical", relatedModule: "Automation" },
  { id: "forms-spam-protection", categoryId: "forms-qa", title: "Spam protection", description: "Captcha or honeypot active on public forms.", required: false, severity: "info", relatedModule: "Automation" },

  // Domain / DNS QA
  { id: "dns-domain", categoryId: "domain-dns-qa", title: "Domain configuration", description: "A/AAAA/CNAME records point to correct hosting.", required: true, severity: "critical", relatedModule: "Infrastructure" },
  { id: "dns-ssl", categoryId: "domain-dns-qa", title: "SSL certificate", description: "Valid SSL certificate; no expiry within 30 days.", required: true, severity: "critical", relatedModule: "Infrastructure" },
  { id: "dns-launch-redirects", categoryId: "domain-dns-qa", title: "Launch redirects", description: "Old URLs redirect to new structure; www/non-www canonical set.", required: true, severity: "critical", relatedModule: "Infrastructure" },

  // Performance QA
  { id: "perf-load-speed", categoryId: "performance-qa", title: "Page load performance", description: "Home and key pages load acceptably on mobile and desktop.", required: true, severity: "warning", relatedModule: "Infrastructure" },
  { id: "perf-images", categoryId: "performance-qa", title: "Image optimization", description: "Hero and gallery images compressed; lazy loading where appropriate.", required: true, severity: "warning", relatedModule: "Creative" },
  { id: "perf-core-basics", categoryId: "performance-qa", title: "Core performance basics", description: "No blocking scripts; fonts and assets optimized.", required: false, severity: "info", relatedModule: "Infrastructure" },

  // Accessibility QA
  { id: "a11y-alt-text", categoryId: "accessibility-qa", title: "Image alt text", description: "Meaningful images have descriptive alt attributes.", required: true, severity: "warning", relatedModule: "Projects" },
  { id: "a11y-headings", categoryId: "accessibility-qa", title: "Heading hierarchy", description: "Logical H1–H3 structure on key templates.", required: false, severity: "info", relatedModule: "Projects" },
  { id: "a11y-keyboard", categoryId: "accessibility-qa", title: "Keyboard navigation basics", description: "Nav and forms operable via keyboard on primary flows.", required: false, severity: "info", relatedModule: "Projects" },

  // Legal / Trust QA
  { id: "legal-privacy", categoryId: "legal-trust-qa", title: "Privacy policy", description: "Privacy policy page live and linked in footer.", required: true, severity: "critical", relatedModule: "Client HQ" },
  { id: "legal-terms", categoryId: "legal-trust-qa", title: "Terms and conditions", description: "Terms page live if required for business type.", required: false, severity: "warning", relatedModule: "Client HQ" },
  { id: "legal-trust-signals", categoryId: "legal-trust-qa", title: "Trust builders", description: "Reviews, certifications, or trust badges display correctly.", required: false, severity: "info", relatedModule: "Creative" },

  // Post-Launch
  { id: "post-smoke-test", categoryId: "post-launch", title: "Production smoke test", description: "Home, contact, and primary conversion paths verified live.", required: true, severity: "critical", relatedModule: "Projects" },
  { id: "post-forms-live", categoryId: "post-launch", title: "Live form verification", description: "Submit test lead on production; confirm routing.", required: true, severity: "critical", relatedModule: "Automation" },
  { id: "post-analytics-live", categoryId: "post-launch", title: "Live analytics check", description: "Realtime analytics receiving production traffic.", required: true, severity: "warning", relatedModule: "Infrastructure" },
  { id: "post-client-handoff", categoryId: "post-launch", title: "Client launch handoff", description: "Client notified; portal invite and training sent if applicable.", required: true, severity: "warning", relatedModule: "Client HQ" },
  { id: "post-monitoring", categoryId: "post-launch", title: "48-hour monitoring", description: "Uptime and error monitoring scheduled for first 48 hours.", required: false, severity: "info", relatedModule: "Infrastructure" },
];

export function buildDefaultChecklist(): LaunchQaChecklistItem[] {
  return SEEDS.map((seed) => ({
    ...seed,
    status: "pending",
    notes: "",
  }));
}

export function getCategoryDef(id: LaunchQaCategoryId): LaunchQaCategoryDef {
  return LAUNCH_QA_CATEGORIES.find((c) => c.id === id) ?? LAUNCH_QA_CATEGORIES[0];
}
