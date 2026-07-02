import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { isUnsignedContract } from "@/lib/contracts/lifecycle";
import { displayConversionStatus } from "./lifecycle";
import type { ExecutiveConversionWidget, ExecutiveConversionWidgetItem } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    return Number((value as AnyDoc).id);
  }
  return null;
}

function clientName(raw: unknown): string {
  if (typeof raw === "object" && raw !== null && "name" in raw) {
    return String((raw as { name: string }).name);
  }
  return "Client";
}

function proposalAmount(doc: AnyDoc): number | null {
  const snap = doc.pricingSnapshot as Record<string, unknown> | undefined;
  if (snap?.grandOneTimeTotal != null) return Number(snap.grandOneTimeTotal);
  if (doc.investment != null) return Number(doc.investment);
  return null;
}

function contractAmount(doc: AnyDoc): number | null {
  const monthly = doc.monthlyAmount != null ? Number(doc.monthlyAmount) : 0;
  const project = doc.projectAmount != null ? Number(doc.projectAmount) : 0;
  const total = monthly * 12 + project;
  return total > 0 ? total : null;
}

export async function loadExecutiveConversionWidget(): Promise<ExecutiveConversionWidget> {
  const payload = await getPayload({ config });
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [approvedProposals, conversions, contracts] = await Promise.all([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "proposals" as any,
      where: { status: { equals: "approved" } },
      limit: 100,
      depth: 1,
      sort: "-approvedAt",
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "proposal-conversions" as any,
      where: { status: { equals: "completed" } },
      limit: 100,
      depth: 1,
      sort: "-convertedAt",
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "contracts" as any,
      where: { status: { not_in: ["archived", "declined"] } },
      limit: 200,
      depth: 1,
      sort: "-updatedAt",
      overrideAccess: true,
    }),
  ]);

  const convertedProposalIds = new Set<number>();
  for (const doc of conversions.docs) {
    const pid = relId((doc as AnyDoc).proposal);
    if (pid) convertedProposalIds.add(pid);
  }

  const readyToConvert: ExecutiveConversionWidgetItem[] = [];
  let conversionValue = 0;

  for (const doc of approvedProposals.docs) {
    const row = doc as AnyDoc;
    const id = row.id as number;
    if (convertedProposalIds.has(id)) continue;
    if (row.conversionExecutedAt) continue;

    const amount = proposalAmount(row);
    if (amount) conversionValue += amount;
    const clientId = relId(row.client);
    readyToConvert.push({
      id,
      clientId,
      clientName: clientName(row.client),
      title: String(row.title ?? row.proposalNumber ?? "Proposal"),
      status: "Ready to convert",
      amount,
      href: clientId
        ? `/admin/operations/client-command/${clientId}?tab=proposals`
        : `/admin/sales/conversion/${id}`,
      bucket: "ready",
    });
  }

  const recentlyConverted: ExecutiveConversionWidgetItem[] = [];
  for (const doc of conversions.docs) {
    const row = doc as AnyDoc;
    const convertedAt = row.convertedAt ? new Date(String(row.convertedAt)) : null;
    if (!convertedAt || convertedAt < weekAgo) continue;
    const clientId = relId(row.client);
    const proposalId = relId(row.proposal);
    recentlyConverted.push({
      id: row.id as number,
      clientId,
      clientName: clientName(row.client),
      title: String(row.title ?? "Conversion"),
      status: displayConversionStatus(String(row.status)),
      amount: null,
      href: clientId
        ? `/admin/operations/client-command/${clientId}?tab=contracts`
        : `/admin/sales/conversion/${proposalId ?? row.id}`,
      bucket: "converted",
    });
  }

  const contractsAwaitingSignature: ExecutiveConversionWidgetItem[] = [];
  const signedToday: ExecutiveConversionWidgetItem[] = [];
  const launchQueue: ExecutiveConversionWidgetItem[] = [];

  for (const doc of contracts.docs) {
    const row = doc as AnyDoc;
    const status = String(row.status ?? "draft");
    const clientId = relId(row.client);
    const item: ExecutiveConversionWidgetItem = {
      id: row.id as number,
      clientId,
      clientName: clientName(row.client),
      title: String(row.title ?? "Contract"),
      status,
      amount: contractAmount(row),
      href: clientId
        ? `/admin/operations/client-command/${clientId}?tab=contracts`
        : "#",
      bucket: "contracts",
    };

    if (isUnsignedContract(status)) {
      contractsAwaitingSignature.push({ ...item, bucket: "contracts" });
    }

    if (status === "signed" && row.signedAt) {
      const signedAt = new Date(String(row.signedAt));
      if (signedAt >= todayStart) {
        signedToday.push({ ...item, bucket: "signed" });
      }
    }
  }

  for (const doc of conversions.docs) {
    const row = doc as AnyDoc;
    const launchStatus = String(row.launchStatus ?? "queued");
    if (launchStatus === "completed") continue;
    const clientId = relId(row.client);
    launchQueue.push({
      id: row.id as number,
      clientId,
      clientName: clientName(row.client),
      title: String(row.title ?? "Launch"),
      status: launchStatus,
      amount: null,
      href: clientId
        ? `/admin/operations/client-command/${clientId}?tab=contracts`
        : "#",
      bucket: "launch",
    });
  }

  return {
    readyToConvert: readyToConvert.slice(0, 8),
    recentlyConverted: recentlyConverted.slice(0, 8),
    contractsAwaitingSignature: contractsAwaitingSignature.slice(0, 8),
    signedToday: signedToday.slice(0, 8),
    launchQueue: launchQueue.slice(0, 8),
    conversionValue: Math.round(conversionValue),
    totals: {
      ready: readyToConvert.length,
      converted: recentlyConverted.length,
      contracts: contractsAwaitingSignature.length,
      signed: signedToday.length,
      launch: launchQueue.length,
    },
  };
}
