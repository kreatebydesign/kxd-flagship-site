/**
 * Google Ads audit deliverable PDF — aligned with portal AuditDeliverableReport.
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import {
  KXD_REPORT_BRAND,
  kxdReportPageFooterLine,
} from "@/lib/kxd-report-engine/contact";
import { formatSectionIndex } from "@/lib/kxd-report-engine/section";
import {
  buildAuditDeliverableViewModel,
  type AuditDeliverableViewModel,
} from "./audit-deliverable";
import { resolveBrandedReportPdfFilename } from "./filename";
import { assertNoSecretLeak, stripInternalNotesFromSnapshot } from "./sanitize";
import type { BrandedReportSnapshot } from "./types";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return { r: 168, g: 52, b: 36 };
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function createAuditStyles(accentHex: string) {
  const accent = hexToRgb(accentHex);
  const accentColor = `rgb(${accent.r}, ${accent.g}, ${accent.b})`;
  const accentSoft = `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.08)`;

  return StyleSheet.create({
    coverPage: {
      backgroundColor: "#0B0B0B",
      paddingTop: 56,
      paddingBottom: 48,
      paddingHorizontal: 48,
      color: "#F4F1EC",
    },
    coverEyebrow: {
      fontSize: 8,
      letterSpacing: 2,
      textTransform: "uppercase",
      color: "#9B9488",
      marginBottom: 10,
      fontFamily: "Helvetica",
    },
    coverRule: {
      width: 36,
      height: 1,
      backgroundColor: accentColor,
      marginBottom: 14,
    },
    coverTitle: {
      fontSize: 24,
      lineHeight: 1.15,
      marginBottom: 6,
      fontFamily: "Times-Roman",
      color: "#F4F1EC",
      maxWidth: 380,
    },
    coverClient: {
      fontSize: 11,
      color: "#B8B0A4",
      marginBottom: 18,
      fontFamily: "Helvetica",
    },
    coverMetaRow: {
      flexDirection: "row",
      marginBottom: 5,
      fontFamily: "Helvetica",
      fontSize: 9,
    },
    coverMetaLabel: { width: 92, color: "#9B9488" },
    coverMetaValue: { flex: 1, color: "#F4F1EC" },
    page: {
      paddingTop: 42,
      paddingBottom: 52,
      paddingHorizontal: 46,
      fontSize: 10,
      fontFamily: "Times-Roman",
      color: "#141414",
      backgroundColor: "#F7F4EF",
    },
    section: { marginBottom: 14 },
    sectionTitle: {
      fontSize: 14,
      marginBottom: 8,
      fontFamily: "Times-Roman",
      color: "#141414",
    },
    para: {
      fontSize: 10,
      lineHeight: 1.55,
      marginBottom: 6,
      fontFamily: "Times-Roman",
      color: "#141414",
    },
    lead: {
      fontSize: 9,
      lineHeight: 1.5,
      marginBottom: 8,
      color: "#5C574F",
      fontFamily: "Helvetica",
    },
    disclaimer: {
      fontSize: 8.5,
      lineHeight: 1.45,
      marginTop: 8,
      paddingLeft: 8,
      borderLeftWidth: 2,
      borderLeftColor: accentColor,
      backgroundColor: accentSoft,
      paddingVertical: 6,
      color: "#5C574F",
      fontFamily: "Helvetica",
    },
    bullet: {
      fontSize: 9.5,
      lineHeight: 1.45,
      marginBottom: 4,
      paddingLeft: 10,
      fontFamily: "Times-Roman",
    },
    metricGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    metricCard: {
      width: "48%",
      borderWidth: 1,
      borderColor: "#E4DDD2",
      backgroundColor: "#FFFFFF",
      padding: 8,
      marginBottom: 4,
      minHeight: 58,
    },
    metricCardCaution: {
      borderColor: `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.35)`,
      backgroundColor: accentSoft,
    },
    metricLabel: {
      fontSize: 7,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      color: "#5C574F",
      marginBottom: 3,
      fontFamily: "Helvetica",
    },
    metricValue: {
      fontSize: 14,
      fontFamily: "Helvetica-Bold",
      color: "#141414",
    },
    metricNote: {
      fontSize: 7,
      marginTop: 3,
      color: "#5C574F",
      fontFamily: "Helvetica",
    },
    callout: {
      borderWidth: 1,
      borderColor: `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.25)`,
      backgroundColor: accentSoft,
      padding: 10,
      marginBottom: 10,
    },
    closing: {
      marginTop: 8,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: "#E4DDD2",
    },
    closingMeta: {
      fontSize: 8,
      color: "#5C574F",
      marginTop: 6,
      fontFamily: "Helvetica",
    },
    footer: {
      position: "absolute",
      left: 46,
      right: 46,
      bottom: 24,
      flexDirection: "row",
      justifyContent: "space-between",
      fontFamily: "Helvetica",
      fontSize: 7.5,
      color: "#5C574F",
    },
    sectionNum: {
      fontSize: 8,
      color: accentColor,
      width: 18,
      fontFamily: "Helvetica-Bold",
    },
    sectionHead: {
      flexDirection: "row",
      alignItems: "baseline",
      marginBottom: 6,
    },
  });
}

function PageFooter({
  clientName,
  pageLabel,
}: {
  clientName: string;
  pageLabel: string;
}) {
  return (
    <View style={{ position: "absolute", left: 46, right: 46, bottom: 24, flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ fontSize: 7.5, color: "#5C574F", fontFamily: "Helvetica" }}>
        {kxdReportPageFooterLine("kreatebydesign.com")}
      </Text>
      <Text style={{ fontSize: 7.5, color: "#5C574F", fontFamily: "Helvetica" }}>
        {clientName} · {pageLabel} · Confidential
      </Text>
    </View>
  );
}

function AuditDeliverableDocument({
  model,
  logoSrc,
}: {
  model: AuditDeliverableViewModel;
  logoSrc: string | null;
}) {
  const styles = createAuditStyles(model.brandAccent);
  let sectionIndex = 1;

  return (
    <Document
      title={`${model.cover.title} — ${model.cover.clientName}`}
      author={KXD_REPORT_BRAND}
      subject={model.cover.auditPeriodLabel}
    >
      <Page size="LETTER" style={styles.coverPage}>
        {logoSrc ? (
          // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image has no alt prop
          <Image src={logoSrc} style={{ width: 108, height: 36, marginBottom: 24, objectFit: "contain" }} />
        ) : null}
        <Text style={styles.coverEyebrow}>{model.cover.eyebrow}</Text>
        <View style={styles.coverRule} />
        <Text style={styles.coverTitle}>{model.cover.title}</Text>
        <Text style={styles.coverClient}>{model.cover.clientName}</Text>
        <View style={styles.coverMetaRow}>
          <Text style={styles.coverMetaLabel}>Audit period</Text>
          <Text style={styles.coverMetaValue}>{model.cover.auditPeriodLabel}</Text>
        </View>
        <View style={styles.coverMetaRow}>
          <Text style={styles.coverMetaLabel}>Repairs completed</Text>
          <Text style={styles.coverMetaValue}>{model.cover.repairDateLabel}</Text>
        </View>
        <View style={styles.coverMetaRow}>
          <Text style={styles.coverMetaLabel}>Prepared by</Text>
          <Text style={styles.coverMetaValue}>{model.cover.preparedBy}</Text>
        </View>
      </Page>

      <Page size="LETTER" style={styles.page}>
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionNum}>{formatSectionIndex(sectionIndex++)}</Text>
            <Text style={styles.sectionTitle}>Executive summary</Text>
          </View>
          {model.executiveSummary.map((paragraph) => (
            <Text key={paragraph.slice(0, 40)} style={styles.para}>
              {paragraph}
            </Text>
          ))}
        </View>

        <View style={styles.section} wrap={false}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionNum}>{formatSectionIndex(sectionIndex++)}</Text>
            <Text style={styles.sectionTitle}>Verified performance snapshot</Text>
          </View>
          <Text style={styles.lead}>{model.performanceLead}</Text>
          <View style={styles.metricGrid}>
            {model.metrics.map((metric) => (
              <View
                key={metric.key}
                style={[
                  styles.metricCard,
                  ...(metric.emphasis === "caution" ? [styles.metricCardCaution] : []),
                ]}
                wrap={false}
              >
                <Text style={styles.metricLabel}>{metric.label}</Text>
                <Text style={styles.metricValue}>{metric.value}</Text>
                {metric.note ? <Text style={styles.metricNote}>{metric.note}</Text> : null}
              </View>
            ))}
          </View>
          <Text style={styles.disclaimer}>{model.conversionDisclaimer}</Text>
        </View>

        {model.sections.map((section) => (
          <View
            key={section.id}
            style={section.variant === "callout" ? styles.callout : styles.section}
            wrap={false}
          >
            <View style={styles.sectionHead}>
              <Text style={styles.sectionNum}>{formatSectionIndex(sectionIndex++)}</Text>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            {section.paragraphs.map((paragraph) => (
              <Text key={paragraph.slice(0, 40)} style={styles.para}>
                {paragraph}
              </Text>
            ))}
            {section.bullets.map((bullet) => (
              <Text key={bullet.slice(0, 40)} style={styles.bullet}>
                • {bullet}
              </Text>
            ))}
          </View>
        ))}

        <View style={styles.closing}>
          {model.closing.paragraphs.map((paragraph) => (
            <Text key={paragraph.slice(0, 40)} style={styles.para}>
              {paragraph}
            </Text>
          ))}
          <Text style={styles.closingMeta}>
            {model.cover.preparedBy} · {model.closing.contactEmail} · Report version{" "}
            {model.closing.version} · Generated {model.closing.generatedAt.slice(0, 10)}
          </Text>
        </View>

        <PageFooter clientName={model.cover.clientName} pageLabel={model.cover.auditPeriodLabel} />
      </Page>
    </Document>
  );
}

export async function renderAuditDeliverablePdf(
  snapshot: BrandedReportSnapshot,
  options?: {
    auditPeriodLabel?: string | null;
    repairDateLabel?: string | null;
    preparedBy?: string | null;
    logoSrc?: string | null;
  },
): Promise<{ buffer: Buffer; filename: string }> {
  const clientFacing = stripInternalNotesFromSnapshot(snapshot) as BrandedReportSnapshot;
  const model = buildAuditDeliverableViewModel(clientFacing, {
    auditPeriodLabel: options?.auditPeriodLabel,
    repairDateLabel: options?.repairDateLabel,
    preparedBy: options?.preparedBy,
    logoUrl: options?.logoSrc ?? null,
  });

  const doc = (
    <AuditDeliverableDocument model={model} logoSrc={options?.logoSrc ?? null} />
  );
  const instance = pdf(doc);
  const blob = await instance.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const asTextProbe = buffer.toString("latin1");
  assertNoSecretLeak(asTextProbe, "audit deliverable PDF binary probe");
  assertNoSecretLeak(JSON.stringify(model), "audit deliverable view model");

  return {
    buffer,
    filename: resolveBrandedReportPdfFilename(clientFacing),
  };
}
