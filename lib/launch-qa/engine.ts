import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { buildDefaultChecklist } from "./templates";
import {
  computeCategorySummaries,
  computeLaunchQaScores,
  deriveSessionStatus,
  extractBlockers,
  extractWarnings,
  recommendationLabel,
} from "./scoring";
import type {
  LaunchQaCommandSummary,
  LaunchQaDetail,
  LaunchQaListItem,
  LaunchQaPortfolioData,
  LaunchQaChecklistItem,
  LaunchRecommendation,
  LaunchQaStatus,
} from "./types";
import { launchQaHrefForClient } from "./playbooks";

const COLLECTION = "website-qa-checks";

type QaDoc = Record<string, unknown>;

function parseChecklist(raw: unknown): LaunchQaChecklistItem[] {
  if (!Array.isArray(raw)) return buildDefaultChecklist();
  const defaults = buildDefaultChecklist();
  const byId = new Map(defaults.map((d) => [d.id, d]));
  return defaults.map((def) => {
    const found = (raw as LaunchQaChecklistItem[]).find((r) => r.id === def.id);
    if (!found) return { ...def };
    return { ...def, ...found, id: def.id, categoryId: def.categoryId };
  });
}

function clientIdFromRel(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    return Number((value as { id: number }).id);
  }
  return null;
}

function clientNameFromRel(value: unknown): string {
  if (typeof value === "object" && value !== null && "name" in value) {
    return String((value as { name: string }).name);
  }
  return "Client";
}

function toDetail(doc: QaDoc): LaunchQaDetail {
  const items = parseChecklist(doc.checklistItems);
  const scores = computeLaunchQaScores(items);
  const clientId = clientIdFromRel(doc.client) ?? 0;
  const recommendation = (doc.recommendation as LaunchRecommendation) ?? scores.recommendation;
  if (doc.approvedAt) {
    scores.recommendation = "approved";
  }

  return {
    id: doc.id as number,
    clientId,
    clientName: clientNameFromRel(doc.client),
    projectId: clientIdFromRel(doc.project),
    websiteUrl: doc.websiteUrl ? String(doc.websiteUrl) : null,
    status: (doc.status as LaunchQaStatus) ?? "draft",
    launchDate: doc.launchDate ? String(doc.launchDate) : null,
    readinessScore: Number(doc.readinessScore ?? scores.readinessScore),
    notes: doc.notes ? String(doc.notes) : null,
    checklistItems: items,
    categories: computeCategorySummaries(items),
    blockers: (doc.blockers as LaunchQaDetail["blockers"]) ?? extractBlockers(items),
    warnings: (doc.warnings as LaunchQaDetail["warnings"]) ?? extractWarnings(items),
    scores,
    recommendation: doc.approvedAt ? "approved" : recommendation,
    checkedBy: doc.checkedBy ? String(doc.checkedBy) : null,
    approvedBy: doc.approvedBy ? String(doc.approvedBy) : null,
    completedAt: doc.completedAt ? String(doc.completedAt) : null,
    approvedAt: doc.approvedAt ? String(doc.approvedAt) : null,
    createdAt: String(doc.createdAt ?? ""),
    updatedAt: String(doc.updatedAt ?? ""),
    playbookHref: "/admin/operations/playbooks",
  };
}

function toListItem(doc: QaDoc): LaunchQaListItem {
  const clientId = clientIdFromRel(doc.client) ?? 0;
  const id = doc.id as number;
  return {
    id,
    clientId,
    clientName: clientNameFromRel(doc.client),
    projectId: clientIdFromRel(doc.project),
    websiteUrl: doc.websiteUrl ? String(doc.websiteUrl) : null,
    status: (doc.status as LaunchQaStatus) ?? "draft",
    launchDate: doc.launchDate ? String(doc.launchDate) : null,
    readinessScore: Number(doc.readinessScore ?? 0),
    recommendation: (doc.recommendation as LaunchRecommendation) ?? "not-ready",
    criticalBlockers: Array.isArray(doc.blockers) ? doc.blockers.length : 0,
    updatedAt: String(doc.updatedAt ?? ""),
    href: `/admin/operations/launch-qa/${clientId}`,
    clientHref: `/admin/operations/client-command/${clientId}`,
  };
}

