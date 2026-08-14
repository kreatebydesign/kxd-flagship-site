/**
 * Branded monthly client report PDF — KXD Report Engine tokens + official logo.
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
  KXD_REPORT_CONTACT_EMAIL,
  kxdReportPageFooterLine,
} from "@/lib/kxd-report-engine/contact";
import { KXD_REPORT_COLORS } from "@/lib/kxd-report-engine/tokens";
import { resolveKxdReportLogoAsset } from "@/lib/kxd-report-engine/logos";
import { formatSectionIndex } from "@/lib/kxd-report-engine/section";
import { REPORT_SCOPE_LABEL, type BrandedReportSnapshot } from "./types";
import { resolveBrandedReportPdfFilename } from "./filename";
import { assertNoSecretLeak, stripInternalNotesFromSnapshot } from "./sanitize";
import { renderAuditDeliverablePdf } from "./export-audit-deliverable-pdf";

const colors = KXD_REPORT_COLORS;

const styles = StyleSheet.create({
  coverPage: {
    backgroundColor: colors.richBlack,
    paddingTop: 72,
    paddingBottom: 56,
    paddingHorizontal: 52,
    justifyContent: "center",
  },
  coverLogo: { width: 118, height: 111, marginBottom: 36 },
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
    fontSize: 26,
    color: colors.ivoryOnBlack,
    lineHeight: 1.15,
    maxWidth: 360,
    marginBottom: 12,
    fontFamily: "Times-Roman",
  },
  coverMetaRow: {
    flexDirection: "row",
    marginBottom: 6,
    fontFamily: "Helvetica",
    fontSize: 9,
  },
  coverMetaLabel: { width: 96, color: colors.mutedOnBlack },
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
  section: { marginBottom: 14 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 8,
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
  h2: { fontSize: 13, marginBottom: 0 },
  para: {
    marginBottom: 7,
    lineHeight: 1.45,
    fontFamily: "Helvetica",
    fontSize: 9.2,
  },
  muted: { color: colors.muted, fontSize: 8.3, fontFamily: "Helvetica" },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  metricCard: {
    width: "48%",
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    padding: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 7.2,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.goldMuted,
    fontFamily: "Helvetica",
    marginBottom: 4,
  },
  metricValue: { fontSize: 14, fontFamily: "Times-Roman", marginBottom: 3 },
  footer: {
    position: "absolute",
    left: 48,
    right: 48,
    bottom: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    fontFamily: "Helvetica",
    fontSize: 7.5,
    color: colors.muted,
  },
  panel: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    padding: 10,
    marginBottom: 10,
  },
});

function CoverMeta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.coverMetaRow}>
      <Text style={styles.coverMetaLabel}>{label}</Text>
      <Text style={styles.coverMetaValue}>{value}</Text>
    </View>
  );
}

function Section({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section} wrap={false}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionNum}>{formatSectionIndex(index)}</Text>
        <Text style={styles.h2}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function PageFooter({
  clientName,
  pageLabel,
}: {
  clientName: string;
  pageLabel: string;
}) {
  return (
    <View style={styles.footer} fixed>
      <Text>{kxdReportPageFooterLine("kreatebydesign.com")}</Text>
      <Text>
        {clientName} · {pageLabel} · Confidential
      </Text>
    </View>
  );
}

function BrandedMonthlyReportDocument({
  snapshot,
  logoSrc,
}: {
  snapshot: BrandedReportSnapshot;
  logoSrc: string | null;
}) {
  const scopeLabels = snapshot.scope.includedCapabilities
    .map((id) => REPORT_SCOPE_LABEL[id])
    .join(" · ");
  const includedWork = snapshot.workCompleted.filter((w) => w.included && w.clientVisible);
  let section = 1;

  return (
    <Document
      title={`${KXD_REPORT_BRAND} Monthly Performance Report — ${snapshot.clientName}`}
      author={KXD_REPORT_BRAND}
      subject={`Monthly Performance Report ${snapshot.period.label}`}
    >
      <Page size="LETTER" style={styles.coverPage}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image has no alt prop */}
        {logoSrc ? <Image src={logoSrc} style={styles.coverLogo} /> : null}
        <Text style={styles.coverDocType}>{KXD_REPORT_BRAND}</Text>
        <View style={styles.coverRule} />
        <Text style={styles.coverH1}>Monthly Performance Report</Text>
        <CoverMeta label="Client" value={snapshot.clientName} />
        <CoverMeta label="Period" value={snapshot.period.label} />
        <CoverMeta label="Timezone" value={snapshot.period.timezone} />
        <CoverMeta label="Services" value={scopeLabels || "Base website management"} />
        <CoverMeta label="Generated" value={snapshot.generatedAt.slice(0, 10)} />
        <CoverMeta label="Designation" value="Confidential · Client-facing" />
      </Page>

      <Page size="LETTER" style={styles.page}>
        <Section index={section++} title="Executive summary">
          <Text style={styles.para}>{snapshot.narratives.executiveSummary.body}</Text>
          {snapshot.period.excludesFinalDayNote ? (
            <Text style={styles.muted}>{snapshot.period.excludesFinalDayNote}</Text>
          ) : null}
        </Section>

        <Section index={section++} title="Performance snapshot">
          <Text style={styles.muted}>
            Only entitled and available channels are shown. Comparison labels and
            freshness are preserved for each metric.
          </Text>
          <View style={styles.metricGrid}>
            {snapshot.metrics.length === 0 ? (
              <Text style={styles.para}>No entitled metrics available for this period.</Text>
            ) : (
              snapshot.metrics.map((m) => (
                <View key={m.key} style={styles.metricCard} wrap={false}>
                  <Text style={styles.metricLabel}>{m.label}</Text>
                  <Text style={styles.metricValue}>{m.displayValue}</Text>
                  <Text style={styles.muted}>
                    {m.percentChangeLabel} · {m.source} · {m.completeness}
                  </Text>
                  {m.note ? <Text style={styles.muted}>{m.note}</Text> : null}
                </View>
              ))
            )}
          </View>
        </Section>

        <Section index={section++} title="Data sources">
          {snapshot.dataSources.map((s) => (
            <Text key={s.providerId} style={styles.para}>
              {s.label}: {s.includedInReport ? "Included" : "Not included"};{" "}
              {s.connected ? "Connected" : "Not connected"}. {s.statusNote}
            </Text>
          ))}
        </Section>

        <PageFooter clientName={snapshot.clientName} pageLabel={snapshot.period.label} />
      </Page>

      <Page size="LETTER" style={styles.page}>
        <Section index={section++} title="Website performance">
          <Text style={styles.para}>{snapshot.narratives.websitePerformance.body}</Text>
        </Section>
        <Section index={section++} title="Organic search performance">
          <Text style={styles.para}>{snapshot.narratives.organicSearch.body}</Text>
        </Section>
        <Section index={section++} title="Google Ads performance">
          <Text style={styles.para}>{snapshot.narratives.googleAds.body}</Text>
        </Section>
        <Section index={section++} title="Work completed by KXD">
          {includedWork.length > 0 ? (
            includedWork.map((w) => (
              <Text key={w.id} style={styles.para}>
                • {w.title}
                {w.completedAt ? ` (${w.completedAt.slice(0, 10)})` : ""}
                {w.summary ? ` — ${w.summary}` : ""}
              </Text>
            ))
          ) : (
            <Text style={styles.para}>{snapshot.narratives.workCompleted.body}</Text>
          )}
        </Section>
        <PageFooter clientName={snapshot.clientName} pageLabel={snapshot.period.label} />
      </Page>

      <Page size="LETTER" style={styles.page}>
        <Section index={section++} title="Improvements and wins">
          <Text style={styles.para}>{snapshot.narratives.improvementsAndWins.body}</Text>
        </Section>
        <Section index={section++} title="Issues or risks">
          <Text style={styles.para}>{snapshot.narratives.issuesOrRisks.body}</Text>
        </Section>
        <Section index={section++} title="Recommendations">
          <Text style={styles.para}>{snapshot.narratives.recommendations.body}</Text>
        </Section>
        <Section index={section++} title="August priorities">
          <Text style={styles.para}>{snapshot.narratives.augustPriorities.body}</Text>
        </Section>
        {snapshot.outOfScopeOpportunities.length > 0 ? (
          <Section index={section++} title="Optional upgrades (not included)">
            <View style={styles.panel}>
              {snapshot.outOfScopeOpportunities.map((o) => (
                <Text key={o.capability} style={styles.para}>
                  {o.title} — {o.summary} {o.upgradeFraming}
                </Text>
              ))}
            </View>
          </Section>
        ) : null}
        <Section index={section++} title="Closing">
          <Text style={styles.para}>{snapshot.narratives.closing.body}</Text>
          <Text style={styles.muted}>
            {KXD_REPORT_BRAND} · {KXD_REPORT_CONTACT_EMAIL}
          </Text>
        </Section>
        <PageFooter clientName={snapshot.clientName} pageLabel={snapshot.period.label} />
      </Page>
    </Document>
  );
}

export async function renderBrandedReportPdf(
  snapshot: BrandedReportSnapshot,
  options?: {
    auditPeriodLabel?: string;
    repairDateLabel?: string;
    preparedBy?: string | null;
    logoSrc?: string | null;
  },
): Promise<{ buffer: Buffer; filename: string }> {
  const clientFacing = stripInternalNotesFromSnapshot(snapshot) as BrandedReportSnapshot;
  if (clientFacing.internalNotes) {
    throw new Error("Internal notes must not enter the client PDF.");
  }

  if (clientFacing.presentation?.useAuditTheme === true) {
    return renderAuditDeliverablePdf(clientFacing, options);
  }

  const logo = resolveKxdReportLogoAsset();
  const doc = (
    <BrandedMonthlyReportDocument
      snapshot={clientFacing}
      logoSrc={logo.exists ? logo.absolutePath : null}
    />
  );
  const instance = pdf(doc);
  const blob = await instance.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const asTextProbe = buffer.toString("latin1");
  assertNoSecretLeak(asTextProbe, "branded report PDF binary probe");
  assertNoSecretLeak(JSON.stringify(clientFacing.narratives), "branded report narratives");

  return {
    buffer,
    filename: resolveBrandedReportPdfFilename(clientFacing),
  };
}
