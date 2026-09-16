/**
 * Account Statement PDF — @react-pdf/renderer.
 *
 * Canonical KXD client-facing Account Statement renderer.
 * One design system for every client; only ledger data changes.
 *
 * Pagination rules (system-wide):
 * - never orphan a section heading or section total
 * - keep individual obligation / payment rows intact
 * - keep Final Account Position (lines + total) together
 * - never emit a mostly-blank trailing page from footer overflow
 * - legitimate multi-page statements remain intentional and branded
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

/**
 * Footer is absolutely positioned. Keep bottom padding just large enough to
 * clear the footer band — excess padding is a common cause of blank trailing
 * pages when content already fills the letter sheet.
 */
const PAGE_PADDING_BOTTOM = 26;

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.paper,
    color: colors.ink,
    fontFamily: PROPOSAL_PDF_SANS,
    fontSize: 9,
    paddingTop: 26,
    paddingBottom: PAGE_PADDING_BOTTOM,
    paddingHorizontal: 42,
  },
  continuedBanner: {
    position: "absolute",
    top: 10,
    left: 42,
    right: 42,
    fontSize: 6.5,
    letterSpacing: 0.35,
    textTransform: "uppercase",
    color: colors.muted,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
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
    marginBottom: 6,
  },
  heroLeft: { flex: 1, paddingRight: 18 },
  goldRule: {
    width: 28,
    height: 1,
    backgroundColor: colors.gold,
    marginBottom: 5,
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
    marginBottom: 6,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
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
  section: { marginBottom: 6 },
  sectionLast: { marginBottom: 0 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 3,
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
  serviceItem: { marginBottom: 3.5 },
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
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 9,
    marginBottom: 0,
  },
  finalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
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
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    left: 42,
    right: 42,
    bottom: 14,
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
  footerPage: {
    position: "absolute",
    left: 42,
    right: 42,
    bottom: 4,
    textAlign: "center",
    fontSize: 6,
    letterSpacing: 0.3,
    color: colors.muted,
  },
});

function money(cents: number, currency: string): string {
  return formatCents(cents, currency);
}

function SectionHeading(props: {
  eyebrow: string;
  title: string;
  /** Keep heading + enough following content from orphaning. */
  minPresenceAhead?: number;
}): React.ReactElement {
  return (
    <View
      style={styles.sectionHead}
      wrap={false}
      minPresenceAhead={props.minPresenceAhead ?? 48}
    >
      <Text style={styles.sectionEyebrow}>{props.eyebrow}</Text>
      <Text style={styles.sectionTitle}>{props.title}</Text>
    </View>
  );
}

function OpenBalanceRow(props: {
  item: AccountStatementDocument["openBalances"]["items"][number];
  currency: string;
  upcoming?: boolean;
}): React.ReactElement {
  const { item, currency, upcoming } = props;
  return (
    <View style={styles.serviceItem} wrap={false} minPresenceAhead={42}>
      <View style={styles.serviceHead}>
        <Text style={styles.serviceTitle}>{item.description}</Text>
        <Text style={styles.serviceAmount}>
          {money(item.remainingCents, currency)}
        </Text>
      </View>
      <Text style={styles.servicePeriod}>
        {upcoming
          ? item.timingNote ||
            (item.dueDate
              ? `Due ${formatProposalCalendarDate(item.dueDate)}`
              : "Not yet due")
          : `${item.statusLabel}${
              item.dueDate
                ? ` · Due ${formatProposalCalendarDate(item.dueDate)}`
                : " · Due now"
            }`}
      </Text>
      <Text style={styles.serviceDesc}>
        Original {money(item.originalCents, currency)} · Paid{" "}
        {money(item.paidCents, currency)} · Remaining{" "}
        {money(item.remainingCents, currency)}
      </Text>
    </View>
  );
}

