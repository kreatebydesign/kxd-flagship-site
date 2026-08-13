/**
 * Load a client-safe Active Engagement summary from existing commercial records.
 * Reusable across CES workspaces — not client-specific.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { parseStoredDirectAgreementTerms } from "@/lib/direct-agreement/validate";
import { normalizeLifecyclePackage } from "@/lib/proposal-lifecycle/package";
import { formatCommercialStatus } from "@/lib/client-command/commercial/map-agreement";
import type { ActiveEngagementSnapshot } from "./types";
import {
  resolveEngagementCapacityHours,
  resolveEngagementPaymentStatus,
} from "./helpers";

type AnyDoc = Record<string, unknown> & { id: number };

const QUALIFYING_STATUSES = new Set([
  "active",
  "paid",
  "accepted",
  "executed",
  "completed",
]);

function emptySnapshot(): ActiveEngagementSnapshot {
  return {
    available: false,
    title: null,
    statusLabel: null,
    periodLabel: null,
    paymentLabel: null,
    capacityLabel: null,
    includedSummary: null,
  };
}

function formatDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function periodLabel(start: string | null, end: string | null): string | null {
  const a = formatDay(start);
  const b = formatDay(end);
  if (a && b) return `${a} – ${b}`;
  if (a) return `From ${a}`;
  if (b) return `Through ${b}`;
  return null;
}

function summarizeIncluded(raw: string | null | undefined): string | null {
  const text = String(raw ?? "").trim();
  return text || null;
}

function scoreStatus(status: string): number {
  if (status === "active") return 100;
  if (status === "paid") return 90;
  if (status === "executed") return 80;
  if (status === "accepted") return 70;
  if (status === "completed") return 60;
  return 0;
}

async function loadClientMonthlyServiceCredits(
  clientId: number,
): Promise<number | null> {
  try {
    const payload = await getPayload({ config });
    const client = (await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    })) as { monthlyServiceCredits?: number | null };
    const credits = client.monthlyServiceCredits;
    return typeof credits === "number" && Number.isFinite(credits) ? credits : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the primary qualifying engagement for a portal client.
 * Returns `available: false` when nothing client-safe can be shown.
 */
export async function loadActiveEngagementForClient(
  clientId: number,
): Promise<ActiveEngagementSnapshot> {
  if (!clientId || !Number.isFinite(clientId)) return emptySnapshot();

  const payload = await getPayload({ config });
  let docs: AnyDoc[] = [];
  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "contracts" as any,
      where: { client: { equals: clientId } },
      sort: "-updatedAt",
      limit: 20,
      depth: 0,
      overrideAccess: true,
    });
    docs = result.docs as AnyDoc[];
  } catch {
    return emptySnapshot();
  }

  if (docs.length === 0) return emptySnapshot();

  type Candidate = {
    score: number;
    title: string;
    status: string;
    paymentStatus: string | null;
    serviceStart: string | null;
    serviceEnd: string | null;
    capacityHours: number | null;
    includedServices: string | null;
  };

  const candidates: Candidate[] = [];

  for (const doc of docs) {
    const pkg = normalizeLifecyclePackage(doc.lifecyclePackage);
    const da = parseStoredDirectAgreementTerms(doc.directAgreementTerms);
    const commercial = String(pkg.commercialStatus ?? doc.status ?? "").trim();
    if (!QUALIFYING_STATUSES.has(commercial) && !QUALIFYING_STATUSES.has(String(doc.status))) {
      continue;
    }

    const status = commercial || String(doc.status ?? "");
    const paymentStatus = resolveEngagementPaymentStatus(
      pkg.paymentReferences?.paymentStatus,
    );

    candidates.push({
      score: scoreStatus(status) + (paymentStatus === "paid" ? 5 : 0),
      title: String(doc.title ?? "Engagement").trim() || "Engagement",
      status,
      paymentStatus,
      serviceStart:
        da?.serviceStartDate ??
        (doc.startDate ? String(doc.startDate).slice(0, 10) : null),
      serviceEnd:
        da?.serviceEndDate ??
        (doc.serviceEndDate ? String(doc.serviceEndDate).slice(0, 10) : null),
      capacityHours:
        typeof da?.capacityHoursPerMonth === "number" &&
        Number.isFinite(da.capacityHoursPerMonth)
          ? da.capacityHoursPerMonth
          : null,
      includedServices: da?.includedServices ?? null,
    });
  }

  if (candidates.length === 0) return emptySnapshot();

  candidates.sort((a, b) => b.score - a.score);
  const top = candidates[0];
  const monthlyServiceCredits = await loadClientMonthlyServiceCredits(clientId);
  const capacityHours = resolveEngagementCapacityHours({
    agreementCapacityHours: top.capacityHours,
    monthlyServiceCredits,
  });

  return {
    available: true,
    title: top.title,
    statusLabel: formatCommercialStatus(top.status),
    periodLabel: periodLabel(top.serviceStart, top.serviceEnd),
    paymentLabel: top.paymentStatus
      ? formatCommercialStatus(top.paymentStatus)
      : null,
    capacityLabel:
      capacityHours != null ? `${capacityHours} hours per month` : null,
    includedSummary: summarizeIncluded(top.includedServices),
  };
}
