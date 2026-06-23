/**
 * lib/client-onboarding.ts
 * KXD OS Phase 4A — Client Onboarding utilities
 *
 * Readiness scoring, completion %, and missing-requirements engine
 * for ClientOnboarding records.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OnboardingRecord = Record<string, any>;

export type OnboardingSection =
  | "businessInfo"
  | "businessDetails"
  | "websiteInfo"
  | "socialAccounts"
  | "projectGoals"
  | "brandAssets"
  | "accessRequests";

export type ReadinessLabel = "Ready" | "Needs Information" | "Missing Critical Items";

export type ReadinessResult = {
  score: number;
  label: ReadinessLabel;
  color: "green" | "yellow" | "red";
  completionPercent: number;
  sectionScores: Record<OnboardingSection, number>;
  completeSections: OnboardingSection[];
  incompleteSections: OnboardingSection[];
};

export type MissingRequirements = {
  missingBusinessInfo: string[];
  missingAssets: string[];
  missingAccess: string[];
  all: string[];
};

const SECTION_LABELS: Record<OnboardingSection, string> = {
  businessInfo:     "Business Information",
  businessDetails:  "Business Details",
  websiteInfo:      "Website Information",
  socialAccounts:   "Social Accounts",
  projectGoals:     "Project Goals",
  brandAssets:        "Brand Assets",
  accessRequests:   "Access Requests",
};

const ACCESS_FIELDS: Array<{ key: string; label: string }> = [
  { key: "websiteAccess",      label: "Website Access" },
  { key: "domainAccess",       label: "Domain Access" },
  { key: "hostingAccess",      label: "Hosting Credentials" },
  { key: "socialMediaAccess",  label: "Social Media Access" },
  { key: "analyticsAccess",    label: "Analytics Access" },
  { key: "emailAccess",        label: "Email Access" },
];

const ASSET_FIELDS: Array<{ key: string; label: string; critical?: boolean }> = [
  { key: "logoFiles",           label: "Logo Files",           critical: true },
  { key: "brandGuidelines",     label: "Brand Guidelines" },
  { key: "marketingMaterials",  label: "Marketing Materials" },
  { key: "photos",              label: "Photos" },
  { key: "videos",              label: "Videos" },
];

function isPopulated(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return true;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return true;
  return false;
}

function sectionScore(fields: unknown[]): number {
  if (fields.length === 0) return 0;
  const filled = fields.filter(isPopulated).length;
  return Math.round((filled / fields.length) * 100);
}

function sectionFields(record: OnboardingRecord): Record<OnboardingSection, unknown[]> {
  return {
    businessInfo: [
      record.businessName,
      record.dba,
      record.primaryContact,
      record.email,
      record.phone,
      record.address,
      record.city,
      record.state,
      record.zip,
    ],
    businessDetails: [
      record.industry,
      record.yearsInBusiness,
      record.serviceAreas,
      record.shortBusinessDescription,
    ],
    websiteInfo: [
      record.currentWebsite,
      record.hostingProvider,
      record.domainRegistrar,
      record.analyticsConnected,
    ],
    socialAccounts: [
      record.facebook,
      record.instagram,
      record.linkedin,
      record.youtube,
      record.tiktok,
    ],
    projectGoals: [
      record.primaryGoal,
      record.successDefinition,
      record.biggestPainPoint,
      record.topCompetitors,
    ],
    brandAssets: [
      record.logoFiles,
      record.brandGuidelines,
      record.marketingMaterials,
      record.photos,
      record.videos,
    ],
    accessRequests: [
      record.websiteAccess,
      record.domainAccess,
      record.hostingAccess,
      record.socialMediaAccess,
      record.analyticsAccess,
      record.emailAccess,
    ],
  };
}

/** Social section counts as complete when at least one profile URL is provided. */
function adjustedSectionScore(section: OnboardingSection, fields: unknown[]): number {
  if (section === "socialAccounts") {
    return fields.some(isPopulated) ? 100 : 0;
  }
  if (section === "accessRequests") {
    return fields.some(isPopulated) ? 100 : 0;
  }
  return sectionScore(fields);
}

export function calculateOnboardingReadiness(record: OnboardingRecord): ReadinessResult {
  const fieldsBySection = sectionFields(record);
  const sectionScores = {} as Record<OnboardingSection, number>;
  const completeSections: OnboardingSection[] = [];
  const incompleteSections: OnboardingSection[] = [];

  for (const section of Object.keys(fieldsBySection) as OnboardingSection[]) {
    const score = adjustedSectionScore(section, fieldsBySection[section]);
    sectionScores[section] = score;
    if (score >= 80) completeSections.push(section);
    else incompleteSections.push(section);
  }

  const sections = Object.keys(sectionScores) as OnboardingSection[];
  const score = Math.round(
    sections.reduce((sum, s) => sum + sectionScores[s], 0) / sections.length,
  );

  const completionPercent = score;

  const criticalMissing =
    !isPopulated(record.businessName) ||
    !isPopulated(record.email) ||
    !isPopulated(record.primaryContact) ||
    !isPopulated(record.logoFiles);

  let label: ReadinessLabel;
  let color: "green" | "yellow" | "red";

  if (criticalMissing || score < 50) {
    label = "Missing Critical Items";
    color = "red";
  } else if (score >= 85) {
    label = "Ready";
    color = "green";
  } else {
    label = "Needs Information";
    color = "yellow";
  }

  return {
    score,
    label,
    color,
    completionPercent,
    sectionScores,
    completeSections,
    incompleteSections,
  };
}

