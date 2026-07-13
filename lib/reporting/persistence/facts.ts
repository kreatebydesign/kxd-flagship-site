/**
 * Phase 31C — Persist / load ReportingFacts (Shared Core).
 * Idempotent upsert by factKey. Never stores tokens or raw provider payloads.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type {
  PeriodWindow,
  ReportingConfidence,
  ReportingFact,
  ReportingFreshness,
  TrendDirection,
} from "@/lib/reporting/domain";

const COLLECTION = "reporting-facts";

type FactDoc = {
  id: number;
  factKey: string;
  client: number | { id: number };
  periodStart: string;
  periodEnd: string;
  periodGrain: PeriodWindow["grain"];
  periodLabel?: string | null;
  domain: string;
  metricKey: string;
  providerId: string;
  value: number;
  unit: string;
  previousValue?: number | null;
  delta?: number | null;
  trend?: TrendDirection | null;
  sourceFetchedAt: string;
  sourceFreshness: ReportingFreshness;
  sourceConfidence: ReportingConfidence;
  evidenceRefs?: string[] | null;
};

function clientIdOf(value: FactDoc["client"]): number {
  return typeof value === "object" && value ? value.id : Number(value);
}

export function reportingFactToDocData(fact: ReportingFact) {
  return {
    factKey: fact.id,
    client: fact.clientId,
    periodStart: fact.period.start,
    periodEnd: fact.period.end,
    periodGrain: fact.period.grain,
    periodLabel: fact.period.label ?? null,
    domain: fact.domain,
    metricKey: fact.metricKey,
    providerId: fact.source.providerId,
    value: fact.value,
    unit: fact.unit,
    previousValue: fact.previousValue ?? null,
    delta: fact.delta ?? null,
    trend: fact.trend ?? "unknown",
    sourceFetchedAt: fact.source.fetchedAt,
    sourceFreshness: fact.source.freshness,
    sourceConfidence: fact.source.confidence,
    evidenceRefs: fact.evidenceRefs,
  };
}

export function docToReportingFact(doc: FactDoc): ReportingFact {
  return {
    id: doc.factKey,
    clientId: clientIdOf(doc.client),
    period: {
      start: doc.periodStart,
      end: doc.periodEnd,
      grain: doc.periodGrain,
      label: doc.periodLabel ?? undefined,
    },
    domain: doc.domain as ReportingFact["domain"],
    metricKey: doc.metricKey as ReportingFact["metricKey"],
    value: Number(doc.value),
    unit: doc.unit,
    previousValue: doc.previousValue ?? null,
    delta: doc.delta ?? null,
    trend: (doc.trend ?? "unknown") as TrendDirection,
    source: {
      providerId: doc.providerId,
      clientId: clientIdOf(doc.client),
      fetchedAt: doc.sourceFetchedAt,
      freshness: doc.sourceFreshness,
      confidence: doc.sourceConfidence,
    },
    evidenceRefs: Array.isArray(doc.evidenceRefs) ? doc.evidenceRefs : [],
  };
}

export type PersistReportingFactsResult = {
  written: number;
  created: number;
  updated: number;
  factKeys: string[];
};

/**
 * Upsert facts by deterministic factKey. Safe to re-run for the same period.
 */
export async function persistReportingFacts(
  facts: readonly ReportingFact[],
): Promise<PersistReportingFactsResult> {
  if (facts.length === 0) {
    return { written: 0, created: 0, updated: 0, factKeys: [] };
  }

  const payload = await getPayload({ config });
  let created = 0;
  let updated = 0;
  const factKeys: string[] = [];

  for (const fact of facts) {
    const data = reportingFactToDocData(fact);
    factKeys.push(fact.id);

    const existing = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      where: { factKey: { equals: fact.id } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    if (existing.docs.length > 0) {
      const id = (existing.docs[0] as { id: number }).id;
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: COLLECTION as any,
        id,
        data,
        overrideAccess: true,
      });
      updated += 1;
    } else {
      await payload.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: COLLECTION as any,
        data,
        overrideAccess: true,
      });
      created += 1;
    }
  }

  return {
    written: created + updated,
    created,
    updated,
    factKeys,
  };
}

/**
 * Load persisted facts for a client period window (exact period.start match).
 */
export async function loadReportingFacts(input: {
  clientId: number;
  period: PeriodWindow;
  /** Optional provider filter, e.g. google-search-console */
  providerId?: string;
}): Promise<ReportingFact[]> {
  const payload = await getPayload({ config });
  const and: Array<{ [key: string]: { equals: string | number } }> = [
    { client: { equals: input.clientId } },
    { periodStart: { equals: input.period.start } },
  ];
  if (input.providerId) {
    and.push({ providerId: { equals: input.providerId } });
  }

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { and } as any,
    limit: 200,
    depth: 0,
    overrideAccess: true,
    sort: "metricKey",
  });

  return (result.docs as FactDoc[]).map(docToReportingFact);
}

export type ReportingFactProvenance = {
  period: PeriodWindow | null;
  providerIds: string[];
  fetchedAt: string | null;
  factCount: number;
};

export function summarizeReportingFactProvenance(
  facts: readonly ReportingFact[],
): ReportingFactProvenance {
  if (facts.length === 0) {
    return { period: null, providerIds: [], fetchedAt: null, factCount: 0 };
  }
  const providerIds = [...new Set(facts.map((f) => f.source.providerId))].sort();
  const fetchedAt = facts
    .map((f) => f.source.fetchedAt)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
  return {
    period: facts[0]!.period,
    providerIds,
    fetchedAt,
    factCount: facts.length,
  };
}
