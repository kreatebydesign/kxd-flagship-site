/**
 * Website Audit Report lifecycle — generate, save, approve, reopen, archive, PDF.
 * Separates report status from lead pipeline status on website-audits.
 */

import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  buildCanonicalAuditReport,
  resolveClientFacingReport,
  stripInternalForClient,
} from "./canonicalize.ts";
import { generateAuditNarrative } from "./narrative.ts";
import { buildDefaultActionPlan } from "./plan.ts";
import { renderAuditReportPdf } from "./export-pdf.tsx";
import { buildAuditReportHtml } from "./export-html.ts";
import type {
  AuditReportSource,
  CanonicalAuditReport,
  ReportSaveInput,
  ReportStatus,
} from "./types.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function toSource(doc: AnyDoc): AuditReportSource {
  const clientRel = doc.client ?? null;
  const clientId =
    typeof clientRel === "number"
      ? clientRel
      : clientRel && typeof clientRel === "object"
        ? Number(clientRel.id)
        : null;

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
    client: clientRel,
    clientId,
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
  };
}

export class AuditReportError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "AuditReportError";
    this.status = status;
  }
}

async function loadAudit(id: number, depth = 1): Promise<AnyDoc> {
  if (!Number.isFinite(id) || id <= 0) {
    throw new AuditReportError("Invalid audit id.", 400);
  }
  const payload = await getPayload({ config });
  try {
    const doc = await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "website-audits" as any,
      id,
      depth,
      overrideAccess: true,
    });
    return doc as AnyDoc;
  } catch {
    throw new AuditReportError("Audit not found.", 404);
  }
}

async function updateAudit(id: number, data: Record<string, unknown>): Promise<AnyDoc> {
  const payload = await getPayload({ config });
  const doc = await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "website-audits" as any,
    id,
    data,
    depth: 1,
    overrideAccess: true,
  });
  return doc as AnyDoc;
}

export async function getAuditReportSource(id: number): Promise<AuditReportSource> {
  return toSource(await loadAudit(id, 1));
}

/**
 * Initialize / regenerate narrative from stored audit evidence.
 * Does not rerun the website auditor.
 * By default refuses to overwrite operator-edited narrative unless force=true.
 */
export async function generateAuditReport(
  id: number,
  opts?: { force?: boolean; actorEmail?: string | null },
): Promise<{ source: AuditReportSource; canonical: CanonicalAuditReport }> {
  const doc = await loadAudit(id, 1);
  const source = toSource(doc);
  const status = source.reportStatus || "none";

  if (status === "approved") {
    throw new AuditReportError(
      "Approved reports cannot be regenerated. Return to Draft first.",
      409,
    );
  }
  if (status === "archived") {
    throw new AuditReportError("Archived reports cannot be regenerated.", 409);
  }

  const hasOperatorEdits = Boolean(
    source.executiveSummary?.trim() ||
      source.workingWell?.trim() ||
      source.losingOpportunity?.trim() ||
      source.recommendedNextSteps?.trim(),
  );

  if (hasOperatorEdits && !opts?.force && status !== "none") {
    throw new AuditReportError(
      "Report already has operator edits. Pass force=true to regenerate narrative.",
      409,
    );
  }

  if (!source.website || source.overallScore == null) {
    // Still allow generation if website exists — scores may be partial
    if (!source.website) {
      throw new AuditReportError("Audit is missing a website URL.", 422);
    }
  }

  const narrative = generateAuditNarrative(source);
  const manuals = Array.isArray(source.manualFindings) ? source.manualFindings : [];
  const plan =
    Array.isArray(source.recommendationPlan) && source.recommendationPlan.length > 0 && !opts?.force
      ? source.recommendationPlan
      : buildDefaultActionPlan(source, manuals);

  const now = new Date().toISOString();
  const updated = await updateAudit(id, {
    reportStatus: "draft",
    reportTitle: narrative.reportTitle,
    executiveSummary: narrative.executiveSummary,
    workingWell: narrative.workingWell,
    losingOpportunity: narrative.losingOpportunity,
    recommendedNextSteps: narrative.recommendedNextSteps,
    closingNote: narrative.closingNote,
    recommendationPlan: plan,
    findingOverrides: source.findingOverrides ?? [],
    manualFindings: manuals,
    sectionVisibility: source.sectionVisibility ?? {
      executiveSummary: true,
      overallScore: true,
      findings: true,
      priorityActionPlan: true,
      professionalAssessment: true,
      appendix: true,
    },
    reportGeneratedAt: now,
    reportUpdatedAt: now,
  });

  const next = toSource(updated);
  return { source: next, canonical: buildCanonicalAuditReport(next) };
}