export function getMissingClientRequirements(record: OnboardingRecord): MissingRequirements {
  const missingBusinessInfo: string[] = [];

  if (!isPopulated(record.businessName)) missingBusinessInfo.push("Business Name");
  if (!isPopulated(record.primaryContact)) missingBusinessInfo.push("Primary Contact");
  if (!isPopulated(record.email)) missingBusinessInfo.push("Email");
  if (!isPopulated(record.phone)) missingBusinessInfo.push("Phone");
  if (!isPopulated(record.address)) missingBusinessInfo.push("Address");
  if (!isPopulated(record.city)) missingBusinessInfo.push("City");
  if (!isPopulated(record.state)) missingBusinessInfo.push("State");
  if (!isPopulated(record.zip)) missingBusinessInfo.push("ZIP");
  if (!isPopulated(record.industry)) missingBusinessInfo.push("Industry");
  if (!isPopulated(record.shortBusinessDescription)) missingBusinessInfo.push("Business Description");

  const missingAssets: string[] = [];
  for (const asset of ASSET_FIELDS) {
    if (!isPopulated(record[asset.key])) {
      missingAssets.push(asset.label);
    }
  }

  const missingAccess: string[] = [];
  for (const access of ACCESS_FIELDS) {
    if (!record[access.key]) {
      missingAccess.push(access.label);
    }
  }

  const all = [...missingBusinessInfo, ...missingAssets, ...missingAccess];

  return { missingBusinessInfo, missingAssets, missingAccess, all };
}

export function formatMissingSections(record: OnboardingRecord): string {
  const readiness = calculateOnboardingReadiness(record);
  if (readiness.incompleteSections.length === 0) return "All sections complete";
  return readiness.incompleteSections
    .map((s) => SECTION_LABELS[s])
    .join(", ");
}

export function onboardingStatusLabel(status: string | null | undefined): string {
  const map: Record<string, string> = {
    draft:       "Draft",
    sent:        "Sent",
    "in-progress": "In Progress",
    submitted:   "Submitted",
    approved:    "Approved",
  };
  return map[status ?? ""] ?? status ?? "—";
}

export type ChecklistItem = {
  label: string;
  done: boolean;
  critical?: boolean;
};

export type OnboardingChecklists = {
  assets: ChecklistItem[];
  domainDns: ChecklistItem[];
  brand: ChecklistItem[];
  content: ChecklistItem[];
};

export type OnboardingWorkflowStatus =
  | "draft"
  | "waiting-on-client"
  | "waiting-on-kxd"
  | "ready-for-build"
  | "approved";

export function getOnboardingChecklists(record: OnboardingRecord): OnboardingChecklists {
  const assets: ChecklistItem[] = [
    { label: "Logo Files", done: isPopulated(record.logoFiles), critical: true },
    { label: "Brand Guidelines", done: isPopulated(record.brandGuidelines) },
    { label: "Marketing Materials", done: isPopulated(record.marketingMaterials) },
    { label: "Photos", done: isPopulated(record.photos) },
    { label: "Videos", done: isPopulated(record.videos) },
  ];

  const domainDns: ChecklistItem[] = [
    { label: "Current Website URL", done: isPopulated(record.currentWebsite) },
    { label: "Domain Registrar", done: isPopulated(record.domainRegistrar), critical: true },
    { label: "Domain Access", done: record.domainAccess === true },
    { label: "Hosting Provider", done: isPopulated(record.hostingProvider) },
    { label: "Hosting Access", done: record.hostingAccess === true },
    { label: "Analytics Connected", done: record.analyticsConnected === true },
  ];

  const brand: ChecklistItem[] = [
    { label: "Logo Files", done: isPopulated(record.logoFiles), critical: true },
    { label: "Brand Guidelines", done: isPopulated(record.brandGuidelines) },
    { label: "Brand Colors / Fonts Documented", done: isPopulated(record.brandGuidelines) || isPopulated(record.marketingMaterials) },
  ];

  const content: ChecklistItem[] = [
    { label: "Business Description", done: isPopulated(record.shortBusinessDescription), critical: true },
    { label: "Primary Goal", done: isPopulated(record.primaryGoal) },
    { label: "Success Definition", done: isPopulated(record.successDefinition) },
    { label: "Pain Point Identified", done: isPopulated(record.biggestPainPoint) },
    { label: "Competitor Context", done: isPopulated(record.topCompetitors) },
  ];

  return { assets, domainDns, brand, content };
}

export function getOnboardingWorkflowStatus(record: OnboardingRecord): OnboardingWorkflowStatus {
  const status = String(record.status ?? "draft");
  const readiness = calculateOnboardingReadiness(record);
  const missing = getMissingClientRequirements(record);

  if (status === "approved") return "approved";
  if (readiness.label === "Ready" && (status === "submitted" || status === "in-progress")) {
    return "ready-for-build";
  }
  if (status === "submitted") return "waiting-on-kxd";
  if (missing.all.length > 0 && ["sent", "in-progress", "submitted"].includes(status)) {
    return "waiting-on-client";
  }
  return "draft";
}

export function onboardingWorkflowLabel(status: OnboardingWorkflowStatus): string {
  const map: Record<OnboardingWorkflowStatus, string> = {
    draft: "Draft",
    "waiting-on-client": "Waiting on Client",
    "waiting-on-kxd": "Waiting on KXD",
    "ready-for-build": "Ready for Build",
    approved: "Approved",
  };
  return map[status];
}
