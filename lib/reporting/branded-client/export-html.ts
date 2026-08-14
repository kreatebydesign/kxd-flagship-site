/**
 * HTML preview for branded monthly client reports.
 * Visually aligned with KXD Report Engine tokens; used for operator review.
 */

import {
  KXD_REPORT_BRAND,
  KXD_REPORT_CONTACT_EMAIL,
  kxdReportContactLine,
} from "@/lib/kxd-report-engine/contact";
import { KXD_REPORT_COLORS, KXD_REPORT_TYPE } from "@/lib/kxd-report-engine/tokens";
import { REPORT_SCOPE_LABEL } from "./types";
import type { BrandedReportSnapshot } from "./types";
import { escapeHtml, stripInternalNotesFromSnapshot } from "./sanitize";
import { isNarrativeHidden, narrativeTitleForSnapshot } from "./presentation";

function renderMetricCard(
  snapshot: BrandedReportSnapshot,
  metricHtml: string,
): string {
  const audit = snapshot.presentation?.useAuditTheme === true;
  return metricHtml
    .split("\n")
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (!audit) return block;
      return block.replace('class="metric"', 'class="metric metric--audit"');
    })
    .join("\n");
}

export function buildBrandedReportHtml(
  snapshot: BrandedReportSnapshot,
  options?: { includeInternalNotes?: boolean },
): string {
  const clientFacing = options?.includeInternalNotes
    ? snapshot
    : stripInternalNotesFromSnapshot(snapshot);
  const c = KXD_REPORT_COLORS;
  const presentation = clientFacing.presentation;
  const auditTheme = presentation?.useAuditTheme === true;
  const documentTitle = presentation?.documentTitle ?? "Monthly Performance Report";
  const coverTitle = presentation?.coverTitle ?? "Monthly Performance Report";
  const coverEyebrow = presentation?.coverEyebrow ?? KXD_REPORT_BRAND;
  const scopeLabels = clientFacing.scope.includedCapabilities
    .map((id) => REPORT_SCOPE_LABEL[id])
    .join(" · ");

  const metricsHtml = clientFacing.metrics
    .map((m) => {
      const meta = auditTheme
        ? `${escapeHtml(m.source)}${m.note ? ` · ${escapeHtml(m.note)}` : ""}`
        : `${escapeHtml(m.percentChangeLabel)} · ${escapeHtml(m.source)} · ${escapeHtml(m.completeness)}`;
      return `<div class="metric">
        <div class="metric-label">${escapeHtml(m.label)}</div>
        <div class="metric-value">${escapeHtml(m.displayValue)}</div>
        <div class="metric-meta">${meta}</div>
      </div>`;
    })
    .join("\n");

  const sourcesHtml = clientFacing.dataSources
    .map((s) => {
      return `<li><strong>${escapeHtml(s.label)}</strong> — ${
        s.includedInReport ? "Included" : "Not included"
      }; ${s.connected ? "Connected" : "Not connected"}; ${escapeHtml(s.statusNote)}</li>`;
    })
    .join("\n");

  const workHtml = clientFacing.workCompleted
    .filter((w) => w.included && w.clientVisible)
    .map(
      (w) =>
        `<li><strong>${escapeHtml(w.title)}</strong>${
          w.summary ? ` — ${escapeHtml(w.summary)}` : ""
        }</li>`,
    )
    .join("\n");

  const outOfScopeHtml = presentation?.hideOutOfScope
    ? ""
    : clientFacing.outOfScopeOpportunities
        .map(
          (o) =>
            `<li><strong>${escapeHtml(o.title)}</strong> — ${escapeHtml(o.summary)} <em>${escapeHtml(o.upgradeFraming)}</em></li>`,
        )
        .join("\n");

  const narrativeKeys = Object.keys(clientFacing.narratives) as Array<
    keyof BrandedReportSnapshot["narratives"]
  >;

  const sections = narrativeKeys
    .filter((key) => !isNarrativeHidden(clientFacing, key))
    .map((key) => {
      const section = clientFacing.narratives[key];
      if (!section.body.trim()) return "";
      const provenance = presentation?.hideNarrativeProvenance
        ? ""
        : `<p class="provenance">${escapeHtml(section.provenance)}</p>`;
      return `<section class="section">
        <h2>${escapeHtml(narrativeTitleForSnapshot(clientFacing, key))}</h2>
        ${provenance}
        <div class="body">${escapeHtml(section.body).replace(/\n/g, "<br/>")}</div>
      </section>`;
    })
    .filter(Boolean)
    .join("\n");

  const internalBlock =
    options?.includeInternalNotes && clientFacing.internalNotes
      ? `<section class="section internal"><h2>Internal notes (operator only)</h2><p>${escapeHtml(clientFacing.internalNotes)}</p></section>`
      : "";

  const freshnessPanel =
    presentation?.hideDataFreshnessPanel === true
      ? ""
      : `<div class="panel">
      <strong>Data freshness</strong>
      <ul>${sourcesHtml || "<li>No data sources recorded.</li>"}</ul>
      ${
        clientFacing.period.excludesFinalDayNote
          ? `<p>${escapeHtml(clientFacing.period.excludesFinalDayNote)}</p>`
          : ""
      }
    </div>`;

  const performanceLead = presentation?.performanceSnapshotLead
    ? `<p class="snapshot-lead">${escapeHtml(presentation.performanceSnapshotLead)}</p>`
    : "";

  const workSection =
    presentation?.hideWorkCompletedList === true
      ? ""
      : `<section class="section">
      <h2>Work completed</h2>
      <ul>${workHtml || "<li>No client-visible completed work included.</li>"}</ul>
    </section>`;

  const bodyBg = auditTheme ? c.richBlack : c.paper;
  const wrapBg = auditTheme ? "transparent" : "transparent";
  const textColor = auditTheme ? c.ivory : c.ink;
  const panelBg = auditTheme ? "#111111" : "#fff";
  const panelBorder = auditTheme ? c.lineOnBlack : c.line;
  const metricBg = auditTheme ? "#141414" : c.panel;
  const muted = auditTheme ? c.mutedOnBlack : c.muted;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(KXD_REPORT_BRAND)} — ${escapeHtml(documentTitle)} — ${escapeHtml(clientFacing.clientName)}</title>
