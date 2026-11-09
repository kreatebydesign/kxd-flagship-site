/**
 * Ongoing service scope and November execution plan (evidence-bound).
 * Does not imply tasks were completed unless noted in ledger.
 */

export type OngoingService = {
  label: string;
  evidence: string;
  clientFacing: string;
};

export type ClientValueProfile = {
  clientId: number;
  clientName: string;
  productionUrl: string | null;
  retainerLabel: string;
  deliveredHighlights: string[];
  ongoingServices: OngoingService[];
  inProgress: string[];
  waitingOnClient: string[];
  nextPriorities: string[];
};

export const CLIENT_VALUE_PROFILES: ClientValueProfile[] = [
  {
    clientId: 5,
    clientName: "Cusick Morgan Motorsports",
    productionUrl: "https://www.cusickmotorsports.com",
    retainerLabel: "Cusick Morgan Motorsports — Monthly Retainer",
    deliveredHighlights: [
      "August historical website and SEO improvements recorded (deliverables #10–16).",
      "September 2026 performance report published (monthly_reports #5).",
    ],
    ongoingServices: [
      {
        label: "Search Console and SEO monitoring",
        evidence: "monthly_deliverables #17; GA4/GSC sync reporting_sync_states",
        clientFacing:
          "KXD watches how Google finds your motorsports site and flags issues that could hide you from search.",
      },
      {
        label: "Website and search health checks",
        evidence: "monthly_deliverables #18",
        clientFacing:
          "KXD keeps an eye on whether the site stays online, accurate, and usable for visitors.",
      },
      {
        label: "Hosting and analytics wiring",
        evidence: "client_infrastructure GA4 542430303; batch-0b mapping",
        clientFacing:
          "KXD maintains the technical tie between your site, analytics, and search tools.",
      },
    ],
    inProgress: [
      "Search performance monitoring and ongoing SEO optimization (#17).",
      "Ongoing website/search health monitoring (#18).",
    ],
    waitingOnClient: [],
    nextPriorities: [
      "Founder review of October performance draft before any portal publish.",
      "Continue monitoring; log any verified site fixes before marking new completions.",
    ],
  },
  {
    clientId: 9,
    clientName: "On Track Performance",
    productionUrl: "https://www.on-track-performance.com",
    retainerLabel: "On Track Performance — Monthly Retainer",
    deliveredHighlights: [
      "Staged replacement website recorded complete historically (#19). Live site unchanged.",
      "September 2026 performance report published (monthly_reports #6).",
    ],
    ongoingServices: [
      {
        label: "Live site search monitoring",
        evidence: "monthly_deliverables #23–#24",
        clientFacing:
          "KXD tracks how the current OTP website appears in Google while the new site waits for launch approval.",
      },
      {
        label: "Search Console follow-through",
        evidence: "monthly_deliverables #24",
        clientFacing:
          "KXD follows up on indexing so important service pages can be found.",
      },
    ],
    inProgress: [
      "Website/search performance monitoring (#23).",
      "Search Console/indexing follow-through (#24).",
    ],
    waitingOnClient: [
      "Staged replacement site: review and launch decision when Don is ready (historical note on #19).",
    ],
    nextPriorities: [
      "Clarify launch timing for staged OTP site without treating staging as go-live.",
      "October report draft review (Search-only metrics limitation for OTP).",
    ],
  },
  {
    clientId: 10,
    clientName: "2475 Townsgate",
    productionUrl: "https://www.2475townsgate.com",
    retainerLabel: "2475 Townsgate - Monthly Web Retainer",
    deliveredHighlights: [
      "Property website rebuild and tenant profiles (August historical #25–#30).",
      "Google Analytics 4 installed and verified 2026-09-28 (#31).",
      "September 2026 performance report published (monthly_reports #8).",
    ],
    ongoingServices: [
      {
        label: "Analytics and search monitoring after GA4",
        evidence: "monthly_deliverables #32; reporting_sync_states",
        clientFacing:
          "KXD monitors traffic and search now that measurement is live on the property site.",
      },
      {
        label: "Live property website care",
        evidence: "client_infrastructure production_url; HTTP 200 verified 2026-11-09",
        clientFacing:
          "KXD supports the live Townsgate site so tenants and visitors can reach correct information.",
      },
    ],
    inProgress: ["Search/analytics monitoring following production measurement setup (#32)."],
    waitingOnClient: [],
    nextPriorities: [
      "Use October as first full GA4 baseline in client report draft.",
      "Any property content updates only after verified change records.",
    ],
  },
  {
    clientId: 14,
    clientName: "OTP Carts",
    productionUrl: "https://www.otpcarts.com",
    retainerLabel: "OTP Carts — Monthly Retainer",
    deliveredHighlights: [
      "Website launch and post-launch QA August 2026 (#1).",
      "Technical SEO and Search Console setup August (#4–#6).",
      "October: Facebook/Instagram business setup (#49) and social creative batch (#50).",
      "September 2026 performance report published (monthly_reports #7).",
    ],
    ongoingServices: [
      {
        label: "Live website and Search Console monitoring",
        evidence: "client_infrastructure; deliverable #6 context",
        clientFacing:
          "KXD keeps the OTP Carts website maintained and watches Google indexing after launch.",
      },
      {
        label: "Local search and Google Business Profile",
        evidence: "monthly_deliverables #7–#9",
        clientFacing:
          "KXD is setting up Westlake local presence. Google verification from your team is still required.",
      },
    ],
    inProgress: [
      "Local search / showroom setup (#8).",
      "Google profile ownership / access recovery (#9).",
    ],
    waitingOnClient: ["Google Business Profile setup (Westlake) (#7) waiting on verification."],
    nextPriorities: [
      "Execute planned Social Media Sales Push (#56) after founder sign-off.",
      "Finish Westlake GBP after Nicole completes verification.",
      "October performance draft review (one analytics lead event, not a sale claim).",
    ],
  },
];

