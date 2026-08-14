/**
 * Approval-first branded monthly report lifecycle.
 * draft → in-review → approved → ready-for-manual-delivery → archived
 *
 * Extends MonthlyReports. Never emails. Never fabricates metrics.
 */

import "server-only";

import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { getPayload } from "payload";
import config from "@payload-config";
import { loadClientReportingConnection } from "@/lib/reporting/providers/connection";
import { loadReportingFacts } from "@/lib/reporting/persistence/facts";
import type { ReportingCapabilityId } from "@/lib/reporting/domain";
import { composeBrandedReportSnapshot } from "./compose";
import { renderBrandedReportPdf } from "./export-pdf";
import { buildBrandedReportHtml } from "./export-html";
import { buildManualAuditMetrics, isVerifiedAuditTotals } from "./manual-audit-metrics";
import {
  GOOGLE_ADS_AUDIT_REPAIR_KIND,
  brandedReportPeriodFromDoc,
  presentationForReportDoc,
  reportKindFromDoc,
} from "./presentation";
import { july2026ControlledPeriod, createBrandedReportPeriod } from "./period";
import { resolveReportScope, scopeIncludes, isReportScopeCapability } from "./scope";
import { buildBrandedMetric, freshnessFromSyncAt } from "./metrics";
import { comparisonPeriodFor } from "./period";
import {
  assertSnapshotImmutable,
  fingerprintBrandedSnapshot,
} from "./snapshot";
import { sanitizeReportText } from "./sanitize";
import {
  BRANDED_REPORT_APPROVAL_STATUSES,
  type BrandedReportApprovalStatus,
  type BrandedReportArchiveEntry,
  type BrandedReportOverviewRow,
  type BrandedReportSnapshot,
  type BrandedMetric,
  type CompletedWorkItem,
  type DataSourcePresence,
  type ReportScopeCapability,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

const COLLECTION = "monthly-reports";
const PDF_ROOT = path.join(process.cwd(), "storage", "branded-monthly-reports");

export class BrandedReportError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "BrandedReportError";
    this.status = status;
  }
}

function isApprovalStatus(value: unknown): value is BrandedReportApprovalStatus {
  return (
    typeof value === "string" &&
    (BRANDED_REPORT_APPROVAL_STATUSES as readonly string[]).includes(value)
  );
}

function clientIdOf(doc: AnyDoc): number {
  const client = doc.client;
  if (typeof client === "number") return client;
  if (client && typeof client === "object") return Number(client.id);
  return Number(doc.client_id ?? 0);
}

function clientNameOf(doc: AnyDoc): string {
  const client = doc.client;
  if (client && typeof client === "object") {
    return String(client.name ?? "Client");
  }
  return "Client";
}

async function loadReport(id: number, depth = 1): Promise<AnyDoc> {
  if (!Number.isFinite(id) || id <= 0) {
    throw new BrandedReportError("Invalid report id.", 400);
  }
  const payload = await getPayload({ config });
  try {
    const doc = await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      id,
      depth,
      overrideAccess: true,
    });
    return doc as AnyDoc;
  } catch {
    throw new BrandedReportError("Report not found.", 404);
  }
}

async function updateReport(id: number, data: Record<string, unknown>): Promise<AnyDoc> {
  const payload = await getPayload({ config });
  const doc = await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    id,
    data,
    depth: 1,
    overrideAccess: true,
  });
  return doc as AnyDoc;
}

function assertClientMatch(doc: AnyDoc, expectedClientId: number): void {
  const actual = clientIdOf(doc);
  if (!Number.isFinite(expectedClientId) || expectedClientId <= 0) {
    throw new BrandedReportError("Invalid client id.", 400);
  }
  if (actual !== expectedClientId) {
    throw new BrandedReportError("Cross-client report access denied.", 403);
  }
}

function pdfPathFor(reportId: number, version: number, fingerprint: string): string {
  const safeFp = fingerprint.slice(0, 16);
  return path.join(PDF_ROOT, String(reportId), `v${version}-${safeFp}.pdf`);
}

