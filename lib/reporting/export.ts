import { monthLabel } from "./templates";
import type { GeneratedReportPayload, ReportDoc } from "./types";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function section(title: string, body: string): string {
  return `
    <section class="kxd-report-section">
      <h2>${esc(title)}</h2>
      <div class="kxd-report-body">${body}</div>
    </section>`;
}

function listItems(items: string[]): string {
  if (items.length === 0) return "<p class=\"kxd-report-muted\">No items this period.</p>";
  return `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
}

export function buildHtmlReport(
  clientName: string,
  month: number,
  year: number,
  payload: GeneratedReportPayload,
): string {
  const label = monthLabel(month, year);
  const kpiGrid = payload.kpis
    .map(
      (k) =>
        `<div class="kxd-report-kpi"><span class="kxd-report-kpi__label">${esc(k.label)}</span><span class="kxd-report-kpi__value">${esc(k.value)}</span></div>`,
    )
    .join("");

  const timeline = payload.timeline
    .slice(0, 20)
    .map(
      (e) =>
        `<div class="kxd-report-timeline-item"><time>${esc(new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }))}</time><strong>${esc(e.title)}</strong>${e.summary ? `<p>${esc(e.summary)}</p>` : ""}</div>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(clientName)} · ${esc(label)} Executive Report</title>
  <style>
    :root { --ink: #080808; --paper: #f5f0e8; --muted: rgba(245,240,232,0.55); }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--ink); color: var(--paper); font-family: Georgia, 'Cormorant Garamond', serif; line-height: 1.6; }
    .kxd-report { max-width: 52rem; margin: 0 auto; padding: 3rem 2rem 4rem; }
    .kxd-report-hero { border-bottom: 1px solid rgba(245,240,232,0.1); padding-bottom: 2rem; margin-bottom: 2.5rem; }
    .kxd-report-eyebrow { font-family: system-ui, sans-serif; font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
    .kxd-report-title { font-size: 2.5rem; font-weight: 400; margin: 0.5rem 0 0; line-height: 1.15; }
    .kxd-report-lead { font-family: system-ui, sans-serif; font-size: 1rem; color: rgba(245,240,232,0.78); margin-top: 1rem; }
    .kxd-report-section { margin-bottom: 2.25rem; }
    .kxd-report-section h2 { font-size: 1.35rem; font-weight: 400; margin: 0 0 0.75rem; }
    .kxd-report-body { font-family: system-ui, sans-serif; font-size: 0.92rem; color: rgba(245,240,232,0.8); }
    .kxd-report-body p { margin: 0 0 0.75rem; white-space: pre-wrap; }
    .kxd-report-kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1.5rem 0; }
    .kxd-report-kpi { padding: 1rem; background: rgba(255,255,255,0.04); border-radius: 4px; }
    .kxd-report-kpi__label { display: block; font-family: system-ui, sans-serif; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
    .kxd-report-kpi__value { display: block; font-size: 1.35rem; margin-top: 0.35rem; }
    .kxd-report-timeline-item { padding: 0.75rem 0; border-bottom: 1px solid rgba(245,240,232,0.06); font-family: system-ui, sans-serif; font-size: 0.875rem; }
    .kxd-report-timeline-item time { display: block; color: var(--muted); font-size: 0.75rem; }
    .kxd-report-muted { color: var(--muted); }
    ul { margin: 0; padding-left: 1.2rem; }
    li { margin-bottom: 0.35rem; }
    @media print {
      body { background: white; color: #111; }
      .kxd-report-kpi { border: 1px solid #ddd; background: #fafafa; }
    }
  </style>
</head>
<body>
  <article class="kxd-report">
    <header class="kxd-report-hero">
      <p class="kxd-report-eyebrow">Kreate by Design · Executive Report</p>
      <h1 class="kxd-report-title">${esc(clientName)}</h1>
      <p class="kxd-report-eyebrow">${esc(label)}</p>
      <p class="kxd-report-lead">${esc(payload.executiveSummary)}</p>
    </header>
    <div class="kxd-report-kpi-grid">${kpiGrid}</div>
    ${section("Work Completed", `<p>${esc(payload.workCompleted)}</p>`)}
    ${section("Top Priorities", listItems(payload.recommendations.topPriorities))}
    ${section("Quick Wins", listItems(payload.recommendations.quickWins))}
    ${section("Infrastructure", listItems(payload.recommendations.infrastructureImprovements))}
    ${section("Growth Opportunities", listItems(payload.recommendations.growthOpportunities))}
    ${section("Completed Wins", listItems(payload.recommendations.completedWins))}
    ${section("Timeline", timeline || "<p class=\"kxd-report-muted\">No major events recorded.</p>")}
    ${section("Next Month", listItems(payload.nextMonthPriorities))}
    <footer class="kxd-report-body kxd-report-muted" style="margin-top:3rem;padding-top:1.5rem;border-top:1px solid rgba(245,240,232,0.08);">
      Prepared by Kreate by Design · Confidential executive report
    </footer>
  </article>
</body>
</html>`;
}

export function buildPortalReportHtml(
  clientName: string,
  month: number,
  year: number,
  payload: GeneratedReportPayload,
): string {
  return buildHtmlReport(clientName, month, year, payload);
}

/** Print-ready PDF architecture — returns HTML with print stylesheet (no external PDF lib) */
export function buildPdfReadyDocument(
  clientName: string,
  month: number,
  year: number,
  payload: GeneratedReportPayload,
): string {
  const html = buildHtmlReport(clientName, month, year, payload);
  return html.replace(
    "@media print {",
    "@page { margin: 0.75in; } @media print {",
  );
}

export function buildReportDownloadFilename(report: ReportDoc): string {
  const month = Number(report.reportingMonth);
  const year = Number(report.reportingYear);
  const name = String(report.title ?? "report")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${name}-${year}-${String(month).padStart(2, "0")}.html`;
}
