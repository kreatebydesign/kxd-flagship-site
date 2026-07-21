/**
 * Public commercial partnership packages for Kreate by Design.
 * Pricing and structure are approved — do not invent capabilities here.
 */

export type PartnershipPackageId =
  | "partnership"
  | "operating"
  | "executive";

export type PartnershipPackage = {
  id: PartnershipPackageId;
  name: string;
  /** Short outcome line under the name */
  outcome: string;
  idealFor: string;
  monthlyStarting: number;
  monthlyLabel: string;
  setupFee: number;
  setupLabel: string;
  credits: number;
  recommended?: boolean;
  popular?: boolean;
  includes: readonly string[];
  inquiryParam: PartnershipPackageId;
};

export type PartnershipAddOn = {
  id: string;
  name: string;
  summary: string;
  pricingNote: string;
};

export const PARTNERSHIP_PACKAGES: readonly PartnershipPackage[] = [
  {
    id: "partnership",
    name: "KXD Partnership",
    outcome:
      "Consistent website care, organized feedback, and dependable creative support.",
    idealFor: "Teams that need a serious review workflow without constant change volume.",
    monthlyStarting: 1250,
    monthlyLabel: "Starting at $1,250/month",
    setupFee: 1000,
    setupLabel: "$1,000 setup",
    credits: 4,
    includes: [
      "Premium KXD client portal",
      "Website Review and visual feedback",
      "Organized revision workflow",
      "Client notifications and activity visibility",
      "Routine website updates",
      "Ongoing KXD support",
      "Regular account check-in",
    ],
    inquiryParam: "partnership",
  },
  {
    id: "operating",
    name: "KXD Operating Partnership",
    outcome:
      "For active websites, recurring requests, and stronger operational support.",
    idealFor: "Active sites with recurring requests that need a clear production rhythm.",
    monthlyStarting: 2000,
    monthlyLabel: "Starting at $2,000/month",
    setupFee: 1750,
    setupLabel: "$1,750 setup",
    credits: 7,
    recommended: true,
    popular: true,
    includes: [
      "Everything in KXD Partnership",
      "Website Workspace",
      "Structured website change requests",
      "Greater monthly production capacity",
      "Performance and reporting readiness",
      "Stronger communication and workflow support",
      "Monthly operating review",
    ],
    inquiryParam: "operating",
  },
  {
    id: "executive",
    name: "KXD Executive Partnership",
    outcome:
      "Deeper creative leadership, performance visibility, and priority access.",
    idealFor:
      "Growing organizations that want the website and the story around it in one relationship.",
    monthlyStarting: 3500,
    monthlyLabel: "Starting at $3,500/month",
    setupFee: 3000,
    setupLabel: "$3,000+ setup",
    credits: 12,
    includes: [
      "Everything in KXD Operating Partnership",
      "Executive performance reporting",
      "Strategic reviews",
      "Priority handling",
      "Expanded operating support",
      "Higher monthly production capacity",
      "Specialized KXD capabilities when included in the agreement",
    ],
    inquiryParam: "executive",
  },
] as const;

export const PARTNERSHIP_ADD_ONS: readonly PartnershipAddOn[] = [
  {
    id: "inventory-showroom",
    name: "Inventory + Public Showroom",
    summary:
      "Manage listings inside the portal and publish them to a public showroom when ready.",
    pricingNote: "Available by proposal",
  },
  {
    id: "executive-reporting",
    name: "Executive Reporting",
    summary:
      "Performance reporting and interpretation when your data sources are connected.",
    pricingNote: "Priced according to scope",
  },
  {
    id: "priority-support",
    name: "Priority Support",
    summary: "Faster acknowledgment and reserved capacity inside your monthly credits.",
    pricingNote: "Available by proposal",
  },
  {
    id: "additional-brand",
    name: "Additional Brand or Location",
    summary: "Extended partnership coverage for another property or brand surface.",
    pricingNote: "Priced according to scope",
  },
  {
    id: "campaign-content",
    name: "Campaign and Content Support",
    summary: "Defined sprints for campaign pages and content production.",
    pricingNote: "Priced according to scope",
  },
  {
    id: "custom-integrations",
    name: "Custom Integrations",
    summary: "Connected systems scoped to the operational needs of the partnership.",
    pricingNote: "Available by proposal",
  },
] as const;

export const PARTNERSHIP_SCOPE_COPY = {
  creditsTitle: "How service credits work",
  creditsBody:
    "Service credits reserve monthly production capacity within each partnership. They cover routine website work — not open-ended labor. Larger requests receive an estimate before work begins. Credits reset each month and do not roll over.",
  boundariesTitle: "What sits outside the monthly partnership",
  boundariesBody:
    "Major projects and third-party costs are quoted separately. Accelerated or after-hours work may require separate priority pricing. Work begins once KXD has the required content, approvals, and access.",
  pricingNote:
    "All pricing is a starting point and is confirmed in the final agreement based on scope, complexity, and selected capabilities.",
} as const;

export const PARTNERSHIP_PAGE_COPY = {
  eyebrow: "Partnerships",
  headline: "Creative and operating partnership for websites that need ongoing care.",
  lead:
    "Kreate by Design is a premium creative and operating partner for teams that need more than a one-off project. You receive strategy, creative judgment, and reliable execution through an organized monthly relationship — with clear capacity, structured feedback, and a private client experience.",
  systemNote:
    "KXD OS supports the relationship. Clients partner with Kreate by Design — not software alone.",
} as const;

export function getPartnershipPackage(
  id: string | null | undefined,
): PartnershipPackage | null {
  if (!id) return null;
  return PARTNERSHIP_PACKAGES.find((pkg) => pkg.id === id) ?? null;
}

export function partnershipInquiryHref(id: PartnershipPackageId): string {
  return `/contact?partnership=${id}`;
}
