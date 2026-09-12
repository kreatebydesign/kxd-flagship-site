/**
 * Website form lead counts from client-inquiries (Shared Core).
 *
 * Counts channel=form only — never Ads conversions, never GA4 generate_lead.
 * Client-scoped + period-scoped. Reusable for any managed client with inquiries.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { CLIENT_INQUIRIES_COLLECTION } from "@/lib/managed-client-leads/collection";
import { ledgerScopeWhere } from "@/lib/managed-client-leads/isolation";
import { previousPeriodWindow } from "@/lib/reporting/providers/period";
import type { PeriodWindow } from "@/lib/reporting/domain/types";

export type WebsiteFormInquiryCount = {
  available: boolean;
  count: number | null;
  previousCount: number | null;
  delta: number | null;
  period: PeriodWindow;
  /** Honest provenance for UI disclosures. */
  sourceLabel: string;
  definition: string;
  /** Why unavailable when available=false. */
  unavailableReason: string | null;
};

function dayBounds(period: PeriodWindow): { startIso: string; endExclusiveIso: string } {
  return {
    startIso: `${period.start}T00:00:00.000Z`,
    // Payload less_than exclusive end-of-day → next day 00:00
    endExclusiveIso: `${period.end}T23:59:59.999Z`,
  };
}

async function countFormInquiries(input: {
  clientId: number;
  clientKey: string;
  period: PeriodWindow;
}): Promise<number | null> {
  try {
    const payload = await getPayload({ config });
    const { startIso, endExclusiveIso } = dayBounds(input.period);
    const result = await payload.find({
      collection: CLIENT_INQUIRIES_COLLECTION,
      depth: 0,
      limit: 0,
      pagination: true,
      overrideAccess: true,
      where: {
        and: [
          ledgerScopeWhere(input.clientId, input.clientKey),
          { channel: { equals: "form" } },
          { receivedAt: { greater_than_equal: startIso } },
          { receivedAt: { less_than_equal: endExclusiveIso } },
        ],
      },
    });
    return typeof result.totalDocs === "number" ? result.totalDocs : null;
  } catch {
    return null;
  }
}

/**
 * Count website form submissions from client-inquiries for a reporting period.
 * Returns available=false when the ledger cannot be read — never fabricates.
 * A verified zero for the period is available=true with count=0.
 */
export async function countWebsiteFormInquiries(input: {
  clientId: number;
  clientKey: string;
  period: PeriodWindow;
}): Promise<WebsiteFormInquiryCount> {
  const clientKey = String(input.clientKey ?? "").trim();
  const base = {
    period: input.period,
    sourceLabel: "client-inquiries · channel=form",
    definition:
      "Count of client-inquiries with channel=form in the selected period. Excludes calls, Ads conversions, and GA4 generate_lead.",
  };

  if (!Number.isFinite(input.clientId) || input.clientId <= 0 || !clientKey) {
    return {
      ...base,
      available: false,
      count: null,
      previousCount: null,
      delta: null,
      unavailableReason: "Client scope is incomplete for inquiry counting.",
    };
  }

  const count = await countFormInquiries({
    clientId: input.clientId,
    clientKey,
    period: input.period,
  });

  if (count == null) {
    return {
      ...base,
      available: false,
      count: null,
      previousCount: null,
      delta: null,
      unavailableReason: "client-inquiries could not be read for this client.",
    };
  }

  const priorPeriod = previousPeriodWindow(input.period);
  const previousCount = await countFormInquiries({
    clientId: input.clientId,
    clientKey,
    period: priorPeriod,
  });

  return {
    ...base,
    available: true,
    count,
    previousCount,
    delta: previousCount != null ? count - previousCount : null,
    unavailableReason: null,
  };
}