async function buildDataSources(
  clientId: number,
  scopeCaps: ReportScopeCapability[],
): Promise<{
  dataSources: DataSourcePresence[];
  enabledCapabilities: ReportingCapabilityId[];
  timezone: string | null;
  reportingEnabled: boolean;
}> {
  const connection = await loadClientReportingConnection(clientId);
  const enabled = connection?.enabledCapabilities ?? [];
  const infraTimezone: string | null = null;

  // Lightweight sync lookup
  const payload = await getPayload({ config });
  let syncDocs: AnyDoc[] = [];
  try {
    const sync = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "reporting-sync-states" as any,
      where: { client: { equals: clientId } },
      limit: 20,
      overrideAccess: true,
    });
    syncDocs = sync.docs as AnyDoc[];
  } catch {
    syncDocs = [];
  }

  const syncAt = (provider: string): string | null => {
    const row = syncDocs.find((d) => String(d.provider ?? "") === provider);
    return row?.lastSuccessfulSyncAt ? String(row.lastSuccessfulSyncAt) : null;
  };

  const includeBase = scopeCaps.includes("base-website");
  const includeSeo = scopeCaps.includes("seo");
  const includeAds = scopeCaps.includes("google-ads");

  const ga4Connected = Boolean(connection?.ga4PropertyId);
  const gscConnected = Boolean(connection?.searchConsoleSiteUrl);
  const adsConnected = Boolean(connection?.googleAdsCustomerId);

  const dataSources: DataSourcePresence[] = [
    {
      providerId: "ga4",
      label: "Google Analytics 4",
      connected: ga4Connected,
      entitled: enabled.includes("website-analytics") || includeBase,
      includedInReport: includeBase,
      lastSuccessfulSyncAt: syncAt("ga4"),
      freshness: freshnessFromSyncAt(syncAt("ga4")),
      statusNote: !includeBase
        ? "Not included in report scope."
        : !ga4Connected
          ? "GA4 property is not configured."
          : syncAt("ga4")
            ? "Configured; last successful sync recorded."
            : "Configured; no successful sync recorded for this client.",
    },
    {
      providerId: "search-console",
      label: "Google Search Console",
      connected: gscConnected,
      entitled: enabled.includes("seo"),
      includedInReport: includeSeo,
      lastSuccessfulSyncAt: syncAt("search-console") ?? syncAt("gsc"),
      freshness: freshnessFromSyncAt(syncAt("search-console") ?? syncAt("gsc")),
      statusNote: !includeSeo
        ? "Not included in report scope."
        : !gscConnected
          ? "Search Console site is not configured."
          : "Configured for organic search reporting.",
    },
    {
      providerId: "google-ads",
      label: "Google Ads",
      connected: adsConnected,
      entitled: enabled.includes("google-ads"),
      includedInReport: includeAds,
      lastSuccessfulSyncAt: syncAt("google-ads") ?? syncAt("ads"),
      freshness: freshnessFromSyncAt(syncAt("google-ads") ?? syncAt("ads")),
      statusNote: !includeAds
        ? "Not included in report scope."
        : !adsConnected
          ? "Google Ads customer is not configured."
          : "Configured for advertising reporting.",
    },
    {
      providerId: "activity",
      label: "Completed work / activity",
      connected: true,
      entitled: true,
      includedInReport: true,
      lastSuccessfulSyncAt: null,
      freshness: "unknown",
      statusNote: "Derived from client-visible completed activity when available.",
    },
    {
      providerId: "operator",
      label: "Operator narrative",
      connected: true,
      entitled: true,
      includedInReport: true,
      lastSuccessfulSyncAt: null,
      freshness: "fresh",
      statusNote: "Operator-authored sections require review before approval.",
    },
  ];

  return {
    dataSources,
    enabledCapabilities: enabled,
    timezone: infraTimezone,
    reportingEnabled: true,
  };
}

