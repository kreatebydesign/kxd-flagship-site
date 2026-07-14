/**
 * Phase 33A — CLI companion for the Automated Reporting Engine.
 *
 *   npm run reporting:sweep
 *   npm run reporting:sweep -- --dry-run
 *   npm run reporting:sweep -- --force --client-slug=primal-motorsports
 */

import { runReportingAutomationSweep } from "../lib/reporting/automation/server";

function parseArgs(argv: string[]) {
  let dryRun = false;
  let force = false;
  let clientId: number | null = null;
  let clientSlug: string | null = null;

  for (const arg of argv) {
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--force") force = true;
    else if (arg.startsWith("--client-id=")) {
      const n = Number(arg.slice("--client-id=".length));
      clientId = Number.isFinite(n) ? n : null;
    } else if (arg.startsWith("--client-slug=")) {
      clientSlug = arg.slice("--client-slug=".length).trim() || null;
    }
  }

  return { dryRun, force, clientId, clientSlug };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log("\nPhase 33A — reporting automation sweep");
  console.log(
    `Mode: ${args.dryRun ? "DRY-RUN" : "APPLY"} · force=${args.force ? "yes" : "no"}`,
  );

  const summary = await runReportingAutomationSweep(args);

  console.log("\nSummary");
  console.log(`  clients considered: ${summary.clientsConsidered}`);
  console.log(`  clients run:        ${summary.clientsRun}`);
  console.log(`  capacity skipped:   ${summary.clientsSkippedCapacity}`);
  console.log(`  provider attempts:  ${summary.providerAttempts}`);
  console.log(`  synced:             ${summary.providerSynced}`);
  console.log(`  failed:             ${summary.providerFailed}`);
  console.log(`  skipped:            ${summary.providerSkipped}`);
  console.log(`  deferred:           ${summary.providerDeferred}`);
  console.log(`  truncated:          ${summary.truncated ? "yes" : "no"}`);
  console.log(`  dry-run:            ${summary.dryRun ? "yes (zero mutations)" : "no"}`);

  for (const client of summary.clients) {
    console.log(`\n${client.clientName} (${client.clientSlug ?? client.clientId})`);
    for (const p of client.providers) {
      console.log(
        `  · ${p.provider}: ${p.outcome}/${p.integrationStatus} — ${p.message}` +
          (p.windowId ? ` [window ${p.windowId}]` : "") +
          (p.nextScheduledSyncAt ? ` (next ${p.nextScheduledSyncAt})` : ""),
      );
    }
  }

  if (summary.warnings.length) {
    console.log("\nWarnings:");
    for (const w of summary.warnings) console.log(`  - ${w}`);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
