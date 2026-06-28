import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { loadIntelligenceContext } from "@/lib/intelligence/context";
import { createExecutiveEvent } from "@/lib/executive-timeline/create-event";
import { generateReportPayload } from "./generator";
import { buildHtmlReport, buildPdfReadyDocument, buildPortalReportHtml } from "./export";
import { defaultReportTitle, getBuiltinTemplate, monthLabel } from "./templates";
import type {
  GenerateReportInput,
  GenerateReportResult,
  ReportDoc,
  ReportingDashboardData,
} from "./types";

const COLLECTION = "monthly-reports";

export async function getReportingDashboard(): Promise<ReportingDashboardData> {
  const payload = await getPayload({ config });
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [reports, clients] = await Promise.all([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      limit: 200,
      sort: "-updatedAt",
      depth: 1,
      overrideAccess: true,
    }),
    payload.find({
      collection: "clients",
      where: { status: { equals: "active" } },
      limit: 200,
      overrideAccess: true,
    }),
  ]);

  const docs = reports.docs as ReportDoc[];
  const activeClients = clients.docs as ReportDoc[];

  const thisMonthReports = docs.filter(
    (r) => Number(r.reportingMonth) === currentMonth && Number(r.reportingYear) === currentYear,
  );

  const clientIdsWithReport = new Set(
    thisMonthReports.map((r) =>
      typeof r.client === "object" && r.client !== null ? (r.client as ReportDoc).id : r.client,
    ),
  );

  const clientsWithoutReport = activeClients.filter((c) => !clientIdsWithReport.has(c.id));

  const published = docs.filter((r) => r.status === "published");
  const viewed = published.filter((r) => Number(r.viewCount ?? 0) > 0);

  const lastGenerated = docs
    .filter((r) => r.status === "ready" || r.status === "published")
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];

  return {
    reportsDue: clientsWithoutReport.length,
    reportsGenerated: thisMonthReports.filter((r) => ["ready", "published"].includes(String(r.status))).length,
    reportsApproved: docs.filter((r) => r.approvedBy).length,
    reportsPublished: published.length,
    reportsViewed: viewed.length,
    lastGeneratedAt: lastGenerated?.updatedAt ? String(lastGenerated.updatedAt) : null,
    recentReports: docs.slice(0, 12),
    clientsWithoutReport,
  };
}

export async function getAllReports(limit = 100): Promise<ReportDoc[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    limit,
    sort: "-reportingYear,-reportingMonth",
    depth: 1,
    overrideAccess: true,
  });
  return result.docs as ReportDoc[];
}

export async function getReportById(id: number): Promise<ReportDoc | null> {
  const payload = await getPayload({ config });
  try {
    const doc = await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      id,
      depth: 2,
      overrideAccess: true,
    });
    return doc as ReportDoc;
  } catch {
    return null;
  }
}

export async function getPortalReports(clientId: number): Promise<ReportDoc[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: {
      and: [
        { client: { equals: clientId } },
        { status: { equals: "published" } },
      ],
    },
    sort: "-reportingYear,-reportingMonth",
    limit: 48,
    depth: 0,
    overrideAccess: true,
  });
  return result.docs as ReportDoc[];
}

