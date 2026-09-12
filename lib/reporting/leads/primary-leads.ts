/**
 * Primary lead counting law — reusable across clients.
 *
 * WEBSITE FORM LEADS = client-inquiries channel=form for the period when provided
 * (never GA4 `generate_lead`, never Ads form conversions).
 * PAID QUALIFIED CALL LEADS = Ads `phone_calls` / `qualified_leads` when persisted.
 * TOTAL PRIMARY = form + calls when both present — never Ads aggregate `conversions`,
 * never GA4 aggregate `conversions`, never Ads form conversions.
 *
 * Confirmed CRM leads remain a separate category (not inferred here).
 */

import type { CanonicalMetricKey, PeriodWindow, ReportingFact } from "@/lib/reporting/domain/types";

export type PrimaryLeadSourceKey =
  | "website_form_leads"
  | "paid_qualified_call_leads"
  | "total_primary_leads";

export type PrimaryLeadMetric = {
  key: PrimaryLeadSourceKey;
  label: string;
  value: number | null;
  previousValue: number | null;
  delta: number | null;
  definition: string;
  available: boolean;
};

export type PrimaryLeadBreakdown = {
  websiteFormLeads: PrimaryLeadMetric;
  paidQualifiedCallLeads: PrimaryLeadMetric;
  totalPrimaryLeads: PrimaryLeadMetric;
  /** Explicit: Ads/GA4 aggregate conversions are never added into totals. */
  excludedFromPrimary: string[];
  period: PeriodWindow | null;
};

function factInPeriod(
  facts: ReportingFact[],
  key: CanonicalMetricKey,
  period: PeriodWindow | null,
): ReportingFact | null {
  return (
    facts.find(
      (f) =>
        f.metricKey === key &&
        (period == null ||
          (f.period.start === period.start && f.period.end === period.end)),
    ) ?? null
  );
}

function metricFromFact(
  key: PrimaryLeadSourceKey,
  label: string,
  definition: string,
  fact: ReportingFact | null,
): PrimaryLeadMetric {
  if (!fact || fact.value == null || !Number.isFinite(Number(fact.value))) {
    return {
      key,
      label,
      value: null,
      previousValue: null,
      delta: null,
      definition,
      available: false,
    };
  }
  const value = Math.round(Number(fact.value));
  const previousValue =
    fact.previousValue != null && Number.isFinite(Number(fact.previousValue))
      ? Math.round(Number(fact.previousValue))
      : null;
  const delta =
    previousValue != null ? value - previousValue : fact.delta != null ? Math.round(fact.delta) : null;
  return {
    key,
    label,
    value,
    previousValue,
    delta,
    definition,
    available: true,
  };
}

export type WebsiteFormInquiryOverride = {
  available: boolean;
  count: number | null;
  previousCount?: number | null;
  delta?: number | null;
  definition?: string;
};

/**
 * Resolve primary lead headline metrics.
 * Website form leads prefer client-inquiries override when provided.
 * GA4 generate_lead is never used as the website form lead count.
 * Missing sources stay unavailable — never coerced from absent data.
 */
export function resolvePrimaryLeadBreakdown(input: {
  facts: ReportingFact[];
  period: PeriodWindow | null;
  /** Period-scoped client-inquiries form count — preferred over analytics events. */
  websiteFormInquiries?: WebsiteFormInquiryOverride | null;
}): PrimaryLeadBreakdown {
  const period = input.period;
  /** Prefer qualified_leads when present; else phone_calls (Ads PHONE_CALL_LEAD category). */
  const qualifiedFact =
    factInPeriod(input.facts, "qualified_leads", period) ??
    factInPeriod(input.facts, "phone_calls", period);

  const inquiry = input.websiteFormInquiries;
  let websiteFormLeads: PrimaryLeadMetric;
  if (inquiry) {
    if (
      inquiry.available &&
      inquiry.count != null &&
      Number.isFinite(Number(inquiry.count))
    ) {
      const value = Math.round(Number(inquiry.count));
      const previousValue =
        inquiry.previousCount != null && Number.isFinite(Number(inquiry.previousCount))
          ? Math.round(Number(inquiry.previousCount))
          : null;
      const delta =
        inquiry.delta != null && Number.isFinite(Number(inquiry.delta))
          ? Math.round(Number(inquiry.delta))
          : previousValue != null
            ? value - previousValue
            : null;
      websiteFormLeads = {
        key: "website_form_leads",
        label: "Website form leads",
        value,
        previousValue,
        delta,
        definition:
          inquiry.definition ??
          "client-inquiries with channel=form for the selected period.",
        available: true,
      };
    } else {
      websiteFormLeads = {
        key: "website_form_leads",
        label: "Website form leads",
        value: null,
        previousValue: null,
        delta: null,
        definition:
          inquiry.definition ??
          "Website form leads require period-scoped client-inquiries (channel=form).",
        available: false,
      };
    }
  } else {
    websiteFormLeads = {
      key: "website_form_leads",
      label: "Website form leads",
      value: null,
      previousValue: null,
      delta: null,
      definition:
        "Website form leads require period-scoped client-inquiries (channel=form). GA4 generate_lead is not used.",
      available: false,
    };
  }

  const paidQualifiedCallLeads = metricFromFact(
    "paid_qualified_call_leads",
    "Qualified call leads",
    "Google Ads phone-call lead conversions for the selected period (duration threshold configured in Ads).",
    qualifiedFact,
  );

  const excludedFromPrimary = [
    "GA4 aggregate conversions",
    "GA4 generate_lead events",
    "Google Ads aggregate conversions",
    "Google Ads form/submit-lead conversions",
  ];

  let totalPrimaryLeads: PrimaryLeadMetric;
  if (websiteFormLeads.available && paidQualifiedCallLeads.available) {
    const value = (websiteFormLeads.value ?? 0) + (paidQualifiedCallLeads.value ?? 0);
    const previousValue =
      websiteFormLeads.previousValue != null && paidQualifiedCallLeads.previousValue != null
        ? websiteFormLeads.previousValue + paidQualifiedCallLeads.previousValue
        : null;
    totalPrimaryLeads = {
      key: "total_primary_leads",
      label: "Primary leads",
      value,
      previousValue,
      delta: previousValue != null ? value - previousValue : null,
      definition:
        "Website form leads + qualified call leads. Ads/GA4 aggregate conversions and generate_lead are excluded to prevent double counting.",
      available: true,
    };
  } else if (websiteFormLeads.available) {
    totalPrimaryLeads = {
      ...websiteFormLeads,
      key: "total_primary_leads",
      label: "Primary leads",
      definition:
        "Website form leads only — qualified call leads are not available for this period yet.",
    };
  } else if (paidQualifiedCallLeads.available) {
    totalPrimaryLeads = {
      ...paidQualifiedCallLeads,
      key: "total_primary_leads",
      label: "Primary leads",
      definition:
        "Qualified call leads only — website form leads are not available for this period yet.",
    };
  } else {
    totalPrimaryLeads = {
      key: "total_primary_leads",
      label: "Primary leads",
      value: null,
      previousValue: null,
      delta: null,
      definition:
        "Primary leads require client-inquiries form counts and/or Ads phone-call lead facts. Missing is not zero.",
      available: false,
    };
  }

  return {
    websiteFormLeads,
    paidQualifiedCallLeads,
    totalPrimaryLeads,
    excludedFromPrimary,
    period,
  };
}
