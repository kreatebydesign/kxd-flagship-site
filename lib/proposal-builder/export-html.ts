/**
 * Premium HTML preview for proposals — visual family of audit reports, not coupled.
 */

import { formatCents } from "./money.ts";
import {
  formatClientFacingCreditAmount,
  formatClientFacingCreditType,
} from "./client-facing-labels.ts";
import {
  composeClosingPresentation,
  composeCoverPresentation,
  composeInvestmentPresentation,
  composeOpeningSections,
  composeScopeWorkstream,
  composeTermsSectionPlan,
  proseKindForTermsKey,
  shouldShowRecurringInvestment,
  structureProposalProse,
  type ProposalProseBlock,
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

function renderProseBlocks(blocks: ProposalProseBlock[], editorial = false): string {
  if (editorial) {
    const paragraphs = blocks.filter((block) => block.type === "paragraph");
    const items = blocks.flatMap((block) => (block.type === "paragraph" ? [] : block.items));
    if (items.length >= 4) {
      const midpoint = Math.ceil(items.length / 2);
      const left = items.slice(0, midpoint);
      const right = items.slice(midpoint);
      return `
        ${paragraphs
          .map((block) => (block.type === "paragraph" ? `<p>${esc(block.text)}</p>` : ""))
          .join("")}
        <div class="editorial-grid">
          <ul class="prose-list">${left.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
          <ul class="prose-list">${right.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
        </div>`;
    }
  }

  return blocks
    .map((block) => {
      if (block.type === "paragraph") {
        return `<p>${esc(block.text)}</p>`;
      }
      if (block.type === "numbered") {
        const items = block.items.map((item) => `<li>${esc(item)}</li>`).join("");
        return `<ol class="prose-list">${items}</ol>`;
      }
      const items = block.items.map((item) => `<li>${esc(item)}</li>`).join("");
      return `<ul class="prose-list">${items}</ul>`;
    })
    .join("");
}

export function renderProposalPreviewHtml(proposal: CanonicalProposal): string {
  const c = KXD_REPORT_COLORS;
  const logo = resolveKxdReportLogoAsset();
  const cover = composeCoverPresentation(proposal);
  const opening = composeOpeningSections(proposal);
  const investment = composeInvestmentPresentation(proposal);
  const terms = composeTermsSectionPlan(proposal);
  const closing = composeClosingPresentation(proposal);
  const workstreams = proposal.scopeGroups.map((group, index) =>
    composeScopeWorkstream(group, index, proposal.scopeGroups.length),
  );

  const openingHtml = opening
    .map(
      (section) => `
      <section class="block ${section.emphasis === "lead" ? "lead" : "supporting"}">
        <div class="eyebrow">${esc(section.eyebrow)}</div>
        <h2>${esc(section.title)}</h2>
        ${section.paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}
      </section>`,
    )
    .join("");

  const scopeHtml = workstreams
    .map((workstream) => {
      const dels = workstream.deliverables
        .map(
          (item) =>
            `<li><strong>${esc(item.title)}</strong>${item.description ? ` — ${esc(item.description)}` : ""}</li>`,
        )
        .join("");
      return `
        <section class="block scope">
          <div class="scope-index">${esc(workstream.indexLabel)}</div>
          <h2>${esc(workstream.title)}</h2>
          ${workstream.subtitle ? `<div class="scope-subtitle">${esc(workstream.subtitle)}</div>` : ""}
          <div class="mini-rule"></div>
          ${workstream.overview ? `<p>${esc(workstream.overview)}</p>` : ""}
          ${dels ? `<h3>Deliverables</h3><ul class="deliverables">${dels}</ul>` : ""}
        </section>`;
    })
    .join("");

  const annualHtml = investment.annualLines
    .map(
      (line) =>
        `<div class="invest-row"><span>${esc(line.title)}</span><strong>${esc(line.amountLabel)}</strong></div>`,
    )
    .join("");
  const monthlyHtml = investment.monthlyLines
    .map(
      (line) =>
        `<div class="invest-row"><span>${esc(line.title)}</span><strong>${esc(line.amountLabel)}</strong></div>`,
    )
    .join("");
  const quarterlyHtml = investment.quarterlyLines
    .map(
      (line) =>
        `<div class="invest-row"><span>${esc(line.title)}</span><strong>${esc(line.amountLabel)}</strong></div>`,
    )
    .join("");
  const creditHtml = proposal.credits
    .map(
      (credit) =>
        `<div class="invest-row"><span>${esc(credit.label)} · ${esc(formatClientFacingCreditType(credit.kind))}</span><strong>${esc(formatClientFacingCreditAmount(credit, proposal.currency))}</strong></div>`,
    )
    .join("");
  const scheduleHtml = investment.showDetailedSchedule
    ? investment.scheduleRows
        .map(
          (row) =>
            `<div class="invest-row"><span>${esc(row.label)}<br/><span class="muted">${esc(row.timing)}</span></span><strong>${esc(row.amount)}</strong></div>`,
        )
        .join("")
    : "";

  const termsHtml = terms
    .map(
      (section) => `
      <section class="block">
        <div class="eyebrow">${esc(section.eyebrow)}</div>
        <h2>${esc(section.title)}</h2>
        ${renderProseBlocks(
          structureProposalProse(
            section.text,
            proseKindForTermsKey(
              section.key as
                | "clientResponsibilities"
                | "exclusions"
                | "nextSteps"
                | "proposalTerms"
                | "paymentAssumptions"
                | "timelineAssumptions"
                | "expirationLanguage"
                | "changeRequestLanguage",
            ),
          ),
          section.layout === "editorial",
        )}
      </section>`,
    )
    .join("");

  const sponsorshipNotes = proposal.credits
    .map((credit) => credit.notes?.trim())
    .filter(Boolean) as string[];
  const sponsorshipHtml = sponsorshipNotes
    .map(
      (note) => `
      <section class="block">
        <div class="eyebrow">Sponsorship</div>
        <h2>Sponsorship condition</h2>
        <p>${esc(note)}</p>
      </section>`,
    )
    .join("");

  const orgHtml = cover.organizationLines
    .map((line, index) => {
      const joiner =
        index > 0 && cover.organizationJoiner
          ? `<div class="cover-joiner">${esc(cover.organizationJoiner)}</div>`
          : "";
      return `${joiner}<h1>${esc(line)}</h1>`;
    })
    .join("");

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
    --gold-muted: ${c.goldMuted};
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
    min-height: 78vh;
    padding: clamp(2.75rem, 6vw, 4.5rem) clamp(1.5rem, 5vw, 3.5rem);
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }
  .cover .doc { font-family: system-ui, sans-serif; letter-spacing: 0.28em; text-transform: uppercase; font-size: 11px; color: #a39e93; }
  .cover-logo { width: 5.75rem; height: auto; margin: 0 0 2rem; display: block; }
  .cover .rule { width: 48px; height: 1px; background: var(--gold); margin: 14px 0 2rem; }
  .cover h1 { font-size: clamp(2.1rem, 5vw, 3.15rem); font-weight: 500; line-height: 1.12; margin: 0; max-width: 16ch; }
  .cover-joiner { font-family: system-ui, sans-serif; color: var(--gold); letter-spacing: 0.18em; margin: 0.85rem 0; font-size: 14px; }
  .cover-engagement { font-family: system-ui, sans-serif; color: #a39e93; margin: 1.75rem 0 2.25rem; max-width: 420px; line-height: 1.55; font-size: 15px; }
  .cover-prepared-label { font-family: system-ui, sans-serif; letter-spacing: 0.18em; text-transform: uppercase; font-size: 11px; color: #a39e93; margin-bottom: 6px; }
  .cover-prepared-name { font-size: 1.25rem; margin: 0 0 0.35rem; }
  .cover .meta { font-family: system-ui, sans-serif; font-size: 14px; color: #a39e93; line-height: 1.7; }
  .cover-studio { margin-top: 18px; color: var(--ivory); font-size: 16px; }
  .wrap { max-width: 880px; margin: 0 auto; padding: clamp(2.5rem, 5vw, 4rem) 24px 80px; }
  .eyebrow { font-family: system-ui, sans-serif; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
  h2 { font-size: clamp(1.55rem, 3vw, 1.9rem); font-weight: 500; margin: 0 0 14px; max-width: 22ch; }
  h3 { font-family: system-ui, sans-serif; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold-muted); margin: 18px 0 10px; }
  p { line-height: 1.65; font-size: 1.05rem; margin: 0 0 1rem; max-width: 68ch; }
  .block { padding: 2rem 0; border-bottom: 1px solid var(--line); }
  .block.lead { padding: 2.4rem 0; }
  .block.supporting p { max-width: 62ch; }
  .scope-index { font-family: system-ui, sans-serif; letter-spacing: 0.22em; color: var(--gold-muted); font-size: 12px; margin-bottom: 8px; }
  .scope-subtitle { font-family: system-ui, sans-serif; letter-spacing: 0.14em; text-transform: uppercase; font-size: 12px; color: var(--muted); margin-bottom: 12px; }
  .mini-rule { width: 36px; height: 1px; background: var(--gold); margin-bottom: 16px; }
  ul.deliverables, ol.prose-list, ul.prose-list { padding-left: 0; list-style: none; line-height: 1.55; margin: 0 0 0.95rem; }
  ul.deliverables li, ol.prose-list li, ul.prose-list li { margin: 0 0 0.85rem; padding-left: 1.1rem; position: relative; max-width: 64ch; }
  ul.deliverables li::before, ul.prose-list li::before { content: "•"; position: absolute; left: 0; color: var(--gold-muted); }
  ol.prose-list { counter-reset: step; }
  ol.prose-list li { counter-increment: step; }
  ol.prose-list li::before { content: counter(step) "."; position: absolute; left: 0; color: var(--gold-muted); font-family: system-ui, sans-serif; font-size: 0.9em; }
  .editorial-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem 2rem; }
  .invest-hero { background: var(--panel); border-left: 2px solid var(--gold); padding: 1.35rem 1.25rem; margin: 0.5rem 0 1.5rem; }
  .invest-hero .amount { font-size: clamp(2rem, 4vw, 2.6rem); margin: 0 0 0.35rem; line-height: 1.1; }
  .invest-row { display: flex; justify-content: space-between; gap: 16px; padding: 0.7rem 0; border-bottom: 1px solid var(--line); font-family: system-ui, sans-serif; font-size: 14px; }
  .muted { color: var(--muted); }
  .subhead { font-family: system-ui, sans-serif; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold-muted); margin: 1rem 0 0.65rem; }
  .closing { background: var(--panel); padding: clamp(1.5rem, 4vw, 2.25rem); min-height: 280px; display: flex; flex-direction: column; justify-content: space-between; margin-top: 1rem; }
  .disclosure { background: #fffdf8; border-left: 2px solid var(--gold); padding: 14px; margin-top: 16px; }
  .footer { margin-top: 48px; font-family: system-ui, sans-serif; font-size: 12px; color: var(--muted); }
  @media (max-width: 640px) {
    .cover { padding: 48px 24px; min-height: 68vh; }
    .cover h1 { max-width: none; }
  }
</style>
</head>
<body>
  <header class="cover">
    ${logo.exists ? `<img class="cover-logo" src="${esc(logo.publicPath)}" alt="${esc(KXD_REPORT_BRAND)}" width="104" height="98" />` : ""}
    <div class="doc">${esc(cover.docType)}</div>
    <div class="rule"></div>
    ${orgHtml}
    <div class="cover-engagement">${esc(cover.engagementTitle)}</div>
    ${
      cover.preparedForName
        ? `<div class="cover-prepared-label">Prepared for</div><div class="cover-prepared-name">${esc(cover.preparedForName)}</div>`
        : ""
    }
    ${cover.preparedForDetail ? `<div class="meta">${esc(cover.preparedForDetail)}</div>` : ""}
    <div class="meta">
      ${cover.metaLines.map((line) => `<div>${esc(line)}</div>`).join("")}
      <div class="cover-studio">${esc(cover.studioLine)}</div>
    </div>
  </header>
  <main class="wrap">
    ${openingHtml}
    ${scopeHtml}
    <section class="block">
      <div class="eyebrow">${esc(investment.eyebrow)}</div>
      <h2>${esc(investment.title)}</h2>
      <div class="invest-hero">
        <div class="eyebrow">${esc(investment.heroEyebrow)}</div>
        <div class="amount">${esc(investment.heroAmount)}</div>
        <div class="muted">Total project investment</div>
        ${investment.paymentSummary ? `<p style="font-family:system-ui,sans-serif;font-weight:600;margin:0.65rem 0 0">${esc(investment.paymentSummary)}</p>` : ""}
      </div>
      ${annualHtml ? `<div class="subhead">Annual hosting</div>${annualHtml}${investment.annualTotalLabel ? `<p class="muted">${esc(investment.annualTotalLabel)}</p>` : ""}` : ""}
      ${
        monthlyHtml
          ? `<div class="subhead">Monthly</div>${monthlyHtml}`
          : investment.monthlyNoneLabel
            ? `<div class="subhead">Monthly management</div><p class="muted">${esc(investment.monthlyNoneLabel)}</p>`
            : ""
      }
      ${quarterlyHtml ? `<div class="subhead">Quarterly</div>${quarterlyHtml}` : ""}
      ${creditHtml ? `<div class="subhead">Credits & adjustments</div>${creditHtml}` : ""}
      ${scheduleHtml ? `<div class="subhead">Payment schedule</div>${scheduleHtml}` : ""}
      ${shouldShowRecurringInvestment(proposal.totals.monthlyTotalCents) && !monthlyHtml ? `<p class="muted">Monthly investment ${esc(formatCents(proposal.totals.monthlyTotalCents, proposal.currency))}/month</p>` : ""}
    </section>
    ${sponsorshipHtml}
    ${termsHtml}
    <section class="closing">
      <div>
        <div class="eyebrow">${esc(closing.eyebrow)}</div>
        <h2>${esc(closing.title)}</h2>
        ${renderProseBlocks(structureProposalProse(closing.nextSteps, "steps"))}
        ${closing.closingNote ? `<p>${esc(closing.closingNote)}</p>` : ""}
        ${
          closing.acceptance
            ? `<div class="disclosure"><div class="eyebrow">Proposal acceptance</div><p>${esc(closing.acceptance)}</p></div>`
            : ""
        }
      </div>
      <div style="margin-top:28px;font-size:18px">${esc(KXD_REPORT_BRAND)}</div>
    </section>
    <div class="footer">${esc(KXD_REPORT_BRAND)} · ${esc(KXD_REPORT_SITE)} · ${esc(proposal.proposalNumber)}</div>
  </main>
</body>
</html>`;
}
