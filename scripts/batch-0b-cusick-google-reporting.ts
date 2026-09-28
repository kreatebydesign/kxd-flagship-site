/**
 * Batch 0B — Cusick Google mapping + reporting readiness (production-controlled).
 *
 * - Maps/verifies GA4 + GSC on Client Infrastructure for clients 5/9/14/10
 * - Probes Google auth + provider access
 * - Optionally syncs ReportingFacts for previous completed UTC month
 *
 * Does NOT invite/activate Don, invent facts, publish reports, or touch unrelated clients.
 *
 * Usage:
 *   KXD_CONFIRM_CUSICK_BATCH_0B=1 \
 *     KXD_SERVER_ONLY_SHIM=1 node --import ./scripts/shims/register-server-only.mjs --import tsx \
 *     scripts/batch-0b-cusick-google-reporting.ts
 *
 * Stages:
 *   (default)         preflight + dry-run mapping plan
 *   APPLY_MAPPINGS=1  write infrastructure mappings
 *   APPLY_SYNC=1      sync ReportingFacts after successful probes
 */

import { getPayload } from "payload";
import config from "@payload-config";
import { getReportingCapabilityIds } from "../lib/ces/partnership/capabilities";
import { defaultExecutiveReportingPeriod } from "../lib/reporting/ingest/period";
import { syncReportingFacts } from "../lib/reporting/ingest/sync-reporting-facts";
import { loadClientReportingConnection } from "../lib/reporting/providers/connection";
import { normalizeGa4PropertyId, normalizeSearchConsoleSiteUrl } from "../lib/reporting/providers/connection-resolve";
import { getGoogleReportingAuthConfig } from "../lib/reporting/providers/google/auth";
import { GA4_CORE_METRICS, runGa4Report } from "../lib/reporting/providers/google/ga4/client";
import { querySearchConsoleAggregate } from "../lib/reporting/providers/google/search-console/client";
import { toProviderDate } from "../lib/reporting/providers/period";
import {
  formatDbTarget,
  loadPayloadEnv,
  resolveDbTarget,
} from "./lib/payload-db-target";

const CONFIRMED = process.env.KXD_CONFIRM_CUSICK_BATCH_0B === "1";
const APPLY_MAPPINGS = process.env.APPLY_MAPPINGS === "1";
const APPLY_SYNC = process.env.APPLY_SYNC === "1";

const DON_EMAIL = "don.cusick@deezco.com";

