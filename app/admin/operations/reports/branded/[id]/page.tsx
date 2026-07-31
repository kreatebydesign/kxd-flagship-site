import { BrandedReportWorkspace } from "@/components/admin/operations/reports/BrandedReportWorkspace";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import {
  composeSnapshotForReportDoc,
  listBrandedReportArchive,
} from "@/lib/reporting/branded-client/lifecycle";
import {
  BRANDED_REPORT_APPROVAL_STATUSES,
  type BrandedReportApprovalStatus,
  type ReportScopeCapability,
} from "@/lib/reporting/branded-client/types";
import { isReportScopeCapability } from "@/lib/reporting/branded-client/scope";
import { getPayload } from "payload";
import config from "@payload-config";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function isApprovalStatus(value: unknown): value is BrandedReportApprovalStatus {
  return (
    typeof value === "string" &&
    (BRANDED_REPORT_APPROVAL_STATUSES as readonly string[]).includes(value)
  );
}

export default async function BrandedReportWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const reportId = Number(id);
  const clientId = Number(sp.clientId);

  if (!Number.isFinite(reportId) || reportId <= 0) {
    redirect("/admin/operations/reports");
  }
  if (!Number.isFinite(clientId) || clientId <= 0) {
    redirect("/admin/operations/reports");
  }

  const payload = await getPayload({ config });
  let doc: Record<string, unknown>;
  try {
    doc = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "monthly-reports" as any,
      id: reportId,
      depth: 1,
      overrideAccess: true,
    })) as Record<string, unknown>;
  } catch {
    redirect("/admin/operations/reports");
  }

  const rel = doc.client;
  const docClientId =
    typeof rel === "number"
      ? rel
      : rel && typeof rel === "object" && "id" in rel
        ? Number((rel as { id: number }).id)
        : 0;
  if (docClientId !== clientId) {
    redirect("/admin/operations/reports");
  }

  const clientName =
    rel && typeof rel === "object" && "name" in rel
      ? String((rel as { name?: string }).name ?? "Client")
      : "Client";

  const snapshot = await composeSnapshotForReportDoc(doc);
  const archive = await listBrandedReportArchive(clientId);
  const approvalStatus = isApprovalStatus(doc.approvalStatus)
    ? doc.approvalStatus
    : "draft";
  const includedCapabilities = (
    Array.isArray(doc.includedCapabilities) ? doc.includedCapabilities : []
  ).filter(isReportScopeCapability) as ReportScopeCapability[];

  return (
    <OperationsShell activeId="reports">
      <BrandedReportWorkspace
        reportId={reportId}
        clientId={clientId}
        clientName={clientName}
        approvalStatus={approvalStatus}
        version={Number(doc.version ?? 1)}
        periodLabel={snapshot.period.label}
        timezone={snapshot.period.timezone}
        snapshot={snapshot}
        archive={archive}
        includedCapabilities={
          includedCapabilities.length
            ? includedCapabilities
            : snapshot.scope.includedCapabilities
        }
        initialNarratives={{
          executiveSummary: String(
            doc.executiveSummary ?? snapshot.narratives.executiveSummary.body,
          ),
          websitePerformanceNarrative: String(
            doc.websitePerformanceNarrative ??
              snapshot.narratives.websitePerformance.body,
          ),
          organicSearchNarrative: String(
            doc.organicSearchNarrative ?? snapshot.narratives.organicSearch.body,
          ),
          googleAdsNarrative: String(
            doc.googleAdsNarrative ?? snapshot.narratives.googleAds.body,
          ),
          workCompleted: String(
            doc.workCompleted ?? snapshot.narratives.workCompleted.body,
          ),
          improvementsMade: String(
            doc.improvementsMade ?? snapshot.narratives.improvementsAndWins.body,
          ),
          issuesOrRisks: String(
            doc.issuesOrRisks ?? snapshot.narratives.issuesOrRisks.body,
          ),
          recommendations: String(
            typeof doc.recommendations === "string"
              ? doc.recommendations
              : snapshot.narratives.recommendations.body,
          ),
          augustPriorities: String(
            doc.augustPriorities ?? snapshot.narratives.augustPriorities.body,
          ),
          closingNote: String(doc.closingNote ?? snapshot.narratives.closing.body),
          internalNotes: String(doc.internalNotes ?? ""),
        }}
      />
    </OperationsShell>
  );
}
