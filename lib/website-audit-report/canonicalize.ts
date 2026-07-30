/**
 * Build the single canonical report used by preview and PDF.
 */

import { deriveAutomatedFindings, manualFindingToDerived } from "./findings.ts";
import { buildDefaultActionPlan, normalizeActionPlan } from "./plan.ts";
import { composeClientActionPlan } from "./compose-client-actions.ts";
import {
  DEFAULT_SECTION_VISIBILITY,
  type AuditReportSource,
  type CanonicalActionItem,
  type CanonicalAuditReport,
  type CanonicalFinding,
  type FindingOverride,
  type ManualFinding,
  type ReportStatus,
  type SectionVisibility,
} from "./types.ts";

function asId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  if (value && typeof value === "object" && "id" in value) {
    return asId((value as { id: unknown }).id);
  }
  return null;
}

function resolveClientMeta(source: AuditReportSource): {
  clientId: number | null;
  canonicalWebsiteUrl: string | null;
} {
  const clientId = asId(source.client) ?? (typeof source.client === "number" ? source.client : null);
  const canonical =
    source.canonicalWebsiteUrl?.trim() ||
    (source.client && typeof source.client === "object"
      ? source.client.companyWebsite?.trim() || null
      : null);
  return { clientId, canonicalWebsiteUrl: canonical || null };
}

function mergeVisibility(input?: SectionVisibility | null): Required<SectionVisibility> {
  return { ...DEFAULT_SECTION_VISIBILITY, ...(input ?? {}) };
}

function applyOverride(
  finding: ReturnType<typeof deriveAutomatedFindings>[number],
  overrides: FindingOverride[],
): CanonicalFinding {
  const override = overrides.find((o) => o.id === finding.id);
  return {
    ...finding,
    title: override?.title?.trim() || finding.title,
    detected: override?.explanation?.trim() || finding.detected,
    whyItMatters: override?.whyItMatters?.trim() || finding.whyItMatters,
    recommendedAction: override?.recommendedAction?.trim() || finding.recommendedAction,
    severity: override?.severity || finding.severity,
    category: override?.category || finding.category,
    included: !(override?.hidden === true),
  };
}

function methodologyNotes(): string[] {
  return [
    "The KXD Website Auditor fetches a single public HTML page and scores Performance, SEO, Mobile, Conversion, and Brand signals.",
    "Overall score is a weighted composite: Performance 20%, SEO 25%, Mobile 20%, Conversion 20%, Brand 15%.",
    "Findings marked as measured come from that HTML pass. KXD Professional Assessment language is interpretation, not a laboratory measurement.",
    "Manual findings are added by Kreate by Design during professional review and are not automated measurements.",
  ];
}

function limitations(): string[] {
  return [
    "This is not a complete crawl of every page on the site.",
    "This is not an accessibility compliance certification.",
    "This is not a security penetration test or vulnerability certification.",
    "This does not guarantee ranking, lead volume, or revenue outcomes.",
    "Third-party scripts, authenticated areas, and JavaScript-rendered content may be underrepresented.",
  ];
}

function checksPerformed(): string[] {
  return [
    "Public HTTP(S) fetch of the audited URL",
    "Response timing and HTML payload size signals",
    "Title, meta description, H1, and canonical presence",
    "Viewport and mobile interaction signals",
    "Conversion language, form, and scheduling cues",
    "Brand signals such as favicon, typography, and logo presence",
  ];
}

/**
 * Build live (draft) canonical content from raw audit + curated fields.
 * Never mutates raw score/insight fields.
 */
