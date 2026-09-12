/**
 * Account Statement PDF — @react-pdf/renderer.
 * Reuses KXD report tokens, official gold monogram, and proposal PDF fonts.
 *
 * Single-page editorial financial statement (not spreadsheet / Stripe receipt).
 */

import React from "react";
import {
  Document,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { KXD_REPORT_BRAND, kxdReportContactLine } from "@/lib/kxd-report-engine/contact";
import { resolveKxdReportLogoAsset } from "@/lib/kxd-report-engine/logos";
import { KXD_REPORT_COLORS } from "@/lib/kxd-report-engine/tokens";
import { formatProposalCalendarDate } from "@/lib/proposal-builder/calendar-date";
import { formatCents } from "@/lib/proposal-builder/money";
import {
  ensureProposalPdfFonts,
  PROPOSAL_PDF_SANS,
  PROPOSAL_PDF_SERIF,
} from "@/lib/proposal-builder/pdf-fonts";
import type { AccountStatementDocument } from "./types";
import { assertAccountStatementValid } from "./validate";

ensureProposalPdfFonts();

const colors = KXD_REPORT_COLORS;

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.paper,
    color: colors.ink,
    fontFamily: PROPOSAL_PDF_SANS,
    fontSize: 9,
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 42,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  brandCol: { maxWidth: 190 },
  logo: { width: 38, height: 36, marginBottom: 4 },
  brandName: {
    fontSize: 7,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.muted,
  },
  metaCol: {
    alignItems: "flex-end",
    maxWidth: 250,
    paddingTop: 2,
  },
  metaLabel: {
    fontSize: 6.5,
    letterSpacing: 0.45,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 1,
  },
  metaValue: {
    fontFamily: PROPOSAL_PDF_SERIF,
    fontSize: 10,
    color: colors.ink,
    textAlign: "right",
    lineHeight: 1.25,
    marginBottom: 6,
  },
  hero: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  heroLeft: { flex: 1, paddingRight: 18 },
  goldRule: {
    width: 28,
    height: 1,
    backgroundColor: colors.gold,
    marginBottom: 6,
  },
  title: {
    fontFamily: PROPOSAL_PDF_SERIF,
    fontWeight: 700,
    fontSize: 18,
    color: colors.richBlack,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  titleSub: {
    fontSize: 7.5,
    color: colors.muted,
    lineHeight: 1.3,
    maxWidth: 300,
  },
  heroRight: { alignItems: "flex-end", minWidth: 140 },
  heroOutstandingLabel: {
    fontSize: 6.5,
    letterSpacing: 0.45,
    textTransform: "uppercase",
    color: colors.goldMuted,
    marginBottom: 2,
  },
  heroOutstandingValue: {
    fontFamily: PROPOSAL_PDF_SERIF,
    fontWeight: 700,
    fontSize: 18,
    color: colors.richBlack,
  },
  summaryBlock: {
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2.5,
  },
  summaryLabel: {
    flex: 1,
    paddingRight: 10,
    fontSize: 8.5,
    color: colors.muted,
  },
  summaryValue: {
    fontFamily: PROPOSAL_PDF_SERIF,
    fontSize: 10,
    color: colors.ink,
  },
  section: { marginBottom: 8 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 4,
  },
  sectionEyebrow: {
    fontSize: 6.5,
    letterSpacing: 0.45,
    textTransform: "uppercase",
    color: colors.goldMuted,
    marginRight: 8,
  },
  sectionTitle: {
    fontFamily: PROPOSAL_PDF_SERIF,
    fontWeight: 700,
    fontSize: 11,
    color: colors.richBlack,
  },
  payRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingVertical: 2.5,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  payDate: { width: 100, fontSize: 7.5, color: colors.muted },
  payLabel: {
    flex: 1,
    fontFamily: PROPOSAL_PDF_SERIF,
    fontSize: 9,
    color: colors.ink,
    paddingRight: 8,
  },
  payAmount: {
    fontFamily: PROPOSAL_PDF_SERIF,
    fontSize: 9.5,
    color: colors.richBlack,
  },
  tallyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  tallyLabel: { fontSize: 8, color: colors.muted },
  tallyValue: {
    fontFamily: PROPOSAL_PDF_SERIF,
    fontSize: 9.5,
    color: colors.ink,
  },
  tallyEmphLabel: { fontSize: 8, color: colors.ink },
  tallyEmphValue: {
    fontFamily: PROPOSAL_PDF_SERIF,
    fontWeight: 700,
    fontSize: 10,
    color: colors.richBlack,
  },
  serviceItem: { marginBottom: 4.5 },
  serviceHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  serviceTitle: {
    flex: 1,
    paddingRight: 8,
    fontFamily: PROPOSAL_PDF_SERIF,
    fontSize: 9,
    color: colors.richBlack,
  },
  serviceAmount: {
    fontFamily: PROPOSAL_PDF_SERIF,
    fontSize: 9.5,
    color: colors.richBlack,
  },
  servicePeriod: {
    fontSize: 6.5,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: colors.muted,
    marginTop: 1,
    marginBottom: 1,
  },
  serviceDesc: {
    fontSize: 7.5,
    color: colors.muted,
    lineHeight: 1.35,
  },
  invoiceNote: {
    marginTop: 4,
    paddingVertical: 5,
    paddingHorizontal: 7,
    backgroundColor: colors.panel,
    fontSize: 7.5,
    color: colors.ink,
    lineHeight: 1.3,
  },
  finalShell: {
    backgroundColor: colors.ivory,
    paddingTop: 7,
    paddingBottom: 7,
    paddingHorizontal: 9,
    marginBottom: 5,
  },
  finalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2.5,
  },
  finalLabel: {
    flex: 1,
    paddingRight: 8,
    fontSize: 8,
    color: colors.ink,
  },
  finalValue: {
    fontFamily: PROPOSAL_PDF_SERIF,
    fontSize: 9.5,
    color: colors.richBlack,
  },
  finalTotalRule: {
    height: 1,
    backgroundColor: colors.gold,
    width: 22,
    marginTop: 2,
    marginBottom: 5,
  },
  finalTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  finalTotalLabel: {
    fontSize: 7,
    letterSpacing: 0.45,
    textTransform: "uppercase",
    color: colors.goldMuted,
    paddingBottom: 1,
  },
  finalTotalValue: {
    fontFamily: PROPOSAL_PDF_SERIF,
    fontWeight: 700,
    fontSize: 13,
    color: colors.richBlack,
  },
  noteText: {
    fontSize: 7.5,
    color: colors.muted,
    lineHeight: 1.35,
    marginBottom: 3,
  },
  footer: {
    position: "absolute",
    left: 42,
    right: 42,
    bottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: { fontSize: 6.5, color: colors.muted },
  footerMark: {
    fontSize: 6.5,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: colors.goldMuted,
  },
});