export async function generateMonthlyReport(
  input: GenerateReportInput,
): Promise<GenerateReportResult> {
  const payload = await getPayload({ config });
  const ctx = await loadIntelligenceContext();
  const client = ctx.clientsById.get(input.clientId);
  if (!client) return { success: false, error: "Client not found." };

  const clientName = String(client.name);
  const template = getBuiltinTemplate(input.templateSlug);

  const existing = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: {
      and: [
        { client: { equals: input.clientId } },
        { reportingMonth: { equals: input.month } },
        { reportingYear: { equals: input.year } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  });

  const payload_data = generateReportPayload(
    input.clientId,
    input.month,
    input.year,
    ctx,
    input.templateSlug,
  );

  const { getCompletedPlaybooksForClientInMonth } = await import("@/lib/playbooks");
  const completedPlaybooks = await getCompletedPlaybooksForClientInMonth(
    input.clientId,
    input.month,
    input.year,
  );
  if (completedPlaybooks.length > 0) {
    const lines = completedPlaybooks.map((r) => `· Playbook completed — ${r.playbookName}`);
    payload_data.workCompleted = `${payload_data.workCompleted}\n${lines.join("\n")}`;
    payload_data.executiveSummary = `${payload_data.executiveSummary} ${completedPlaybooks.length} operational playbook${completedPlaybooks.length === 1 ? "" : "s"} completed this period.`;
  }

  const { getClientSuccessActivityForMonth } = await import("@/lib/client-success");
  const successActivity = await getClientSuccessActivityForMonth(
    input.clientId,
    input.month,
    input.year,
  );
  if (
    successActivity.checkInsCompleted > 0 ||
    successActivity.wins.length > 0 ||
    successActivity.goalsAchieved.length > 0
  ) {
    const successLines: string[] = [];
    if (successActivity.checkInsCompleted > 0) {
      successLines.push(`· ${successActivity.checkInsCompleted} success meeting(s) completed`);
    }
    for (const win of successActivity.wins.slice(0, 5)) {
      successLines.push(`· Win — ${win.slice(0, 120)}`);
    }
    for (const goal of successActivity.goalsAchieved) {
      successLines.push(`· ${goal}`);
    }
    if (successActivity.renewalReadiness !== "Not assessed") {
      successLines.push(`· Renewal readiness: ${successActivity.renewalReadiness}`);
    }
    for (const note of successActivity.expansionNotes) {
      successLines.push(`· Expansion: ${note}`);
    }
    payload_data.workCompleted = `${payload_data.workCompleted}\n${successLines.join("\n")}`;
    payload_data.executiveSummary = `${payload_data.executiveSummary} Relationship health trend tracked via ${successActivity.checkInsCompleted} success check-in${successActivity.checkInsCompleted === 1 ? "" : "s"}.`;
    if (successActivity.renewalReadiness !== "Not assessed") {
      payload_data.executiveSummary = `${payload_data.executiveSummary} ${successActivity.renewalReadiness}.`;
    }
  }

  const htmlExport = buildHtmlReport(clientName, input.month, input.year, payload_data);
  const portalHtml = buildPortalReportHtml(clientName, input.month, input.year, payload_data);

  const data = {
    title: defaultReportTitle(clientName, input.month, input.year),
    client: input.clientId,
    reportingMonth: input.month,
    reportingYear: input.year,
    status: "ready",
    preparedBy: input.preparedBy ?? "KXD Reporting Engine",
    executiveSummary: payload_data.executiveSummary,
    workCompleted: payload_data.workCompleted,
    deliverables: payload_data.deliverables,
    projects: payload_data.projects,
    meetings: payload_data.meetings,
    websiteHealth: payload_data.websiteHealth,
    infrastructure: payload_data.infrastructure,
    growth: payload_data.growth,
    recommendations: payload_data.recommendations,
    kpis: payload_data.kpis,
    traffic: payload_data.traffic,
    conversions: payload_data.conversions,
    seo: payload_data.seo,
    timeline: payload_data.timeline,
    notes: payload_data.notes,
    nextMonthPriorities: payload_data.nextMonthPriorities,
    connectorStatus: payload_data.connectorStatus,
    reportData: payload_data,
    htmlExport,
    portalHtml,
  };

  let report: ReportDoc;
  if (existing.docs[0]) {
    report = (await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      id: existing.docs[0].id as number,
      data: { ...data, version: Number(existing.docs[0].version ?? 1) + 1 },
      overrideAccess: true,
    })) as ReportDoc;
  } else {
    report = (await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      data,
      overrideAccess: true,
    })) as ReportDoc;
  }

  try {
    await createExecutiveEvent({
      client: input.clientId,
      eventType: "reporting.generated",
      title: `Monthly report generated · ${monthLabel(input.month, input.year)}`,
      summary: payload_data.executiveSummary.slice(0, 280),
      category: "relationship",
      importance: "normal",
      sourceModule: "Growth",
      metadata: { reportId: report.id, template: template.slug },
    });
  } catch (err) {
    console.error("[KXD Reporting] Timeline publish failed:", err);
  }

  return { success: true, reportId: report.id as number };
}

export async function publishMonthlyReport(
  reportId: number,
  approvedBy?: string,
): Promise<ReportDoc | null> {
  const payload = await getPayload({ config });
  const report = await getReportById(reportId);
  if (!report) return null;

  const clientId =
    typeof report.client === "object" && report.client !== null
      ? (report.client as ReportDoc).id
      : report.client;

  const updated = await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    id: reportId,
    data: {
      status: "published",
      publishedAt: new Date().toISOString(),
      approvedBy: approvedBy ?? "KXD Operations",
    },
    overrideAccess: true,
  });

  if (clientId) {
    try {
      await createExecutiveEvent({
        client: clientId as number,
        eventType: "reporting.published",
        title: `Monthly report published · ${monthLabel(Number(report.reportingMonth), Number(report.reportingYear))}`,
        category: "relationship",
        importance: "high",
        sourceModule: "Growth",
        metadata: { reportId },
      });
    } catch (err) {
      console.error("[KXD Reporting] Publish timeline failed:", err);
    }
  }

  return updated as ReportDoc;
}

export async function recordPortalReportView(reportId: number): Promise<void> {
  const payload = await getPayload({ config });
  const report = await getReportById(reportId);
  if (!report) return;

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    id: reportId,
    data: { viewCount: Number(report.viewCount ?? 0) + 1 },
    overrideAccess: true,
  });
}
