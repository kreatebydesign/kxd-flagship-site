/**
 * Server-side PDF document from the same CanonicalAuditReport as HTML preview.
 * Dedicated black cover page; shared KXD Report Engine tokens + official logo.
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Link,
  Image,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import {
  ACTION_PLAN_GROUP_LABEL,
  ACTION_PLAN_GROUPS,
  CATEGORY_LABEL,
  type CanonicalAuditReport,
  type CanonicalFinding,
} from "./types.ts";
import { buildAuditReportPdfFilename } from "./filename.ts";
import {
  KXD_REPORT_BRAND,
  kxdReportPageFooterLine,
} from "./branding.ts";
import {
  coverDocumentType,
  coverPrimaryName,
  domainLabel,
  findingProvenanceLabel,
  findingSupportCopy,
  fmtLongDate,
  formatGradeContext,
  formatScoreOutOf,
  scoreConditionLabel,
  severityLabel,
} from "./presentation.ts";
import { KXD_REPORT_COLORS } from "../kxd-report-engine/tokens.ts";
import { resolveKxdReportLogoAsset } from "../kxd-report-engine/logos.ts";
import { formatSectionIndex } from "../kxd-report-engine/section.ts";

const colors = KXD_REPORT_COLORS;

const styles = StyleSheet.create({
  coverPage: {
    backgroundColor: colors.richBlack,
    paddingTop: 72,
    paddingBottom: 56,
    paddingHorizontal: 52,
    justifyContent: "center",
  },
  coverLogo: {
    width: 118,
    height: 111,
    marginBottom: 36,
  },
  coverDocType: {
    fontSize: 8,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    color: colors.mutedOnBlack,
    fontFamily: "Helvetica",
    marginBottom: 10,
  },
  coverRule: {
    width: 42,
    height: 1,
    backgroundColor: colors.gold,
    marginBottom: 16,
  },
  coverH1: {
    fontSize: 28,
    color: colors.ivoryOnBlack,
    lineHeight: 1.15,
    maxWidth: 340,
    marginBottom: 12,
  },
  coverUrl: {
    fontSize: 10,
    color: colors.mutedOnBlack,
    fontFamily: "Helvetica",
    marginBottom: 28,
  },
  coverMetaRow: {
    flexDirection: "row",
    marginBottom: 6,
    fontFamily: "Helvetica",
    fontSize: 9,
  },
  coverMetaLabel: { width: 88, color: colors.mutedOnBlack },
  coverMetaValue: { flex: 1, color: colors.ivoryOnBlack },
  page: {
    paddingTop: 46,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontSize: 10,
    fontFamily: "Times-Roman",
    color: colors.ink,
    backgroundColor: colors.paper,
  },
  eyebrow: {
    fontSize: 7.5,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 5,
    fontFamily: "Helvetica",
  },
  h2: { fontSize: 13, marginBottom: 8, marginTop: 2 },
  h3: {
    fontSize: 8.5,
    marginBottom: 6,
    marginTop: 8,
    fontFamily: "Helvetica",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: colors.goldMuted,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sectionNum: {
    fontSize: 8,
    letterSpacing: 1.4,
    color: colors.goldMuted,
    fontFamily: "Helvetica",
    width: 18,
  },
  muted: { color: colors.muted, fontSize: 8.3, fontFamily: "Helvetica" },
  para: { marginBottom: 7, lineHeight: 1.45, fontFamily: "Helvetica", fontSize: 9.2 },
  section: { marginBottom: 14 },
  sectionLead: {
    color: colors.muted,
    fontSize: 8.4,
    fontFamily: "Helvetica",
    marginBottom: 10,
  },
  scorePanel: {
    backgroundColor: colors.richBlack,
    padding: 14,
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 7.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.mutedOnBlack,
    fontFamily: "Helvetica",
    marginBottom: 6,
  },
  scoreValue: { fontSize: 28, letterSpacing: -0.4, color: colors.ivoryOnBlack },
  scoreGrade: {
    color: colors.gold,
    fontFamily: "Helvetica",
    fontSize: 9,
    marginTop: 8,
  },
  scoreGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  scoreCard: {
    width: "18%",
    borderWidth: 1,
    borderColor: colors.line,
    padding: 7,
  },
  finding: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 7,
    paddingBottom: 6,
    marginBottom: 1,
  },
  findingTitle: { fontSize: 11.2, marginBottom: 3, lineHeight: 1.3, maxWidth: 460 },
  fieldLabel: {
    color: colors.goldMuted,
    fontSize: 7.5,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontFamily: "Helvetica",
  },
  actionGroup: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 10,
    marginBottom: 8,
  },
  actionItem: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 5,
    fontFamily: "Helvetica",
    fontSize: 9,
  },
  actionIndex: { color: colors.goldMuted, width: 16, fontSize: 8 },
  actionPriority: {
    color: colors.muted,
    width: 36,
    fontSize: 7.2,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  actionText: { flex: 1 },
  assessmentBand: {
    backgroundColor: colors.richBlack,
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  assessmentBandTitle: { color: colors.ivoryOnBlack, fontSize: 13.5, marginBottom: 4 },
  assessmentBandLead: {
    color: colors.mutedOnBlack,
    fontSize: 8.4,
    fontFamily: "Helvetica",
    marginTop: 4,
    maxWidth: 420,
    lineHeight: 1.4,
  },
  assessmentBlock: {
    marginBottom: 9,
    paddingLeft: 9,
    borderLeftWidth: 2,
    borderLeftColor: colors.gold,
  },
  assessmentHeading: {
    fontSize: 11,
    marginBottom: 5,
    marginTop: 2,
    color: colors.ink,
  },
  limitationsBox: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    padding: 10,
    marginTop: 6,
    marginBottom: 4,
  },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 7.3,
    color: colors.muted,
    fontFamily: "Helvetica",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 7,
  },
  footerMark: { width: 16, height: 15, marginRight: 8 },
  footerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  notice: {
    borderLeftWidth: 2,
    borderLeftColor: colors.gold,
    paddingLeft: 8,
    color: colors.muted,
    fontFamily: "Helvetica",
    fontSize: 8,
    marginTop: 8,
  },
  listItem: { marginBottom: 2.5, fontFamily: "Helvetica", fontSize: 8.5, paddingLeft: 2, color: colors.muted },
  closing: {
    marginTop: 8,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  closingMark: { width: 32, height: 30, marginBottom: 6 },
  closingBrand: {
    fontSize: 7.5,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: colors.goldMuted,
    fontFamily: "Helvetica",
    marginBottom: 3,
  },
  closingSignoff: {
    fontSize: 8.5,
    color: colors.muted,
    fontFamily: "Helvetica",
  },
});

function Paras({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <Text key={i} style={styles.para}>
            {p}
          </Text>
        ))}
    </>
  );
}

function SectionHead({ index, title }: { index: number; title: string }) {
  return (
    <View style={styles.sectionHead} wrap={false}>
      <Text style={styles.sectionNum}>{formatSectionIndex(index)}</Text>
      <Text style={styles.h2}>{title}</Text>
    </View>
  );
}

function PageFooter({
  domain,
  logoPath,
}: {
  domain: string;
  logoPath: string | null;
}) {
  return (
    <View style={styles.footer} fixed>
      <View style={styles.footerLeft}>
        {logoPath ? (
          // react-pdf Image — decorative footer mark
          // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image has no alt prop
          <Image src={logoPath} style={styles.footerMark} />
        ) : null}
        <Text>{kxdReportPageFooterLine(domain)}</Text>
      </View>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

function FindingBlock({ finding }: { finding: CanonicalFinding }) {
  const support = findingSupportCopy(finding);
  return (
    <View style={styles.finding}>
      <Text style={styles.eyebrow}>
        {CATEGORY_LABEL[finding.category]} · {severityLabel(finding.severity)}
      </Text>
      <Text style={styles.findingTitle}>{finding.title}</Text>
      {support ? <Text style={styles.para}>{support}</Text> : null}
      <Text style={styles.para}>
        <Text style={styles.fieldLabel}>Why it matters </Text>
        {finding.whyItMatters}
      </Text>
      {finding.evidence ? (
        <Text style={{ ...styles.para, color: colors.muted }}>
          <Text style={styles.fieldLabel}>{findingProvenanceLabel(finding)} </Text>
          {finding.evidence}
        </Text>
      ) : null}
      {finding.recommendedAction ? (
        <Text style={{ ...styles.para, marginTop: 4 }}>
          <Text style={styles.fieldLabel}>Recommended action </Text>
          {finding.recommendedAction}
        </Text>
      ) : null}
    </View>
  );
}

function AuditReportPdfDocument({ report }: { report: CanonicalAuditReport }) {
  const domain = domainLabel(report.auditedUrl);
  const company = coverPrimaryName(report);
  const vis = report.sectionVisibility;
  const findings = report.findings.filter((f) => f.included !== false);
  const actions = report.actionPlan
    .filter((a) => a.included !== false)
    .sort((a, b) => a.order - b.order);
  const logo = resolveKxdReportLogoAsset();
  const logoPath = logo.exists ? logo.absolutePath : null;
  const overall = report.scores.overallScore;
  const gradeLine = formatGradeContext(report.scores.grade, overall);
  const condition = scoreConditionLabel(overall);

  return (
    <Document
      title={`${coverDocumentType()} — ${company}`}
      author={KXD_REPORT_BRAND}
      subject={`${coverDocumentType()} — ${company}`}
      creator={KXD_REPORT_BRAND}
    >
      <Page size="LETTER" style={styles.coverPage}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image has no alt prop */}
        {logoPath ? <Image src={logoPath} style={styles.coverLogo} /> : null}
        <Text style={styles.coverDocType}>{coverDocumentType()}</Text>
        <View style={styles.coverRule} />
        <Text style={styles.coverH1}>{company}</Text>
        <Link src={report.auditedUrl} style={styles.coverUrl}>
          {domain}
        </Link>
        <View style={styles.coverMetaRow}>
          <Text style={styles.coverMetaLabel}>Audit date</Text>
          <Text style={styles.coverMetaValue}>{fmtLongDate(report.auditDate)}</Text>
        </View>
        <View style={styles.coverMetaRow}>
          <Text style={styles.coverMetaLabel}>Prepared by</Text>
          <Text style={styles.coverMetaValue}>{KXD_REPORT_BRAND}</Text>
        </View>
        {report.preparedFor ? (
          <View style={styles.coverMetaRow}>
            <Text style={styles.coverMetaLabel}>Prepared for</Text>
            <Text style={styles.coverMetaValue}>{report.preparedFor}</Text>
          </View>
        ) : null}
      </Page>

      <Page size="LETTER" style={styles.page}>
        {vis.executiveSummary && report.executiveSummary ? (
          <View style={styles.section}>
            <SectionHead index={1} title="Executive summary" />
            <Paras text={report.executiveSummary} />
          </View>
        ) : null}

        {vis.overallScore ? (
          <View style={styles.section} wrap={false}>
            <SectionHead index={2} title="Overall score" />
            <View style={styles.scorePanel}>
              <Text style={styles.scoreLabel}>Composite score</Text>
              <Text style={styles.scoreValue}>{formatScoreOutOf(overall)}</Text>
              {gradeLine ? (
                <Text style={styles.scoreGrade}>{gradeLine}</Text>
              ) : condition ? (
                <Text style={styles.scoreGrade}>{condition}</Text>
              ) : null}
            </View>
            <Text style={styles.muted}>
              Measured {fmtLongDate(report.scores.measuredAt)} from a single-page HTML review on a
              0–100 scale. Scores are not rescaled for this report.
            </Text>
            <View style={styles.scoreGrid}>
              {(
                [
                  ["Performance", report.scores.performanceScore],
                  ["SEO", report.scores.seoScore],
                  ["Mobile", report.scores.mobileScore],
                  ["Conversion", report.scores.conversionScore],
                  ["Brand", report.scores.brandScore],
                ] as const
              ).map(([label, score]) => (
                <View key={label} style={styles.scoreCard}>
                  <Text style={styles.muted}>{label}</Text>
                  <Text>{score == null ? "—" : String(score)}</Text>
                </View>
              ))}
            </View>
            {report.partialDataNotes.length ? (
              <Text style={styles.notice}>{report.partialDataNotes.join(" ")}</Text>
            ) : null}
          </View>
        ) : null}

        <PageFooter domain={domain} logoPath={logoPath} />
      </Page>

      {vis.findings ? (
        <Page size="LETTER" style={styles.page}>
          <SectionHead index={3} title="Findings" />
          {findings.length === 0 ? (
            <Text style={styles.muted}>No findings included in this report.</Text>
          ) : (
            findings.map((f) => <FindingBlock key={f.id} finding={f} />)
          )}
          <PageFooter domain={domain} logoPath={logoPath} />
        </Page>
      ) : null}

      <Page size="LETTER" style={styles.page}>
        {vis.priorityActionPlan ? (
          <View style={styles.section}>
            <SectionHead index={4} title="Priority action plan" />
            <Text style={styles.sectionLead}>
              Executive roadmap by priority. Expected outcome, timing, and ownership appear only
              when recorded for this engagement.
            </Text>
            {ACTION_PLAN_GROUPS.map((group) => {
              const items = actions.filter((a) => a.group === group);
              if (!items.length) return null;
              return (
                <View key={group} style={styles.actionGroup} wrap={false}>
                  <Text style={styles.h3}>Priority · {ACTION_PLAN_GROUP_LABEL[group]}</Text>
                  {items.map((item, idx) => (
                    <View key={item.id} style={styles.actionItem}>
                      <Text style={styles.actionIndex}>
                        {String(idx + 1).padStart(2, "0")}
                      </Text>
                      <Text style={styles.actionPriority}>Action</Text>
                      <Text style={styles.actionText}>{item.text}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        ) : null}

        {vis.professionalAssessment ? (
          <View style={styles.section}>
            <View style={styles.assessmentBand} wrap={false}>
              <Text style={styles.assessmentBandTitle}>
                {formatSectionIndex(5)}  KXD professional assessment
              </Text>
              <Text style={styles.assessmentBandLead}>
                Strategic conclusion — interpretation, not a second findings list.
              </Text>
            </View>
            {report.workingWell ? (
              <View style={styles.assessmentBlock}>
                <Text style={styles.assessmentHeading}>What is working well</Text>
                <Paras text={report.workingWell} />
              </View>
            ) : null}
            {report.losingOpportunity ? (
              <View style={styles.assessmentBlock}>
                <Text style={styles.assessmentHeading}>Where opportunity is being lost</Text>
                <Paras text={report.losingOpportunity} />
              </View>
            ) : null}
            {report.recommendedNextSteps ? (
              <View style={styles.assessmentBlock}>
                <Text style={styles.assessmentHeading}>Recommended next steps</Text>
                <Paras text={report.recommendedNextSteps} />
              </View>
            ) : null}
            {report.closingNote ? (
              <View style={styles.assessmentBlock}>
                <Text style={styles.assessmentHeading}>Closing note</Text>
                <Paras text={report.closingNote} />
              </View>
            ) : null}
          </View>
        ) : null}

        {!vis.appendix ? (
          <View style={styles.closing}>
            <Text style={styles.closingBrand}>{KXD_REPORT_BRAND}</Text>
            <Text style={styles.closingSignoff}>Website Audit Report</Text>
          </View>
        ) : null}

        <PageFooter domain={domain} logoPath={logoPath} />
      </Page>

      {vis.appendix ? (
        <Page size="LETTER" style={styles.page}>
          <View style={styles.section}>
            <SectionHead index={6} title="Appendix" />
            <Text style={styles.sectionLead}>
              Methodology and limitations supporting this assessment.
            </Text>
            <Text style={styles.para}>
              <Text style={styles.fieldLabel}>Audit date </Text>
              {fmtLongDate(report.auditDate)}
            </Text>
            <Text style={styles.para}>
              <Text style={styles.fieldLabel}>Audited URL </Text>
              {report.auditedUrl}
            </Text>
            <Text style={styles.h3}>Checks performed</Text>
            {report.checksPerformed.map((item) => (
              <Text key={item} style={styles.listItem}>
                • {item}
              </Text>
            ))}
            <Text style={styles.h3}>Methodology</Text>
            {report.methodologyNotes.map((item) => (
              <Text key={item} style={styles.listItem}>
                • {item}
              </Text>
            ))}
            <View style={styles.limitationsBox} wrap={false}>
              <Text style={{ ...styles.h3, marginTop: 0 }}>Important limitations</Text>
              {report.limitations.map((item) => (
                <Text key={item} style={styles.listItem}>
                  • {item}
                </Text>
              ))}
              <View style={styles.closing}>
                <Text style={styles.closingBrand}>{KXD_REPORT_BRAND}</Text>
                <Text style={styles.closingSignoff}>Website Audit Report</Text>
              </View>
            </View>
          </View>
          <PageFooter domain={domain} logoPath={logoPath} />
        </Page>
      ) : null}
    </Document>
  );
}

export async function renderAuditReportPdf(
  report: CanonicalAuditReport,
): Promise<{ buffer: Buffer; filename: string }> {
  const instance = pdf(<AuditReportPdfDocument report={report} />);
  const blob = await instance.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    filename: buildAuditReportPdfFilename(report),
  };
}

export { AuditReportPdfDocument };