function AccountStatementPdfDocument(props: {
  doc: AccountStatementDocument;
  logoSrc: string | null;
}): React.ReactElement {
  const { doc, logoSrc } = props;
  const currency = doc.currency;
  const statementDateLabel = formatProposalCalendarDate(doc.statementDate);
  const hasUpcoming = (doc.openBalances.upcomingItems?.length ?? 0) > 0;
  const hasCurrentCharges =
    doc.currentCharges.items.length > 0 ||
    Boolean(doc.currentCharges.existingInvoiceNote);
  const continuedLabel = `${doc.clientName} · Account Statement · Continued`;

  return (
    <Document
      title={`${doc.title} — ${doc.clientName}`}
      author={KXD_REPORT_BRAND}
      subject={`Account statement for ${doc.clientName}`}
      creator={KXD_REPORT_BRAND}
    >
      <Page size="LETTER" style={styles.page} wrap>
        <Text
          style={styles.continuedBanner}
          fixed
          render={({ pageNumber }) =>
            pageNumber > 1 ? continuedLabel : " "
          }
        />

        <View style={styles.header} wrap={false}>
          <View style={styles.brandCol}>
            {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
            <Text style={styles.brandName}>{KXD_REPORT_BRAND}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Prepared for</Text>
            <Text style={styles.metaValue}>{doc.clientName}</Text>
            {doc.contactName ? (
              <>
                <Text style={styles.metaLabel}>Contact</Text>
                <Text style={styles.metaValue}>{doc.contactName}</Text>
              </>
            ) : null}
            <Text style={styles.metaLabel}>{doc.documentKindLabel}</Text>
            <Text style={styles.metaValue}>{doc.documentKindValue}</Text>
            <Text style={styles.metaLabel}>Statement date</Text>
            <Text style={styles.metaValue}>{statementDateLabel}</Text>
          </View>
        </View>

        <View style={styles.hero} wrap={false}>
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

        <View style={styles.summaryBlock} wrap={false}>
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
              {doc.summary.accountPaymentsReceivedLabel}
            </Text>
            <Text style={styles.summaryValue}>
              {money(doc.summary.accountPaymentsReceivedCents, currency)}
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
          {doc.summary.currentChargeLines.length > 0
            ? doc.summary.currentChargeLines.map((line) => (
                <View key={line.id} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{line.label}</Text>
                  <Text style={styles.summaryValue}>
                    {money(line.amountCents, currency)}
                  </Text>
                </View>
              ))
            : null}
        </View>

        <View style={styles.section} wrap>
          <SectionHeading
            eyebrow="Due"
            title={doc.openBalances.sectionTitle}
            minPresenceAhead={72}
          />
          {doc.openBalances.items.length === 0 ? (
            <Text style={styles.noteText} wrap={false}>
              Nothing currently due.
            </Text>
          ) : (
            doc.openBalances.items.map((item) => (
              <OpenBalanceRow key={item.id} item={item} currency={currency} />
            ))
          )}
          <View style={styles.tallyRow} wrap={false} minPresenceAhead={28}>
            <Text style={styles.tallyEmphLabel}>
              {doc.openBalances.totalRemainingLabel}
            </Text>
            <Text style={styles.tallyEmphValue}>
              {money(doc.openBalances.totalRemainingCents, currency)}
            </Text>
          </View>
        </View>

        {hasUpcoming ? (
          <View style={styles.section} wrap>
            <SectionHeading
              eyebrow="Upcoming"
              title={doc.openBalances.upcomingSectionTitle}
              minPresenceAhead={72}
            />
            {doc.openBalances.upcomingItems.map((item) => (
              <OpenBalanceRow
                key={item.id}
                item={item}
                currency={currency}
                upcoming
              />
            ))}
          </View>
        ) : null}

        <View style={styles.section} wrap>
          <SectionHeading
            eyebrow="Recorded"
            title={doc.paymentHistory.sectionTitle}
            minPresenceAhead={72}
          />
          {doc.paymentHistory.payments.map((payment) => (
            <View
              key={payment.id}
              style={styles.payRow}
              wrap={false}
              minPresenceAhead={28}
            >
              <Text style={styles.payDate}>
                {formatProposalCalendarDate(payment.paidOn)}
              </Text>
              <Text style={styles.payLabel}>
                {payment.label}
                {payment.detail ? ` · ${payment.detail}` : ""}
              </Text>
              <Text style={styles.payAmount}>
                {money(payment.amountCents, currency)}
              </Text>
            </View>
          ))}
          <View wrap={false} minPresenceAhead={40}>
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
        </View>

        {hasCurrentCharges ? (
          <View style={styles.section} wrap>
            <SectionHeading
              eyebrow="Services"
              title={doc.currentCharges.sectionTitle}
              minPresenceAhead={72}
            />
            {doc.currentCharges.items.map((item) => (
              <View
                key={item.id}
                style={styles.serviceItem}
                wrap={false}
                minPresenceAhead={40}
              >
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
            <View style={styles.tallyRow} wrap={false} minPresenceAhead={28}>
              <Text style={styles.tallyEmphLabel}>
                {doc.currentCharges.subtotalLabel}
              </Text>
              <Text style={styles.tallyEmphValue}>
                {money(doc.currentCharges.subtotalCents, currency)}
              </Text>
            </View>
            {doc.currentCharges.existingInvoiceNote ? (
              <Text style={styles.invoiceNote} wrap={false}>
                {doc.currentCharges.existingInvoiceNote}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/*
          Keep heading + Final Account Position shell together.
          Do NOT set a large minPresenceAhead here — that forces an otherwise
          fitting block onto a nearly empty trailing page.
        */}
        <View style={styles.sectionLast} wrap={false}>
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
        <Text
          style={styles.footerPage}
          fixed
          render={({ pageNumber, totalPages }) =>
            totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : " "
          }
        />
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