const TARGETS = [
  {
    id: 5,
    slug: "cusick-morgan-motorsports",
    name: "Cusick Morgan Motorsports",
    cesId: 6,
    ga4: "542430303",
    gsc: "sc-domain:cusickmotorsports.com",
    verifyOnly: false,
  },
  {
    id: 9,
    slug: "otp",
    name: "On Track Performance",
    cesId: 7,
    ga4: "543428635",
    gsc: "sc-domain:on-track-performance.com",
    verifyOnly: false,
  },
  {
    id: 14,
    slug: "otp-carts",
    name: "OTP Carts",
    cesId: 8,
    ga4: "543445564",
    gsc: "sc-domain:otpcarts.com",
    verifyOnly: true,
  },
  {
    id: 10,
    slug: "2475-townsgate",
    name: "2475 Townsgate",
    cesId: 9,
    ga4: "556300668",
    gsc: "sc-domain:2475townsgate.com",
    verifyOnly: false,
  },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function flag(value: unknown): "SET" | "NOT_SET" {
  return typeof value === "string" && value.trim() ? "SET" : "NOT_SET";
}

function sameGa4(a: unknown, expected: string): boolean {
  const left = normalizeGa4PropertyId(typeof a === "string" ? a : null);
  const right = normalizeGa4PropertyId(expected);
  return Boolean(left && right && left === right);
}

function sameGsc(a: unknown, expected: string): boolean {
  const left = normalizeSearchConsoleSiteUrl(typeof a === "string" ? a : null);
  const right = normalizeSearchConsoleSiteUrl(expected);
  return Boolean(left && right && left === right);
}

async function main() {
  loadPayloadEnv();
  const target = resolveDbTarget();
  console.log("\n=== BATCH 0B — Cusick Google reporting ===\n");
  console.log(`DB target: ${formatDbTarget(target)}`);
  console.log(
    `Mode: mappings=${APPLY_MAPPINGS ? "APPLY" : "DRY"} sync=${APPLY_SYNC ? "APPLY" : "SKIP"}`,
  );

  if (!target.isRemote || target.kind !== "remote-postgres") {
    throw new Error("Refusing Batch 0B against a non-remote Postgres target.");
  }
  if (!CONFIRMED) {
    throw new Error("Set KXD_CONFIRM_CUSICK_BATCH_0B=1 to acknowledge production scope.");
  }

  const payload = await getPayload({ config });
  const conflicts: string[] = [];

  // ── Preflight ────────────────────────────────────────────────────────────
  console.log("\n--- PREFLIGHT ---");
  for (const t of TARGETS) {
    const client = (await payload.findByID({
      collection: "clients",
      id: t.id,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
    if (String(client.slug) !== t.slug) {
      conflicts.push(`Client #${t.id} slug mismatch: ${client.slug} !== ${t.slug}`);
    } else {
      console.log(`✔ client #${t.id} ${client.name} (${client.slug})`);
    }

    const ces = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-experience-profiles" as any,
      where: { client: { equals: t.id } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const cesDoc = ces.docs[0] as AnyDoc | undefined;
    if (!cesDoc || Number(cesDoc.id) !== t.cesId) {
      conflicts.push(
        `CES for client #${t.id}: expected id ${t.cesId}, got ${cesDoc?.id ?? "missing"}`,
      );
    } else {
      const modules = Array.isArray(cesDoc.enabledModules)
        ? (cesDoc.enabledModules as string[])
        : [];
      const caps = getReportingCapabilityIds(modules);
      if (!caps.includes("website-analytics") || !caps.includes("seo")) {
        conflicts.push(
          `CES #${cesDoc.id} missing analytics/seo entitlements: ${caps.join(",") || "(none)"}`,
        );
      } else {
        console.log(`✔ CES #${cesDoc.id} analytics+seo entitled`);
      }
    }
  }

  const don = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-users" as any,
    where: { email: { equals: DON_EMAIL } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const donUser = don.docs[0] as AnyDoc | undefined;
  if (!donUser || Number(donUser.id) !== 13 || donUser.active !== false) {
    conflicts.push(
      `Don safety conflict: expected inactive user #13, got id=${donUser?.id} active=${donUser?.active}`,
    );
  } else {
    console.log("✔ Don #13 inactive");
  }

  const invite = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-invitations" as any,
    where: { email: { equals: DON_EMAIL } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const inv = invite.docs[0] as AnyDoc | undefined;
  if (!inv || Number(inv.id) !== 3 || inv.status !== "draft" || Number(inv.sendCount || 0) !== 0) {
    conflicts.push(
      `Invitation safety conflict: expected draft #3 sendCount=0, got id=${inv?.id} status=${inv?.status} sendCount=${inv?.sendCount}`,
    );
  } else {
    console.log("✔ Invitation #3 draft unsent");
  }

  // OTP Carts mapping verify
  const otpInfra = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-infrastructure" as any,
    where: { client: { equals: 14 } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const otpDoc = otpInfra.docs[0] as AnyDoc | undefined;
  if (!otpDoc) {
    conflicts.push("OTP Carts infrastructure missing");
  } else {
    const ga4Ok = sameGa4(otpDoc.ga4PropertyId, "543445564");
    const gscOk = sameGsc(otpDoc.searchConsoleSiteUrl, "sc-domain:otpcarts.com");
    console.log(
      `✔ OTP Carts mapping check: GA4 ${ga4Ok ? "MATCH" : "MISMATCH"} GSC ${gscOk ? "MATCH" : "MISMATCH"} (values not printed)`,
    );
    if (!ga4Ok || !gscOk) {
      conflicts.push(
        `OTP Carts existing mapping does not match authoritative values (ga4Match=${ga4Ok} gscMatch=${gscOk})`,
      );
    }
  }

  const auth = getGoogleReportingAuthConfig();
  console.log(`· Credential mode: ${auth.mode}${auth.invalidReason ? ` (${auth.invalidReason})` : ""}`);

  if (conflicts.length > 0) {
    console.error("\nPREFLIGHT CONFLICTS — STOP before writes:");
    for (const c of conflicts) console.error(`  - ${c}`);
    console.log(
      "\nRESULT_JSON",
      JSON.stringify({ preflight: "FAIL", conflicts, authMode: auth.mode }, null, 2),
    );
    process.exit(2);
  }

  console.log("\nPREFLIGHT VERDICT: PASS");

  // ── Mapping writes ───────────────────────────────────────────────────────
  const mappingResults: Array<{
    slug: string;
    clientId: number;
    infraId: number | null;
    ga4Before: "SET" | "NOT_SET";
    gscBefore: "SET" | "NOT_SET";
    action: "unchanged" | "updated" | "would-update" | "missing-infra";
  }> = [];

  console.log("\n--- MAPPINGS ---");
  for (const t of TARGETS) {
    const infra = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-infrastructure" as any,
      where: { client: { equals: t.id } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const doc = infra.docs[0] as AnyDoc | undefined;
    if (!doc) {
      mappingResults.push({
        slug: t.slug,
        clientId: t.id,
        infraId: null,
        ga4Before: "NOT_SET",
        gscBefore: "NOT_SET",
        action: "missing-infra",
      });
      console.error(`✗ missing infrastructure for ${t.slug}`);
      continue;
    }

    const ga4Before = flag(doc.ga4PropertyId);
    const gscBefore = flag(doc.searchConsoleSiteUrl);
    const ga4Match = sameGa4(doc.ga4PropertyId, t.ga4);
    const gscMatch = sameGsc(doc.searchConsoleSiteUrl, t.gsc);

    if (t.verifyOnly || (ga4Match && gscMatch)) {
      mappingResults.push({
        slug: t.slug,
        clientId: t.id,
        infraId: Number(doc.id),
        ga4Before,
        gscBefore,
        action: "unchanged",
      });
      console.log(`· ${t.slug}: mappings match/verify-only — unchanged`);
      continue;
    }

    if (!APPLY_MAPPINGS) {
      mappingResults.push({
        slug: t.slug,
        clientId: t.id,
        infraId: Number(doc.id),
        ga4Before,
        gscBefore,
        action: "would-update",
      });
      console.log(`[dry-run] would update ${t.slug} infrastructure #${doc.id}`);
      continue;
    }

    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-infrastructure" as any,
      id: Number(doc.id),
      data: {
        ga4PropertyId: normalizeGa4PropertyId(t.ga4) ?? t.ga4,
        searchConsoleSiteUrl: normalizeSearchConsoleSiteUrl(t.gsc) ?? t.gsc,
      },
      overrideAccess: true,
    });
    mappingResults.push({
      slug: t.slug,
      clientId: t.id,
      infraId: Number(doc.id),
      ga4Before,
      gscBefore,
      action: "updated",
    });
    console.log(`✔ updated ${t.slug} infrastructure #${doc.id}`);
  }

  if (mappingResults.some((m) => m.action === "missing-infra")) {
    throw new Error("Missing infrastructure rows — aborting before sync.");
  }

  // ── Auth + probes ────────────────────────────────────────────────────────
  console.log("\n--- AUTH / PROBES ---");
  const period = defaultExecutiveReportingPeriod(new Date());
  console.log(`Reporting period: ${period.label ?? `${period.start} → ${period.end}`}`);

  const probeResults: Array<{
    slug: string;
    clientId: number;
    ga4Auth: "PASS" | "FAIL" | "SKIP";
    gscAuth: "PASS" | "FAIL" | "SKIP";
    ga4Detail: string;
    gscDetail: string;
  }> = [];

  const authReady =
    auth.mode !== "not-configured" && auth.mode !== "invalid-configuration";

  if (!authReady) {
    console.error(
      `Google credentials unavailable (mode=${auth.mode}). STOP before ingest.`,
    );
  }

  for (const t of TARGETS) {
    if (!authReady) {
      probeResults.push({
        slug: t.slug,
        clientId: t.id,
        ga4Auth: "SKIP",
        gscAuth: "SKIP",
        ga4Detail: `auth ${auth.mode}`,
        gscDetail: `auth ${auth.mode}`,
      });
      continue;
    }

    const connection = await loadClientReportingConnection(t.id);
    if (!connection?.ga4PropertyId || !connection.searchConsoleSiteUrl) {
      probeResults.push({
        slug: t.slug,
        clientId: t.id,
        ga4Auth: "FAIL",
        gscAuth: "FAIL",
        ga4Detail: "missing mapped property after load",
        gscDetail: "missing mapped property after load",
      });
      continue;
    }

    const ga4Probe = await runGa4Report({
      propertyId: connection.ga4PropertyId,
      startDate: toProviderDate(period.start),
      endDate: toProviderDate(period.end),
      metrics: [...GA4_CORE_METRICS],
    });
    const gscProbe = await querySearchConsoleAggregate({
      siteUrl: connection.searchConsoleSiteUrl,
      startDate: toProviderDate(period.start),
      endDate: toProviderDate(period.end),
    });

    probeResults.push({
      slug: t.slug,
      clientId: t.id,
      ga4Auth: ga4Probe.ok ? "PASS" : "FAIL",
      gscAuth: gscProbe.ok ? "PASS" : "FAIL",
      ga4Detail: ga4Probe.ok
        ? `rows=${ga4Probe.rowCount}`
        : sanitize(ga4Probe.error.message),
      gscDetail: gscProbe.ok
        ? `rows=${gscProbe.rowCount}`
        : sanitize(gscProbe.error.message),
    });
    console.log(
      `· ${t.slug}: GA4=${probeResults.at(-1)!.ga4Auth} (${probeResults.at(-1)!.ga4Detail}) GSC=${probeResults.at(-1)!.gscAuth} (${probeResults.at(-1)!.gscDetail})`,
    );
  }

  const allProbesPass =
    authReady &&
    probeResults.every((p) => p.ga4Auth === "PASS" && p.gscAuth === "PASS");

  // ── Sync ─────────────────────────────────────────────────────────────────
  const syncResults: Array<{
    slug: string;
    clientId: number;
    attempted: boolean;
    ga4Outcome: string;
    gscOutcome: string;
    periodLabel: string;
    ga4SuccessAt: string | null;
    gscSuccessAt: string | null;
  }> = [];

  console.log("\n--- SYNC ---");
  if (!APPLY_SYNC) {
    console.log("Sync skipped (APPLY_SYNC not set).");
  } else if (!allProbesPass) {
    console.error("Sync blocked: auth/probes not fully green.");
  } else {
    for (const t of TARGETS) {
      const ga4 = await syncReportingFacts({
        clientId: t.id,
        provider: "ga4",
        start: period.start,
        end: period.end,
        refresh: true,
      });
      const gsc = await syncReportingFacts({
        clientId: t.id,
        provider: "search-console",
        start: period.start,
        end: period.end,
        refresh: true,
      });
      syncResults.push({
        slug: t.slug,
        clientId: t.id,
        attempted: true,
        ga4Outcome: summarizeSync(ga4),
        gscOutcome: summarizeSync(gsc),
        periodLabel: period.label ?? `${period.start}_${period.end}`,
        ga4SuccessAt: ga4.ok ? new Date().toISOString() : null,
        gscSuccessAt: gsc.ok ? new Date().toISOString() : null,
      });
      console.log(
        `✔ synced ${t.slug}: GA4=${syncResults.at(-1)!.ga4Outcome} GSC=${syncResults.at(-1)!.gscOutcome}`,
      );
    }
  }

  // ── Facts / sync-state snapshot ──────────────────────────────────────────
  const factSnapshot: Record<string, unknown> = {};
  for (const t of TARGETS) {
    const facts = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "reporting-facts" as any,
      where: {
        and: [
          { client: { equals: t.id } },
          { periodStart: { equals: period.start } },
        ],
      },
      limit: 100,
      depth: 0,
      overrideAccess: true,
    });
    const byMetric: Record<string, number | null> = {};
    const providers = new Set<string>();
    for (const doc of facts.docs as AnyDoc[]) {
      providers.add(String(doc.providerId || ""));
      byMetric[String(doc.metricKey)] = typeof doc.value === "number" ? doc.value : null;
    }
    const syncStates = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "reporting-sync-states" as any,
      where: { client: { equals: t.id } },
      limit: 10,
      depth: 0,
      overrideAccess: true,
    });
    factSnapshot[t.slug] = {
      factCount: facts.totalDocs,
      providers: [...providers],
      metrics: byMetric,
      syncStates: (syncStates.docs as AnyDoc[]).map((s) => ({
        provider: s.provider,
        lastOutcome: s.lastOutcome,
        lastSuccessfulSyncAt: s.lastSuccessfulSyncAt,
        lastFailedSyncAt: s.lastFailedSyncAt,
        consecutiveFailures: s.consecutiveFailures,
        lastFactsWritten: s.lastFactsWritten,
        hasFailureReason: Boolean(String(s.failureReason || "").trim()),
      })),
    };
  }

  // Don safety again
  const donAfter = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-users" as any,
    where: { email: { equals: DON_EMAIL } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const invAfter = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "portal-invitations" as any,
    where: { id: { equals: 3 } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const donDoc = donAfter.docs[0] as AnyDoc | undefined;
  const invDoc = invAfter.docs[0] as AnyDoc | undefined;

  console.log("\nRESULT_JSON");
  console.log(
    JSON.stringify(
      {
        preflight: "PASS",
        authMode: auth.mode,
        authReady,
        period: {
          start: period.start,
          end: period.end,
          label: period.label ?? null,
        },
        mappingResults,
        probeResults,
        syncResults,
        factSnapshot,
        donSafety: {
          userId: donDoc?.id ?? null,
          active: donDoc?.active ?? null,
          invitationId: invDoc?.id ?? null,
          invitationStatus: invDoc?.status ?? null,
          sendCount: invDoc?.sendCount ?? null,
        },
        secretsExposed: false,
      },
      null,
      2,
    ),
  );

  process.exit(0);
}

function sanitize(message: string): string {
  return message
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/ya29\.[A-Za-z0-9._-]+/g, "[token]")
    .replace(/-----BEGIN[\s\S]+?-----END[^-]+-----/g, "[pem]")
    .slice(0, 240);
}

function summarizeSync(result: {
  ok: boolean;
  error?: { message?: string } | null;
  factsWritten?: number;
  skippedReason?: string | null;
  outcome?: string | null;
}): string {
  if (result.ok) {
    return `ok facts=${result.factsWritten ?? "?"}${result.outcome ? ` outcome=${result.outcome}` : ""}`;
  }
  return `fail ${sanitize(result.error?.message || result.skippedReason || "unknown")}`;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
