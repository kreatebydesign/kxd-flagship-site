/**
 * Phase 33A — Concise executive narratives from ReportingFacts only.
 * No AI. No invented business advice. Evidence-bound statements only.
 */

import type { ReportingFact } from "@/lib/reporting/domain/types";

export type ExecutiveReportingNarrative = {
  id: string;
  statement: string;
  domain: "search" | "website" | "ads" | "overall";
  metricKeys: string[];
  factIds: string[];
  direction: "up" | "down" | "flat" | "unknown";
};

function factByKey(facts: readonly ReportingFact[], key: string): ReportingFact | undefined {
  return facts.find((f) => f.metricKey === key);
}

function trendOf(fact: ReportingFact | undefined): "up" | "down" | "flat" | "unknown" {
  if (!fact) return "unknown";
  if (fact.trend === "up" || fact.trend === "down" || fact.trend === "flat") {
    return fact.trend;
  }
  if (fact.previousValue == null) return "unknown";
  const delta = fact.value - fact.previousValue;
  if (Math.abs(delta) < Number.EPSILON) return "flat";
  return delta > 0 ? "up" : "down";
}

function pushNarrative(
  out: ExecutiveReportingNarrative[],
  input: {
    id: string;
    statement: string;
    domain: ExecutiveReportingNarrative["domain"];
    keys: string[];
    facts: readonly ReportingFact[];
    direction: ExecutiveReportingNarrative["direction"];
  },
) {
  const matched = input.facts.filter((f) => input.keys.includes(f.metricKey));
  if (matched.length === 0) return;
  out.push({
    id: input.id,
    statement: input.statement,
    domain: input.domain,
    metricKeys: input.keys,
    factIds: matched.map((f) => f.id),
    direction: input.direction,
  });
}

/**
 * Deterministic narratives. Only emits a line when supporting facts exist
 * and trend/direction is knowable (except explicit stable traffic).
 */
export function composeExecutiveReportingNarratives(input: {
  clientId: number;
  facts: readonly ReportingFact[];
}): ExecutiveReportingNarrative[] {
  const facts = input.facts;
  const narratives: ExecutiveReportingNarrative[] = [];

  const impressions = trendOf(factByKey(facts, "impressions"));
  const seo = trendOf(factByKey(facts, "seo_visibility"));
  const clicks = trendOf(factByKey(facts, "clicks"));
  if (impressions === "up" || seo === "up" || clicks === "up") {
    pushNarrative(narratives, {
      id: `nar-${input.clientId}-search-up`,
      statement: "Search visibility increased.",
      domain: "search",
      keys: ["impressions", "seo_visibility", "clicks", "average_position"],
      facts,
      direction: "up",
    });
  } else if (impressions === "down" || seo === "down") {
    pushNarrative(narratives, {
      id: `nar-${input.clientId}-search-down`,
      statement: "Search visibility declined.",
      domain: "search",
      keys: ["impressions", "seo_visibility", "clicks"],
      facts,
      direction: "down",
    });
  }

  const cpl = trendOf(factByKey(facts, "cost_per_lead"));
  const adSpend = trendOf(factByKey(facts, "ad_spend"));
  const conversions = trendOf(factByKey(facts, "conversions"));
  if (cpl === "down") {
    pushNarrative(narratives, {
      id: `nar-${input.clientId}-ads-efficiency-up`,
      statement: "Advertising efficiency improved.",
      domain: "ads",
      keys: ["cost_per_lead", "ad_spend", "conversions"],
      facts,
      direction: "up",
    });
  } else if (cpl === "up") {
    pushNarrative(narratives, {
      id: `nar-${input.clientId}-ads-efficiency-down`,
      statement: "Advertising efficiency declined.",
      domain: "ads",
      keys: ["cost_per_lead", "ad_spend", "conversions"],
      facts,
      direction: "down",
    });
  } else if (conversions === "up" && (adSpend === "flat" || adSpend === "down")) {
    pushNarrative(narratives, {
      id: `nar-${input.clientId}-ads-conversions-up`,
      statement: "Advertising conversions increased.",
      domain: "ads",
      keys: ["conversions", "ad_spend"],
      facts,
      direction: "up",
    });
  }

  const sessions = trendOf(factByKey(facts, "sessions"));
  const visitors = trendOf(factByKey(facts, "visitors"));
  if (sessions === "flat" || visitors === "flat") {
    pushNarrative(narratives, {
      id: `nar-${input.clientId}-traffic-stable`,
      statement: "Website traffic remained stable.",
      domain: "website",
      keys: ["sessions", "visitors"],
      facts,
      direction: "flat",
    });
  } else if (sessions === "up" || visitors === "up") {
    pushNarrative(narratives, {
      id: `nar-${input.clientId}-traffic-up`,
      statement: "Website traffic increased.",
      domain: "website",
      keys: ["sessions", "visitors"],
      facts,
      direction: "up",
    });
  } else if (sessions === "down" || visitors === "down") {
    pushNarrative(narratives, {
      id: `nar-${input.clientId}-traffic-down`,
      statement: "Website traffic declined.",
      domain: "website",
      keys: ["sessions", "visitors"],
      facts,
      direction: "down",
    });
  }

  return narratives;
}
