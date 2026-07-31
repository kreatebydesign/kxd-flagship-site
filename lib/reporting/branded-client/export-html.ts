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

export function buildBrandedReportHtml(
  snapshot: BrandedReportSnapshot,
  options?: { includeInternalNotes?: boolean },
): string {
  const clientFacing = options?.includeInternalNotes
    ? snapshot
    : stripInternalNotesFromSnapshot(snapshot);
  const c = KXD_REPORT_COLORS;
  const scopeLabels = clientFacing.scope.includedCapabilities
    .map((id) => REPORT_SCOPE_LABEL[id])
    .join(" · ");

  const metricsHtml = clientFacing.metrics
    .map((m) => {
      return `<div class="metric">
        <div class="metric-label">${escapeHtml(m.label)}</div>
        <div class="metric-value">${escapeHtml(m.displayValue)}</div>
        <div class="metric-meta">${escapeHtml(m.percentChangeLabel)} · ${escapeHtml(m.source)} · ${escapeHtml(m.completeness)}</div>
        ${m.note ? `<div class="metric-note">${escapeHtml(m.note)}</div>` : ""}
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

  const outOfScopeHtml = clientFacing.outOfScopeOpportunities
    .map(
      (o) =>
        `<li><strong>${escapeHtml(o.title)}</strong> — ${escapeHtml(o.summary)} <em>${escapeHtml(o.upgradeFraming)}</em></li>`,
    )
    .join("\n");

  const sections = Object.values(clientFacing.narratives)
    .map((section) => {
      // Skip empty out-of-scope channel sections that say "not included"
      return `<section class="section">
        <h2>${escapeHtml(section.title)}</h2>
        <p class="provenance">${escapeHtml(section.provenance)}</p>
        <div class="body">${escapeHtml(section.body).replace(/\n/g, "<br/>")}</div>
      </section>`;
    })
    .join("\n");

  const internalBlock =
    options?.includeInternalNotes && clientFacing.internalNotes
      ? `<section class="section internal"><h2>Internal notes (operator only)</h2><p>${escapeHtml(clientFacing.internalNotes)}</p></section>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(KXD_REPORT_BRAND)} — Monthly Performance Report — ${escapeHtml(clientFacing.clientName)}</title>
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
    background: var(--paper);
    color: var(--ink);
    font-family: ${KXD_REPORT_TYPE.body};
    line-height: 1.5;
  }
  .cover {
    background: var(--black);
    color: var(--ivory);
    padding: 4.5rem 2.5rem 3.5rem;
    min-height: 70vh;
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
    max-width: 18ch;
  }
  .cover-meta { color: ${c.mutedOnBlack}; font-size: 0.92rem; margin: 0.25rem 0; }
  .wrap { max-width: 52rem; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }
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
  .metric-label {
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${c.goldMuted};
    margin-bottom: 0.35rem;
  }
  .metric-value {
    font-family: ${KXD_REPORT_TYPE.display};
    font-size: 1.45rem;
  }
  .metric-meta, .metric-note {
    color: var(--muted);
    font-size: 0.78rem;
    margin-top: 0.35rem;
  }
  .panel {
    border: 1px solid var(--line);
    background: #fff;
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
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }
</style>
</head>
<body>
  <header class="cover">
    <div class="cover-eyebrow">${escapeHtml(KXD_REPORT_BRAND)}</div>
    <div class="cover-rule"></div>
    <h1>Monthly Performance Report</h1>
    <p class="cover-meta">${escapeHtml(clientFacing.clientName)}</p>
    <p class="cover-meta">${escapeHtml(clientFacing.period.label)}</p>
    <p class="cover-meta">Timezone: ${escapeHtml(clientFacing.period.timezone)}</p>
    <p class="cover-meta">Confidential · Client-facing</p>
    <p class="cover-meta">Services included: ${escapeHtml(scopeLabels || "None confirmed")}</p>
  </header>
  <main class="wrap">
    <div class="panel">
      <strong>Data freshness</strong>
      <ul>${sourcesHtml || "<li>No data sources recorded.</li>"}</ul>
      ${
        clientFacing.period.excludesFinalDayNote
          ? `<p>${escapeHtml(clientFacing.period.excludesFinalDayNote)}</p>`
          : ""
      }
    </div>
    <section class="section">
      <h2>Performance snapshot</h2>
      <div class="metrics">${metricsHtml || "<p>No entitled metrics available for this period.</p>"}</div>
    </section>
    ${sections}
    <section class="section">
      <h2>Work completed</h2>
      <ul>${workHtml || "<li>No client-visible completed work included.</li>"}</ul>
    </section>
    ${
      outOfScopeHtml
        ? `<section class="section"><h2>Optional upgrades (not included)</h2><ul>${outOfScopeHtml}</ul></section>`
        : ""
    }
    ${internalBlock}
    <footer>
      <p>${escapeHtml(kxdReportContactLine())}</p>
      <p>Generated ${escapeHtml(clientFacing.generatedAt.slice(0, 10))} · Version ${clientFacing.version} · Fingerprint ${escapeHtml(clientFacing.fingerprint.slice(0, 12))}…</p>
      <p>Questions: ${escapeHtml(KXD_REPORT_CONTACT_EMAIL)}</p>
    </footer>
  </main>
</body>
</html>`;
}
