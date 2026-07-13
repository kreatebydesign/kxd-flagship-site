/**
 * Phase 31C — Persist ReportingFacts from entitled providers (CLI helper).
 * Production preferred path: POST /api/admin/reporting/ingest (Vercel OIDC).
 *
 * Usage:
 *   npm run ingest:reporting-facts -- --client-slug=primal-motorsports --provider=search-console
 *   npm run ingest:reporting-facts -- --client-id=1 --provider=search-console --year=2026 --month=6
 *
 * Default period: previous completed UTC calendar month.
 */

import {
  parseReportingIngestBody,
  syncReportingFacts,
} from "../lib/reporting/ingest/sync-reporting-facts";

interface CliArgs {
  clientId: number | null;
  clientSlug: string | null;
  provider: "search-console" | "ga4";
  year: number | null;
  month: number | null;
  refresh: boolean;
}

function printUsage(): void {
  console.log(`
Phase 31C — Persist ReportingFacts from entitled providers

Required:
  --client-id=<id>  OR  --client-slug=<slug>
  --provider=search-console|ga4

Optional:
  --year=YYYY --month=M   calendar month (default: previous completed UTC month)
  --refresh               bypass provider success cache

Prefer production:
  POST /api/admin/reporting/ingest  (admin session or CRON_SECRET)
`);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    clientId: null,
    clientSlug: null,
    provider: "search-console",
    year: null,
    month: null,
    refresh: false,
  };

  for (const raw of argv) {
    if (raw === "--help" || raw === "-h") {
      printUsage();
      process.exit(0);
    }
    if (raw === "--refresh") {
      args.refresh = true;
      continue;
    }
    if (raw.startsWith("--client-id=")) {
      const n = Number(raw.slice("--client-id=".length));
      args.clientId = Number.isFinite(n) && n > 0 ? n : null;
      continue;
    }
    if (raw.startsWith("--client-slug=")) {
      args.clientSlug = raw.slice("--client-slug=".length).trim() || null;
      continue;
    }
    if (raw.startsWith("--provider=")) {
      const v = raw.slice("--provider=".length);
      if (v === "ga4" || v === "search-console") args.provider = v;
      else {
        console.error(`Unknown provider: ${v}`);
        process.exit(1);
      }
      continue;
    }
    if (raw.startsWith("--year=")) {
      args.year = Number(raw.slice("--year=".length));
      continue;
    }
    if (raw.startsWith("--month=")) {
      args.month = Number(raw.slice("--month=".length));
      continue;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const parsed = parseReportingIngestBody({
    clientId: args.clientId,
    clientSlug: args.clientSlug,
    provider: args.provider,
    year: args.year,
    month: args.month,
    refresh: args.refresh,
  });
  if ("error" in parsed) {
    console.error(parsed.error);
    printUsage();
    process.exit(1);
  }

  const result = await syncReportingFacts(parsed);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 2);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
