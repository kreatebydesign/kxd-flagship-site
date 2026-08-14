/**
 * Client-facing audit deliverable view model — shared by portal React UI and PDF export.
 */

import { KXD_REPORT_CONTACT_EMAIL } from "@/lib/kxd-report-engine/contact";
import {
  GOOGLE_ADS_AUDIT_REPAIR_KIND,
  narrativeTitleForSnapshot,
} from "./presentation";
import { PRIMAL_AUDIT_PDF_FILENAME } from "./primal-audit-content";
import type { BrandedMetric, BrandedReportSnapshot } from "./types";

export type AuditDeliverableMetric = {
  key: string;
  label: string;
  value: string;
  note?: string;
  emphasis?: "default" | "caution" | "confirmed";
};

export type AuditDeliverableSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets: string[];
  variant: "default" | "callout";
};

export type AuditDeliverableViewModel = {
  kind: typeof GOOGLE_ADS_AUDIT_REPAIR_KIND;
  reportId: number;
  version: number;
  cover: {
    eyebrow: string;
    title: string;
    clientName: string;
    auditPeriodLabel: string;
    repairDateLabel: string;
    preparedBy: string;
    logoUrl: string | null;
  };
  executiveSummary: string[];
  performanceLead: string;
  metrics: AuditDeliverableMetric[];
  conversionDisclaimer: string;
  sections: AuditDeliverableSection[];
  closing: {
    paragraphs: string[];
    contactEmail: string;
    generatedAt: string;
    version: number;
  };
  pdfFilename: string;
  brandAccent: string;
};

const METRIC_LABEL_OVERRIDES: Record<string, string> = {
  "ads.audit.searchConversions": "Search platform-reported conversions",
  "ads.audit.demandGenConversions": "Demand Gen platform-reported conversions",
  "ads.audit.credibleCalls": "Credible calls of 60+ seconds",
};

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function stripLeadingHeading(body: string, headings: string[]): string {
  const lines = body.split(/\r?\n/);
  if (lines.length === 0) return body;
  const first = normalizeLine(lines[0] ?? "");
  const firstNoColon = first.replace(/:+\s*$/, "");
  for (const heading of headings) {
    const normalized = normalizeLine(heading).replace(/:+\s*$/, "");
    if (
      first === heading ||
      firstNoColon === normalized ||
      first.toLowerCase() === `${normalized.toLowerCase()}:`
    ) {
      return lines.slice(1).join("\n").trim();
    }
  }
  return body.trim();
}

export function parseNarrativeBody(body: string): { paragraphs: string[]; bullets: string[] } {
  const paragraphs: string[] = [];
  const bullets: string[] = [];
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    const text = paragraphBuffer.join(" ").trim();
    if (text) paragraphs.push(text);
    paragraphBuffer = [];
  };

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      continue;
    }
    if (/^[•\-*]\s+/.test(line)) {
      flushParagraph();
      bullets.push(line.replace(/^[•\-*]\s+/, "").trim());
      continue;
    }
    paragraphBuffer.push(line);
  }
  flushParagraph();
  return { paragraphs, bullets };
}

function metricEmphasis(key: string): AuditDeliverableMetric["emphasis"] {
  if (key.includes("Conversions")) return "caution";
  if (key.includes("credibleCalls")) return "confirmed";
  return "default";
}

function mapMetrics(metrics: BrandedMetric[]): AuditDeliverableMetric[] {
  return metrics.map((metric) => ({
    key: metric.key,
    label: METRIC_LABEL_OVERRIDES[metric.key] ?? metric.label,
    value: metric.displayValue,
    note:
      metric.key.includes("Conversions")
        ? "Platform-reported — not a confirmed business inquiry"
        : metric.note && !metric.note.includes("contaminated")
          ? metric.note
          : undefined,
    emphasis: metricEmphasis(metric.key),
  }));
}

const SECTION_ORDER: Array<{
  id: string;
  narrativeKey: keyof BrandedReportSnapshot["narratives"];
  variant?: AuditDeliverableSection["variant"];
}> = [
  { id: "found", narrativeKey: "issuesOrRisks" },
  { id: "repairs", narrativeKey: "workCompleted" },
  { id: "protected", narrativeKey: "improvementsAndWins" },
  { id: "measurement", narrativeKey: "augustPriorities" },
  { id: "growth", narrativeKey: "googleAds", variant: "callout" },
];