export function buildCanonicalAuditReport(source: AuditReportSource): CanonicalAuditReport {
  const { clientId, canonicalWebsiteUrl } = resolveClientMeta(source);
  const overrides = Array.isArray(source.findingOverrides) ? source.findingOverrides : [];
  const manuals: ManualFinding[] = Array.isArray(source.manualFindings)
    ? source.manualFindings
    : [];
  const visibility = mergeVisibility(source.sectionVisibility);

  const automated = deriveAutomatedFindings(source).map((f) => applyOverride(f, overrides));
  const manualCanonical: CanonicalFinding[] = manuals.map((m) => ({
    ...manualFindingToDerived(m),
    included: !m.hidden,
  }));

  const planSource =
    Array.isArray(source.recommendationPlan) && source.recommendationPlan.length > 0
      ? normalizeActionPlan(source.recommendationPlan)
      : buildDefaultActionPlan(source, manuals);

  const actionPlan: CanonicalActionItem[] = planSource.map((item) => ({
    ...item,
    included: !item.hidden,
  }));

  const companyName =
    (source.client && typeof source.client === "object" && source.client.name) ||
    source.company ||
    source.name ||
    "Website Audit";

  const contactName = source.name?.trim() || null;
  const contactEmail = source.email?.trim() || null;
  const preparedFor = contactName;

  const auditDate = source.completedAt || source.createdAt || new Date().toISOString();
  const reportStatus = (source.reportStatus as ReportStatus) || "none";

  const partialDataNotes: string[] = [];
  if (source.overallScore == null) {
    partialDataNotes.push("Overall score was not stored on this audit record.");
  }
  const scoreKeys = [
    "performanceScore",
    "seoScore",
    "mobileScore",
    "conversionScore",
    "brandScore",
  ] as const;
  for (const key of scoreKeys) {
    if (source[key] == null) {
      partialDataNotes.push(`${key} was not stored on this audit record.`);
    }
  }

  return {
    auditId: Number(source.id),
    reportTitle: source.reportTitle?.trim() || `Website Audit — ${companyName}`,
    companyName: String(companyName),
    contactName,
    contactEmail,
    preparedFor,
    auditedUrl: String(source.website),
    canonicalClientUrl: canonicalWebsiteUrl,
    auditDate,
    reportGeneratedAt: source.reportGeneratedAt ?? null,
    reportApprovedAt: source.reportApprovedAt ?? null,
    reportStatus,
    executiveSummary: source.executiveSummary?.trim() || "",
    workingWell: source.workingWell?.trim() || "",
    losingOpportunity: source.losingOpportunity?.trim() || "",
    recommendedNextSteps: source.recommendedNextSteps?.trim() || "",
    closingNote: source.closingNote?.trim() || "",
    scores: {
      overallScore: source.overallScore != null ? Number(source.overallScore) : null,
      grade: source.grade != null ? String(source.grade) : null,
      performanceScore: source.performanceScore != null ? Number(source.performanceScore) : null,
      seoScore: source.seoScore != null ? Number(source.seoScore) : null,
      mobileScore: source.mobileScore != null ? Number(source.mobileScore) : null,
      conversionScore: source.conversionScore != null ? Number(source.conversionScore) : null,
      brandScore: source.brandScore != null ? Number(source.brandScore) : null,
      measuredAt: auditDate,
    },
    findings: [...automated, ...manualCanonical],
    actionPlan,
    sectionVisibility: visibility,
    methodologyNotes: methodologyNotes(),
    limitations: limitations(),
    checksPerformed: checksPerformed(),
    partialDataNotes,
    clientId,
    internalNotes: source.internalNotes?.trim() || null,
  };
}

/**
 * Resolve content for client-facing preview/PDF.
 * Approved reports use the immutable snapshot when present.
 */
export function resolveClientFacingReport(
  source: AuditReportSource,
  opts?: { preferLiveDraft?: boolean },
): CanonicalAuditReport {
  if (
    !opts?.preferLiveDraft &&
    source.reportStatus === "approved" &&
    source.approvedSnapshot &&
    typeof source.approvedSnapshot === "object"
  ) {
    const snap = source.approvedSnapshot as CanonicalAuditReport;
    return {
      ...snap,
      // Never leak internal notes into client surfaces
      internalNotes: null,
      findings: (snap.findings ?? []).filter((f) => f.included !== false),
      // Presentation-only composition — does not alter stored snapshot fields
      actionPlan: composeClientActionPlan(
        (snap.actionPlan ?? []).filter((a) => a.included !== false),
      ),
    };
  }

  const live = buildCanonicalAuditReport(source);
  return {
    ...live,
    internalNotes: null,
    findings: live.findings.filter((f) => f.included),
    actionPlan: composeClientActionPlan(live.actionPlan.filter((a) => a.included)),
  };
}

export function stripInternalForClient(report: CanonicalAuditReport): CanonicalAuditReport {
  return {
    ...report,
    internalNotes: null,
    findings: report.findings.filter((f) => f.included !== false),
    actionPlan: composeClientActionPlan(
      report.actionPlan.filter((a) => a.included !== false),
    ),
  };
}