export async function saveAuditReport(
  id: number,
  input: ReportSaveInput,
): Promise<{ source: AuditReportSource; canonical: CanonicalAuditReport }> {
  const doc = await loadAudit(id, 1);
  const source = toSource(doc);
  const status = source.reportStatus || "none";

  if (status === "approved") {
    throw new AuditReportError(
      "Approved reports are locked. Return to Draft before editing.",
      409,
    );
  }
  if (status === "archived") {
    throw new AuditReportError("Archived reports cannot be edited.", 409);
  }
  if (status === "none") {
    throw new AuditReportError("Generate the report narrative before saving edits.", 409);
  }

  const nextStatus: ReportStatus = input.markReadyForReview
    ? "ready-for-review"
    : status === "ready-for-review"
      ? "ready-for-review"
      : "draft";

  const data: Record<string, unknown> = {
    reportStatus: nextStatus,
    reportUpdatedAt: new Date().toISOString(),
  };

  if (input.reportTitle !== undefined) data.reportTitle = input.reportTitle;
  if (input.executiveSummary !== undefined) data.executiveSummary = input.executiveSummary;
  if (input.workingWell !== undefined) data.workingWell = input.workingWell;
  if (input.losingOpportunity !== undefined) data.losingOpportunity = input.losingOpportunity;
  if (input.recommendedNextSteps !== undefined) {
    data.recommendedNextSteps = input.recommendedNextSteps;
  }
  if (input.closingNote !== undefined) data.closingNote = input.closingNote;
  if (input.sectionVisibility !== undefined) data.sectionVisibility = input.sectionVisibility;
  if (input.findingOverrides !== undefined) data.findingOverrides = input.findingOverrides;
  if (input.manualFindings !== undefined) data.manualFindings = input.manualFindings;
  if (input.recommendationPlan !== undefined) data.recommendationPlan = input.recommendationPlan;
  if (input.internalNotes !== undefined) data.internalNotes = input.internalNotes;
  if (input.clientId !== undefined) {
    data.client = input.clientId;
  }
  if (input.canonicalWebsiteUrl !== undefined) {
    data.canonicalWebsiteUrl = input.canonicalWebsiteUrl;
  }

  // Never touch raw evidence fields
  const updated = await updateAudit(id, data);
  const next = toSource(updated);
  return { source: next, canonical: buildCanonicalAuditReport(next) };
}

export async function approveAuditReport(
  id: number,
  actorEmail?: string | null,
): Promise<{ source: AuditReportSource; canonical: CanonicalAuditReport }> {
  const doc = await loadAudit(id, 1);
  const source = toSource(doc);
  const status = source.reportStatus || "none";

  if (status === "archived") {
    throw new AuditReportError("Archived reports cannot be approved.", 409);
  }
  if (status === "none") {
    throw new AuditReportError("Generate the report before approving.", 409);
  }
  if (!source.executiveSummary?.trim()) {
    throw new AuditReportError("Executive summary is required before approval.", 422);
  }

  if (status === "approved" && source.approvedSnapshot) {
    // Idempotent — return existing approved state
    return {
      source,
      canonical: resolveClientFacingReport(source),
    };
  }

  const live = stripInternalForClient(buildCanonicalAuditReport(source));
  const now = new Date().toISOString();
  const updated = await updateAudit(id, {
    reportStatus: "approved",
    reportApprovedAt: now,
    reportApprovedBy: actorEmail?.trim() || "operator",
    reportUpdatedAt: now,
    approvedSnapshot: {
      ...live,
      reportStatus: "approved",
      reportApprovedAt: now,
      internalNotes: null,
    },
  });

  const next = toSource(updated);
  return { source: next, canonical: resolveClientFacingReport(next) };
}

