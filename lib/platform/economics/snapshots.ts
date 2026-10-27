import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type {
  PlatformEconomicsHistoryPoint,
  PlatformEconomicsInputs,
  PlatformEconomicsSnapshotSummary,
  PlatformEconomicsComputed,
} from "./types";

type SnapshotDoc = {
  id: number | string;
  label: string;
  calculationVersion: string;
  capturedAt: string;
  sourceFingerprint: string;
  inputs: PlatformEconomicsInputs;
  outputs: PlatformEconomicsComputed;
  milestoneNotes: string[];
};

function asOutputs(raw: unknown): PlatformEconomicsComputed | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as PlatformEconomicsComputed;
}

export async function listPlatformEconomicsSnapshots(
  limit = 24,
): Promise<PlatformEconomicsSnapshotSummary[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "platform-economics-snapshots",
    limit,
    sort: "-capturedAt",
    depth: 0,
  });

  return result.docs
    .map((doc) => {
      const outputs = asOutputs(doc.outputs);
      if (!outputs) return null;
      return {
        id: String(doc.id),
        label: String(doc.label ?? "Snapshot"),
        capturedAt: String(doc.capturedAt ?? doc.createdAt),
        calculationVersion: String(doc.calculationVersion ?? "v1"),
        replacementCostMidUsd: outputs.replacementCost.replacementCostMidUsd,
        overallCompletionPercent: outputs.overallCompletionPercent,
        monthlyRecurringRevenue: outputs.saas.monthlyRecurringRevenue,
      };
    })
    .filter((row): row is PlatformEconomicsSnapshotSummary => row !== null);
}

export function snapshotsToHistory(
  snapshots: PlatformEconomicsSnapshotSummary[],
): PlatformEconomicsHistoryPoint[] {
  return [...snapshots]
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
    .map((s) => ({
      capturedAt: s.capturedAt,
      replacementCostMidUsd: s.replacementCostMidUsd,
      overallCompletionPercent: s.overallCompletionPercent,
      monthlyRecurringRevenue: s.monthlyRecurringRevenue,
      label: s.label,
    }));
}

export async function economicsSnapshotExistsForFingerprint(
  sourceFingerprint: string,
): Promise<boolean> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "platform-economics-snapshots",
    where: { sourceFingerprint: { equals: sourceFingerprint } },
    limit: 1,
    depth: 0,
  });
  return result.docs.length > 0;
}

export async function createPlatformEconomicsSnapshot(args: {
  label: string;
  calculationVersion: string;
  sourceFingerprint: string;
  inputs: PlatformEconomicsInputs;
  outputs: PlatformEconomicsComputed;
  milestoneNotes: string[];
}): Promise<SnapshotDoc> {
  const payload = await getPayload({ config });
  const doc = await payload.create({
    collection: "platform-economics-snapshots",
    data: {
      label: args.label,
      calculationVersion: args.calculationVersion,
      capturedAt: new Date().toISOString(),
      sourceFingerprint: args.sourceFingerprint,
      inputs: args.inputs,
      outputs: args.outputs,
      milestoneNotes: args.milestoneNotes,
    },
  });
  return doc as SnapshotDoc;
}