async function metricsFromFacts(
  clientId: number,
  period: ReturnType<typeof july2026ControlledPeriod>,
  scopeCaps: ReportScopeCapability[],
): Promise<BrandedMetric[]> {
  const comparison = comparisonPeriodFor(period);
  let facts: Awaited<ReturnType<typeof loadReportingFacts>> = [];
  try {
    facts = await loadReportingFacts({
      clientId,
      period: {
        start: period.start,
        end: period.end,
        grain: "month",
        label: period.label,
      },
    });
  } catch {
    facts = [];
  }

  const metrics: BrandedMetric[] = [];
  const pick = (metricKey: string) =>
    facts.find((f) => f.metricKey === metricKey || f.metricKey.endsWith(`.${metricKey}`));

  if (scopeCaps.includes("base-website")) {
    const users = pick("users") ?? pick("activeUsers") ?? pick("sessions");
    if (users) {
      metrics.push(
        buildBrandedMetric({
          key: `ga4.${users.metricKey}`,
          label: users.metricKey.includes("session") ? "Sessions" : "Website users",
          value: users.value,
          unit: users.unit || "count",
          periodStart: period.start,
          periodEnd: period.end,
          comparisonStart: comparison.start,
          comparisonEnd: comparison.end,
          previousValue: users.previousValue ?? null,
          source: "GA4",
          lastSuccessfulSyncAt: users.source.fetchedAt,
          freshness: freshnessFromSyncAt(users.source.fetchedAt),
          completeness: "complete",
          provenance: "verified",
        }),
      );
    }
  }

  if (scopeCaps.includes("seo")) {
    const clicks = pick("clicks");
    if (clicks && String(clicks.source.providerId).includes("search")) {
      metrics.push(
        buildBrandedMetric({
          key: "gsc.clicks",
          label: "Organic search clicks",
          value: clicks.value,
          unit: "count",
          periodStart: period.start,
          periodEnd: period.end,
          comparisonStart: comparison.start,
          comparisonEnd: comparison.end,
          previousValue: clicks.previousValue ?? null,
          source: "Google Search Console",
          lastSuccessfulSyncAt: clicks.source.fetchedAt,
          freshness: freshnessFromSyncAt(clicks.source.fetchedAt),
          completeness: "complete",
          provenance: "verified",
        }),
      );
    }
  }

  if (scopeCaps.includes("google-ads")) {
    const cost = pick("cost") ?? pick("spend");
    if (cost && String(cost.source.providerId).includes("ads")) {
      metrics.push(
        buildBrandedMetric({
          key: "ads.spend",
          label: "Google Ads spend",
          value: cost.value,
          unit: "usd",
          periodStart: period.start,
          periodEnd: period.end,
          comparisonStart: comparison.start,
          comparisonEnd: comparison.end,
          previousValue: cost.previousValue ?? null,
          source: "Google Ads",
          lastSuccessfulSyncAt: cost.source.fetchedAt,
          freshness: freshnessFromSyncAt(cost.source.fetchedAt),
          completeness: "complete",
          provenance: "verified",
        }),
      );
    }
  }

  return metrics;
}

function workItemsFromDoc(doc: AnyDoc): CompletedWorkItem[] {
  const selected = Array.isArray(doc.selectedWorkItems) ? doc.selectedWorkItems : [];
  if (selected.length > 0) {
    return selected.map((item: AnyDoc, idx: number) => ({
      id: String(item.id ?? `work-${idx}`),
      title: sanitizeReportText(item.title ?? "Completed work", 300),
      summary: sanitizeReportText(item.summary ?? "", 800),
      completedAt: item.completedAt ? String(item.completedAt) : null,
      source: String(item.source ?? "activity"),
      clientVisible: item.clientVisible !== false,
      included: item.included !== false,
    }));
  }
  return [];
}

