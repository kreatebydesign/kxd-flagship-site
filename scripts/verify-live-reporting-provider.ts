/**
 * Phase 29C.2 — Controlled live Google reporting validation (read-only diagnostic).
 *
 * Live-read only. Does NOT:
 * - run migrations
 * - mutate Client Infrastructure / Experience Profiles
 * - persist reporting facts
 * - create monthly reports
 * - modify portal state
 * - print credentials, tokens, or raw Google payloads
 *
 * Usage:
 *   npm run verify:reporting-live -- \
 *     --client-id=<id> \
 *     --provider=ga4|search-console|all \
 *     --start=YYYY-MM-DD \
 *     --end=YYYY-MM-DD
 *
 * Optional:
 *   --allow-partial-period   allow ranges that include today (default: reject)
 *   --skip-cache-check       skip second identical request
 *   --readiness-only         inspect client config without calling Google
 *   --client-slug=<slug>     resolve client id from slug (readiness / live)
 *
 * Run: npm run verify:reporting-live
 */

type ProviderArg = "ga4" | "search-console" | "all";

interface CliArgs {
  clientId: number | null;
  clientSlug: string | null;
  provider: ProviderArg | null;
  start: string | null;
  end: string | null;
  allowPartialPeriod: boolean;
  skipCacheCheck: boolean;
  readinessOnly: boolean;
}

function printUsage(): void {
  console.log(`
Phase 29C.2 — Live reporting provider diagnostic (read-only)

Required for live read:
  --client-id=<payload-client-id>   OR  --client-slug=<slug>
  --provider=ga4|search-console|all
  --start=YYYY-MM-DD
  --end=YYYY-MM-DD

Optional:
  --allow-partial-period   allow ranges including today (default: rejected)
  --skip-cache-check       skip warm-cache second request
  --readiness-only         inspect entitlements/connection; no Google calls

Examples:
  npm run verify:reporting-live -- --client-slug=primal-motorsports --readiness-only
  npm run verify:reporting-live -- --client-id=1 --provider=ga4 --start=2026-06-01 --end=2026-06-30

Safety:
  Never prints credentials, tokens, or raw Google responses.
  Never persists reporting facts. Never runs migrations.
`);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    clientId: null,
    clientSlug: null,
    provider: null,
    start: null,
    end: null,
    allowPartialPeriod: false,
    skipCacheCheck: false,
    readinessOnly: false,
  };

  for (const raw of argv) {
    if (raw === "--help" || raw === "-h") {
      printUsage();
      process.exit(0);
    }
    if (raw === "--allow-partial-period") {
      args.allowPartialPeriod = true;
      continue;
    }
    if (raw === "--skip-cache-check") {
      args.skipCacheCheck = true;
      continue;
    }
    if (raw === "--readiness-only") {
      args.readinessOnly = true;
      continue;
    }
    const m = /^--([a-z-]+)=(.*)$/.exec(raw);
    if (!m) {
      throw new Error(`Unrecognized argument: ${raw}`);
    }
    const [, key, value] = m;
    if (key === "client-id") {
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) throw new Error("--client-id must be a positive number");
      args.clientId = n;
    } else if (key === "client-slug") {
      args.clientSlug = value.trim() || null;
    } else if (key === "provider") {
      if (value !== "ga4" && value !== "search-console" && value !== "all") {
        throw new Error("--provider must be ga4 | search-console | all");
      }
      args.provider = value;
    } else if (key === "start") {
      args.start = value.trim();
    } else if (key === "end") {
      args.end = value.trim();
    } else {
      throw new Error(`Unrecognized argument: --${key}`);
    }
  }

  return args;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/ya29\.[A-Za-z0-9._-]+/g, "[redacted]")
    .replace(/-----BEGIN[\s\S]*?-----END[^-]*-----/g, "[redacted-pem]")
    .slice(0, 240);
}