export async function getLaunchQaPortfolio(): Promise<LaunchQaPortfolioData> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    limit: 100,
    sort: "-updatedAt",
    depth: 1,
    overrideAccess: true,
  });

  const sessions = result.docs.map((d) => toListItem(d as QaDoc));
  const open = sessions.filter((s) => !["launched", "archived", "approved"].includes(s.status)).length;
  const blocked = sessions.filter((s) => s.status === "blocked").length;
  const ready = sessions.filter((s) => s.status === "ready").length;
  const approved = sessions.filter((s) => s.status === "approved").length;
  const launched = sessions.filter((s) => s.status === "launched").length;
  const avgScore =
    sessions.length
      ? Math.round(sessions.reduce((sum, s) => sum + s.readinessScore, 0) / sessions.length)
      : 0;

  return {
    sessions,
    totals: { open, blocked, ready, approved, launched, avgScore },
  };
}

export async function getLaunchQaById(id: number): Promise<LaunchQaDetail | null> {
  const payload = await getPayload({ config });
  try {
    const doc = await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      id,
      depth: 1,
      overrideAccess: true,
    });
    return toDetail(doc as QaDoc);
  } catch {
    return null;
  }
}

export async function getLatestLaunchQaForClient(clientId: number): Promise<LaunchQaDetail | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: {
      and: [
        { client: { equals: clientId } },
        { status: { not_equals: "archived" } },
      ],
    },
    limit: 1,
    sort: "-updatedAt",
    depth: 1,
    overrideAccess: true,
  });

  const doc = result.docs[0];
  if (!doc) return null;
  return toDetail(doc as QaDoc);
}

export async function createLaunchQaCheck(input: {
  clientId: number;
  projectId?: number;
  websiteUrl?: string;
  launchDate?: string;
  notes?: string;
  createdFrom?: string;
}): Promise<LaunchQaDetail> {
  const payload = await getPayload({ config });
  const items = buildDefaultChecklist();
  const scores = computeLaunchQaScores(items);

  const doc = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    data: {
      client: input.clientId,
      project: input.projectId,
      websiteUrl: input.websiteUrl,
      launchDate: input.launchDate,
      status: "draft",
      readinessScore: scores.readinessScore,
      recommendation: scores.recommendation,
      notes: input.notes ?? `Created from ${input.createdFrom ?? "Launch QA"}`,
      categories: computeCategorySummaries(items),
      checklistItems: items,
      blockers: extractBlockers(items),
      warnings: extractWarnings(items),
      metadata: { createdFrom: input.createdFrom },
    },
    overrideAccess: true,
  });

  const detail = toDetail(doc as QaDoc);
  const { onLaunchQaCreated } = await import("./automation");
  await onLaunchQaCreated(payload, {
    clientId: input.clientId,
    qaId: detail.id,
    projectId: input.projectId,
    websiteUrl: input.websiteUrl,
  });

  return detail;
}

export async function getLaunchQaSummaryForClient(clientId: number): Promise<LaunchQaCommandSummary> {
  const detail = await getLatestLaunchQaForClient(clientId);
  if (!detail) {
    return {
      qaId: null,
      href: launchQaHrefForClient(clientId),
      status: "none",
      readinessScore: 0,
      recommendation: "none",
      criticalBlockers: 0,
      openItems: 0,
      launchDate: null,
    };
  }

  const openItems = detail.checklistItems.filter(
    (i) => i.status === "pending" || i.status === "fail",
  ).length;

  return {
    qaId: detail.id,
    href: launchQaHrefForClient(clientId),
    status: detail.status,
    readinessScore: detail.readinessScore,
    recommendation: detail.recommendation,
    criticalBlockers: detail.scores.criticalBlockerCount,
    openItems,
    launchDate: detail.launchDate,
  };
}

export function formatRecommendation(rec: LaunchRecommendation): string {
  return recommendationLabel(rec);
}