export async function composeSnapshotForReportDoc(
  doc: AnyDoc,
  options?: {
    operatorCapabilities?: ReportScopeCapability[] | null;
    confirmedBy?: string | null;
  },
): Promise<BrandedReportSnapshot> {
  const clientId = clientIdOf(doc);
  if (!clientId) throw new BrandedReportError("Report is missing client.", 400);

  const timezone =
    (typeof doc.reportingTimezone === "string" && doc.reportingTimezone) ||
    DEFAULT_TZ_FALLBACK;

  const period =
    doc.periodStart && doc.periodEnd
      ? brandedReportPeriodFromDoc({
          periodStart: String(doc.periodStart),
          periodEnd: String(doc.periodEnd),
          reportingYear: Number(doc.reportingYear) || null,
          reportingMonth: Number(doc.reportingMonth) || null,
          timezone,
        })
      : july2026ControlledPeriod(timezone);

  const storedCaps = Array.isArray(doc.includedCapabilities)
    ? doc.includedCapabilities.filter(isReportScopeCapability)
    : null;

  const { dataSources, enabledCapabilities, reportingEnabled } = await buildDataSources(
    clientId,
    storedCaps ?? ["base-website"],
  );

  const scope = resolveReportScope({
    reportingEnabled,
    experienceCapabilities: enabledCapabilities,
    operatorConfirmedCapabilities:
      options?.operatorCapabilities ?? storedCaps ?? null,
    confirmedBy: options?.confirmedBy ?? doc.scopeConfirmedBy ?? null,
    confirmedAt: doc.scopeConfirmedAt ? String(doc.scopeConfirmedAt) : null,
    notes: doc.scopeNotes ? String(doc.scopeNotes) : null,
  });

  const verifiedMetrics = await metricsFromFacts(
    clientId,
    period,
    scope.includedCapabilities,
  );

  const presentation = presentationForReportDoc(doc);
  const reportKind = reportKindFromDoc(doc);
  const provenance =
    doc.dataProvenance && typeof doc.dataProvenance === "object"
      ? (doc.dataProvenance as Record<string, unknown>)
      : null;
  const verifiedTotals = provenance?.verifiedTotals;

  let metricsForCompose = verifiedMetrics;
  if (
    reportKind === GOOGLE_ADS_AUDIT_REPAIR_KIND &&
    isVerifiedAuditTotals(verifiedTotals)
  ) {
    metricsForCompose = buildManualAuditMetrics(verifiedTotals, period);
  }

  return composeBrandedReportSnapshot({
    reportId: Number(doc.id),
    clientId,
    clientName: clientNameOf(doc),
    version: Number(doc.version ?? 1),
    period,
    scope,
    verifiedMetrics: metricsForCompose,
    dataSources,
    workItems: workItemsFromDoc(doc),
    presentation,
    narratives: {
      executiveSummary: doc.executiveSummary ? String(doc.executiveSummary) : undefined,
      websitePerformance: doc.websitePerformanceNarrative
        ? String(doc.websitePerformanceNarrative)
        : undefined,
      organicSearch: doc.organicSearchNarrative
        ? String(doc.organicSearchNarrative)
        : undefined,
      googleAds: doc.googleAdsNarrative ? String(doc.googleAdsNarrative) : undefined,
      workCompleted: doc.workCompleted ? String(doc.workCompleted) : undefined,
      improvementsAndWins: doc.improvementsMade ? String(doc.improvementsMade) : undefined,
      issuesOrRisks: doc.issuesOrRisks ? String(doc.issuesOrRisks) : undefined,
      recommendations: typeof doc.recommendations === "string"
        ? doc.recommendations
        : undefined,
      augustPriorities: doc.augustPriorities ? String(doc.augustPriorities) : undefined,
      closing: doc.closingNote ? String(doc.closingNote) : undefined,
    },
    internalNotes: doc.internalNotes ? String(doc.internalNotes) : "",
  });
}

const DEFAULT_TZ_FALLBACK = "America/Los_Angeles";

export type GenerateBrandedReportInput = {
  clientId: number;
  year?: number;
  month?: number;
  startDay?: number;
  endDay?: number;
  timezone?: string | null;
  operatorCapabilities?: ReportScopeCapability[] | null;
  confirmedBy?: string | null;
  preparedBy?: string | null;
};

export async function generateBrandedClientReport(
  input: GenerateBrandedReportInput,
): Promise<{ report: AnyDoc; snapshot: BrandedReportSnapshot }> {
  const clientId = Number(input.clientId);
  if (!Number.isFinite(clientId) || clientId <= 0) {
    throw new BrandedReportError("Invalid client id.", 400);
  }

  const payload = await getPayload({ config });
  let client: AnyDoc;
  try {
    client = (await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    throw new BrandedReportError("Client not found.", 404);
  }

  const year = input.year ?? 2026;
  const month = input.month ?? 7;
  const period = createBrandedReportPeriod({
    year,
    month,
    startDay: input.startDay ?? (year === 2026 && month === 7 ? 1 : 1),
    endDay: input.endDay ?? (year === 2026 && month === 7 ? 30 : undefined),
    timezone: input.timezone,
  });

  const { enabledCapabilities, reportingEnabled } = await buildDataSources(
    clientId,
    input.operatorCapabilities ?? ["base-website"],
  );

  const scope = resolveReportScope({
    reportingEnabled,
    experienceCapabilities: enabledCapabilities,
    operatorConfirmedCapabilities: input.operatorCapabilities ?? null,
    confirmedBy: input.confirmedBy ?? null,
    confirmedAt: input.operatorCapabilities ? new Date().toISOString() : null,
  });

  const existing = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: {
      and: [
        { client: { equals: clientId } },
        { reportingYear: { equals: year } },
        { reportingMonth: { equals: month } },
      ],
    },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  });

  const prior = existing.docs[0] as AnyDoc | undefined;
  const priorStatus = isApprovalStatus(prior?.approvalStatus)
    ? prior!.approvalStatus
    : "draft";
  if (prior && (priorStatus === "approved" || priorStatus === "ready-for-manual-delivery")) {
    throw new BrandedReportError(
      "An approved report already exists for this period. Reopen to draft before regenerating, or create a revision workflow.",
      409,
    );
  }

  const title = `${String(client.name ?? "Client")} — ${period.label}`;
  const data = {
    title,
    client: clientId,
    status: "draft",
    approvalStatus: "draft" as BrandedReportApprovalStatus,
    reportType: "monthly_marketing",
    reportingMonth: month,
    reportingYear: year,
    periodStart: period.start,
    periodEnd: period.end,
    reportingTimezone: period.timezone,
    version: prior ? Number(prior.version ?? 1) : 1,
    preparedBy: input.preparedBy ?? null,
    includedCapabilities: scope.includedCapabilities,
    scopeConfirmedBy: scope.confirmedBy,
    scopeConfirmedAt: scope.confirmedAt,
    scopeNotes: scope.notes,
    deliveryMode: "manual",
    approvedSnapshot: null,
    approvedFingerprint: null,
    reportApprovedAt: null,
    reportApprovedBy: null,
  };

  let doc: AnyDoc;
  if (prior) {
    doc = await updateReport(Number(prior.id), data);
  } else {
    doc = (await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      data,
      depth: 1,
      overrideAccess: true,
    })) as AnyDoc;
  }

  const snapshot = await composeSnapshotForReportDoc(doc, {
    operatorCapabilities: scope.includedCapabilities,
    confirmedBy: scope.confirmedBy,
  });

  doc = await updateReport(Number(doc.id), {
    reportData: snapshot,
    htmlExport: buildBrandedReportHtml(snapshot, { includeInternalNotes: false }),
    executiveSummary: snapshot.narratives.executiveSummary.body,
    workCompleted: snapshot.narratives.workCompleted.body,
  });

  return { report: doc, snapshot };
}