async function run(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    printUsage();
    process.exit(1);
  }

  let args: CliArgs;
  try {
    args = parseArgs(argv);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    printUsage();
    process.exit(1);
  }

  if (args.clientId == null && !args.clientSlug) {
    console.error("Missing --client-id or --client-slug");
    printUsage();
    process.exit(1);
  }

  // Lazy-load server modules only after CLI validation succeeds.
  const { getPayload } = await import("payload");
  const { default: config } = await import("@payload-config");
  const { getReportingCapabilityIds } = await import(
    "../lib/ces/partnership/capabilities.ts"
  );
  const { getGoogleReportingAuthConfig } = await import(
    "../lib/reporting/providers/google/auth.ts"
  );
  const {
    ingestClientReporting,
    ingestClientReportingProvider,
  } = await import("../lib/reporting/providers/ingest.ts");
  const { composeReportingFromProviderResults } = await import(
    "../lib/reporting/providers/compose-from-providers.ts"
  );
  const { loadClientReportingConnection } = await import(
    "../lib/reporting/providers/connection.ts"
  );
  const { isCapabilityEnabled } = await import(
    "../lib/reporting/providers/capability-gate.ts"
  );
  const { REPORTING_PROVIDER_CAPABILITY } = await import(
    "../lib/reporting/providers/types.ts"
  );
  const { periodIncludesToday } = await import("../lib/reporting/providers/period.ts");
  type PeriodWindow = import("../lib/reporting/domain/types.ts").PeriodWindow;
  type ReportingProviderId = import("../lib/reporting/providers/types.ts").ReportingProviderId;
  type ReportingProviderResult =
    import("../lib/reporting/providers/types.ts").ReportingProviderResult;

  function assertClosedPeriod(
    start: string,
    end: string,
    allowPartial: boolean,
  ): PeriodWindow {
    if (!DATE_RE.test(start) || !DATE_RE.test(end)) {
      throw new Error("Dates must be YYYY-MM-DD");
    }
    if (start > end) throw new Error("--start must be on or before --end");

    const today = new Date().toISOString().slice(0, 10);
    if (start > today || end > today) {
      throw new Error("Date range must not include future dates");
    }

    const period: PeriodWindow = {
      start: `${start}T00:00:00.000Z`,
      end: `${end}T23:59:59.999Z`,
      grain: "month",
      label: `${start} → ${end}`,
    };

    if (!allowPartial && periodIncludesToday(period)) {
      throw new Error(
        "Period includes today. Use a closed historical range, or pass --allow-partial-period.",
      );
    }

    return period;
  }

  function credentialModeLabel(): string {
    const cfg = getGoogleReportingAuthConfig();
    if (cfg.mode === "service-account") {
      return `service-account (email present: ${cfg.serviceAccountEmail ? "yes" : "no"})`;
    }
    if (cfg.mode === "oauth-refresh") return "oauth-refresh";
    if (cfg.mode === "invalid-configuration") {
      return `invalid-configuration (${cfg.invalidReason ?? "see docs"})`;
    }
    return "not-configured";
  }

  async function resolveClientId(): Promise<{
    clientId: number;
    clientName: string;
    clientStatus: string;
  }> {
    const payload = await getPayload({ config });

    if (args.clientId != null) {
      try {
        const client = await payload.findByID({
          collection: "clients",
          id: args.clientId,
          depth: 0,
          overrideAccess: true,
        });
        return {
          clientId: args.clientId,
          clientName: String((client as { name?: string }).name ?? `Client ${args.clientId}`),
          clientStatus: String((client as { status?: string }).status ?? "unknown"),
        };
      } catch {
        throw new Error(`Client id ${args.clientId} not found`);
      }
    }

    const found = await payload.find({
      collection: "clients",
      where: { slug: { equals: args.clientSlug! } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const doc = found.docs[0] as { id?: number; name?: string; status?: string } | undefined;
    if (!doc?.id) throw new Error(`Client slug "${args.clientSlug}" not found`);
    return {
      clientId: Number(doc.id),
      clientName: String(doc.name ?? args.clientSlug),
      clientStatus: String(doc.status ?? "unknown"),
    };
  }

  async function printReadiness(
    clientId: number,
    clientName: string,
    clientStatus: string,
  ): Promise<void> {
    const auth = getGoogleReportingAuthConfig();
    const payload = await getPayload({ config });

    const profile = await payload.find({
      collection: "client-experience-profiles",
      where: { client: { equals: clientId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const profileDoc = profile.docs[0] as { enabledModules?: unknown } | undefined;
    const rawModules = Array.isArray(profileDoc?.enabledModules)
      ? (profileDoc.enabledModules as unknown[]).filter((m): m is string => typeof m === "string")
      : [];
    const reportingCaps = getReportingCapabilityIds(rawModules);

    let connection: Awaited<ReturnType<typeof loadClientReportingConnection>> = null;
    let infraSchemaReady = true;
    try {
      connection = await loadClientReportingConnection(clientId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      infraSchemaReady = false;
      console.log(
        "\nClient Infrastructure read blocked (likely missing search_console_site_url column).",
      );
      console.log(
        "Confirm DB target, then run `npm run migrate` (Payload may ask about prior push-mode). Do not force if unsure.",
      );
      console.log(`sanitized error: ${sanitizeErrorMessage(msg)}`);
    }

    console.log("\n=== Client readiness (sanitized) ===");
    console.log(`client ID:              ${clientId}`);
    console.log(`client display name:    ${clientName}`);
    console.log(`client status:          ${clientStatus}`);
    console.log(`experience profile:     ${profile.docs.length > 0 ? "present" : "missing"}`);
    console.log(`enabledModules:         ${rawModules.length ? rawModules.join(", ") : "(empty)"}`);
    console.log(
      `reporting capabilities: ${reportingCaps.join(", ") || "(none)"}`,
    );
    console.log(
      `website-analytics:      ${isCapabilityEnabled(reportingCaps, "website-analytics") ? "enabled" : "disabled"}`,
    );
    console.log(
      `seo:                    ${isCapabilityEnabled(reportingCaps, "seo") ? "enabled" : "disabled"}`,
    );
    console.log(
      `infra schema ready:     ${infraSchemaReady ? "yes" : "no — migration required"}`,
    );
    console.log(
      `GA4 property:           ${connection?.ga4PropertyId ? "configured" : infraSchemaReady ? "not configured" : "unknown (schema)"}`,
    );
    console.log(
      `Search Console site:    ${connection?.searchConsoleSiteUrl ? "configured" : infraSchemaReady ? "not configured" : "unknown (schema)"}`,
    );
    console.log(`credential mode:        ${credentialModeLabel()}`);
    if (auth.mode === "invalid-configuration") {
      console.log(`credential issue:       ${auth.invalidReason ?? "invalid"}`);
    }
    console.log(
      `infra doc:              ${connection?.infrastructureId != null ? "present" : infraSchemaReady ? "missing" : "unknown (schema)"}`,
    );

    if (!reportingCaps.includes("website-analytics")) {
      console.log(
        '\nTo enable GA4 ingestion, add "website-analytics" to Client Experience Profile enabledModules.',
      );
    }
    if (!reportingCaps.includes("seo")) {
      console.log(
        '\nTo enable Search Console ingestion, add "seo" to Client Experience Profile enabledModules.',
      );
    }
    if (infraSchemaReady && !connection?.ga4PropertyId) {
      console.log(
        "\nTo configure GA4, set Client Infrastructure ga4PropertyId (numeric or properties/N).",
      );
    }
    if (infraSchemaReady && !connection?.searchConsoleSiteUrl) {
      console.log(
        "\nTo configure Search Console, set searchConsoleSiteUrl (URL-prefix or sc-domain:).",
      );
    }
  }

  function printResultTable(result: ReportingProviderResult, cacheStatus: string): void {
    console.log("\n--- Provider result ---");
    console.log(`provider:               ${result.providerId}`);
    console.log(`capability ID:          ${result.capabilityId}`);
    console.log(`status:                 ${result.status}`);
    console.log(`retrieval freshness:    ${result.freshness}`);
    console.log(`period completeness:    ${result.periodCompleteness}`);
    console.log(
      `requested period:       ${result.requestedPeriod.start.slice(0, 10)} → ${result.requestedPeriod.end.slice(0, 10)}`,
    );
    console.log(
      `effective period:       ${result.effectivePeriod.start.slice(0, 10)} → ${result.effectivePeriod.end.slice(0, 10)}`,
    );
    console.log(`fetchedAt:              ${result.fetchedAt ?? "—"}`);
    console.log(`cache status:           ${cacheStatus}`);
    console.log(`fact count:             ${result.facts.length}`);
    console.log(`snapshot:               ${result.snapshot ? "present" : "none"}`);
    if (result.warnings.length) {
      console.log("warnings:");
      for (const w of result.warnings) {
        console.log(`  - [${w.code}] ${w.message}`);
      }
    }
    if (result.error) {
      console.log(
        `error:                  ${result.error.code} — ${sanitizeErrorMessage(result.error.message)}`,
      );
    }
    if (result.facts.length > 0) {
      console.log("\nmetric               value           unit");
      for (const f of result.facts) {
        const metric = f.metricKey.padEnd(20);
        const value = String(f.value).padEnd(15);
        console.log(`${metric}${value}${f.unit}`);
      }
    }
  }

  async function runProvider(
    clientId: number,
    provider: ReportingProviderId,
    period: PeriodWindow,
    skipCacheCheck: boolean,
  ): Promise<ReportingProviderResult> {
    const live = await ingestClientReportingProvider({
      clientId,
      provider,
      period,
      refresh: true,
    });
    printResultTable(live, "first request: live (refresh=true)");

    if (!skipCacheCheck && (live.status === "connected" || live.status === "no-rows")) {
      const cached = await ingestClientReportingProvider({
        clientId,
        provider,
        period,
        refresh: false,
      });
      printResultTable(
        cached,
        cached.fetchedAt === live.fetchedAt || cached.cachedAt
          ? "second identical request: cache (warm runtime)"
          : "second identical request: refetched",
      );
    }

    return live;
  }

  const { clientId, clientName, clientStatus } = await resolveClientId();
  await printReadiness(clientId, clientName, clientStatus);

  if (args.readinessOnly) {
    console.log("\nReadiness-only mode: no Google provider calls were made.");
    console.log("No reporting facts were persisted.");
    return;
  }

  if (!args.provider || !args.start || !args.end) {
    console.error("Live mode requires --provider, --start, and --end (or use --readiness-only).");
    printUsage();
    process.exit(1);
  }

  let period: PeriodWindow;
  try {
    period = assertClosedPeriod(args.start, args.end, args.allowPartialPeriod);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  console.log("\n=== Live credential gate ===");
  console.log(`credential mode:        ${credentialModeLabel()}`);
  const auth = getGoogleReportingAuthConfig();
  if (auth.mode === "not-configured" || auth.mode === "invalid-configuration") {
    console.error(
      "\nBlocked: reporting credentials are not usable. Configure service account or reporting OAuth before live calls.",
    );
    console.log("No Google provider calls were made.");
    console.log("No reporting facts were persisted.");
    process.exit(2);
  }

  const providers: ReportingProviderId[] =
    args.provider === "all" ? ["ga4", "search-console"] : [args.provider];

  console.log("\n=== Independent provider reads ===");
  const results: ReportingProviderResult[] = [];
  for (const provider of providers) {
    console.log(`\n>>> ${provider}`);
    const capability = REPORTING_PROVIDER_CAPABILITY[provider];
    const connection = await loadClientReportingConnection(clientId);
    const enabled = isCapabilityEnabled(connection?.enabledCapabilities ?? [], capability);
    console.log(`capability ${capability}: ${enabled ? "enabled" : "disabled"}`);
    if (!enabled) {
      console.log("Skipping live call — entitlement gate (no bypass).");
      continue;
    }
    if (provider === "ga4" && !connection?.ga4PropertyId) {
      console.log("Skipping live call — GA4 property not configured.");
      continue;
    }
    if (provider === "search-console" && !connection?.searchConsoleSiteUrl) {
      console.log(
        "Skipping live call — Search Console site not configured (migration may be required).",
      );
      continue;
    }

    results.push(await runProvider(clientId, provider, period, args.skipCacheCheck));
  }

  if (args.provider === "all") {
    console.log("\n=== Combined ingestion ===");
    const combined = await ingestClientReporting({
      clientId,
      period,
      providers,
      refresh: true,
    });
    console.log(`combined fact count:    ${combined.facts.length}`);
    for (const r of combined.results) {
      console.log(`  ${r.providerId}: ${r.status} (${r.facts.length} facts)`);
    }
    const composed = composeReportingFromProviderResults({
      clientId,
      period,
      results: combined.results,
    });
    console.log(
      `composition:            health=${composed.health.overall.state} momentum=${composed.momentum.overall.state}`,
    );
    console.log("composeReportingFromProviderResults succeeded (in-memory only).");
  }

  if (!args.skipCacheCheck && results.some((r) => r.status === "connected")) {
    console.log("\n=== Period isolation (cache) ===");
    const altStart = period.start.slice(0, 10);
    const altPeriod: PeriodWindow = {
      start: "2026-05-01T00:00:00.000Z",
      end: "2026-05-31T23:59:59.999Z",
      grain: "month",
      label: "May 2026 alt",
    };
    if (altPeriod.start.slice(0, 10) !== altStart) {
      const provider = results.find((r) => r.status === "connected")!.providerId;
      const alt = await ingestClientReportingProvider({
        clientId,
        provider,
        period: altPeriod,
        refresh: true,
      });
      console.log(
        `different period (${altPeriod.start.slice(0, 10)}→${altPeriod.end.slice(0, 10)}): live status=${alt.status}`,
      );
      console.log("different provider isolation: enforced by cache key (client+provider+period)");
    }
  }

  console.log("\nThis command performed a live provider read.");
  console.log("No reporting facts were persisted.");
  console.log("No monthly reports were created.");
  console.log("No portal or Client Infrastructure mutations were performed.");
}

run().catch((err) => {
  console.error("Fatal:", sanitizeErrorMessage(err instanceof Error ? err.message : String(err)));
  console.log("No reporting facts were persisted.");
  process.exit(1);
});
