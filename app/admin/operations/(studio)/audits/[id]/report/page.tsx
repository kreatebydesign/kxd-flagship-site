import { notFound } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import { requirePayloadAdminPage } from "@/lib/admin/auth";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { KxdPage } from "@/components/os";
import { AuditReportEditor } from "@/components/admin/operations/audits/AuditReportEditor";
import { buildCanonicalAuditReport } from "@/lib/website-audit-report/canonicalize";
import type { AuditReportSource, ReportStatus } from "@/lib/website-audit-report/types";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function toSource(doc: AnyDoc): AuditReportSource {
  return {
    id: Number(doc.id),
    name: doc.name ?? null,
    email: doc.email ?? null,
    company: doc.company ?? null,
    website: String(doc.website ?? ""),
    overallScore: doc.overallScore ?? null,
    grade: doc.grade ?? null,
    performanceScore: doc.performanceScore ?? null,
    seoScore: doc.seoScore ?? null,
    mobileScore: doc.mobileScore ?? null,
    conversionScore: doc.conversionScore ?? null,
    brandScore: doc.brandScore ?? null,
    strengths: doc.strengths ?? null,
    opportunities: doc.opportunities ?? null,
    recommendations: doc.recommendations ?? null,
    completedAt: doc.completedAt ?? null,
    createdAt: doc.createdAt ?? null,
    client: doc.client ?? null,
    canonicalWebsiteUrl: doc.canonicalWebsiteUrl ?? null,
    internalNotes: doc.internalNotes ?? null,
    reportStatus: (doc.reportStatus as ReportStatus) ?? "none",
    reportTitle: doc.reportTitle ?? null,
    executiveSummary: doc.executiveSummary ?? null,
    workingWell: doc.workingWell ?? null,
    losingOpportunity: doc.losingOpportunity ?? null,
    recommendedNextSteps: doc.recommendedNextSteps ?? null,
    closingNote: doc.closingNote ?? null,
    sectionVisibility: doc.sectionVisibility ?? null,
    findingOverrides: doc.findingOverrides ?? null,
    manualFindings: doc.manualFindings ?? null,
    recommendationPlan: doc.recommendationPlan ?? null,
    reportGeneratedAt: doc.reportGeneratedAt ?? null,
    reportUpdatedAt: doc.reportUpdatedAt ?? null,
    reportApprovedAt: doc.reportApprovedAt ?? null,
    reportApprovedBy: doc.reportApprovedBy ?? null,
    reportDownloadedAt: doc.reportDownloadedAt ?? null,
    reportDownloadedBy: doc.reportDownloadedBy ?? null,
    approvedSnapshot: doc.approvedSnapshot ?? null,
    clientId:
      typeof doc.client === "number"
        ? doc.client
        : doc.client && typeof doc.client === "object"
          ? Number(doc.client.id)
          : null,
  };
}

export default async function AuditReportEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auditId = Number(id);
  await requirePayloadAdminPage(`/admin/operations/audits/${id}/report`);

  if (!Number.isFinite(auditId) || auditId <= 0) notFound();

  const payload = await getPayload({ config });

  let doc: AnyDoc;
  try {
    doc = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "website-audits" as any,
      id: auditId,
      depth: 1,
    })) as AnyDoc;
  } catch {
    notFound();
  }

  const clientsResult = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "clients" as any,
    limit: 200,
    depth: 0,
    sort: "name",
  });

  const clients = (clientsResult.docs as AnyDoc[]).map((c) => ({
    id: Number(c.id),
    name: String(c.name ?? `Client ${c.id}`),
    companyWebsite: (c.companyWebsite as string | null) ?? null,
  }));

  const source = toSource(doc);
  const canonical =
    source.reportStatus && source.reportStatus !== "none"
      ? buildCanonicalAuditReport(source)
      : null;

  return (
    <OperationsShell activeId="audits">
      <KxdPage className="kxd-os-page--ops">
        <AuditReportEditor
          auditId={auditId}
          initialSource={source}
          initialCanonical={canonical}
          clients={clients}
        />
      </KxdPage>
    </OperationsShell>
  );
}