export async function saveBrandedReportDraft(
  reportId: number,
  expectedClientId: number,
  patch: {
    executiveSummary?: string;
    websitePerformanceNarrative?: string;
    organicSearchNarrative?: string;
    googleAdsNarrative?: string;
    workCompleted?: string;
    improvementsMade?: string;
    issuesOrRisks?: string;
    recommendations?: string;
    augustPriorities?: string;
    closingNote?: string;
    internalNotes?: string;
    selectedWorkItems?: CompletedWorkItem[];
    operatorCapabilities?: ReportScopeCapability[];
    confirmedBy?: string | null;
  },
): Promise<{ report: AnyDoc; snapshot: BrandedReportSnapshot }> {
  const doc = await loadReport(reportId, 1);
  assertClientMatch(doc, expectedClientId);

  const status = isApprovalStatus(doc.approvalStatus) ? doc.approvalStatus : "draft";
  if (status === "approved" || status === "ready-for-manual-delivery" || status === "archived") {
    throw new BrandedReportError(
      "Approved or archived reports are immutable. Reopen to draft to revise.",
      409,
    );
  }

  const data: Record<string, unknown> = {
    approvalStatus: "draft",
    status: "draft",
  };
  for (const key of [
    "executiveSummary",
    "websitePerformanceNarrative",
    "organicSearchNarrative",
    "googleAdsNarrative",
    "workCompleted",
    "improvementsMade",
    "issuesOrRisks",
    "augustPriorities",
    "closingNote",
    "internalNotes",
  ] as const) {
    if (patch[key] != null) data[key] = sanitizeReportText(patch[key]);
  }
  if (patch.recommendations != null) {
    data.recommendations = sanitizeReportText(patch.recommendations);
  }
  if (patch.selectedWorkItems) data.selectedWorkItems = patch.selectedWorkItems;
  if (patch.operatorCapabilities) {
    data.includedCapabilities = patch.operatorCapabilities.filter(isReportScopeCapability);
    data.scopeConfirmedBy = patch.confirmedBy ?? null;
    data.scopeConfirmedAt = new Date().toISOString();
  }

  let updated = await updateReport(reportId, data);
  const snapshot = await composeSnapshotForReportDoc(updated, {
    operatorCapabilities: patch.operatorCapabilities ?? null,
    confirmedBy: patch.confirmedBy ?? null,
  });
  updated = await updateReport(reportId, {
    reportData: snapshot,
    htmlExport: buildBrandedReportHtml(snapshot, { includeInternalNotes: false }),
  });
  return { report: updated, snapshot };
}