<style>
  :root {
    --black: ${c.richBlack};
    --ink: ${textColor};
    --ivory: ${c.ivory};
    --paper: ${bodyBg};
    --gold: ${c.gold};
    --muted: ${muted};
    --line: ${panelBorder};
    --panel: ${metricBg};
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--paper);
    color: var(--ink);
    font-family: ${KXD_REPORT_TYPE.body};
    line-height: 1.55;
  }
  .cover {
    background: var(--black);
    color: var(--ivory);
    padding: 4.5rem 2.5rem 3.5rem;
    min-height: ${auditTheme ? "52vh" : "70vh"};
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .cover-eyebrow {
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-size: 0.72rem;
    color: ${c.mutedOnBlack};
    margin-bottom: 0.75rem;
  }
  .cover-rule {
    width: 2.6rem;
    height: 1px;
    background: var(--gold);
    margin-bottom: 1.1rem;
  }
  .cover h1 {
    font-family: ${KXD_REPORT_TYPE.display};
    font-weight: 500;
    font-size: clamp(1.8rem, 4vw, 2.6rem);
    margin: 0 0 0.75rem;
    max-width: ${auditTheme ? "22ch" : "18ch"};
  }
  .cover-meta { color: ${c.mutedOnBlack}; font-size: 0.92rem; margin: 0.25rem 0; }
  .wrap {
    max-width: 52rem;
    margin: 0 auto;
    padding: 2.5rem 1.5rem 4rem;
    background: ${wrapBg};
  }
  h2 {
    font-family: ${KXD_REPORT_TYPE.display};
    font-size: 1.25rem;
    margin: 0 0 0.35rem;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid var(--line);
  }
  .section { margin: 2rem 0; }
  .provenance {
    color: var(--muted);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 0 0 0.75rem;
  }
  .body { white-space: pre-wrap; }
  .snapshot-lead {
    color: var(--muted);
    font-size: 0.92rem;
    margin: 0 0 1rem;
    max-width: 62ch;
  }
  .metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: 0.75rem;
    margin: 1.25rem 0;
  }
  .metric {
    border: 1px solid var(--line);
    background: var(--panel);
    padding: 0.9rem;
  }
  .metric--audit .metric-value {
    font-size: 1.25rem;
  }
  .metric-label {
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${auditTheme ? c.gold : c.goldMuted};
    margin-bottom: 0.35rem;
  }
  .metric-value {
    font-family: ${KXD_REPORT_TYPE.display};
    font-size: 1.45rem;
  }
  .metric-meta {
    color: var(--muted);
    font-size: 0.78rem;
    margin-top: 0.35rem;
  }
  .panel {
    border: 1px solid var(--line);
    background: ${panelBg};
    padding: 1rem 1.1rem;
    margin: 1rem 0;
  }
  .internal { border-color: #c45; background: #fff5f5; }
  footer {
    margin-top: 3rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
    color: var(--muted);
    font-size: 0.85rem;
  }
  @media (max-width: 640px) {
    .cover { padding: 3rem 1.25rem 2.5rem; }
    .wrap { padding: 1.75rem 1rem 3rem; }
    .metrics { grid-template-columns: 1fr 1fr; }
  }
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }
</style>
</head>
<body>
  <header class="cover">
    <div class="cover-eyebrow">${escapeHtml(coverEyebrow)}</div>
    <div class="cover-rule"></div>
    <h1>${escapeHtml(coverTitle)}</h1>
    <p class="cover-meta">${escapeHtml(clientFacing.clientName)}</p>
    <p class="cover-meta">${escapeHtml(clientFacing.period.label)}</p>
    <p class="cover-meta">Timezone: ${escapeHtml(clientFacing.period.timezone)}</p>
    <p class="cover-meta">Confidential · Client-facing</p>
    ${
      auditTheme
        ? ""
        : `<p class="cover-meta">Services included: ${escapeHtml(scopeLabels || "None confirmed")}</p>`
    }
  </header>
  <main class="wrap">
    ${freshnessPanel}
    <section class="section">
      <h2>Performance snapshot</h2>
      ${performanceLead}
      <div class="metrics">${renderMetricCard(clientFacing, metricsHtml) || "<p>No entitled metrics available for this period.</p>"}</div>
    </section>
    ${sections}
    ${workSection}
    ${
      outOfScopeHtml
        ? `<section class="section"><h2>Optional upgrades (not included)</h2><ul>${outOfScopeHtml}</ul></section>`
        : ""
    }
    ${internalBlock}
    <footer>
      <p>${escapeHtml(kxdReportContactLine())}</p>
      <p>Generated ${escapeHtml(clientFacing.generatedAt.slice(0, 10))} · Version ${clientFacing.version}</p>
      <p>Questions: ${escapeHtml(KXD_REPORT_CONTACT_EMAIL)}</p>
    </footer>
  </main>
</body>
</html>`;
}
