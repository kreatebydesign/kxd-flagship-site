/**
 * Read-only Don Client Value readiness matrix (no mutations).
 *
 * Reports allowlisted infrastructure + reporting-facts presence for the four
 * Don inspection clients. Never prints property ID values — only SET/NOT_SET.
 *
 * Usage:
 *   npx tsx scripts/inspect-don-client-value-readiness.ts
 *
 * Requires Postgres env (DATABASE_URI / DATABASE_URL) + PAYLOAD_SECRET when run via Payload.
 * If Payload cannot boot, exits with guidance — Neon/operator SQL may be used separately.
 *
 * Slugs below are inspection inventory only — not an access-control source, and not
 * Don Portal Lite architecture (that package remains separate / uncommitted).
 */
import { getPayload } from "payload";
import config from "@payload-config";
import { loadPayloadEnv, resolveDbTarget } from "./lib/payload-db-target";
import { resolveInfrastructureForClient } from "../lib/reporting/providers/connection-resolve";
import { normalizeGa4PropertyId, normalizeSearchConsoleSiteUrl } from "../lib/reporting/providers/connection-resolve";
import { defaultWorkPerformancePeriod } from "../lib/portal/work-performance/period";
import { loadReportingFacts } from "../lib/reporting/persistence";

/** Local inspection inventory — keep in sync manually with operator Don checklists. */
const INSPECTION_CLIENTS = [
  { slug: "cusick-morgan-motorsports", label: "Cusick Motorsports" },
  { slug: "otp", label: "On Track Performance" },
  { slug: "otp-carts", label: "OTP Carts" },
  { slug: "2475-townsgate", label: "2475 Townsgate" },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function flag(value: unknown): "SET" | "NOT_SET" {
  if (value == null) return "NOT_SET";
  if (typeof value === "string" && !value.trim()) return "NOT_SET";
  return "SET";
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

async function main() {
  loadPayloadEnv();
  const target = resolveDbTarget();
  console.log("\nDon Client Value readiness (read-only)\n");
  console.log(
    `DB target: kind=${target.kind} host=${target.host} db=${target.database} via=${target.sourceVar}`,
  );

  if (target.kind === "sqlite" || target.kind === "missing") {
    console.log("\nNo Postgres target — cannot inspect Production readiness from this shell.\n");
    process.exitCode = 2;
    return;
  }

  const payload = await getPayload({ config });
  const period = defaultWorkPerformancePeriod();

  for (const { slug, label } of INSPECTION_CLIENTS) {
    const clients = await payload.find({
      collection: "clients",
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const client = (clients.docs[0] as AnyDoc | undefined) ?? null;
    console.log(`\n── ${label} (${slug}) ──`);
    if (!client) {
      console.log("  ✘ client record missing");
      continue;
    }
    const clientId = Number(client.id);
    console.log(`  clientId=${clientId}`);

    const infraResult = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-infrastructure" as any,
      where: { client: { equals: clientId } },
      limit: 5,
      depth: 0,
      overrideAccess: true,
    });
    const infra = resolveInfrastructureForClient(
      clientId,
      infraResult.docs as Array<Record<string, unknown>>,
    );
    if (infra === "cross-client") {
      console.log("  ✘ infrastructure cross-client isolation failure");
      continue;
    }
    if (!infra) {
      console.log("  infrastructure: missing");
      console.log("  GA4 mapping: NOT_SET");
      console.log("  GSC mapping: NOT_SET");
      console.log("  hostingProvider: NOT_SET");
      console.log("  nextRenewalDate: NOT_SET");
      console.log("  domainExpirationDate: NOT_SET");
      console.log("  primaryDomain: NOT_SET");
    } else {
      const ga4 = normalizeGa4PropertyId(asString(infra.ga4PropertyId));
      const gsc = normalizeSearchConsoleSiteUrl(asString(infra.searchConsoleSiteUrl));
      console.log(`  GA4 mapping: ${ga4 ? "SET" : "NOT_SET"}`);
      console.log(`  GSC mapping: ${gsc ? "SET" : "NOT_SET"}`);
      console.log(`  hostingProvider: ${flag(infra.hostingProvider)}`);
      console.log(`  nextRenewalDate: ${flag(infra.nextRenewalDate)}`);
      console.log(`  domainExpirationDate: ${flag(infra.domainExpirationDate)}`);
      console.log(`  primaryDomain: ${flag(infra.primaryDomain)}`);
    }

    let factCount = 0;
    try {
      const facts = await loadReportingFacts({ clientId, period });
      factCount = facts.length;
    } catch {
      factCount = -1;
    }
    console.log(
      `  ReportingFacts (${period.start.slice(0, 7)}): ${
        factCount < 0 ? "ERROR" : factCount === 0 ? "none" : `${factCount} facts`
      }`,
    );

    const mattNeeds: string[] = [];
    if (!infra) mattNeeds.push("create client-infrastructure row");
    else {
      if (flag(infra.hostingProvider) === "NOT_SET") mattNeeds.push("hostingProvider");
      if (flag(infra.nextRenewalDate) === "NOT_SET") mattNeeds.push("nextRenewalDate");
      if (flag(infra.domainExpirationDate) === "NOT_SET") mattNeeds.push("domainExpirationDate");
      if (flag(infra.primaryDomain) === "NOT_SET") mattNeeds.push("primaryDomain");
      if (!normalizeGa4PropertyId(asString(infra.ga4PropertyId))) {
        mattNeeds.push("ga4PropertyId + Google property access for KXD reporting identity");
      }
      if (!normalizeSearchConsoleSiteUrl(asString(infra.searchConsoleSiteUrl))) {
        mattNeeds.push("searchConsoleSiteUrl + GSC access for KXD reporting identity");
      }
    }
    if (factCount === 0) {
      mattNeeds.push("reporting ingest after property mapping (facts appear after sync)");
    }

    console.log(
      `  Matt must supply: ${mattNeeds.length ? mattNeeds.join("; ") : "none — mappings present"}`,
    );
    console.log(
      "  Portal before fill: honest empty/disconnected Care & Continuity + performance story (no fabricated metrics).",
    );
  }

  console.log("\nNo Production data was written.\n");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
