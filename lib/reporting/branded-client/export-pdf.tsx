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
import { isNarrativeHidden, narrativeTitleForSnapshot } from "./presentation";
import {
  groupClientFacingWorkItems,
  toClientFacingWorkItem,
} from "./work-summary";

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
  metricCompare: {
    fontSize: 7,
    color: colors.muted,
    marginTop: 2,
    fontFamily: "Helvetica",
  },
  workGroupLabel: {
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.goldMuted,
    marginTop: 8,
    marginBottom: 4,
    fontFamily: "Helvetica",
  },
  workTitle: {
    fontSize: 10,
    color: colors.ink,
    fontFamily: "Helvetica",
    marginBottom: 1,
  },
  workSummary: {
    fontSize: 9,
    color: colors.muted,
    marginBottom: 6,
    lineHeight: 1.4,
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
  const presentation = snapshot.presentation;
  const scopeLabels = snapshot.scope.includedCapabilities
    .map((id) => REPORT_SCOPE_LABEL[id])
    .join(" · ");
  const includedWork = snapshot.workCompleted
    .filter((w) => w.included && w.clientVisible)
    .map(toClientFacingWorkItem);
  const workGroups = groupClientFacingWorkItems(includedWork);
  const pageLabel =
    presentation?.reportMonthLabel ||
    presentation?.coverTitle ||
    snapshot.period.label;
  const showDataSources = presentation?.hideDataFreshnessPanel !== true;
  const showOutOfScope =
    presentation?.hideOutOfScope !== true &&
    snapshot.outOfScopeOpportunities.length > 0;
  const showWorkList = presentation?.hideWorkCompletedList !== true;
  let section = 1;

  const narrativeOrder = [
    "websitePerformance",
    "organicSearch",
    "googleAds",
    "workCompleted",
    "improvementsAndWins",
    "issuesOrRisks",
    "recommendations",
    "augustPriorities",
  ] as const;

  return (
    <Document
      title={`${KXD_REPORT_BRAND} ${
        presentation?.documentTitle || "Monthly Performance Report"
      } — ${snapshot.clientName}`}
      author={KXD_REPORT_BRAND}
      subject={
        presentation?.reportMonthLabel
          ? `${presentation.reportMonthLabel} Monthly Report`
          : `Monthly Performance Report ${snapshot.period.label}`
      }
    >
      <Page size="LETTER" style={styles.coverPage}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image has no alt prop */}
        {logoSrc ? <Image src={logoSrc} style={styles.coverLogo} /> : null}
        <Text style={styles.coverDocType}>{KXD_REPORT_BRAND}</Text>
        <View style={styles.coverRule} />
        <Text style={styles.coverH1}>
          {presentation?.coverTitle || "Monthly Performance Report"}
        </Text>
        {presentation?.coverSubtitle ? (
          <Text style={styles.coverDocType}>{presentation.coverSubtitle}</Text>
        ) : null}
        <CoverMeta label="Client" value={snapshot.clientName} />
        {presentation?.reportMonthLabel ? (
          <CoverMeta label="Report month" value={presentation.reportMonthLabel} />
        ) : (
          <CoverMeta label="Period" value={snapshot.period.label} />
        )}
        {presentation?.googlePerformancePeriodLabel ? (
          <CoverMeta
            label="Google performance"
            value={presentation.googlePerformancePeriodLabel}
          />
        ) : null}
        <CoverMeta label="Services" value={scopeLabels || "Base website management"} />
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
            {presentation?.performanceSnapshotLead ||
              "Only entitled and available channels are shown."}
          </Text>
          <View style={styles.metricGrid}>
            {snapshot.metrics.length === 0 ? (
              <Text style={styles.para}>No entitled metrics available for this period.</Text>
            ) : (
              snapshot.metrics.map((m) => {
                const unavailable =
                  m.value == null ||
                  m.completeness === "unavailable" ||
                  m.provenance === "missing";
                return (
                  <View key={m.key} style={styles.metricCard} wrap={false}>
                    <Text style={styles.metricLabel}>{m.label}</Text>
                    <Text style={styles.metricValue}>{m.displayValue}</Text>
                    {unavailable ? (
                      <Text style={styles.muted}>
                        {m.note || "Not available for this period"}
                      </Text>
                    ) : (
                      <>
                        <Text style={styles.muted}>{m.source}</Text>
                        {m.percentChangeLabel &&
                        m.percentChangeLabel !== "Comparison unavailable" ? (
                          <Text style={styles.metricCompare}>{m.percentChangeLabel}</Text>
                        ) : null}
                      </>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </Section>

        {showDataSources ? (
          <Section index={section++} title="Data sources">
            {snapshot.dataSources.map((s) => (
              <Text key={s.providerId} style={styles.para}>
                {s.label}: {s.includedInReport ? "Included" : "Not included"};{" "}
                {s.connected ? "Connected" : "Not connected"}. {s.statusNote}
              </Text>
            ))}
          </Section>
        ) : null}

        <PageFooter clientName={snapshot.clientName} pageLabel={pageLabel} />
      </Page>

      <Page size="LETTER" style={styles.page}>
        {narrativeOrder
          .filter((key) => !isNarrativeHidden(snapshot, key))
          .filter((key) => {
            if (key === "workCompleted" && showWorkList && includedWork.length > 0) {
              return false;
            }
            const body = snapshot.narratives[key]?.body?.trim() ?? "";
            return body.length > 0;
          })
          .map((key) => (
            <Section
              key={key}
              index={section++}
              title={narrativeTitleForSnapshot(snapshot, key)}
            >
              <Text style={styles.para}>{snapshot.narratives[key].body}</Text>
            </Section>
          ))}

        {showWorkList && includedWork.length > 0 ? (
          <Section
            index={section++}
            title={
              presentation?.sectionTitles?.workCompleted ?? "KXD work this month"
            }
          >
            {workGroups.map((group) => (
              <View key={group.status}>
                <Text style={styles.workGroupLabel}>{group.label}</Text>
                {group.items.map((w) => (
                  <View key={w.id} wrap={false}>
                    <Text style={styles.workTitle}>
                      {w.title}
                      {w.completedAt && group.status === "complete"
                        ? ` (${w.completedAt.slice(0, 10)})`
                        : ""}
                    </Text>
                    {w.summary ? (
                      <Text style={styles.workSummary}>{w.summary}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ))}
          </Section>
        ) : null}

        <PageFooter clientName={snapshot.clientName} pageLabel={pageLabel} />
      </Page>

      <Page size="LETTER" style={styles.page}>
        {!isNarrativeHidden(snapshot, "closing") ? (
          <Section index={section++} title={narrativeTitleForSnapshot(snapshot, "closing")}>
            <Text style={styles.para}>{snapshot.narratives.closing.body}</Text>
            <Text style={styles.muted}>
              {KXD_REPORT_BRAND} · {KXD_REPORT_CONTACT_EMAIL}
            </Text>
          </Section>
        ) : null}
        {showOutOfScope ? (
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
        <PageFooter clientName={snapshot.clientName} pageLabel={pageLabel} />
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
