/**
 * Canonical client-facing narrative content for the Primal Google Ads Audit & Repair Report.
 * Bodies omit section headings — presentation components supply hierarchy.
 */

import type { VerifiedAuditTotals } from "./manual-audit-metrics";

export const PRIMAL_AUDIT_PERIOD_LABEL = "May 15–August 12, 2026";
export const PRIMAL_AUDIT_REPAIR_DATE_LABEL = "August 13, 2026";
export const PRIMAL_AUDIT_PDF_FILENAME =
  "Primal-Motorsports-Google-Ads-Audit-August-2026.pdf";

export const PRIMAL_VERIFIED_TOTALS: VerifiedAuditTotals = {
  totalSpendReviewed: 9000.53,
  searchSpend: 7393.67,
  demandGenSpend: 1606.86,
  searchClicks: 763,
  demandGenClicks: 1876,
  searchReportedConversions: 5,
  demandGenReportedConversions: 13,
  credibleCallsFromAds60s: 2,
};

export type PrimalAuditNarrativePatch = {
  executiveSummary: string;
  workCompleted: string;
  improvementsMade: string;
  issuesOrRisks: string;
  augustPriorities: string;
  recommendations: string;
  closingNote: string;
};

export function buildPrimalGoogleAdsAuditNarratives(): PrimalAuditNarrativePatch {
  return {
    executiveSummary: `Kreate by Design completed a Google Ads audit and repair for Primal Motorsports covering ${PRIMAL_AUDIT_PERIOD_LABEL}. This report explains what we reviewed, what we repaired, and how those changes protect measurement and ad spend going forward.

We reconciled verified spend and click totals from manual Google Ads export evidence, documented historically unreliable conversion reporting, and completed account repairs on ${PRIMAL_AUDIT_REPAIR_DATE_LABEL}. Platform-reported conversions are distinguished from confirmed business inquiries throughout this report.`,

    issuesOrRisks: `• Conversion tracking could record activity that did not reliably represent an inquiry received by Primal.
• Historical conversion reporting was contaminated and must not be presented as confirmed business outcomes.
• Broad targeting and weak terms consumed budget without reliable conversion evidence.
• Demand Gen targeting and placement evidence were not strong enough to justify continued uncontrolled spend.`,

    workCompleted: `• Form delivery repaired and verified end to end
• Conversion priorities corrected — confirmed website submissions and qualified calls retained as primary actions
• Phone-link clicks, email clicks, and Google-hosted actions moved to secondary
• Weak broad and phrase-match terms paused; negative keywords added
• Physical-presence location targeting applied; East Coast feeder markets retained
• Clean responsive Search ad enabled; unsupported claims and weak creative removed
• Demand Gen paused as a protective measure pending controlled rebuild`,

    improvementsMade: `• Search budget remained at $80/day — no budget increase was made
• East Coast feeder markets retained based on Primal customer travel behavior
• Search Partners, Display Network, AI Max, and campaign broad match remained off
• No aggressive device or scheduling cuts without clean evidence
• Historical campaigns, data, and assets preserved for deliberate rebuilding`,

    augustPriorities: `• Confirmed forms received by Primal
• Qualified calls lasting at least 60 seconds
• Search-term quality
• Georgia core versus East Coast destination performance
• Device performance after clean form data accumulates
• Cost per confirmed inquiry
• Lead quality and disposition
• Booking and sales opportunities`,

    recommendations: `The upper funnel is not being eliminated. Demand Gen was paused as a protective measure while KXD corrected measurement, targeting, and creative quality. Once Search produces approximately two weeks of clean, confirmed lead data and the remarketing audience is sufficient, KXD will rebuild upper-funnel traffic as a controlled remarketing campaign. The rebuild will use tighter audiences, optimized targeting disabled, corrected creative and claims, and verified lead measurement. The controlled relaunch will begin around $10 per day and may scale toward $20 per day when confirmed performance supports it.

Search remains the high-intent foundation during stabilization. Search is being rebuilt around exact and phrase buyer intent, brand terms, and premium race-car experience positioning. KXD will continue expanding intelligently after the measurement foundation is trustworthy. This is optimization and controlled growth — not a permanent reduction in reach. No campaign history, useful data, or assets were deleted.

Weekly review will cover spend, confirmed inquiries, CPA, search quality, changes made, and next decisions. A 30-day performance review will determine the next scaling decisions.`,

    closingNote: `Kreate by Design is committed to protecting Primal's ad investment with accurate measurement, disciplined targeting, and deliberate growth. Questions about this report are welcome at matt@kreatebydesign.com.`,
  };
}
