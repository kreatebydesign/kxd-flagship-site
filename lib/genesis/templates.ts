import type { GenesisTemplateId } from "./types";

export interface GenesisWorkTemplateItem {
  title: string;
  category: string;
  priority: string;
  description?: string;
}

export interface GenesisIndustryTemplate {
  id: GenesisTemplateId;
  name: string;
  description: string;
  editionHint?: string;
  discoveryHints: Partial<Record<string, string>>;
  suggestedPages: string[];
  suggestedFeatures: string[];
  playbookSlugs: string[];
  workTemplates: GenesisWorkTemplateItem[];
  deliverables: string[];
  productionDrafts: string[];
  seoRecommendations: string[];
  launchChecklist: string[];
}

export const GENESIS_INDUSTRY_TEMPLATES: Record<GenesisTemplateId, GenesisIndustryTemplate> = {
  "standard-business": {
    id: "standard-business",
    name: "Standard Business",
    description: "General professional services and growth-stage businesses.",
    discoveryHints: {
      industry: "Professional services, B2B, or local business",
      businessGoals: "Lead generation, credibility, and operational clarity",
    },
    suggestedPages: ["Home", "About", "Services", "Contact", "Blog", "Case Studies", "FAQ"],
    suggestedFeatures: ["Contact forms", "Client portal", "Analytics", "CRM integration"],
    playbookSlugs: ["client-onboarding", "brand-discovery", "website-launch", "monthly-reporting"],
    workTemplates: [
      { title: "Kickoff discovery synthesis", category: "general", priority: "high" },
      { title: "Website sitemap approval", category: "website", priority: "high" },
      { title: "Brand direction workshop", category: "branding", priority: "medium" },
      { title: "SEO baseline audit", category: "seo", priority: "medium" },
    ],
    deliverables: ["Website blueprint", "Brand strategy brief", "SEO launch plan", "Success plan"],
    productionDrafts: ["Homepage hero copy", "Services overview", "About narrative", "Contact CTA"],
    seoRecommendations: ["Local service pages", "Google Business Profile", "Schema for organization"],
    launchChecklist: ["DNS cutover", "Analytics verified", "Forms tested", "Portal invite sent"],
  },
  contractor: {
    id: "contractor",
    name: "Contractor",
    description: "Field services, trades, and job-based contractors.",
    editionHint: "contractor-os",
    discoveryHints: {
      industry: "Construction, trades, or field services",
      primaryServices: "List core job types and service areas",
    },
    suggestedPages: ["Home", "Services", "Service Areas", "Gallery", "Reviews", "Contact", "Financing"],
    suggestedFeatures: ["Lead forms", "Service area maps", "Review integration", "Scheduling"],
    playbookSlugs: ["contractor-launch", "client-onboarding", "seo-launch"],
    workTemplates: [
      { title: "Service area page plan", category: "website", priority: "high" },
      { title: "Before/after gallery structure", category: "content", priority: "medium" },
      { title: "Lead routing setup", category: "automation", priority: "high" },
    ],
    deliverables: ["Service page templates", "Lead capture flows", "Local SEO package"],
    productionDrafts: ["Service descriptions", "Trust badges copy", "Financing CTA"],
    seoRecommendations: ["City + service pages", "LocalBusiness schema", "Review syndication"],
    launchChecklist: ["Click-to-call tested", "Service forms routed", "GBP updated"],
  },
  motorsports: {
    id: "motorsports",
    name: "Motorsports",
    description: "Racing teams, performance shops, and event operations.",
    editionHint: "motorsports-os",
    discoveryHints: {
      industry: "Motorsports, racing, or performance automotive",
      primaryProducts: "Parts, builds, events, sponsorship packages",
    },
    suggestedPages: ["Home", "Team", "Events", "Sponsors", "Shop", "Gallery", "Contact"],
    suggestedFeatures: ["Event calendar", "Sponsor showcases", "E-commerce or catalog", "Media gallery"],
    playbookSlugs: ["motorsports-client-launch", "client-onboarding", "campaign-launch"],
    workTemplates: [
      { title: "Sponsor package pages", category: "website", priority: "high" },
      { title: "Event calendar integration", category: "website", priority: "medium" },
      { title: "Media reel planning", category: "content", priority: "high" },
    ],
    deliverables: ["Sponsor deck web pages", "Event hub", "Brand film brief"],
    productionDrafts: ["Team bio copy", "Sponsor tier descriptions", "Event recap template"],
    seoRecommendations: ["Event landing pages", "Team/driver keywords", "Video schema"],
    launchChecklist: ["Sponsor logos approved", "Event dates published", "Shop links verified"],
  },
  restaurant: {
    id: "restaurant",
    name: "Restaurant",
    description: "Restaurants, cafes, and food-forward hospitality venues.",
    editionHint: "restaurant-os",
    discoveryHints: {
      industry: "Restaurant or food service",
      primaryProducts: "Menu categories, dining experiences, private events",
    },
    suggestedPages: ["Home", "Menu", "Reservations", "Private Events", "About", "Gallery", "Contact"],
    suggestedFeatures: ["Menu display", "Reservations", "Online ordering link", "Location hours"],
    playbookSlugs: ["hospitality-launch", "client-onboarding", "seo-launch"],
    workTemplates: [
      { title: "Menu web structure", category: "website", priority: "high" },
      { title: "Reservation flow wiring", category: "automation", priority: "high" },
      { title: "Food photography shot list", category: "content", priority: "medium" },
    ],
    deliverables: ["Menu web experience", "Reservation integration", "Local SEO foundation"],
    productionDrafts: ["Chef story", "Private dining copy", "Hours & location block"],
    seoRecommendations: ["Menu schema", "Local pack optimization", "Review response plan"],
    launchChecklist: ["Menu PDF/web synced", "Reservation link tested", "Hours accurate"],
  },
  hospitality: {
    id: "hospitality",
    name: "Hospitality",
    description: "Hotels, resorts, venues, and guest experience brands.",
    editionHint: "hospitality-os",
    discoveryHints: {
      industry: "Hospitality, hotel, or venue",
      primaryServices: "Rooms, events, amenities, concierge services",
    },
    suggestedPages: ["Home", "Rooms", "Amenities", "Events", "Dining", "Gallery", "Book", "Contact"],
    suggestedFeatures: ["Booking engine", "Virtual tours", "Event inquiry forms", "Multilingual"],
    playbookSlugs: ["hospitality-launch", "client-onboarding", "monthly-reporting"],
    workTemplates: [
      { title: "Room type page architecture", category: "website", priority: "high" },
      { title: "Booking engine integration", category: "infrastructure", priority: "critical" },
      { title: "Guest journey mapping", category: "general", priority: "medium" },
    ],
    deliverables: ["Property web experience", "Booking integration plan", "Guest email flows"],
    productionDrafts: ["Property story", "Amenity descriptions", "Event venue packages"],
    seoRecommendations: ["Property schema", "Destination content", "Seasonal landing pages"],
    launchChecklist: ["Booking widget tested", "Rate parity verified", "Gallery optimized"],
  },
  "political-campaign": {
    id: "political-campaign",
    name: "Political Campaign",
    description: "Campaign operations, fundraising, and field strategy.",
    editionHint: "political-campaign-os",
    discoveryHints: {
      industry: "Political campaign or advocacy",
      businessGoals: "Fundraising, volunteer mobilization, voter outreach",
    },
    suggestedPages: ["Home", "About", "Platform", "Events", "Donate", "Volunteer", "News", "Contact"],
    suggestedFeatures: ["Donation forms", "Volunteer signup", "Event RSVP", "Email capture"],
    playbookSlugs: ["client-onboarding", "campaign-launch", "monthly-reporting"],
    workTemplates: [
      { title: "Donation funnel pages", category: "website", priority: "critical" },
      { title: "Volunteer onboarding flow", category: "automation", priority: "high" },
      { title: "Event RSVP automation", category: "automation", priority: "medium" },
    ],
    deliverables: ["Campaign site blueprint", "Fundraising flows", "Field comms plan"],
    productionDrafts: ["Candidate bio", "Platform pillars", "Donate CTA variants"],
    seoRecommendations: ["Issue landing pages", "Local event pages", "Newsroom structure"],
    launchChecklist: ["Donation processor tested", "Compliance disclaimers", "Volunteer forms routed"],
  },
  "professional-services": {
    id: "professional-services",
    name: "Professional Services",
    description: "Consulting, legal, financial, and advisory firms.",
    discoveryHints: {
      industry: "Professional services or advisory",
      primaryServices: "Core practice areas and client segments",
    },
    suggestedPages: ["Home", "Services", "Industries", "Team", "Insights", "Contact"],
    suggestedFeatures: ["Lead qualification forms", "Client portal", "Resource library", "Scheduling"],
    playbookSlugs: ["client-onboarding", "executive-strategy-session", "quarterly-business-review"],
    workTemplates: [
      { title: "Practice area page plan", category: "website", priority: "high" },
      { title: "Thought leadership hub", category: "content", priority: "medium" },
      { title: "Client intake workflow", category: "crm", priority: "high" },
    ],
    deliverables: ["Authority content plan", "Intake automation", "Executive reporting cadence"],
    productionDrafts: ["Firm positioning", "Practice area summaries", "Team bios"],
    seoRecommendations: ["Expertise clusters", "FAQ schema", "Insight publishing cadence"],
    launchChecklist: ["Intake forms secured", "Team headshots live", "Insights feed scheduled"],
  },
  "creative-agency": {
    id: "creative-agency",
    name: "Creative Agency",
    description: "Agencies and studios with creative-first delivery.",
    editionHint: "creative-studio-os",
    discoveryHints: {
      industry: "Creative agency or design studio",
      primaryServices: "Brand, web, campaign, and studio production",
    },
    suggestedPages: ["Home", "Work", "Services", "Studio", "Process", "Contact"],
    suggestedFeatures: ["Case study system", "Creative reel", "Client portal", "Project requests"],
    playbookSlugs: ["brand-discovery", "client-onboarding", "campaign-launch", "monthly-reporting"],
    workTemplates: [
      { title: "Case study template system", category: "content", priority: "high" },
      { title: "Brand discovery workshop", category: "branding", priority: "high" },
      { title: "Creative campaign brief", category: "marketing", priority: "medium" },
    ],
    deliverables: ["Portfolio system", "Brand playbook", "Campaign launch kit"],
    productionDrafts: ["Studio manifesto", "Process narrative", "Case study outlines"],
    seoRecommendations: ["Portfolio SEO", "Creative industry keywords", "Structured work pages"],
    launchChecklist: ["Portfolio cases published", "Reel embedded", "Portal provisioned"],
  },
};

export function getGenesisTemplate(id: GenesisTemplateId) {
  return GENESIS_INDUSTRY_TEMPLATES[id] ?? GENESIS_INDUSTRY_TEMPLATES["standard-business"];
}

export function listGenesisTemplates() {
  return Object.values(GENESIS_INDUSTRY_TEMPLATES);
}
