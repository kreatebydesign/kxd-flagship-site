/**
 * HTML export for client-facing preview (and print).
 * Same canonical content as PDF — no internal notes, no hidden items.
 * Visual system uses KXD Report Engine tokens + official logo.
 */

import {
  ACTION_PLAN_GROUP_LABEL,
  ACTION_PLAN_GROUPS,
  CATEGORY_LABEL,
  type CanonicalAuditReport,
  type CanonicalFinding,
} from "./types.ts";
import {
  KXD_REPORT_BRAND,
  KXD_REPORT_CONTACT_EMAIL,
  kxdReportPageFooterLine,
} from "./branding.ts";
import {
  coverDocumentType,
  coverPrimaryName,
  domainLabel,
  findingProvenanceLabel,
  findingSupportCopy,
  fmtLongDate,
  formatGradeContext,
  formatScoreOutOf,
  scoreConditionLabel,
  severityLabel,
} from "./presentation.ts";
import { KXD_REPORT_COLORS, KXD_REPORT_RADIUS_PX } from "../kxd-report-engine/tokens.ts";
import { resolveKxdReportLogoAsset } from "../kxd-report-engine/logos.ts";
import { formatSectionIndex } from "../kxd-report-engine/section.ts";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

function scoreCell(label: string, score: number | null): string {
  const value = score == null ? "—" : String(score);
  return `<div class="score-card"><span class="score-label">${esc(label)}</span><span class="score-value">${esc(value)}</span></div>`;
}

function findingBlock(f: CanonicalFinding): string {
  const support = findingSupportCopy(f);
  return `
    <article class="finding">
      <header>
        <p class="eyebrow">${esc(CATEGORY_LABEL[f.category])} · ${esc(severityLabel(f.severity))}</p>
        <h3>${esc(f.title)}</h3>
      </header>
      ${support ? `<p class="finding-body">${esc(support)}</p>` : ""}
      <p><span class="field-label">Why it matters</span> ${esc(f.whyItMatters)}</p>
      ${
        f.evidence
          ? `<p class="evidence-line"><span class="field-label">${esc(findingProvenanceLabel(f))}</span> ${esc(f.evidence)}</p>`
          : ""
      }
      ${
        f.recommendedAction
          ? `<p class="finding-action"><span class="field-label">Recommended action</span> ${esc(f.recommendedAction)}</p>`
          : ""
      }
    </article>`;
}

function sectionHeading(index: number, title: string): string {
  return `<header class="section-head">
    <span class="section-num">${esc(formatSectionIndex(index))}</span>
    <h2>${esc(title)}</h2>
  </header>`;
}

/**
 * Build self-contained HTML for preview / print.
 * Intentionally excludes internalNotes and non-included findings/actions.
 */
