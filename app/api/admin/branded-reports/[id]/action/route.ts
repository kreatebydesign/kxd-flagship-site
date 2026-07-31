import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import {
  BrandedReportError,
  approveBrandedReport,
  archiveBrandedReport,
  getBrandedReportPreviewHtml,
  reopenBrandedReportToDraft,
  saveBrandedReportDraft,
  submitBrandedReportForReview,
} from "@/lib/reporting/branded-client/lifecycle";
import { isReportScopeCapability } from "@/lib/reporting/branded-client/scope";
import type {
  CompletedWorkItem,
  ReportScopeCapability,
} from "@/lib/reporting/branded-client/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function actorEmail(auth: unknown): string | null {
  if (auth && typeof auth === "object" && "email" in auth) {
    return String((auth as { email?: unknown }).email ?? "") || null;
  }
  return null;
}

function parseIds(params: { id: string }, body: Record<string, unknown>) {
  const reportId = Number(params.id);
  const clientId = Number(body.clientId);
  if (!Number.isFinite(reportId) || reportId <= 0) {
    return { error: NextResponse.json({ success: false, error: "Invalid report id." }, { status: 400 }) };
  }
  if (!Number.isFinite(clientId) || clientId <= 0) {
    return { error: NextResponse.json({ success: false, error: "Invalid client id." }, { status: 400 }) };
  }
  return { reportId, clientId };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseIds({ id }, body);
  if ("error" in parsed) return parsed.error;
  const { reportId, clientId } = parsed;

  const action = String(body.action ?? "");
  try {
    switch (action) {
      case "save": {
        const rawCaps = Array.isArray(body.operatorCapabilities)
          ? body.operatorCapabilities.filter(isReportScopeCapability)
          : undefined;
        const result = await saveBrandedReportDraft(reportId, clientId, {
          executiveSummary:
            typeof body.executiveSummary === "string" ? body.executiveSummary : undefined,
          websitePerformanceNarrative:
            typeof body.websitePerformanceNarrative === "string"
              ? body.websitePerformanceNarrative
              : undefined,
          organicSearchNarrative:
            typeof body.organicSearchNarrative === "string"
              ? body.organicSearchNarrative
              : undefined,
          googleAdsNarrative:
            typeof body.googleAdsNarrative === "string" ? body.googleAdsNarrative : undefined,
          workCompleted: typeof body.workCompleted === "string" ? body.workCompleted : undefined,
          improvementsMade:
            typeof body.improvementsMade === "string" ? body.improvementsMade : undefined,
          issuesOrRisks: typeof body.issuesOrRisks === "string" ? body.issuesOrRisks : undefined,
          recommendations:
            typeof body.recommendations === "string" ? body.recommendations : undefined,
          augustPriorities:
            typeof body.augustPriorities === "string" ? body.augustPriorities : undefined,
          closingNote: typeof body.closingNote === "string" ? body.closingNote : undefined,
          internalNotes: typeof body.internalNotes === "string" ? body.internalNotes : undefined,
          selectedWorkItems: Array.isArray(body.selectedWorkItems)
            ? (body.selectedWorkItems as CompletedWorkItem[])
            : undefined,
          operatorCapabilities: rawCaps as ReportScopeCapability[] | undefined,
          confirmedBy: rawCaps ? actorEmail(auth) : null,
        });
        return NextResponse.json({
          success: true,
          reportId: result.report.id,
          approvalStatus: result.report.approvalStatus,
          fingerprint: result.snapshot.fingerprint,
        });
      }
      case "submit-review": {
        const report = await submitBrandedReportForReview(reportId, clientId);
        return NextResponse.json({
          success: true,
          reportId: report.id,
          approvalStatus: report.approvalStatus,
        });
      }
      case "approve": {
        const email = actorEmail(auth);
        if (!email) {
          return NextResponse.json(
            { success: false, error: "Approval requires an authorized operator." },
            { status: 401 },
          );
        }
        if (body.confirm !== true) {
          return NextResponse.json(
            { success: false, error: "Explicit confirmation required before approval." },
            { status: 400 },
          );
        }
        const result = await approveBrandedReport(reportId, clientId, email);
        return NextResponse.json({
          success: true,
          reportId: result.report.id,
          approvalStatus: result.report.approvalStatus,
          fingerprint: result.snapshot.fingerprint,
          approvedAt: result.report.reportApprovedAt,
        });
      }
      case "reopen": {
        const report = await reopenBrandedReportToDraft(reportId, clientId);
        return NextResponse.json({
          success: true,
          reportId: report.id,
          approvalStatus: report.approvalStatus,
          version: report.version,
        });
      }
      case "archive": {
        const report = await archiveBrandedReport(reportId, clientId);
        return NextResponse.json({
          success: true,
          reportId: report.id,
          approvalStatus: report.approvalStatus,
        });
      }
      case "preview": {
        const html = await getBrandedReportPreviewHtml(reportId, clientId, {
          includeInternalNotes: body.includeInternalNotes === true,
        });
        return new NextResponse(html, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      }
      default:
        return NextResponse.json({ success: false, error: "Unknown action." }, { status: 400 });
    }
  } catch (err) {
    if (err instanceof BrandedReportError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error("[branded-reports/action]", err);
    return NextResponse.json({ success: false, error: "Report action failed." }, { status: 500 });
  }
}
