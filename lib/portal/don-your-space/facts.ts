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
    "These amounts are reconciled payments from your records with Kreate by Design. They are not current account balances or money your businesses earned during this period.",
} as const;

export const DON_YOUR_SPACE_BUSINESSES: DonYourSpaceBusinessFacts[] = [
  {
    slug: "cusick-morgan-motorsports",
    name: "Cusick Morgan Motorsports",
    primaryContact: "Billy Morgan",
    clientId: 5,
    paymentsUsd: 19_674,
    hosting:
      "The live website (cusickmotorsports.com) is hosted by Kreate by Design. Domain and DNS may be managed outside of Wix.",
    workSummary: [
      "Rebuilt and launched the site with driver, season, and partnership pages.",
      "Ongoing care for search visibility, news updates, and sponsor-facing content.",
    ],
    resultsSummary: [
      "Google Search and Analytics figures for August and September 2026 are in the accountability report where they were synced.",
      "Partnership inquiry paths are live on the production site.",
    ],
    paymentsNote:
      "Your share of the reconciled portfolio is listed in the report and payment summary.",
    accessSummary: [
      "Billy Morgan has the active Owner role for this brand in Wix.",
      "Kreate by Design has Admin (Co-Owner) on that Wix site.",
      "Website hosting and updates are managed by KXD; independent administrator login for Don on KXD hosting has not been confirmed in this package.",
    ],
    limitations: [
      "Who legally owns the domain name has not been independently verified beyond account screens.",
    ],
  },
  {
    slug: "otp",
    name: "On Track Performance",
    primaryContact: "Don Cusick",
    clientId: 9,
    paymentsUsd: 3_600,
    hosting:
      "The public site today is on Wix. A rebuilt KXD version is ready but is not on the public address until you approve switching it live.",
    workSummary: [
      "Care and search support for the live Wix site under retainer since August 2025.",
      "A full motorsport rebuild prepared for your launch decision.",
    ],
    resultsSummary: [
      "August and September 2026 Google figures for the live Wix site are in the report where synced.",
      "Wix forms were not fully audited in this package.",
    ],
    paymentsNote: "Retainer and project payments for On Track Performance are in the portfolio ledger.",
    accessSummary: [
      "Billy Morgan has the active Owner role in Wix.",
      "Kreate by Design has Admin (Co-Owner) in Wix.",
      "Wix hosting renewal is reported for November 25, 2026.",
    ],
    limitations: [
      "The rebuilt KXD site does not receive public traffic until you approve going live.",
    ],
  },
  {
    slug: "otp-carts",
    name: "OTP Carts",
    primaryContact: "Don Cusick",
    clientId: 14,
    paymentsUsd: 3_600,
    hosting:
      "The live storefront (www.otpcarts.com) is hosted by Kreate by Design. Wix billing remains tied to the domain.",
    workSummary: [
      "Production launch July 2026 with inquiry and financing forms.",
      "Inventory, search, and local listing support documented in the accountability report.",
    ],
    resultsSummary: [
      "Four form submissions were recorded (two verification tests, two potential buyers). These are not verified sales.",
      "August and September 2026 Google metrics are in the report where synced.",
    ],
    paymentsNote:
      "Some invoices combine On Track Performance and OTP Carts; your allocation is separated in the ledger.",
    accessSummary: [
      "Billy Morgan has the active Owner role in Wix.",
      "Kreate by Design has Admin (Co-Owner) in Wix.",
      "Wix domain renewal is reported for November 6, 2027.",
    ],
    limitations: [
      "Whether customer inquiries reached the intended inbox was not independently verified.",
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
      "The live tenant directory (www.2475townsgate.com) is hosted by Kreate by Design. The domain is managed through Wix.",
    workSummary: [
      "Eight-tenant directory rebuild and ongoing lite retainer for accuracy and search care.",
    ],
    resultsSummary: [
      "Google figures from September 2026 onward are in the report where available.",
    ],
    paymentsNote: "Townsgate payments align with the reconciled portfolio total.",
    accessSummary: [
      "A Wix ownership invitation sent to Billy Morgan was not accepted.",
      "Kreate by Design currently holds the Wix owner and admin role for this account.",
      "Wix domain renewal is reported for September 22, 2028.",
      "KXD can send a new ownership invitation when you authorize it.",
    ],
    limitations: [
      "Wix ownership transfer is not complete. No Townsgate Wix Roles screenshot is included unless one is added to the package.",
    ],
  },
];

export function getDonYourSpaceBusinessBySlug(
  slug: string,
): DonYourSpaceBusinessFacts | undefined {
  return DON_YOUR_SPACE_BUSINESSES.find((b) => b.slug === slug);
}

export const DON_OWNERSHIP_GLOBAL_NOTES = [
  "Expired Wix invitations are not active access.",
  "Wix website roles are separate from where the live KXD-hosted websites run.",
  "The accountability report describes what was delivered, what remains with each party, and what still needs attention. It does not replace legal advice.",
  "Studio records note Nicole Mastro for Westlake OTP Carts Google Business Profile steps. Other social admin access is not listed here without verified exports.",
] as const;