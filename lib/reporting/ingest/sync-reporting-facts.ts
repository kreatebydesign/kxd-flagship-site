/**
 * Phase 31C — Shared Core reporting facts sync orchestration.
 * Invoked by admin API / future cron. Never invents provider metrics beyond
 * honest zero rows when a provider returns an empty settled window.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { PeriodWindow, ReportingFact } from "@/lib/reporting/domain";
import { persistReportingFacts } from "@/lib/reporting/persistence";
import {
  ingestClientReportingProvider,
  loadClientReportingConnection,
  REPORTING_PROVIDER_CAPABILITY,
  type ReportingProviderId,
  type ReportingProviderResult,
  type ReportingProviderStatus,
} from "@/lib/reporting/providers";
import { normalizeSearchConsoleAggregate } from "@/lib/reporting/providers/google/search-console/normalize";
import { resolveIngestPeriod } from "./period";

export const REPORTING_INGEST_PROVIDERS = ["search-console", "ga4", "ads"] as const;
export type ReportingIngestProvider = (typeof REPORTING_INGEST_PROVIDERS)[number];

export type ReportingIngestOutcome =
  | "synced"
  | "synced-empty"
  | "skipped"
  | "unavailable"
  | "unauthorized"
  | "forbidden"
  | "invalid"
  | "error";

export type ReportingFactsSyncRequest = {
  clientId?: number | null;
  clientSlug?: string | null;
  provider: ReportingProviderId;
  year?: number | null;
  month?: number | null;
  /** Optional custom ISO date bounds (UTC calendar). Ignored when year/month set. */
  start?: string | null;
  end?: string | null;
  refresh?: boolean;
};

export type ReportingFactsSyncResult = {
  ok: boolean;
  outcome: ReportingIngestOutcome;
  provider: ReportingProviderId;
  clientId: number | null;
  clientSlug: string | null;
  clientName: string | null;
  requestedPeriod: PeriodWindow | null;
  effectivePeriod: PeriodWindow | null;
  providerStatus: ReportingProviderStatus | null;
  factsFetched: number;
  factsWritten: number;
  factsCreated: number;
  factsUpdated: number;
  message: string;
  warnings: string[];
};

function emptyResult(
  partial: Partial<ReportingFactsSyncResult> & {
    outcome: ReportingIngestOutcome;
    message: string;
    provider: ReportingProviderId;
  },
): ReportingFactsSyncResult {
  return {
    ok: false,
    clientId: null,
    clientSlug: null,
    clientName: null,
    requestedPeriod: null,
    effectivePeriod: null,
    providerStatus: null,
    factsFetched: 0,
    factsWritten: 0,
    factsCreated: 0,
    factsUpdated: 0,
    warnings: [],
    ...partial,
  };
}

function isProvider(value: unknown): value is ReportingProviderId {
  return value === "search-console" || value === "ga4" || value === "ads";
}

async function resolveClient(input: {
  clientId?: number | null;
  clientSlug?: string | null;
}): Promise<
  | { ok: true; clientId: number; clientSlug: string | null; clientName: string }
  | { ok: false; outcome: ReportingIngestOutcome; message: string }