function money(cents: number, currency: string): string {
  return formatCents(cents, currency);
}

function AccountStatementPdfDocument(props: {
  doc: AccountStatementDocument;
  logoSrc: string | null;
}): React.ReactElement {
  const { doc, logoSrc } = props;
  const currency = doc.currency;
  const statementDateLabel = formatProposalCalendarDate(doc.statementDate);

  return (
    <Document
      title={`${doc.title} — ${doc.clientName}`}
      author={KXD_REPORT_BRAND}
      subject={`Account statement for ${doc.clientName}`}
      creator={KXD_REPORT_BRAND}
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brandCol}>
            {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
            <Text style={styles.brandName}>{KXD_REPORT_BRAND}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Prepared for</Text>
            <Text style={styles.metaValue}>{doc.clientName}</Text>
            <Text style={styles.metaLabel}>As of</Text>
            <Text style={styles.metaValue}>{statementDateLabel}</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <View style={styles.goldRule} />
            <Text style={styles.title}>{doc.title}</Text>
            <Text style={styles.titleSub}>
              Project payments, remaining website balance, and current service
              charges — account summary, not a new invoice.
            </Text>
          </View>
          <View style={styles.heroRight}>
            <Text style={styles.heroOutstandingLabel}>
              {doc.summary.totalOutstandingLabel}
            </Text>
            <Text style={styles.heroOutstandingValue}>
              {money(doc.summary.totalOutstandingCents, currency)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryBlock}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {doc.summary.originalProjectLabel}
            </Text>
            <Text style={styles.summaryValue}>
              {money(doc.summary.originalProjectCents, currency)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {doc.summary.paymentsReceivedLabel}
            </Text>
            <Text style={styles.summaryValue}>
              {money(doc.summary.paymentsReceivedCents, currency)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {doc.summary.projectBalanceLabel}
            </Text>
            <Text style={styles.summaryValue}>
              {money(doc.summary.projectBalanceCents, currency)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {doc.summary.currentChargesLabel}
            </Text>
            <Text style={styles.summaryValue}>
              {money(doc.summary.currentChargesCents, currency)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionEyebrow}>Recorded</Text>
            <Text style={styles.sectionTitle}>
              {doc.paymentHistory.sectionTitle}
            </Text>
          </View>
          {doc.paymentHistory.payments.map((payment) => (
            <View key={payment.id} style={styles.payRow}>
              <Text style={styles.payDate}>
                {formatProposalCalendarDate(payment.paidOn)}
              </Text>
              <Text style={styles.payLabel}>{payment.label}</Text>
              <Text style={styles.payAmount}>
                {money(payment.amountCents, currency)}
              </Text>
            </View>
          ))}
          <View style={styles.tallyRow}>
            <Text style={styles.tallyEmphLabel}>
              {doc.paymentHistory.totalReceivedLabel}
            </Text>
            <Text style={styles.tallyEmphValue}>
              {money(doc.paymentHistory.totalReceivedCents, currency)}
            </Text>
          </View>
          <View style={styles.tallyRow}>
            <Text style={styles.tallyLabel}>
              {doc.paymentHistory.remainingLabel}
            </Text>
            <Text style={styles.tallyValue}>
              {money(doc.paymentHistory.remainingCents, currency)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionEyebrow}>Services</Text>
            <Text style={styles.sectionTitle}>
              {doc.currentCharges.sectionTitle}
            </Text>
          </View>
          {doc.currentCharges.items.map((item) => (
            <View key={item.id} style={styles.serviceItem}>
              <View style={styles.serviceHead}>
                <Text style={styles.serviceTitle}>{item.title}</Text>
                <Text style={styles.serviceAmount}>
                  {money(item.amountCents, currency)}
                </Text>
              </View>
              <Text style={styles.servicePeriod}>{item.periodLabel}</Text>
              {item.description ? (
                <Text style={styles.serviceDesc}>{item.description}</Text>
              ) : null}
            </View>
          ))}
          <View style={styles.tallyRow}>
            <Text style={styles.tallyEmphLabel}>
              {doc.currentCharges.subtotalLabel}
            </Text>
            <Text style={styles.tallyEmphValue}>
              {money(doc.currentCharges.subtotalCents, currency)}
            </Text>
          </View>
          {doc.currentCharges.existingInvoiceNote ? (
            <Text style={styles.invoiceNote}>
              {doc.currentCharges.existingInvoiceNote}
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionEyebrow}>Position</Text>
            <Text style={styles.sectionTitle}>
              {doc.finalPosition.sectionTitle}
            </Text>
          </View>
          <View style={styles.finalShell}>
            {doc.finalPosition.lines.map((line) => (
              <View key={line.id} style={styles.finalRow}>
                <Text style={styles.finalLabel}>{line.label}</Text>
                <Text style={styles.finalValue}>
                  {money(line.amountCents, currency)}
                </Text>
              </View>
            ))}
            <View style={styles.finalTotalRule} />
            <View style={styles.finalTotalRow}>
              <Text style={styles.finalTotalLabel}>
                {doc.finalPosition.totalLabel}
              </Text>
              <Text style={styles.finalTotalValue}>
                {money(doc.finalPosition.totalCents, currency)}
              </Text>
            </View>
          </View>
          {doc.closingNotes.map((note) => (
            <Text key={note.id} style={styles.noteText}>
              {note.body}
            </Text>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{kxdReportContactLine()}</Text>
          <Text style={styles.footerMark}>Private · Client account</Text>
        </View>
      </Page>
    </Document>
  );
}

export function buildAccountStatementFilename(
  doc: AccountStatementDocument,
): string {
  const slug =
    doc.clientSlug?.trim() ||
    doc.clientName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return `KXD-Account-Statement-${slug}-${doc.statementDate}.pdf`;
}

export async function renderAccountStatementPdf(
  doc: AccountStatementDocument,
): Promise<{ buffer: Buffer; filename: string }> {
  assertAccountStatementValid(doc);
  const logo = resolveKxdReportLogoAsset();
  if (!logo.exists) {
    throw new Error(
      `Official KXD logo missing at ${logo.absolutePath}. Refusing to invent a mark.`,
    );
  }

  const element = (
    <AccountStatementPdfDocument doc={doc} logoSrc={logo.absolutePath} />
  );
  const instance = pdf(element);
  const blob = await instance.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    filename: buildAccountStatementFilename(doc),
  };
}
