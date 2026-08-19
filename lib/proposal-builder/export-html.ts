/**
 * Premium HTML preview for proposals — visual family of audit reports, not coupled.
 */

import { formatProposalCalendarDate } from "./calendar-date.ts";
import { formatCents } from "./money.ts";
import { formatProposalContactSummary } from "./document.ts";
import {
  formatClientFacingBilling,
  formatClientFacingCreditAmount,
  formatClientFacingCreditType,
  formatClientFacingLineAmount,
  formatClientFacingMonthlyInvestment,
  formatClientFacingPaymentTiming,
} from "./client-facing-labels.ts";
import {
  formatCoverPreparedForLine,
  shouldShowRecurringInvestment,
  distinctScopeOrganizationName,
} from "./presentation.ts";
import { KXD_REPORT_COLORS } from "../kxd-report-engine/tokens.ts";
import { KXD_REPORT_BRAND, KXD_REPORT_SITE } from "../kxd-report-engine/contact.ts";
import { resolveKxdReportLogoAsset } from "../kxd-report-engine/logos.ts";
import type { CanonicalProposal } from "./types.ts";

function esc(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function para(text?: string): string {
  if (!text?.trim()) return "";
  return `<p>${esc(text).replace(/\n/g, "<br/>")}</p>`;
}

function section(eyebrow: string, title: string, body?: string): string {
  if (!body?.trim()) return "";
  return `<section class="block"><div class="eyebrow">${esc(eyebrow)}</div><h2>${esc(title)}</h2>${para(body)}</section>`;
}

export function renderProposalPreviewHtml(proposal: CanonicalProposal): string {
  const c = KXD_REPORT_COLORS;
  const logo = resolveKxdReportLogoAsset();
  const preparedForLine = formatCoverPreparedForLine(
    proposal.primaryOrganization,
    proposal.organizations,
  );
  const contactSummary = formatProposalContactSummary(proposal.primaryContact);
  const scopeHtml = proposal.scopeGroups
    .map((g) => {
      const dels = g.deliverables
        .map((d) => `<li><strong>${esc(d.title)}</strong>${d.description ? `: ${esc(d.description)}` : ""}</li>`)
        .join("");
      const scopeOrg = distinctScopeOrganizationName(
        g.organizationName,
        proposal.primaryOrganization,
      );
      return `
        <section class="block">
          <div class="eyebrow">Included work</div>
          <h2>${esc(g.title)}</h2>
          ${scopeOrg ? `<p class="meta">${esc(scopeOrg)}</p>` : ""}
          ${para(g.overview)}
          ${dels ? `<h3>Deliverables</h3><ul>${dels}</ul>` : ""}
          ${g.estimatedTimeline ? `<p><strong>Timeline:</strong> ${esc(g.estimatedTimeline)}</p>` : ""}
        </section>`;
    })
    .join("");

  const pricingRows = proposal.pricingLines
    .map((line) => {
      const amt = formatClientFacingLineAmount(
        line.unitPriceCents * (line.quantity || 1),
        line.cadence,
        proposal.currency,
      );
      const badge =
        line.inclusion === "optional" || line.isAddon
          ? "Optional"
          : formatClientFacingBilling(line.cadence);
      return `<tr>
        <td>${esc(line.title)}</td>
        <td>${esc(badge)}</td>
        <td class="num">${esc(String(line.quantity))}</td>
        <td class="num">${esc(amt)}</td>
      </tr>`;
    })
    .join("");

  const creditRows = proposal.credits
    .map(
      (credit) =>
        `<tr>
          <td>${esc(credit.label)}</td>
          <td>${esc(formatClientFacingCreditType(credit.kind))}</td>
          <td class="num">${esc(formatClientFacingCreditAmount(credit, proposal.currency))}</td>
        </tr>`,
    )
    .join("");

  const scheduleRows = proposal.paymentSchedule
    .map(
      (item) =>
        `<tr>
          <td>${esc(item.label)}</td>
          <td>${esc(formatClientFacingPaymentTiming(item.due))}</td>
          <td class="num">${esc(formatCents(item.amountCents, proposal.currency))}</td>
        </tr>`,
    )
    .join("");

  const sponsorshipNotes = proposal.credits
    .map((c) => c.notes?.trim())
    .filter(Boolean) as string[];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex,nofollow"/>
<title>${esc(proposal.title)} · ${esc(KXD_REPORT_BRAND)}</title>
<style>
  :root {
    --black: ${c.richBlack};
    --ink: ${c.ink};
    --ivory: ${c.ivory};
    --paper: ${c.paper};
    --gold: ${c.gold};
    --muted: ${c.muted};
    --line: ${c.line};
    --panel: ${c.panel};
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
    color: var(--ink);
    background: linear-gradient(180deg, #f3ebe0 0%, var(--paper) 220px);
  }
  .cover {
    background: var(--black);
    color: var(--ivory);
    min-height: 72vh;
    padding: 72px 48px 56px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .cover .doc { font-family: system-ui, sans-serif; letter-spacing: 0.22em; text-transform: uppercase; font-size: 11px; color: #a39e93; }
  .cover-logo { width: 5.5rem; height: auto; margin: 0 0 1.75rem; display: block; }
  .cover .rule { width: 42px; height: 1px; background: var(--gold); margin: 18px 0 22px; }
  .cover h1 { font-size: clamp(2rem, 5vw, 3rem); font-weight: 500; line-height: 1.15; margin: 0 0 16px; max-width: min(28ch, 100%); overflow-wrap: normal; word-break: normal; }
  .cover .meta { font-family: system-ui, sans-serif; font-size: 14px; color: #d9d2c5; line-height: 1.7; }
  .wrap { max-width: 820px; margin: 0 auto; padding: 48px 24px 80px; }
  .eyebrow { font-family: system-ui, sans-serif; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
  h2 { font-size: 1.55rem; font-weight: 500; margin: 0 0 12px; }
  h3 { font-family: system-ui, sans-serif; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #9a8244; margin: 20px 0 8px; }
  p { line-height: 1.65; font-size: 1.05rem; }
  .block { padding: 28px 0; border-bottom: 1px solid var(--line); }
  .block:last-child { border-bottom: 0; }
  ul { padding-left: 1.15rem; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; font-family: system-ui, sans-serif; font-size: 14px; }
  th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { color: var(--muted); font-weight: 500; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  .totals { background: var(--panel); padding: 18px 20px; margin-top: 16px; border: 1px solid var(--line); border-radius: 2px; }
  .totals div { display: flex; justify-content: space-between; gap: 16px; margin: 6px 0; font-family: system-ui, sans-serif; }
  .disclosure { background: var(--panel); border-left: 2px solid var(--gold); padding: 16px 18px; margin-top: 18px; }
  .footer { margin-top: 48px; font-family: system-ui, sans-serif; font-size: 12px; color: var(--muted); }
  @media (max-width: 640px) {
    .cover { padding: 48px 24px; min-height: 60vh; }
    .cover h1 { max-width: none; }
  }
</style>
</head>
<body>
  <header class="cover">
    ${logo.exists ? `<img class="cover-logo" src="${esc(logo.publicPath)}" alt="${esc(KXD_REPORT_BRAND)}" width="88" height="83" />` : ""}
    <div class="doc">Proposal</div>
    <div class="rule"></div>
    <h1>${esc(proposal.title)}</h1>
    <div class="meta">
      ${preparedForLine ? `<div>${esc(preparedForLine)}</div>` : ""}
      ${contactSummary ? `<div>Primary contact · ${esc(contactSummary)}</div>` : ""}
      <div>Proposal ${esc(proposal.proposalNumber)} · Version ${esc(String(proposal.version))}</div>
      <div>Date ${esc(formatProposalCalendarDate(proposal.proposalDate))} · Expires ${esc(formatProposalCalendarDate(proposal.expirationDate))}</div>
      <div>Prepared by ${esc(proposal.preparedBy)}</div>
    </div>
  </header>
  <main class="wrap">
    ${contactSummary ? `<section class="block"><div class="eyebrow">Contact</div><h2>Primary contact</h2><p>${esc(contactSummary)}</p></section>` : ""}
    ${section("Introduction", "A clear path forward", proposal.executive.clientFacingIntro)}
    ${section("Executive summary", "Where this begins", proposal.executive.executiveSummary)}
    ${section("Situation", "Current situation", proposal.executive.currentSituation)}
    ${section("Objectives", "What success requires", proposal.executive.objectives)}
    ${section("Direction", "Recommended path", proposal.executive.recommendedDirection)}
    ${section("Outcomes", "Desired outcomes", proposal.executive.desiredOutcomes)}
    ${section("Context", "Client-specific context", proposal.executive.clientContext)}
    ${scopeHtml}
    <section class="block">
      <div class="eyebrow">Investment</div>
      <h2>Pricing</h2>
      <table>
        <thead><tr><th>Item</th><th>Billing</th><th class="num">Quantity</th><th class="num">Amount</th></tr></thead>
        <tbody>${pricingRows || `<tr><td colspan="4">Pricing to be confirmed</td></tr>`}</tbody>
      </table>
      ${creditRows ? `<h3>Credits & adjustments</h3><table><thead><tr><th>Credit</th><th>Type</th><th class="num">Amount</th></tr></thead><tbody>${creditRows}</tbody></table>` : ""}
      ${scheduleRows ? `<h3>Payment schedule</h3><table><thead><tr><th>Item</th><th>When due</th><th class="num">Amount</th></tr></thead><tbody>${scheduleRows}</tbody></table>` : ""}
      <div class="totals">
        <div><span>One-time investment</span><strong>${esc(formatCents(proposal.totals.oneTimeTotalCents, proposal.currency))}</strong></div>
        ${shouldShowRecurringInvestment(proposal.totals.monthlyTotalCents) ? `<div><span>Monthly investment</span><strong>${esc(formatClientFacingMonthlyInvestment(proposal.totals.monthlyTotalCents, proposal.currency))}</strong></div>` : ""}
        ${shouldShowRecurringInvestment(proposal.totals.quarterlyTotalCents) ? `<div><span>Quarterly investment</span><strong>${esc(formatCents(proposal.totals.quarterlyTotalCents, proposal.currency))}</strong></div>` : ""}
        ${shouldShowRecurringInvestment(proposal.totals.annualTotalCents) ? `<div><span>Annual investment</span><strong>${esc(formatCents(proposal.totals.annualTotalCents, proposal.currency))}</strong></div>` : ""}
        ${proposal.totals.depositCents > 0 ? `<div><span>Deposit</span><strong>${esc(formatCents(proposal.totals.depositCents, proposal.currency))}</strong></div>` : ""}
      </div>
    </section>
    ${sponsorshipNotes.map((n) => section("Sponsorship", "Sponsorship condition", n)).join("")}
    ${section("Terms", "Terms", proposal.terms.proposalTerms)}
    ${section("Payment", "Payment schedule", proposal.terms.paymentAssumptions)}
    ${section("Timeline", "Project timeline", proposal.terms.timelineAssumptions)}
    ${section("Validity", "Proposal validity", proposal.terms.expirationLanguage)}
    ${section("Changes", "Scope changes", proposal.terms.changeRequestLanguage)}
    ${section("Intellectual property", "Intellectual property", proposal.terms.intellectualPropertySummary)}
    ${section("Cancellation", "Cancellation", proposal.terms.cancellationSummary)}
    ${section("Responsibilities", "What we need from you", proposal.terms.clientResponsibilities)}
    ${section("Exclusions", "What's not included", proposal.terms.exclusions)}
    <section class="block">
      <div class="eyebrow">Next step</div>
      <h2>How to begin</h2>
      ${para(proposal.terms.nextSteps)}
      ${para(proposal.terms.closingNote)}
      <div class="disclosure">
        <p>${esc(proposal.disclosures.acceptance)}</p>
        <p>${esc(proposal.disclosures.contractRequired)}</p>
      </div>
    </section>
    <div class="footer">${esc(KXD_REPORT_BRAND)} · ${esc(KXD_REPORT_SITE)} · Version ${esc(String(proposal.version))}</div>
  </main>
</body>
</html>`;
}