export async function submitBrandedReportForReview(
  reportId: number,
  expectedClientId: number,
): Promise<AnyDoc> {
  const doc = await loadReport(reportId);
  assertClientMatch(doc, expectedClientId);
  const status = isApprovalStatus(doc.approvalStatus) ? doc.approvalStatus : "draft";
  if (status !== "draft" && status !== "in-review") {
    throw new BrandedReportError("Only draft reports can enter review.", 409);
  }
  return updateReport(reportId, {
    approvalStatus: "in-review",
    status: "ready",
  });
}

export async function approveBrandedReport(
  reportId: number,
  expectedClientId: number,
  approvedBy: string,
): Promise<{ report: AnyDoc; snapshot: BrandedReportSnapshot }> {
  if (!approvedBy.trim()) {
    throw new BrandedReportError("Approval requires an authorized operator identity.", 401);
  }
  const doc = await loadReport(reportId, 1);
  assertClientMatch(doc, expectedClientId);
  const status = isApprovalStatus(doc.approvalStatus) ? doc.approvalStatus : "draft";
  if (status !== "draft" && status !== "in-review") {
    throw new BrandedReportError("Only draft or in-review reports can be approved.", 409);
  }

  const snapshot = await composeSnapshotForReportDoc(doc);
  const fingerprint = snapshot.fingerprint;

  const updated = await updateReport(reportId, {
    approvalStatus: "approved",
    status: "ready",
    approvedSnapshot: snapshot,
    approvedFingerprint: fingerprint,
    reportApprovedAt: new Date().toISOString(),
    reportApprovedBy: approvedBy.trim(),
    approvedBy: approvedBy.trim(),
    htmlExport: buildBrandedReportHtml(snapshot, { includeInternalNotes: false }),
    reportData: snapshot,
  });

  return { report: updated, snapshot };
}

export async function reopenBrandedReportToDraft(
  reportId: number,
  expectedClientId: number,
): Promise<AnyDoc> {
  const doc = await loadReport(reportId);
  assertClientMatch(doc, expectedClientId);
  const status = isApprovalStatus(doc.approvalStatus) ? doc.approvalStatus : "draft";
  if (status === "archived") {
    throw new BrandedReportError("Archived reports cannot be reopened.", 409);
  }
  const nextVersion =
    status === "approved" || status === "ready-for-manual-delivery"
      ? Number(doc.version ?? 1) + 1
      : Number(doc.version ?? 1);

  return updateReport(reportId, {
    approvalStatus: "draft",
    status: "draft",
    version: nextVersion,
    approvedSnapshot: null,
    approvedFingerprint: null,
    reportApprovedAt: null,
    reportApprovedBy: null,
  });
}

export async function generateBrandedReportPdf(
  reportId: number,
  expectedClientId: number,
  actorEmail: string | null,
): Promise<{ buffer: Buffer; filename: string; fingerprint: string }> {
  const doc = await loadReport(reportId, 1);
  assertClientMatch(doc, expectedClientId);

  const status = isApprovalStatus(doc.approvalStatus) ? doc.approvalStatus : "draft";
  if (status !== "approved" && status !== "ready-for-manual-delivery") {
    throw new BrandedReportError(
      "PDF generation requires an approved report snapshot.",
      409,
    );
  }

  const stored = doc.approvedSnapshot as BrandedReportSnapshot | null;
  const fingerprint = String(doc.approvedFingerprint ?? "");
  if (!stored || !fingerprint) {
    throw new BrandedReportError("Approved snapshot is missing.", 409);
  }
  assertSnapshotImmutable(stored, fingerprint);
  if (stored.clientId !== expectedClientId || Number(stored.reportId) !== reportId) {
    throw new BrandedReportError("Cross-client snapshot substitution rejected.", 403);
  }
  if (stored.internalNotes) {
    stored.internalNotes = "";
  }

  const outPath = pdfPathFor(reportId, Number(doc.version ?? 1), fingerprint);
  try {
    const existing = await readFile(outPath);
    await updateReport(reportId, {
      approvalStatus: "ready-for-manual-delivery",
      pdfGeneratedAt: doc.pdfGeneratedAt ?? new Date().toISOString(),
      pdfStorageKey: path.relative(process.cwd(), outPath),
      pdfDownloadedAt: new Date().toISOString(),
      pdfDownloadedBy: actorEmail,
    });
    return {
      buffer: existing,
      filename: path.basename(outPath).replace(/\.pdf$/i, "") + ".pdf",
      fingerprint,
    };
  } catch {
    // generate fresh
  }

  const { buffer, filename } = await renderBrandedReportPdf(stored);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, buffer);

  // Verify written bytes hash for integrity (not the snapshot fingerprint).
  createHash("sha256").update(buffer).digest("hex");

  await updateReport(reportId, {
    approvalStatus: "ready-for-manual-delivery",
    status: "ready",
    pdfGeneratedAt: new Date().toISOString(),
    pdfStorageKey: path.relative(process.cwd(), outPath),
    pdfDownloadedAt: new Date().toISOString(),
    pdfDownloadedBy: actorEmail,
    // Explicit: download ≠ sent
    deliveryMode: "manual",
  });

  return { buffer, filename, fingerprint };
}

