/**
 * Frozen client-facing facts — sourced from finalized local accountability package.
 * Do not recalculate totals here.
 */

export type DonYourSpaceBusinessSlug =
  | "cusick-morgan-motorsports"
  | "otp"
  | "otp-carts"
  | "2475-townsgate";

export type DonYourSpaceBusinessFacts = {
  slug: DonYourSpaceBusinessSlug;
  name: string;
  primaryContact: string;
  clientId: number;
  paymentsUsd: number;
  hosting: string;
  workSummary: string[];
  resultsSummary: string[];
  paymentsNote: string;
  accessSummary: string[];
  limitations: string[];
};

export const DON_YOUR_SPACE_WELCOME = {
  greeting: "Welcome, Don.",
  lead: "Your businesses, your records, and a clear view of the work we've completed together.",
} as const;

export const DON_PORTFOLIO_FINANCIALS = {
  grandTotalUsd: 32_174,
  paymentRecordCount: 45,
  projectAndPassThroughUsd: 18_574,
  retainerUsd: 13_600,
  periodLabel: "August 2025 through November 15, 2026",
  disclaimer:
    "These figures are historical reconciled payments from your records with Kreate by Design. They are not current account balances or revenue generated.",
} as const;

export const DON_YOUR_SPACE_BUSINESSES: DonYourSpaceBusinessFacts[] = [
  {
    slug: "cusick-morgan-motorsports",
    name: "Cusick Morgan Motorsports",
    primaryContact: "Billy Morgan",
    clientId: 5,
    paymentsUsd: 19_674,
    hosting:
      "Live site on KXD-managed Vercel (cusickmotorsports.com). Domain and DNS are maintained separately from Wix account roles.",
    workSummary: [
      "Site rebuild and launch on KXD hosting with driver, season, and partnership pages.",
      "Ongoing retainer for search hygiene, news durability, and sponsor-facing content.",
    ],
    resultsSummary: [
      "Google Search and Analytics for August and September 2026 appear in the accountability report with verified sync dates.",
      "Partnership inquiry paths are live on the production site.",
    ],
    paymentsNote:
      "Your allocated share of the reconciled portfolio appears in the report ledger and payment summary.",
    accessSummary: [
      "Billy Morgan holds the active Wix Owner role for this brand on Wix.",
      "Kreate by Design holds active Admin (Co-Owner) on that Wix site.",
      "Production hosting and deployments are managed by KXD on Vercel; client Vercel administrator access for Don is not confirmed in this package.",
    ],
    limitations: [
      "Legal domain registrant is reported from account screens, not independently verified here.",
    ],
  },
  {
    slug: "otp",
    name: "On Track Performance",
    primaryContact: "Don Cusick",
    clientId: 9,
    paymentsUsd: 3_600,
    hosting:
      "Public website remains on Wix. A complete KXD rebuild is staged and is not on the public URL until you approve cutover.",
    workSummary: [
      "Wix production care and SEO under retainer since August 2025.",
      "Full motorsport rebuild prepared on KXD infrastructure for your launch decision.",
    ],
    resultsSummary: [
      "August and September 2026 Google figures for the live Wix hostname are in the report where synced.",
      "Wix form paths are not fully audited in this package.",
    ],
    paymentsNote: "Retainer and project lines attributable to OTP are in the portfolio ledger.",
    accessSummary: [
      "Billy Morgan holds the active Wix Owner role.",
      "Kreate by Design holds active Admin (Co-Owner) on Wix.",
      "Wix hosting renewal reported for November 25, 2026.",
    ],
    limitations: [
      "Staged KXD site does not receive public traffic until cutover is approved.",
    ],
  },
  {
    slug: "otp-carts",
    name: "OTP Carts",
    primaryContact: "Don Cusick",
    clientId: 14,
    paymentsUsd: 3_600,
    hosting:
      "Live storefront on KXD-managed Vercel (www.otpcarts.com). Wix remains tied to domain and studio billing.",
    workSummary: [
      "Production launch July 2026 with inquiry and financing forms.",
      "Inventory, SEO, and local listing support documented in the accountability report.",
    ],
    resultsSummary: [
      "Four form submissions recorded (two verification tests, two potential buyers). These are not verified sales.",
      "August and September 2026 Google metrics are in the report where synced.",
    ],
    paymentsNote:
      "OTP and OTP Carts are sometimes billed together; your allocation is broken out in the ledger.",
    accessSummary: [
      "Billy Morgan holds the active Wix Owner role.",
      "Kreate by Design holds active Admin (Co-Owner) on Wix.",
      "Wix domain renewal reported for November 6, 2027.",
    ],
    limitations: [
      "Inbox delivery for customer submissions was not independently verified.",
      "No cart sales or commission totals are claimed without evidence.",
    ],
  },
  {
    slug: "2475-townsgate",
    name: "2475 Townsgate",
    primaryContact: "Don Cusick",
    clientId: 10,
    paymentsUsd: 5_300,
    hosting:
      "Live directory on KXD-managed Vercel (www.2475townsgate.com). Domain is maintained through Wix.",
    workSummary: [
      "Eight-tenant directory rebuild and ongoing lite retainer for accuracy and search hygiene.",
    ],
    resultsSummary: [
      "Google sync from September 2026 onward appears in the report where available.",
    ],
    paymentsNote: "Townsgate allocations match the reconciled portfolio total.",
    accessSummary: [
      "A prior Wix ownership transfer invitation to Billy Morgan was not accepted.",
      "Kreate by Design currently retains the Wix owner/admin role for this account.",
      "Wix domain renewal reported for September 22, 2028.",
      "KXD can reissue the ownership invitation upon your authorization.",
    ],
    limitations: [
      "Ownership transfer is not complete. No Townsgate Wix Roles screenshot is in the package unless you add one.",
    ],
  },
];

export function getDonYourSpaceBusinessBySlug(
  slug: string,
): DonYourSpaceBusinessFacts | undefined {
  return DON_YOUR_SPACE_BUSINESSES.find((b) => b.slug === slug);
}

export const DON_OWNERSHIP_GLOBAL_NOTES = [
  "Expired historical Wix invitations are not active ownership.",
  "Wix account roles are separate from KXD production hosting on Vercel.",
  "Custom website deliverables, client business assets, and KXD proprietary systems are described in the accountability report without replacing legal counsel.",
  "Nicole Mastro is noted in studio records for Westlake OTP Carts Google Business Profile steps. Named social pages are not listed here without an exported admin roster.",
] as const;