export function buildAuditReportHtml(report: CanonicalAuditReport): string {
  const vis = report.sectionVisibility;
  const domain = domainLabel(report.auditedUrl);
  const company = coverPrimaryName(report);
  const logo = resolveKxdReportLogoAsset();
  const logoSrc = logo.publicPath;
  const includedFindings = report.findings.filter((f) => f.included !== false);
  const includedActions = report.actionPlan
    .filter((a) => a.included !== false)
    .sort((a, b) => a.order - b.order);
  const overall = report.scores.overallScore;
  const gradeLine = formatGradeContext(report.scores.grade, overall);
  const condition = scoreConditionLabel(overall);
  const c = KXD_REPORT_COLORS;
  const radius = KXD_REPORT_RADIUS_PX;

  const cover = `
    <section class="cover-page" aria-label="Report cover">
      ${
        logo.exists
          ? `<img class="cover-logo" src="${esc(logoSrc)}" alt="${esc(KXD_REPORT_BRAND)}" width="168" height="158" />`
          : `<p class="cover-logo-fallback">${esc(KXD_REPORT_BRAND)}</p>`
      }
      <p class="cover-doc-type">${esc(coverDocumentType())}</p>
      <div class="cover-rule" aria-hidden="true"></div>
      <h1>${esc(company)}</h1>
      <p class="cover-url"><a href="${esc(report.auditedUrl)}">${esc(domain)}</a></p>
      <dl class="cover-meta">
        <div><dt>Audit date</dt><dd>${esc(fmtLongDate(report.auditDate))}</dd></div>
        <div><dt>Prepared by</dt><dd>${esc(KXD_REPORT_BRAND)}</dd></div>
        ${
          report.preparedFor
            ? `<div><dt>Prepared for</dt><dd>${esc(report.preparedFor)}</dd></div>`
            : ""
        }
      </dl>
    </section>`;

  const summary =
    vis.executiveSummary && report.executiveSummary
      ? `<section class="section">
          ${sectionHeading(1, "Executive summary")}
          <div class="prose">${paragraphs(report.executiveSummary)}</div>
        </section>`
      : "";

  const scores =
    vis.overallScore
      ? `<section class="section">
          ${sectionHeading(2, "Overall score")}
          <div class="score-hero">
            <div class="score-hero__panel">
              <span class="score-hero__label">Composite score</span>
              <div class="score-hero__main">
                <span class="score-hero__value">${esc(formatScoreOutOf(overall))}</span>
              </div>
              ${
                gradeLine
                  ? `<p class="score-hero__grade">${esc(gradeLine)}</p>`
                  : condition
                    ? `<p class="score-hero__grade">${esc(condition)}</p>`
                    : ""
              }
            </div>
            <p class="muted score-disclaimer">Measured ${esc(fmtLongDate(report.scores.measuredAt))} from a single-page HTML review on a 0–100 scale. Scores are not rescaled for this report.</p>
          </div>
          <div class="score-grid">
            ${scoreCell("Performance", report.scores.performanceScore)}
            ${scoreCell("SEO", report.scores.seoScore)}
            ${scoreCell("Mobile", report.scores.mobileScore)}
            ${scoreCell("Conversion", report.scores.conversionScore)}
            ${scoreCell("Brand", report.scores.brandScore)}
          </div>
          ${
            report.partialDataNotes.length
              ? `<p class="notice">${esc(report.partialDataNotes.join(" "))}</p>`
              : ""
          }
        </section>`
      : "";

  const findings =
    vis.findings
      ? `<section class="section">
          ${sectionHeading(3, "Findings")}
          ${
            includedFindings.length
              ? `<div class="findings-list">${includedFindings.map(findingBlock).join("")}</div>`
              : `<p class="muted">No findings included in this report.</p>`
          }
        </section>`
      : "";

  const actionSections = ACTION_PLAN_GROUPS.map((group) => {
    const items = includedActions.filter((a) => a.group === group);
    if (!items.length) return "";
    return `<div class="action-group">
      <h3><span class="action-priority-label">Priority</span> ${esc(ACTION_PLAN_GROUP_LABEL[group])}</h3>
      <ol class="action-list">
        ${items
          .map(
            (i) =>
              `<li>
                <span class="action-col-label">Action</span>
                <span class="action-text">${esc(i.text)}</span>
              </li>`,
          )
          .join("")}
      </ol>
    </div>`;
  }).join("");

  const actions =
    vis.priorityActionPlan
      ? `<section class="section">
          ${sectionHeading(4, "Priority action plan")}
          <p class="section-lead">Executive roadmap by priority. Expected outcome, timing, and ownership appear only when recorded for this engagement.</p>
          ${actionSections || `<p class="muted">No recommendations included.</p>`}
        </section>`
      : "";

  const assessment =
    vis.professionalAssessment
      ? `<section class="section assessment">
          <div class="assessment-band">
            ${sectionHeading(5, "KXD professional assessment")}
            <p class="section-lead">Strategic conclusion — interpretation, not a second findings list.</p>
          </div>
          ${
            report.workingWell
              ? `<div class="assessment-block"><h3>What is working well</h3>${paragraphs(report.workingWell)}</div>`
              : ""
          }
          ${
            report.losingOpportunity
              ? `<div class="assessment-block"><h3>Where opportunity is being lost</h3>${paragraphs(report.losingOpportunity)}</div>`
              : ""
          }
          ${
            report.recommendedNextSteps
              ? `<div class="assessment-block"><h3>Recommended next steps</h3>${paragraphs(report.recommendedNextSteps)}</div>`
              : ""
          }
          ${
            report.closingNote
              ? `<div class="assessment-block assessment-block--close"><h3>Closing note</h3>${paragraphs(report.closingNote)}</div>`
              : ""
          }
        </section>`
      : "";

  const appendix =
    vis.appendix
      ? `<section class="section appendix">
          ${sectionHeading(6, "Appendix")}
          <p class="section-lead">Methodology and limitations supporting this assessment.</p>
          <div class="appendix-meta">
            <p><span class="field-label">Audit date</span> ${esc(fmtLongDate(report.auditDate))}</p>
            <p><span class="field-label">Audited URL</span> <a href="${esc(report.auditedUrl)}">${esc(report.auditedUrl)}</a></p>
          </div>
          <div class="appendix-grid">
            <div>
              <h3>Checks performed</h3>
              <ul>${report.checksPerformed.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
            </div>
            <div>
              <h3>Methodology</h3>
              <ul>${report.methodologyNotes.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
            </div>
          </div>
          <div class="limitations">
            <h3>Important limitations</h3>
            <ul>${report.limitations.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
          </div>
        </section>`
      : "";

  const closing = `
    <section class="closing" aria-label="Closing">
      ${
        logo.exists
          ? `<img class="closing-mark" src="${esc(logoSrc)}" alt="" width="56" height="53" />`
          : ""
      }
      <p class="closing-brand">${esc(KXD_REPORT_BRAND)}</p>
      <p class="closing-signoff">Website Audit Report</p>
    </section>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(coverDocumentType())} — ${esc(company)}</title>
  <style>
    :root {
      --ink: ${c.ink};
      --black: ${c.richBlack};
      --paper: ${c.paper};
      --ivory: ${c.ivory};
      --muted: ${c.muted};
      --gold: ${c.gold};
      --gold-muted: ${c.goldMuted};
      --gold-soft: ${c.goldSoft};
      --line: ${c.line};
      --panel: ${c.panel};
      --radius: ${radius}px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--ivory);
      color: var(--ink);
      font-family: Georgia, "Iowan Old Style", "Palatino Linotype", Palatino, serif;
      line-height: 1.55;
      -webkit-font-smoothing: antialiased;
    }
    .doc { max-width: 46rem; margin: 0 auto; }
    .cover-page {
      background: var(--black);
      color: ${c.ivoryOnBlack};
      min-height: 92vh;
      padding: 3.5rem 2rem 3.25rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
      break-after: page;
      page-break-after: always;
    }
    .cover-logo {
      width: 7.5rem;
      height: auto;
      margin: 0 0 2.75rem;
      display: block;
    }
    .cover-logo-fallback {
      font-family: system-ui, -apple-system, sans-serif;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      font-size: 0.72rem;
      color: var(--gold);
      margin: 0 0 2.5rem;
    }
    .cover-doc-type {
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.72rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: ${c.mutedOnBlack};
    }
    .cover-rule {
      width: 3.5rem;
      height: 1px;
      background: var(--gold);
      margin: 1.35rem 0 1.5rem;
      opacity: 0.85;
    }
    .cover-page h1 {
      font-weight: 400;
      font-size: clamp(2.15rem, 5vw, 3rem);
      line-height: 1.12;
      margin: 0;
      max-width: 14ch;
      color: ${c.ivoryOnBlack};
      overflow-wrap: anywhere;
    }
    .cover-url {
      margin: 1.15rem 0 0;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.95rem;
      color: ${c.mutedOnBlack};
    }
    .cover-url a { color: inherit; text-decoration-color: var(--gold); }
    .cover-meta {
      margin: 2.5rem 0 0;
      display: grid;
      gap: 0.65rem;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.86rem;
      max-width: 22rem;
    }
    .cover-meta div { display: grid; grid-template-columns: 7.5rem minmax(0,1fr); gap: 0.5rem; }
    .cover-meta dt { color: ${c.mutedOnBlack}; }
    .cover-meta dd { margin: 0; color: ${c.ivoryOnBlack}; }
    .interior {
      background: var(--paper);
      padding: 2.75rem 1.75rem 3.5rem;
      box-shadow: 0 0 0 1px rgba(8,8,8,0.04);
    }
    .eyebrow {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.68rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
      margin: 0 0 0.45rem;
    }
    h2 {
      font-weight: 400;
      font-size: 1.35rem;
      margin: 0;
      line-height: 1.25;
    }
    h3 {
      font-weight: 500;
      font-size: 0.9rem;
      margin: 0 0 0.65rem;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .muted { color: var(--muted); font-family: system-ui, -apple-system, sans-serif; font-size: 0.84rem; }
    .section { margin: 0 0 2.35rem; }
    .section-head {
      display: flex;
      align-items: baseline;
      gap: 0.85rem;
      margin: 0 0 1rem;
      padding-bottom: 0.55rem;
      border-bottom: 1px solid var(--line);
      break-after: avoid;
    }
    .section-num {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.68rem;
      letter-spacing: 0.14em;
      color: var(--gold-muted);
      min-width: 1.5rem;
    }
    .section-lead {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.88rem;
      color: var(--muted);
      margin: -0.15rem 0 1.1rem;
    }
    .prose p, .section p, .assessment-block p {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.94rem;
      margin: 0 0 0.8rem;
    }
    .score-hero { margin-bottom: 1rem; }
    .score-hero__panel {
      background: var(--black);
      color: ${c.ivoryOnBlack};
      border-radius: var(--radius);
      padding: 1.35rem 1.4rem 1.25rem;
      margin-bottom: 0.75rem;
    }
    .score-hero__label {
      display: block;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.66rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: ${c.mutedOnBlack};
      margin-bottom: 0.45rem;
    }
    .score-hero__value {
      font-size: clamp(2.4rem, 6vw, 3.2rem);
      line-height: 1;
      letter-spacing: -0.02em;
      color: ${c.ivoryOnBlack};
    }
    .score-hero__grade {
      margin: 0.75rem 0 0;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.86rem;
      letter-spacing: 0.04em;
      color: var(--gold);
    }
    .score-disclaimer { margin: 0; }
    .score-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 0.45rem;
    }
    .score-card {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 0.7rem 0.55rem;
      background: #fff;
    }
    .score-label {
      display: block;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.62rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }
    .score-value { display: block; margin-top: 0.35rem; font-size: 1.15rem; }
    .finding {
      border-top: 1px solid var(--line);
      padding: 1.15rem 0 1rem;
      break-inside: avoid;
    }
    .finding:first-child { border-top: 0; padding-top: 0.1rem; }
    .finding h3 {
      margin: 0.1rem 0 0.4rem;
      font-family: Georgia, "Iowan Old Style", serif;
      font-size: 1.08rem;
      font-weight: 400;
      line-height: 1.3;
      max-width: 38rem;
    }
    .finding-body, .finding-action, .evidence-line {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.9rem;
    }
    .evidence-line { color: var(--muted); }
    .field-label {
      display: inline;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.7rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--gold-muted);
      margin-right: 0.4rem;
    }
    .action-group {
      margin: 0 0 1.15rem;
      padding: 0.95rem 1rem;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      break-inside: avoid;
    }
    .action-group h3 {
      margin: 0 0 0.7rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      font-size: 0.7rem;
      color: var(--gold-muted);
    }
    .action-priority-label {
      color: var(--muted);
      margin-right: 0.35rem;
      letter-spacing: 0.08em;
    }
    .action-list {
      margin: 0;
      padding: 0;
      list-style: none;
      counter-reset: action;
    }
    .action-list li {
      counter-increment: action;
      display: grid;
      grid-template-columns: 1.5rem 3.5rem minmax(0, 1fr);
      gap: 0.5rem;
      padding: 0.55rem 0;
      border-top: 1px solid rgba(8,8,8,0.06);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.9rem;
      align-items: start;
    }
    .action-list li:first-child { border-top: 0; padding-top: 0; }
    .action-list li::before {
      content: counter(action, decimal-leading-zero);
      color: var(--gold-muted);
      font-size: 0.7rem;
      letter-spacing: 0.06em;
      padding-top: 0.18rem;
    }
    .action-col-label {
      font-size: 0.66rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
      padding-top: 0.18rem;
    }
    .action-text { overflow-wrap: anywhere; }
    .assessment-band {
      background: var(--black);
      color: ${c.ivoryOnBlack};
      padding: 1.25rem 1.25rem 0.45rem;
      border-radius: var(--radius);
      margin-bottom: 1.35rem;
    }
    .assessment-band .section-head {
      border-bottom-color: ${c.lineOnBlack};
      margin-bottom: 0.75rem;
      padding-bottom: 0.65rem;
    }
    .assessment-band h2 {
      color: ${c.ivoryOnBlack};
      font-size: 1.28rem;
      letter-spacing: 0.01em;
    }
    .assessment-band .section-lead {
      color: ${c.mutedOnBlack};
      font-size: 0.84rem;
      max-width: 34rem;
      line-height: 1.45;
      margin: 0 0 0.85rem;
    }
    .assessment-block {
      margin: 0 0 1.35rem;
      padding-left: 1rem;
      border-left: 2px solid var(--gold);
    }
    .assessment-block h3 {
      font-family: Georgia, "Iowan Old Style", serif;
      font-size: 1.02rem;
      font-weight: 400;
      letter-spacing: 0;
      text-transform: none;
      color: var(--ink);
      margin: 0 0 0.55rem;
    }
    .assessment-block p {
      max-width: 38rem;
      line-height: 1.55;
      font-size: 0.92rem;
    }
    .assessment-block--close { margin-bottom: 0; }
    .appendix { opacity: 0.96; }
    .appendix-meta { margin: 0 0 1.1rem; }
    .appendix-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.15rem;
      margin-bottom: 1.1rem;
    }
    .limitations {
      padding: 0.85rem 0.95rem;
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: var(--radius);
      margin-bottom: 0.5rem;
    }
    .limitations h3 { margin-top: 0; color: var(--muted); font-size: 0.78rem; letter-spacing: 0.06em; text-transform: uppercase; }
    .appendix h3 { color: var(--muted); font-size: 0.78rem; letter-spacing: 0.06em; text-transform: uppercase; }
    ol, ul { font-family: system-ui, -apple-system, sans-serif; font-size: 0.84rem; padding-left: 1.1rem; margin: 0; color: var(--muted); }
    li { margin: 0 0 0.35rem; }
    a { color: var(--ink); text-decoration-color: var(--gold); }
    .notice {
      border-left: 2px solid var(--gold);
      padding-left: 0.7rem;
      color: var(--muted);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.84rem;
      margin-top: 0.75rem;
    }
    .closing {
      margin-top: 2.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--line);
      text-align: left;
    }
    .closing-mark {
      width: 2.6rem;
      height: auto;
      display: block;
      margin: 0 0 0.85rem;
    }
    .closing-brand {
      margin: 0 0 0.25rem;
      font-family: system-ui, -apple-system, sans-serif;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-size: 0.68rem;
      color: var(--gold-muted);
    }
    .closing-signoff {
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.82rem;
      color: var(--muted);
    }
    footer.site {
      margin-top: 1.75rem;
      padding-top: 0.85rem;
      border-top: 1px solid var(--line);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.78rem;
      color: var(--muted);
    }
    @page { margin: 0.65in; }
    @media print {
      body { background: white; }
      .cover-page { min-height: 100vh; }
      .interior { box-shadow: none; padding: 0; }
      .section, .finding, .action-group, .assessment-block, .score-hero__panel { break-inside: avoid; }
      h2, h3, .section-head { break-after: avoid; }
    }
    @media (max-width: 900px) {
      .cover-page { padding: 2.75rem 1.5rem 2.5rem; min-height: 85vh; }
      .interior { padding: 2.25rem 1.25rem 3rem; }
      .score-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .appendix-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 700px) {
      .cover-page h1 { max-width: none; font-size: 2rem; }
      .cover-meta div { grid-template-columns: 1fr; gap: 0.12rem; }
      .score-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .action-list li { grid-template-columns: 1.35rem minmax(0, 1fr); }
      .action-col-label { grid-column: 2; padding-top: 0; margin-bottom: -0.1rem; }
    }
  </style>
</head>
<body>
  <article class="doc">
    ${cover}
    <div class="interior">
      ${summary}
      ${scores}
      ${findings}
      ${actions}
      ${assessment}
      ${appendix}
      ${closing}
      <footer class="site">${esc(kxdReportPageFooterLine(domain))}</footer>
    </div>
  </article>
</body>
</html>`;
}

/** Exposed for verify scripts — footer uses shared contact helper. */
export function auditReportHtmlFooterSample(domain: string): string {
  return kxdReportPageFooterLine(domain);
}

export { KXD_REPORT_CONTACT_EMAIL };