export async function reopenAuditReport(
  id: number,
): Promise<{ source: AuditReportSource; canonical: CanonicalAuditReport }> {
  const doc = await loadAudit(id, 1);
  const source = toSource(doc);
  if (source.reportStatus !== "approved" && source.reportStatus !== "ready-for-review") {
    throw new AuditReportError("Only approved or ready-for-review reports can return to Draft.", 409);
  }

  const updated = await updateAudit(id, {
    reportStatus: "draft",
    reportUpdatedAt: new Date().toISOString(),
    // Keep approvedSnapshot for history but live edits use draft fields
  });
  const next = toSource(updated);
  return { source: next, canonical: buildCanonicalAuditReport(next) };
}

export async function archiveAuditReport(
  id: number,
): Promise<{ source: AuditReportSource }> {
  const doc = await loadAudit(id, 1);
  const source = toSource(doc);
  if (source.reportStatus === "none") {
    throw new AuditReportError("Nothing to archive — report not generated.", 409);
  }
  const updated = await updateAudit(id, {
    reportStatus: "archived",
    reportUpdatedAt: new Date().toISOString(),
  });
  return { source: toSource(updated) };
}

export async function associateAuditClient(
  id: number,
  clientId: number | null,
): Promise<{ source: AuditReportSource; canonicalClientUrl: string | null }> {
  const payload = await getPayload({ config });
  let canonicalWebsiteUrl: string | null = null;

  if (clientId != null) {
    if (!Number.isFinite(clientId) || clientId <= 0) {
      throw new AuditReportError("Invalid client id.", 400);
    }
    try {
      const client = await payload.findByID({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "clients" as any,
        id: clientId,
        depth: 0,
        overrideAccess: true,
      });
      canonicalWebsiteUrl =
        typeof (client as AnyDoc).companyWebsite === "string"
          ? String((client as AnyDoc).companyWebsite).trim() || null
          : null;
    } catch {
      throw new AuditReportError("Client not found.", 404);
    }
  }

  const doc = await loadAudit(id, 0);
  const status = (doc.reportStatus as ReportStatus) || "none";
  if (status === "approved") {
    throw new AuditReportError("Cannot change client association on an approved report.", 409);
  }

  const updated = await updateAudit(id, {
    client: clientId,
    canonicalWebsiteUrl,
    reportUpdatedAt: new Date().toISOString(),
  });
  return { source: toSource(updated), canonicalClientUrl: canonicalWebsiteUrl };
}

export async function getAuditReportPreviewHtml(
  id: number,
  opts?: { preferLiveDraft?: boolean },
): Promise<{ html: string; report: CanonicalAuditReport }> {
  const source = toSource(await loadAudit(id, 1));
  if ((source.reportStatus || "none") === "none") {
    throw new AuditReportError("Generate the report before previewing.", 409);
  }
  const report = resolveClientFacingReport(source, opts);
  return { html: buildAuditReportHtml(report), report };
}

export async function getAuditReportPdf(
  id: number,
  actorEmail?: string | null,
): Promise<{ buffer: Buffer; filename: string; report: CanonicalAuditReport }> {
  const source = toSource(await loadAudit(id, 1));
  const status = source.reportStatus || "none";

  if (status === "none") {
    throw new AuditReportError("Generate the report before downloading a PDF.", 409);
  }

  // Prefer approved snapshot for approved reports; drafts can still export for operator review
  const report = resolveClientFacingReport(source, {
    preferLiveDraft: status !== "approved",
  });

  const rendered = await renderAuditReportPdf(report);

  await updateAudit(id, {
    reportDownloadedAt: new Date().toISOString(),
    reportDownloadedBy: actorEmail?.trim() || "operator",
  });

  return { ...rendered, report };
}
