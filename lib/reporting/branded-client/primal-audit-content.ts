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
  googleAdsNarrative: string;
  closingNote: string;
};

export function buildPrimalGoogleAdsAuditNarratives(): PrimalAuditNarrativePatch {
  return {
    executiveSummary: `Between May 15 and August 12, 2026, Kreate by Design reviewed Primal Motorsports' Google Ads account, corrected measurement and campaign structure issues, and completed repairs on August 13. This report summarizes what we found, what we changed, and how we will measure progress from here.

Spend and click totals below come from manually reconciled Google Ads exports. Platform-reported conversion figures are shown for context, but they are not treated as confirmed inquiries received by Primal.`,

    issuesOrRisks: `The audit showed that the account's measurement and campaign structure needed to be tightened before the historical conversion totals could be used confidently for growth decisions. Several platform-recorded actions did not consistently represent a confirmed inquiry received by Primal, so KXD reconciled the available data and rebuilt the foundation around the signals that matter most: delivered forms, qualified calls, search quality, and confirmed lead outcomes.

Search remains the strongest high-intent foundation. The next phase is focused on concentrating spend around the terms, locations, and experiences most closely aligned with Primal's customers while clean lead data accumulates.

Demand Gen has been paused temporarily while KXD rebuilds the upper-funnel strategy around clearer measurement, tighter audience controls, and stronger creative alignment. This protects the current budget while preparing the campaign for a more controlled relaunch.`,

    workCompleted: `• Website form delivery repaired and tested end to end
• Conversion priorities corrected — confirmed website submissions and qualified calls retained as primary actions
• Phone-link clicks, email clicks, and Google-hosted actions moved to secondary
• Weak broad and phrase-match terms paused; negative keywords added
• Physical-presence location targeting applied; East Coast feeder markets retained
• Clean responsive Search ad enabled; unsupported claims and weak creative removed
• Demand Gen paused temporarily while upper-funnel strategy is rebuilt`,

    improvementsMade: `• Search budget remained at $80/day — no budget increase was made
• East Coast feeder markets retained based on Primal customer travel behavior
• Search Partners, Display Network, AI Max, and campaign broad match remained off
• No aggressive device or scheduling cuts without clean evidence
• Historical campaigns, data, and assets preserved for deliberate rebuilding`,

    augustPriorities: `• Forms received by Primal
• Qualified calls lasting at least 60 seconds
• Search-term quality
• Georgia core versus East Coast destination performance
• Device performance as clean form data accumulates
• Cost per confirmed inquiry
• Lead quality and disposition
• Booking and sales opportunities`,

    googleAdsNarrative: `Upper-funnel advertising is not being eliminated. Demand Gen was paused temporarily while KXD strengthens measurement, targeting, and creative quality. Search remains the high-intent foundation during this stabilization period.

After approximately two weeks of clean Search lead data and sufficient remarketing audience development, KXD will evaluate a controlled upper-funnel relaunch. The rebuilt campaign will use tighter audience controls, optimized targeting disabled, corrected creative and claims, and lead measurement tied to forms Primal receives and qualified calls. The initial relaunch budget will be approximately $10 per day, with room to scale toward $20 per day when confirmed performance supports it.

Search is being rebuilt around exact and phrase buyer intent, brand terms, and premium race-car experience positioning. KXD will continue expanding intelligently as the measurement foundation becomes reliable. This is a thoughtful growth plan designed to expand stronger, not a permanent reduction in reach. No campaign history, useful data, or assets were deleted.

Weekly review will cover spend, confirmed inquiries, CPA, search quality, changes made, and next decisions. A 30-day performance review will guide the next scaling steps.`,

    closingNote: `Kreate by Design is committed to helping Primal grow with accurate measurement, disciplined targeting, and deliberate next steps. Questions about this report are welcome at matt@kreatebydesign.com.`,
  };
}