export type NovemberTask = {
  id: string;
  clientId: number;
  title: string;
  category: "inspection" | "monitoring" | "content" | "launch" | "local" | "social";
  effort: "low" | "medium" | "high";
  dependsOn: string | null;
  status: "proposed" | "planned-in-work-engine" | "blocked";
  evidence: string;
};

export const NOVEMBER_2026_EXECUTION_PLAN: NovemberTask[] = [
  {
    id: "nov-cmm-availability",
    clientId: 5,
    title: "Confirm live site responds and key paths load",
    category: "inspection",
    effort: "low",
    dependsOn: null,
    status: "proposed",
    evidence: "Read-only HEAD check 2026-11-09: root redirects to www; follow-up on full page QA not run.",
  },
  {
    id: "nov-cmm-search",
    clientId: 5,
    title: "Continue Search Console review against October facts",
    category: "monitoring",
    effort: "low",
    dependsOn: null,
    status: "proposed",
    evidence: "Deliverable #17; reporting_facts October window present.",
  },
  {
    id: "nov-otp-staging",
    clientId: 9,
    title: "Document launch blockers for staged OTP site (no DNS change)",
    category: "launch",
    effort: "medium",
    dependsOn: "Client review of staged site",
    status: "proposed",
    evidence: "Deliverable #19 historical staging status.",
  },
  {
    id: "nov-otp-gsc",
    clientId: 9,
    title: "Indexing review on live OTP domain",
    category: "monitoring",
    effort: "low",
    dependsOn: null,
    status: "proposed",
    evidence: "Deliverable #24.",
  },
  {
    id: "nov-townsgate-ga4",
    clientId: 10,
    title: "Review first full-month GA4 baseline (October draft)",
    category: "monitoring",
    effort: "low",
    dependsOn: null,
    status: "proposed",
    evidence: "Deliverable #31–#32; October performance draft.",
  },
  {
    id: "nov-townsgate-live",
    clientId: 10,
    title: "Confirm property site availability",
    category: "inspection",
    effort: "low",
    dependsOn: null,
    status: "proposed",
    evidence: "HTTP 200 www.2475townsgate.com 2026-11-09.",
  },
  {
    id: "nov-carts-gbp",
    clientId: 14,
    title: "Follow up on Westlake GBP verification status",
    category: "local",
    effort: "low",
    dependsOn: "Client verification with Google",
    status: "blocked",
    evidence: "Deliverable #7 waiting-on-client.",
  },
  {
    id: "nov-carts-social",
    clientId: 14,
    title: "Social Media Sales Push",
    category: "social",
    effort: "medium",
    dependsOn: "Founder approval of creative direction",
    status: "planned-in-work-engine",
    evidence: "work #56 planned 2026-11-09.",
  },
  {
    id: "nov-carts-live",
    clientId: 14,
    title: "Confirm otpcarts.com availability",
    category: "inspection",
    effort: "low",
    dependsOn: null,
    status: "proposed",
    evidence: "HTTP 200 www.otpcarts.com 2026-11-09.",
  },
];

export const READONLY_INSPECTION_2026_11_09 = {
  inspectedAt: "2026-11-09T20:59:05Z",
  method: "HTTP HEAD (read-only)",
  findings: [
    {
      url: "https://cusickmotorsports.com",
      result: "308 redirect to www",
      countsAsFix: false,
      note: "Site responds; full page and form checks not performed this pass.",
    },
    {
      url: "https://on-track-performance.com",
      result: "301 redirect to www",
      countsAsFix: false,
      note: "Live site responds.",
    },
    {
      url: "https://www.2475townsgate.com",
      result: "HTTP 200",
      countsAsFix: false,
      note: "Property site reachable.",
    },
    {
      url: "https://www.otpcarts.com",
      result: "HTTP 200",
      countsAsFix: false,
      note: "Production site reachable.",
    },
  ],
};