export function buildAuditDeliverableViewModel(
  snapshot: BrandedReportSnapshot,
  options?: {
    auditPeriodLabel?: string | null;
    repairDateLabel?: string | null;
    preparedBy?: string | null;
    logoUrl?: string | null;
    pdfFilename?: string;
  },
): AuditDeliverableViewModel {
  const presentation = snapshot.presentation;
  const auditPeriodLabel =
    options?.auditPeriodLabel?.trim() || snapshot.period.label;
  const repairDateLabel = options?.repairDateLabel?.trim() || "—";
  const preparedBy = options?.preparedBy?.trim() || "Kreate by Design";

  const executiveBody = stripLeadingHeading(snapshot.narratives.executiveSummary.body, [
    "Executive summary",
    narrativeTitleForSnapshot(snapshot, "executiveSummary"),
  ]);
  const executiveSummary = parseNarrativeBody(executiveBody).paragraphs;

  const sections: AuditDeliverableSection[] = SECTION_ORDER.map((spec) => {
    const narrative = snapshot.narratives[spec.narrativeKey];
    const title = narrativeTitleForSnapshot(snapshot, spec.narrativeKey);
    const cleaned = stripLeadingHeading(narrative.body, [title, `${title}:`]);
    const parsed = parseNarrativeBody(cleaned);
    return {
      id: spec.id,
      title,
      paragraphs: parsed.paragraphs,
      bullets: parsed.bullets,
      variant: spec.variant ?? "default",
    };
  }).filter(
    (section) => section.paragraphs.length > 0 || section.bullets.length > 0,
  );

  const closingBody = stripLeadingHeading(snapshot.narratives.closing.body, [
    "Closing",
    narrativeTitleForSnapshot(snapshot, "closing"),
  ]);
  const closingParsed = parseNarrativeBody(closingBody);

  return {
    kind: GOOGLE_ADS_AUDIT_REPAIR_KIND,
    reportId: snapshot.reportId,
    version: snapshot.version,
    cover: {
      eyebrow: presentation?.coverEyebrow ?? "Audit & repair deliverable",
      title: presentation?.coverTitle ?? "Google Ads Audit & Repair Report",
      clientName: snapshot.clientName,
      auditPeriodLabel,
      repairDateLabel,
      preparedBy,
      logoUrl: options?.logoUrl ?? null,
    },
    executiveSummary,
    performanceLead:
      presentation?.performanceSnapshotLead ??
      "Verified audit totals — manually reconciled from Google Ads exports.",
    metrics: mapMetrics(snapshot.metrics),
    conversionDisclaimer:
      "Platform-reported conversions reflect Google Ads signals that were historically unreliable for confirmed inquiries. Credible calls and confirmed form submissions are the measurement foundation going forward.",
    sections,
    closing: {
      paragraphs: closingParsed.paragraphs,
      contactEmail: KXD_REPORT_CONTACT_EMAIL,
      generatedAt: snapshot.generatedAt,
      version: snapshot.version,
    },
    pdfFilename: options?.pdfFilename ?? PRIMAL_AUDIT_PDF_FILENAME,
    brandAccent: presentation?.auditBrandAccent ?? "#A83424",
  };
}

export function auditDeliverableHasDuplicateHeadings(
  model: AuditDeliverableViewModel,
): string[] {
  const problems: string[] = [];
  const titles = new Set<string>();

  for (const section of model.sections) {
    const normalized = section.title.toLowerCase();
    if (titles.has(normalized)) {
      problems.push(`Duplicate section title: ${section.title}`);
    }
    titles.add(normalized);

    for (const paragraph of section.paragraphs) {
      if (paragraph.toLowerCase().startsWith(section.title.toLowerCase())) {
        problems.push(`Section body repeats title: ${section.title}`);
      }
    }
    for (const bullet of section.bullets) {
      if (bullet.toLowerCase() === section.title.toLowerCase()) {
        problems.push(`Bullet repeats section title: ${section.title}`);
      }
    }
  }

  return problems;
}
