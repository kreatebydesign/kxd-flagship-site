/**
 * Primal Motorsports — Executive Review Pack (V1).
 * Authored from partnership reporting through July 20, 2026.
 * Curated metrics only — never fabricated live analytics.
 */

import type { ExecutiveReviewPack } from "../types";

const ASSET = "/migrated-assets/executive-review/primal";

export const PRIMAL_EXECUTIVE_REVIEW_PACK: ExecutiveReviewPack = {
  clientSlug: "primal-motorsports",
  clientName: "Primal Motorsports",
  periodLabel: "Reporting through July 20, 2026",
  heroImageSrc: "/migrated-assets/projects/primal-motorsports-hero.jpg",
  heroImageAlt: "Radical race cars on track — Primal Motorsports",
  opening: {
    eyebrow: "Leadership",
    brand: "Primal Motorsports",
    headline: "Executive Review",
    lead:
      "We've built the core pieces together. Now we finish the new website, keep a close eye on search and ads, and grow with a clear view of what's next.",
    contextLine:
      "This page covers three things: your public website, this private workspace, and future systems that stay a separate conversation until you're ready.",
    glance: {
      phase: "Launch readiness",
      focus: "Final revisions",
      next: "Website launch",
      updated: "July 2026",
    },
  },
  timeline: [
    { id: "previous", label: "Previous website" },
    { id: "planning", label: "Planning & discovery" },
    { id: "rebuild", label: "Website rebuild" },
    { id: "workspace", label: "Workspace development" },
    { id: "marketing", label: "Marketing & reporting" },
    { id: "today", label: "Today", current: true },
    { id: "future", label: "Future growth" },
  ],
  journey: {
    title: "From PrimalRacing.com to PrimalMotorsports.com",
    lead:
      "This is the natural next chapter for the business — not a criticism of what came before. The brand grew. The tools grew with it.",
    before: {
      id: "before",
      title: "Before",
      items: [
        "Previous website on PrimalRacing.com",
        "A different stage of the business",
        "More limited customer experience",
        "Fewer tools for day-to-day management",
      ],
    },
    today: {
      id: "today",
      title: "Today",
      items: [
        "Modern Primal Motorsports website",
        "Clearer customer experience",
        "Private client workspace",
        "Inventory management",
        "Website editing tools",
        "Google Ads connected",
        "Room to grow from here",
      ],
    },
  },
  chapters: [
    {
      id: "opening",
      railLabel: "Stance",
      eyebrow: "Where we stand",
      title: "Where we are right now",
      lead:
        "Think of this as the conversation we'd have in a room together — what we've built, what's still in progress, and what comes next.",
      paragraphs: [
        "When we started under current ownership, the job was straightforward: rebuild the website, run ads and search carefully, and give you a private place to work with us.",
        "That work is largely in place. Right now we're finishing final website revisions with Adam and the team so the new site can go live cleanly.",
        "You can open this anytime. We'll keep it current as things move.",
      ],
      takeaway:
        "The hard build work is done. Right now we're getting the new site ready to launch — and this page stays with you as we go.",
    },
    {
      id: "foundation",
      railLabel: "Foundation",
      eyebrow: "What we built",
      title: "What we've put in place",
      lead:
        "These pieces work together — the website, ads, search, and this workspace — instead of living in separate tools.",
      paragraphs: [
        "This wasn't just a redesign. We rebuilt the site, started advertising carefully, strengthened search on primalmotorsports.com, and opened this workspace so you and KXD can stay aligned.",
        "Everything below is real delivery. If something is still getting connected, we say so.",
      ],
      takeaway:
        "Website, ads, search, and this workspace are working as one system — ready for launch.",
    },
    {
      id: "platform",
      railLabel: "Platform",
      eyebrow: "The website",
      title: "How the website is changing",
      lead:
        "Today's live site still carries the brand. The new site is built and on staging — waiting on final revisions before launch.",
      paragraphs: [
        "We're not throwing away what works. The current site has carried the brand and Radical sales. The rebuild keeps that energy and makes it easier for people to find schools, race programs, inventory, and service.",
        "Primal 2.0 is complete on staging. Launch happens after your final notes — we are not calling it live yet.",
      ],
      takeaway:
        "The live site is carrying you today. The new site is ready on staging. Launch comes after final revisions.",
    },
    {
      id: "demand",
      railLabel: "Demand",
      eyebrow: "Search & ads",
      title: "How people are finding you",
      lead:
        "People are finding Primal through Google Search and Google Ads. The website is now connected to proper conversion tracking.",
      paragraphs: [
        "Reporting will become more detailed as additional integrations are connected inside this workspace.",
        "Website analytics will show up here once GA4 access is verified — nothing is invented in the meantime.",
      ],
      takeaway:
        "People are finding you on Google. Conversion tracking is in place. Deeper reporting inside this workspace comes next.",
    },
    {
      id: "workspace",
      railLabel: "Workspace",
      eyebrow: "How we work together",
      title: "Your private workspace",
      lead:
        "This is where you review the site, update content you control, manage inventory, and see where things stand — without chasing email threads.",
      paragraphs: [
        "Each tool below does a different job. Open any of them when you need it — they're live today.",
      ],
      takeaway:
        "You already have the tools you need for launch and day-to-day work with us. They're built and ready to use.",
    },
    {
      id: "impact",
      railLabel: "Impact",
      eyebrow: "Why it matters",
      title: "What this supports for the business",
      lead:
        "The website and marketing work support three parts of the business — without claiming results we can't prove yet.",
      paragraphs: [
        "Schools, race programs, and Radical inventory each have clearer paths on the new site. Search and ads are already showing interest in schools and inventory.",
        "We can't yet connect every click to every sale inside this workspace. That comes later. The near-term unlock is launching the new site.",
      ],
      takeaway:
        "Schools, race programs, and inventory are set up to work better once the new site launches. Deeper tracking comes after that.",
    },
    {
      id: "roadmap",
      railLabel: "Roadmap",
      eyebrow: "Looking ahead",
      title: "What we're finishing — and what can come later",
      lead:
        "First we finish launch. Then we deepen reporting. Bigger systems like Primal OS stay a separate conversation.",
      paragraphs: [
        "Now, Next, and Later keep things honest. Nothing in Later is part of what you're getting today. Nothing in Now is called done until it is.",
      ],
      takeaway:
        "Right now: finish launch. Next: clearer reporting in this workspace. Later: lead follow-through and Primal OS — when you're ready to talk about it.",
    },
    {
      id: "vision",
      railLabel: "Vision",
      eyebrow: "Growing together",
      title: "Where this can go",
      lead:
        "We've built a strong foundation together. The website and workspace are now in place.",
      paragraphs: [
        "As Primal continues to grow, this workspace can continue growing with it. Future systems like Primal OS remain a separate conversation when the business is ready — not part of what we've delivered today.",
      ],
      takeaway:
        "We've built something solid together. We can keep growing it with Primal — at your pace, when you're ready.",
    },
  ],
  pillars: [
    {
      id: "website",
      number: "01",
      title: "New website rebuilt for the brand",
      body: "The new site is built on staging and being refined for launch.",
      status: "built",
    },
    {
      id: "ads",
      number: "02",
      title: "Advertising launched and managed carefully",
      body: "Google Ads runs for racing schools — Search for people ready to inquire, Demand Gen for awareness and remarketing.",
      status: "built",
    },
    {
      id: "search",
      number: "03",
      title: "Search presence on primalmotorsports.com",
      body: "Search Console is connected. People are finding the primary brand domain more clearly through mid-2026.",
      status: "built",
    },
    {
      id: "workspace",
      number: "04",
      title: "Private partnership workspace opened",
      body: "A quiet place for you and KXD to collaborate, manage inventory, and stay on the same page.",
      status: "built",
    },
    {
      id: "review",
      number: "05",
      title: "A clear way to request website changes",
      body: "Website Review keeps your notes organized — nothing gets lost in email.",
      status: "built",
    },
    {
      id: "ep",
      number: "06",
      title: "A calm view for leadership",
      body: "Overview shows where things stand and what deserves attention next.",
      status: "built",
    },
  ],
  platformFrames: [
    {
      id: "live-home",
      src: `${ASSET}/live-homepage.png`,
      alt: "Current live Primal Motorsports homepage",
      caption: "How customers enter the brand today",
      label: "Today",
      status: "built",
    },
    {
      id: "rebuild-home",
      src: `${ASSET}/rebuild-homepage.png`,
      alt: "Primal 2.0 homepage with clearer paths into schools, racing, inventory, and service",
      caption: "Clearer paths into schools, race programs, inventory, and service",
      label: "Primal 2.0",
      status: "in-progress",
    },
    {
      id: "live-inventory",
      src: `${ASSET}/live-inventory.png`,
      alt: "Current live inventory listing page for Radical vehicles",
      caption: "Radical inventory as it lives on the current site",
      label: "Today",
      status: "built",
    },
    {
      id: "rebuild-inventory",
      src: `${ASSET}/rebuild-inventory.png`,
      alt: "Primal 2.0 inventory presentation for Radical vehicles",
      caption: "A cleaner way to browse Radical vehicles for sale",
      label: "Primal 2.0",
      status: "in-progress",
    },
    {
      id: "rebuild-mega",
      src: `${ASSET}/rebuild-inventory-mega-menu.png`,
      alt: "Primal 2.0 inventory navigation menu",
      caption: "Easier navigation into inventory",
      label: "Primal 2.0",
      status: "in-progress",
    },
    {
      id: "live-schools",
      src: `${ASSET}/live-driving-schools.png`,
      alt: "Current live driving schools page",
      caption: "Driving schools as customers see them today",
      label: "Today",
      status: "built",
    },
    {
      id: "rebuild-schools",
      src: `${ASSET}/rebuild-driving-schools.png`,
      alt: "Primal 2.0 driving schools page",
      caption: "A clearer path into schools on the new site",
      label: "Primal 2.0",
      status: "in-progress",
    },
    {
      id: "rebuild-service",
      src: `${ASSET}/rebuild-service.png`,
      alt: "Primal 2.0 service page",
      caption: "Service presented with a calmer path for customers",
      label: "Primal 2.0",
      status: "in-progress",
    },
    {
      id: "live-car",
      src: `${ASSET}/live-car-details.png`,
      alt: "Current live vehicle detail page for a Radical car",
      caption: "Vehicle detail on the live site today",
      label: "Today",
      status: "built",
    },
  ],
  demand: {
    highlight: {
      title: "Tracked conversions",
      value: "29",
      note: "Since KXD began managing Google Ads — through July 20, 2026",
    },
    supportingMetrics: [
      { id: "clicks", label: "Clicks", value: "2,547", note: "Visits from Google Ads" },
      { id: "impr", label: "Impressions", value: "71,357", note: "Reach into racing schools" },
      { id: "ctr", label: "Search CTR", value: "5.77%", note: "Strong response on Search ads" },
      { id: "spend", label: "Spend", value: "$10,662", note: "Managed carefully" },
    ],
    search: {
      id: "search",
      title: "Search",
      lead:
        "More people are finding primalmotorsports.com. Average position improved from March through mid-July 2026.",
      provenance: "prepared",
      provenanceLabel: "From Google Search Console",
      metrics: [
        { id: "jun-clicks", label: "June 2026 clicks", value: "390", note: "Primary domain" },
        { id: "jul-clicks", label: "July 1–20 clicks", value: "250", note: "Partial month" },
        { id: "jul-position", label: "July avg. position", value: "8.8", note: "Down from 23.5 in March" },
        { id: "jun-impr", label: "June impressions", value: "7,076" },
      ],
      themes: [
        "primal racing school",
        "primal motorsports",
        "primal racing",
        "radical sr1 for sale",
        "radical sr3 for sale",
        "racing school near me",
      ],
      chart: {
        id: "search-trend",
        title: "Supporting detail — clicks and average position",
        summary:
          "Clicks rose from 226 in March to 390 in June. Average position improved from 23.5 to 9.5. Through July 20: 250 clicks at position 8.8.",
        periodLabel: "Mar–Jul 20, 2026 · primalmotorsports.com",
        primaryLabel: "Clicks",
        secondaryLabel: "Avg. position",
        points: [
          { label: "Mar", value: 226, secondary: 23.5 },
          { label: "Apr", value: 269, secondary: 12.6 },
          { label: "May", value: 302, secondary: 12.2 },
          { label: "Jun", value: 390, secondary: 9.5 },
          { label: "Jul*", value: 250, secondary: 8.8 },
        ],
      },
    },
    advertising: {
      id: "ads",
      title: "Advertising detail",
      lead:
        "Google Ads is running for racing schools — managed carefully, not spent as hard as possible.",
      provenance: "prepared",
      provenanceLabel: "From Google Ads",
      metrics: [
        { id: "conv", label: "Tracked conversions", value: "29", note: "Tracked actions in this period" },
        { id: "clicks", label: "Clicks", value: "2,547", note: "Visits from people looking for schools" },
        { id: "impr", label: "Impressions", value: "71,357", note: "Reach into the racing-school market" },
        { id: "spend", label: "Spend", value: "$10,662", note: "Managed with care" },
        { id: "ctr", label: "Blended CTR", value: "3.57%" },
        { id: "search-ctr", label: "Search CTR", value: "5.77%", note: "Strong response on Search ads" },
        { id: "is", label: "Search impression share", value: "37.43%", note: "Room to grow carefully" },
      ],
      themes: [
        "racing school",
        "racing school atlanta",
        "performance driving school",
        "scca racing school",
        "road atlanta",
      ],
      chart: {
        id: "ads-monthly",
        title: "Supporting detail — monthly clicks and conversions",
        summary:
          "Clicks rose from 498 in April to 954 in June, with 12 tracked conversions in June. Through July 20: 627 clicks and 1 conversion — still a partial month.",
        periodLabel: "Apr–Jul 20, 2026 · named campaigns",
        primaryLabel: "Clicks",
        secondaryLabel: "Conversions",
        points: [
          { label: "Apr", value: 498, secondary: 9 },
          { label: "May", value: 469, secondary: 7 },
          { label: "Jun", value: 954, secondary: 12 },
          { label: "Jul*", value: 627, secondary: 1 },
        ],
      },
      note:
        "Two campaigns: Search captures people ready to inquire about racing school. Demand Gen builds awareness and remarkets. Tracked conversions are actions we can measure — not a claim of customers won.",
    },
    domainStory: {
      title: "Moving to one brand domain",
      body:
        "Search traffic is shifting onto primalmotorsports.com. The change on the older domain after early 2026 is that transition — a natural step as the business consolidated under the Primal Motorsports brand.",
      primary: {
        domain: "primalmotorsports.com",
        note: "Primary brand domain — clicks up and position improving through mid-2026.",
      },
      legacy: {
        domain: "primalracing.com",
        note: "Earlier brand domain — strong historically; traffic moved toward the primary Primal Motorsports domain.",
      },
    },
    analyticsEmpty:
      "Website analytics will appear here once GA4 access is verified. We won't show numbers until the connection is real.",
  },
  capabilities: [
    {
      id: "overview",
      title: "Overview",
      outcome: "A calm daily view of where things stand and what needs attention next.",
      href: "/portal",
      hrefLabel: "Open Overview",
      status: "built",
      media: {
        id: "cap-overview",
        src: `${ASSET}/workspace-overview.png`,
        alt: "Overview inside the Primal partnership workspace",
        caption: "Where things stand day to day",
      },
    },
    {
      id: "partnership",
      title: "Partnership",
      outcome: "The longer story of what we've built together and what's ahead.",
      href: "/portal/partnership",
      hrefLabel: "Open Partnership",
      status: "built",
      media: {
        id: "cap-partnership",
        src: `${ASSET}/workspace-partnership-growth.png`,
        alt: "Partnership briefing in the Primal workspace",
        caption: "The partnership story in one place",
      },
    },
    {
      id: "website-review",
      title: "Website Review",
      outcome:
        "Review the website and leave comments exactly where you want updates. Every request stays organized so nothing gets lost.",
      href: "/portal/website-review",
      hrefLabel: "Open Website Review",
      status: "built",
      media: {
        id: "cap-wr",
        src: `${ASSET}/workspace-website-review.png`,
        alt: "Website Review interface — leave comments on pages for KXD to update",
        caption: "Send change requests to KXD, page by page",
      },
    },
    {
      id: "website-workspace",
      title: "Website Workspace",
      outcome:
        "Update the website content you control through the front-end editor. For larger design or development requests, use Website Review.",
      href: "/portal/website-workspace",
      hrefLabel: "Open Website Workspace",
      status: "built",
      media: {
        id: "cap-ww",
        src: `${ASSET}/workspace-website-cms.png`,
        alt: "Website Workspace — edit approved front-end content yourself",
        caption: "Edit content you control — without waiting on KXD",
      },
    },
    {
      id: "inventory",
      title: "Inventory",
      outcome: "Add, update, and publish Radical listings yourself — without waiting on a developer.",
      href: "/portal/inventory",
      hrefLabel: "Open Inventory",
      status: "built",
      media: {
        id: "cap-inv",
        src: `${ASSET}/workspace-inventory-cms.png`,
        alt: "Inventory tools for publishing Radical vehicle listings",
        caption: "Publish vehicles on your own schedule",
      },
    },
  ],
  engines: [
    {
      id: "schools",
      title: "Driving schools",
      body: "Clearer paths for people looking for racing school — supported by search and ads.",
    },
    {
      id: "race",
      title: "Race programs",
      body: "Clearer presentation of Radical Cup and race participation on the new site.",
    },
    {
      id: "inventory",
      title: "Radical inventory",
      body: "Easier vehicle discovery and inquiry — live today, cleaner on the new site.",
    },
  ],
  ongoingWork: {
    title: "Currently working on",
    body: "This partnership stays active every month. Here's what KXD continues to handle alongside the launch work.",
    status: "in-progress",
    items: [
      { id: "website", label: "Website improvements and launch readiness" },
      { id: "ads", label: "Google Ads management" },
      { id: "search", label: "Search visibility" },
      { id: "reporting", label: "Executive reporting" },
      { id: "support", label: "Client support" },
      { id: "workspace", label: "Workspace enhancements" },
    ],
  },
  roadmapLanes: [
    {
      id: "now",
      title: "Now",
      items: [
        {
          id: "revisions",
          title: "Finish website revisions",
          body: "Adam and the team wrap final notes so we can launch without rework.",
          status: "in-progress",
        },
        {
          id: "launch",
          title: "Launch the new website",
          body: "Move Primal 2.0 from staging to live once revisions are complete.",
          status: "in-progress",
        },
        {
          id: "ads-care",
          title: "Keep Ads careful",
          body: "Keep spending thoughtful while we continue bringing in school interest.",
          status: "in-progress",
        },
      ],
    },
    {
      id: "next",
      title: "Next",
      items: [
        {
          id: "live-search",
          title: "Live search numbers in this workspace",
          body: "Show Search Console results here automatically when the period has data.",
          status: "in-progress",
        },
        {
          id: "ga4",
          title: "Website analytics",
          body: "Site traffic numbers appear here once GA4 access is verified.",
          status: "in-progress",
        },
        {
          id: "reporting",
          title: "Clearer recurring reports",
          body: "A clearer recurring view of what's moving — prepared for you, not buried in tools.",
          status: "in-progress",
        },
      ],
    },
    {
      id: "later",
      title: "Later",
      items: [
        {
          id: "leads",
          title: "Lead management",
          body: "A clearer path from inquiry to conversation so good interest doesn't sit waiting.",
          status: "future",
        },
        {
          id: "journey",
          title: "Customer journey",
          body: "One continuous picture from first interest through a longer relationship.",
          status: "future",
        },
        {
          id: "expansion",
          title: "Expansion",
          body: "Room to grow into new programs when you have the capacity — never rushed.",
          status: "future",
        },
        {
          id: "primal-os",
          title: "Primal OS",
          body: "A future conversation when Primal is ready — not part of what we've built today.",
          status: "future",
        },
      ],
    },
  ],
  vision: {
    rings: [
      {
        id: "customer",
        label: "Your website",
        status: "built",
        body: "What customers use for schools, race programs, inventory, and service.",
      },
      {
        id: "partnership",
        label: "This workspace",
        status: "built",
        body: "Where you and KXD refine the site, publish inventory, and stay aligned.",
      },
      {
        id: "operations",
        label: "Operations",
        status: "future",
        body: "Future systems — including driver experiences — when Primal chooses to expand.",
      },
    ],
    futureMedia: {
      id: "driver-portal",
      src: `${ASSET}/rebuild-driver-portal.png`,
      alt: "Example of a future driver portal — not included in current delivery",
      caption: "An example of where things could go — not included in what we've delivered today",
      label: "Future",
      status: "future",
    },
    close:
      "We've built a strong foundation together. The website and workspace are now in place. As Primal continues to grow, this workspace can continue growing with it.",
  },
};
