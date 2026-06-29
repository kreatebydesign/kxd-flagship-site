import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  isOpenProposalStatus,
  needsProposalFollowUp,
  displayProposalStatus,
} from "./lifecycle";
import type { ExecutiveProposalsWidget, ExecutiveProposalsWidgetItem } from "./types";

function relId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    return Number((value as { id: number }).id);
  }
  return null;
}

function clientName(raw: unknown): string {
  if (typeof raw === "object" && raw !== null && "name" in raw) {
    return String((raw as { name: string }).name);
  }
  return "Client";
}

function proposalAmount(doc: Record<string, unknown>): number | null {
  const snap = doc.pricingSnapshot as Record<string, unknown> | undefined;
  if (snap?.grandOneTimeTotal != null) return Number(snap.grandOneTimeTotal);
  if (doc.investment != null) return Number(doc.investment);
  return null;
}

function proposalRecurring(doc: Record<string, unknown>): number | null {
  const snap = doc.pricingSnapshot as Record<string, unknown> | undefined;
  if (snap?.grandRecurringTotal != null) return Number(snap.grandRecurringTotal);
  if (doc.recurringAmount != null) return Number(doc.recurringAmount);
  return null;
}

function toWidgetItem(
  doc: Record<string, unknown>,
  bucket: ExecutiveProposalsWidgetItem["bucket"],
): ExecutiveProposalsWidgetItem | null {
  const id = doc.id as number;
  const clientId = relId(doc.client);
  return {
    id,
    clientId,
    clientName: clientName(doc.client),
    title: String(doc.title ?? doc.proposalNumber ?? "Proposal"),
    status: displayProposalStatus(String(doc.status ?? "draft")),
    amount: proposalAmount(doc),
    recurring: proposalRecurring(doc),
    href: clientId
      ? `/admin/operations/client-command/${clientId}?tab=proposals`
      : `/admin/sales/proposals/${id}`,
    bucket,
  };
}

export async function loadExecutiveProposalsWidget(): Promise<ExecutiveProposalsWidget> {
  const payload = await getPayload({ config });
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "proposals" as any,
    where: {
      status: {
        not_in: ["archived"],
      },
    },
    limit: 300,
    depth: 1,
    sort: "-updatedAt",
    overrideAccess: true,
  });

  const pending: ExecutiveProposalsWidgetItem[] = [];
  const viewed: ExecutiveProposalsWidgetItem[] = [];
  const needsFollowUp: ExecutiveProposalsWidgetItem[] = [];
  const approvedThisMonth: ExecutiveProposalsWidgetItem[] = [];
  const expiring: ExecutiveProposalsWidgetItem[] = [];

  let pipelineValue = 0;
  let forecastRevenue = 0;

  for (const doc of result.docs) {
    const row = doc as Record<string, unknown>;
    const status = String(row.status ?? "draft");
    const amount = proposalAmount(row) ?? 0;
    const recurring = proposalRecurring(row) ?? 0;
    const annual =
      (row.pricingSnapshot as Record<string, unknown> | undefined)?.projectedAnnualValue != null
        ? Number((row.pricingSnapshot as Record<string, unknown>).projectedAnnualValue)
        : amount + recurring * 12;

    if (isOpenProposalStatus(status)) {
      pipelineValue += amount + recurring * 12;
      forecastRevenue += annual * 0.35;
    }

    if (status === "sent" || status === "internal-review") {
      const item = toWidgetItem(row, "pending");
      if (item) pending.push(item);
    }

    if (status === "viewed") {
      const item = toWidgetItem(row, "viewed");
      if (item) viewed.push(item);
    }

    if (needsProposalFollowUp(status)) {
      const item = toWidgetItem(row, "follow-up");
      if (item) needsFollowUp.push(item);
    }

    if (status === "approved") {
      const approvedAt = row.approvedAt ? new Date(String(row.approvedAt)) : null;
      if (approvedAt && approvedAt >= monthStart) {
        const item = toWidgetItem(row, "approved");
        if (item) approvedThisMonth.push(item);
      }
    }

    if (row.expiresAt) {
      const exp = new Date(String(row.expiresAt));
      if (exp <= in14Days && exp >= now && isOpenProposalStatus(status)) {
        const item = toWidgetItem(row, "expiring");
        if (item) expiring.push(item);
      }
    }
  }

  return {
    pending: pending.slice(0, 8),
    viewed: viewed.slice(0, 8),
    needsFollowUp: needsFollowUp.slice(0, 8),
    approvedThisMonth: approvedThisMonth.slice(0, 8),
    expiring: expiring.slice(0, 8),
    pipelineValue: Math.round(pipelineValue),
    forecastRevenue: Math.round(forecastRevenue),
    totals: {
      pending: pending.length,
      viewed: viewed.length,
      needsFollowUp: needsFollowUp.length,
      approvedThisMonth: approvedThisMonth.length,
      expiring: expiring.length,
    },
  };
}
