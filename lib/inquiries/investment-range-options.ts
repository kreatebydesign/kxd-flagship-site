/**
 * Public inquiry investment bands — labels align with published floors;
 * values stay stable for Payload CRM / sales scoring.
 */

export type InquiryBudgetValue =
  | "under-5k"
  | "5k-10k"
  | "10k-25k"
  | "25k-50k"
  | "50k-plus"
  | "50k-100k"
  | "100k-plus"
  | "25k-plus"
  | "not-determined";

export type InquiryBudgetContext = "website-primary" | "brand-primary" | "general";

export type InvestmentRangeOption = {
  value: InquiryBudgetValue;
  label: string;
};

const WEBSITE_RANGES: InvestmentRangeOption[] = [
  { value: "5k-10k", label: "$7,500 – $10,000" },
  { value: "10k-25k", label: "$10,000 – $25,000" },
  { value: "25k-50k", label: "$25,000 – $50,000" },
  { value: "50k-100k", label: "$50,000 – $100,000" },
  { value: "100k-plus", label: "$100,000+" },
  { value: "not-determined", label: "Not yet determined" },
];

const BRAND_RANGES: InvestmentRangeOption[] = [
  { value: "under-5k", label: "$4,500 – $5,000 (brand identity)" },
  { value: "5k-10k", label: "$5,000 – $10,000" },
  { value: "10k-25k", label: "$10,000 – $25,000" },
  { value: "25k-50k", label: "$25,000 – $50,000" },
  { value: "50k-plus", label: "$50,000+" },
];

const CONTACT_GENERAL_RANGES: InvestmentRangeOption[] = [
  { value: "under-5k", label: "$4,500 – $5,000 (brand identity)" },
  { value: "5k-10k", label: "$7,500 – $10,000 (website projects)" },
  { value: "10k-25k", label: "$10,000 – $25,000" },
  { value: "25k-50k", label: "$25,000 – $50,000" },
  { value: "50k-plus", label: "$50,000+" },
];

const START_PROJECT_GENERAL: InvestmentRangeOption[] = [
  { value: "5k-10k", label: "$7,500 – $10,000" },
  { value: "10k-25k", label: "$10,000 – $25,000" },
  { value: "25k-50k", label: "$25,000 – $50,000" },
  { value: "50k-100k", label: "$50,000 – $100,000" },
  { value: "100k-plus", label: "$100,000+" },
  { value: "not-determined", label: "Not yet determined" },
];

export function resolveContactBudgetContext(
  inquiryType: string,
): InquiryBudgetContext {
  if (inquiryType === "brand-systems-identity") return "brand-primary";
  if (
    inquiryType === "luxury-website-experiences" ||
    inquiryType === "growth-infrastructure" ||
    inquiryType === "enterprise-platforms"
  ) {
    return "website-primary";
  }
  return "general";
}

const WEBSITE_SERVICE_LABELS = new Set([
  "Premium Website Experience",
  "Growth Infrastructure",
  "Operating System / Client Portal",
  "CRM & Email Infrastructure",
  "Ongoing Strategic Partnership",
]);

export function resolveStartProjectBudgetContext(
  servicesInterested: string[],
): InquiryBudgetContext {
  if (servicesInterested.length === 0) return "general";
  const hasBrand = servicesInterested.includes("Brand Systems & Identity");
  const hasWebsiteScope = servicesInterested.some((s) =>
    WEBSITE_SERVICE_LABELS.has(s),
  );
  if (hasBrand && !hasWebsiteScope) return "brand-primary";
  if (hasWebsiteScope) return "website-primary";
  return "general";
}

export function getContactInvestmentRanges(
  context: InquiryBudgetContext,
): InvestmentRangeOption[] {
  if (context === "website-primary") {
    return WEBSITE_RANGES.filter((o) => o.value !== "not-determined");
  }
  if (context === "brand-primary") return BRAND_RANGES;
  return CONTACT_GENERAL_RANGES;
}

export function getStartProjectInvestmentRanges(
  context: InquiryBudgetContext,
): InvestmentRangeOption[] {
  if (context === "brand-primary") {
    return [
      { value: "under-5k", label: "$4,500 – $5,000 (brand identity)" },
      { value: "5k-10k", label: "$5,000 – $10,000" },
      { value: "10k-25k", label: "$10,000 – $25,000" },
      { value: "25k-50k", label: "$25,000 – $50,000" },
      { value: "50k-100k", label: "$50,000 – $100,000" },
      { value: "100k-plus", label: "$100,000+" },
      { value: "not-determined", label: "Not yet determined" },
    ];
  }
  if (context === "website-primary") return WEBSITE_RANGES;
  return START_PROJECT_GENERAL;
}

/** @deprecated Use getContactInvestmentRanges — kept for any legacy imports */
export const LEGACY_SITE_BUDGET_OPTIONS = CONTACT_GENERAL_RANGES;