> {
  const payload = await getPayload({ config });

  if (input.clientId != null && Number.isFinite(input.clientId) && input.clientId > 0) {
    try {
      const doc = await payload.findByID({
        collection: "clients",
        id: input.clientId,
        depth: 0,
        overrideAccess: true,
      });
      return {
        ok: true,
        clientId: doc.id as number,
        clientSlug: (doc as { slug?: string | null }).slug ?? null,
        clientName: String((doc as { name?: string }).name ?? "Client"),
      };
    } catch {
      return { ok: false, outcome: "invalid", message: "Client not found." };
    }
  }

  const slug = input.clientSlug?.trim();
  if (!slug) {
    return {
      ok: false,
      outcome: "invalid",
      message: "clientId or clientSlug is required.",
    };
  }

  const found = await payload.find({
    collection: "clients",
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  if (found.docs.length === 0) {
    return { ok: false, outcome: "invalid", message: "Client not found." };
  }
  const doc = found.docs[0] as { id: number; slug?: string; name?: string };
  return {
    ok: true,
    clientId: doc.id,
    clientSlug: doc.slug ?? slug,
    clientName: String(doc.name ?? "Client"),
  };
}

/**
 * When Search Console returns an empty settled window, persist zero facts so
 * Executive Performance can distinguish “synced, no activity” from “not synced”.
 */
function emptySearchConsoleFacts(result: ReportingProviderResult): ReportingFact[] {
  const siteUrl =
    result.warnings.find((w) => w.code === "provider-lag") != null
      ? "configured-site"
      : "configured-site";
  // Prefer connection site from evidence on later facts; here use stable placeholder
  // only as evidence label — value is always zero.
  return normalizeSearchConsoleAggregate({
    clientId: result.clientId,
    period: result.effectivePeriod,
    current: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
    previous: null,
    fetchedAt: result.fetchedAt ?? new Date().toISOString(),
    freshness: "fresh",
    confidence: "medium",
    siteUrl,
  });
}

function factsForPersistence(
  result: ReportingProviderResult,
  connectionSiteUrl: string | null,
): ReportingFact[] {
  if (result.facts.length > 0) return result.facts;
  if (result.status === "no-rows" && result.providerId === "search-console") {
    const facts = emptySearchConsoleFacts(result);
    if (connectionSiteUrl) {
      return facts.map((f) => ({
        ...f,
        evidenceRefs: [
          `gsc:site:${connectionSiteUrl}`,
          ...f.evidenceRefs.filter((r) => !r.startsWith("gsc:site:")),
        ],
      }));
    }
    return facts;
  }
  return [];
}

function outcomeFromProviderStatus(
  status: ReportingProviderStatus,
): ReportingIngestOutcome {
  switch (status) {
    case "connected":
      return "synced";
    case "no-rows":
      return "synced-empty";
    case "capability-disabled":
      return "skipped";
    case "not-configured":
    case "disconnected":
    case "temporarily-unavailable":
    case "rate-limited":
      return "unavailable";
    case "unauthorized":
      return "unauthorized";
    case "forbidden":
      return "forbidden";
    case "invalid-configuration":
      return "invalid";
    default:
      return "error";
  }
}

/**
 * Canonical Shared Core entry — admin route + future cron call this.
 */
export async function syncReportingFacts(
  input: ReportingFactsSyncRequest,
): Promise<ReportingFactsSyncResult> {
  if (!isProvider(input.provider)) {
    return emptyResult({
      outcome: "invalid",
      provider: "search-console",
      message: "provider must be search-console, ga4, or ads.",
    });
  }

  const client = await resolveClient({
    clientId: input.clientId,
    clientSlug: input.clientSlug,
  });
  if (!client.ok) {
    return emptyResult({
      outcome: client.outcome,
      provider: input.provider,
      clientSlug: input.clientSlug ?? null,
      message: client.message,
    });
  }

  const periodOrError = resolveIngestPeriod({
    year: input.year,
    month: input.month,
    start: input.start,
    end: input.end,
  });
  if ("error" in periodOrError) {
    return emptyResult({
      outcome: "invalid",
      provider: input.provider,
      clientId: client.clientId,
      clientSlug: client.clientSlug,
      clientName: client.clientName,
      message: periodOrError.error,
    });
  }
  const period = periodOrError;

  const connection = await loadClientReportingConnection(client.clientId);
  if (!connection) {
    return emptyResult({
      outcome: "forbidden",
      provider: input.provider,
      clientId: client.clientId,
      clientSlug: client.clientSlug,
      clientName: client.clientName,
      requestedPeriod: period,
      message: "Client reporting connection could not be resolved.",
    });
  }

  const capability = REPORTING_PROVIDER_CAPABILITY[input.provider];
  if (!connection.enabledCapabilities.includes(capability)) {
    return emptyResult({
      outcome: "skipped",
      provider: input.provider,
      clientId: client.clientId,
      clientSlug: client.clientSlug,
      clientName: client.clientName,
      requestedPeriod: period,
      providerStatus: "capability-disabled",
      message: `${capability} is not entitled for this client.`,
    });
  }

  if (input.provider === "search-console" && !connection.searchConsoleSiteUrl) {
    return emptyResult({
      outcome: "unavailable",
      provider: input.provider,
      clientId: client.clientId,
      clientSlug: client.clientSlug,
      clientName: client.clientName,
      requestedPeriod: period,
      providerStatus: "not-configured",
      message: "Search Console site URL is not configured on client infrastructure.",
    });
  }

  if (input.provider === "ga4" && !connection.ga4PropertyId) {
    return emptyResult({
      outcome: "unavailable",
      provider: input.provider,
      clientId: client.clientId,
      clientSlug: client.clientSlug,
      clientName: client.clientName,
      requestedPeriod: period,
      providerStatus: "not-configured",
      message: "GA4 property ID is not configured on client infrastructure.",
    });
  }

  if (input.provider === "ads" && !connection.googleAdsCustomerId) {
    return emptyResult({
      outcome: "unavailable",
      provider: input.provider,
      clientId: client.clientId,
      clientSlug: client.clientSlug,
      clientName: client.clientName,
      requestedPeriod: period,
      providerStatus: "not-configured",
      message: "Google Ads customer ID is not configured on client infrastructure.",
    });
  }

  const providerResult = await ingestClientReportingProvider({
    clientId: client.clientId,
    provider: input.provider,
    period,
    refresh: input.refresh === true,
  });

  const facts = factsForPersistence(
    providerResult,
    connection.searchConsoleSiteUrl,
  );

  const outcome = outcomeFromProviderStatus(providerResult.status);
  const warnings = providerResult.warnings.map((w) => w.message);

  if (facts.length === 0) {
    return {
      ok: false,
      outcome,
      provider: input.provider,
      clientId: client.clientId,
      clientSlug: client.clientSlug,
      clientName: client.clientName,
      requestedPeriod: period,
      effectivePeriod: providerResult.effectivePeriod,
      providerStatus: providerResult.status,
      factsFetched: providerResult.facts.length,
      factsWritten: 0,
      factsCreated: 0,
      factsUpdated: 0,
      message:
        providerResult.error?.message ??
        `Provider status "${providerResult.status}" — no facts to persist.`,
      warnings,
    };
  }

  const persisted = await persistReportingFacts(facts);
  const syncedEmpty = providerResult.status === "no-rows";

  return {
    ok: true,
    outcome: syncedEmpty ? "synced-empty" : "synced",
    provider: input.provider,
    clientId: client.clientId,
    clientSlug: client.clientSlug,
    clientName: client.clientName,
    requestedPeriod: period,
    effectivePeriod: providerResult.effectivePeriod,
    providerStatus: providerResult.status,
    factsFetched: providerResult.facts.length || facts.length,
    factsWritten: persisted.written,
    factsCreated: persisted.created,
    factsUpdated: persisted.updated,
    message: syncedEmpty
      ? "Synced empty Search Console window (zero activity facts persisted)."
      : "Reporting facts persisted.",
    warnings,
  };
}

export function parseReportingIngestBody(
  body: unknown,
): ReportingFactsSyncRequest | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "JSON body is required." };
  }
  const raw = body as Record<string, unknown>;
  if (!isProvider(raw.provider)) {
    return { error: "provider must be search-console, ga4, or ads." };
  }

  const clientId =
    typeof raw.clientId === "number"
      ? raw.clientId
      : typeof raw.clientId === "string" && raw.clientId.trim()
        ? Number(raw.clientId)
        : null;
  const clientSlug =
    typeof raw.clientSlug === "string" ? raw.clientSlug.trim() : null;

  if ((clientId == null || !Number.isFinite(clientId)) && !clientSlug) {
    return { error: "clientId or clientSlug is required." };
  }

  return {
    provider: raw.provider,
    clientId: clientId != null && Number.isFinite(clientId) ? clientId : null,
    clientSlug,
    year: typeof raw.year === "number" ? raw.year : null,
    month: typeof raw.month === "number" ? raw.month : null,
    start: typeof raw.start === "string" ? raw.start : null,
    end: typeof raw.end === "string" ? raw.end : null,
    refresh: raw.refresh === true,
  };
}