/** Authenticated portal PDF — read-only; does not mutate approval status. */
export async function getPortalBrandedReportPdf(
  reportId: number,
  expectedClientId: number,
): Promise<{ buffer: Buffer; filename: string }> {
  const doc = await loadReport(reportId, 1);
  assertClientMatch(doc, expectedClientId);

  const status = isApprovalStatus(doc.approvalStatus) ? doc.approvalStatus : "draft";
  if (status !== "approved" && status !== "ready-for-manual-delivery") {
    throw new BrandedReportError("Approved report snapshot required.", 404);
  }
  if (String(doc.status ?? "") !== "published") {
    throw new BrandedReportError("Report is not published.", 404);
  }

  const stored = doc.approvedSnapshot as BrandedReportSnapshot | null;
  const fingerprint = String(doc.approvedFingerprint ?? "");
  if (!stored || !fingerprint) {
    throw new BrandedReportError("Approved snapshot is missing.", 404);
  }
  assertSnapshotImmutable(stored, fingerprint);
  if (stored.clientId !== expectedClientId || Number(stored.reportId) !== reportId) {
    throw new BrandedReportError("Cross-client snapshot substitution rejected.", 403);
  }

  const provenance =
    doc.dataProvenance && typeof doc.dataProvenance === "object"
      ? (doc.dataProvenance as Record<string, unknown>)
      : null;

  const { buffer, filename } = await renderBrandedReportPdf(stored, {
    auditPeriodLabel:
      typeof provenance?.auditPeriodLabel === "string"
        ? provenance.auditPeriodLabel
        : undefined,
    repairDateLabel:
      typeof provenance?.repairDate === "string" ? provenance.repairDate : undefined,
    preparedBy:
      typeof doc.preparedBy === "string" && doc.preparedBy.trim()
        ? doc.preparedBy
        : undefined,
  });
  return { buffer, filename };
}

export async function archiveBrandedReport(
  reportId: number,
  expectedClientId: number,
): Promise<AnyDoc> {
  const doc = await loadReport(reportId);
  assertClientMatch(doc, expectedClientId);
  return updateReport(reportId, {
    approvalStatus: "archived",
    status: "archived",
  });
}

export async function getBrandedReportPreviewHtml(
  reportId: number,
  expectedClientId: number,
  options?: { includeInternalNotes?: boolean },
): Promise<string> {
  const doc = await loadReport(reportId, 1);
  assertClientMatch(doc, expectedClientId);
  const status = isApprovalStatus(doc.approvalStatus) ? doc.approvalStatus : "draft";
  if (
    (status === "approved" || status === "ready-for-manual-delivery") &&
    doc.approvedSnapshot
  ) {
    return buildBrandedReportHtml(doc.approvedSnapshot as BrandedReportSnapshot, {
      includeInternalNotes: Boolean(options?.includeInternalNotes),
    });
  }
  const snapshot = await composeSnapshotForReportDoc(doc);
  return buildBrandedReportHtml(snapshot, {
    includeInternalNotes: Boolean(options?.includeInternalNotes),
  });
}

export async function listBrandedReportArchive(
  clientId: number,
): Promise<BrandedReportArchiveEntry[]> {
  if (!Number.isFinite(clientId) || clientId <= 0) {
    throw new BrandedReportError("Invalid client id.", 400);
  }
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: { client: { equals: clientId } },
    sort: "-reportingYear,-reportingMonth,-version",
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });

  const docs = result.docs as AnyDoc[];
  const latestByPeriod = new Map<string, number>();
  for (const doc of docs) {
    const key = `${doc.reportingYear}-${doc.reportingMonth}`;
    const version = Number(doc.version ?? 1);
    latestByPeriod.set(key, Math.max(latestByPeriod.get(key) ?? 0, version));
  }

  return docs.map((doc) => {
    const key = `${doc.reportingYear}-${doc.reportingMonth}`;
    const version = Number(doc.version ?? 1);
    const status = isApprovalStatus(doc.approvalStatus)
      ? doc.approvalStatus
      : "draft";
    return {
      reportId: Number(doc.id),
      periodLabel:
        doc.periodStart && doc.periodEnd
          ? `${String(doc.periodStart).slice(0, 10)} – ${String(doc.periodEnd).slice(0, 10)}`
          : `${doc.reportingMonth}/${doc.reportingYear}`,
      version,
      approvalStatus: status,
      generatedAt: doc.pdfGeneratedAt ? String(doc.pdfGeneratedAt) : null,
      approvedAt: doc.reportApprovedAt ? String(doc.reportApprovedAt) : null,
      approvedBy: doc.reportApprovedBy ? String(doc.reportApprovedBy) : null,
      pdfAvailable: Boolean(doc.pdfStorageKey),
      fingerprint: doc.approvedFingerprint ? String(doc.approvedFingerprint) : null,
      superseded: version < (latestByPeriod.get(key) ?? version),
    };
  });
}

export async function getBrandedReportingOverview(period = july2026ControlledPeriod()): Promise<{
  period: typeof period;
  rows: BrandedReportOverviewRow[];
}> {
  const payload = await getPayload({ config });
  const clients = await payload.find({
    collection: "clients",
    limit: 200,
    sort: "name",
    overrideAccess: true,
  });

  const reports = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: {
      and: [
        { reportingYear: { equals: period.year } },
        { reportingMonth: { equals: period.month } },
      ],
    },
    limit: 200,
    depth: 0,
    overrideAccess: true,
  });

  const byClient = new Map<number, AnyDoc>();
  for (const doc of reports.docs as AnyDoc[]) {
    byClient.set(clientIdOf(doc), doc);
  }

  const rows: BrandedReportOverviewRow[] = [];
  for (const client of clients.docs as AnyDoc[]) {
    const clientId = Number(client.id);
    const report = byClient.get(clientId) ?? null;
    const { dataSources, enabledCapabilities } = await buildDataSources(clientId, [
      "base-website",
    ]);
    const scope = resolveReportScope({
      reportingEnabled: true,
      experienceCapabilities: enabledCapabilities,
      operatorConfirmedCapabilities: Array.isArray(report?.includedCapabilities)
        ? report!.includedCapabilities.filter(isReportScopeCapability)
        : null,
    });

    const availableSources = dataSources
      .filter((d) => d.connected)
      .map((d) => d.label);
    const missingSources = dataSources
      .filter((d) => d.includedInReport && !d.connected)
      .map((d) => d.label);

    const blockers: string[] = [];
    const warnings: string[] = [];
    if (scope.source === "fail-closed") {
      warnings.push(scope.notes ?? "Scope fail-closed to base website reporting.");
    }
    if (missingSources.length) {
      warnings.push(`Missing data sources: ${missingSources.join(", ")}`);
    }
    if (!availableSources.length && !report) {
      warnings.push("No analytics integrations connected — service-only report possible.");
    }

    const approvalStatus = report && isApprovalStatus(report.approvalStatus)
      ? report.approvalStatus
      : report
        ? "draft"
        : "none";

    const lastSync = dataSources
      .map((d) => d.lastSuccessfulSyncAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;

    rows.push({
      clientId,
      clientName: String(client.name ?? "Client"),
      reportingEnabled: true,
      periodLabel: period.label,
      approvalStatus,
      reportId: report ? Number(report.id) : null,
      version: report ? Number(report.version ?? 1) : null,
      includedCapabilities: scope.includedCapabilities,
      availableSources,
      missingSources,
      lastSuccessfulSyncAt: lastSync,
      freshness: freshnessFromSyncAt(lastSync),
      blockers,
      warnings,
      deliveryStatus:
        approvalStatus === "ready-for-manual-delivery"
          ? "ready-for-manual-delivery"
          : approvalStatus === "approved"
            ? "not-ready"
            : "not-applicable",
      action: blockers.length ? "blocked" : report ? "open" : "generate",
    });
  }

  return { period, rows };
}

export function verifyApprovedSnapshotIntegrity(doc: AnyDoc): boolean {
  const snapshot = doc.approvedSnapshot as BrandedReportSnapshot | null;
  const fingerprint = String(doc.approvedFingerprint ?? "");
  if (!snapshot || !fingerprint) return false;
  try {
    assertSnapshotImmutable(snapshot, fingerprint);
    return fingerprintBrandedSnapshot(snapshot) === fingerprint;
  } catch {
    return false;
  }
}

export { scopeIncludes };
