/**
 * Proposal PDF from canonical snapshot — @react-pdf/renderer.
 * Complete client-facing export; no internal fields or raw enum codes.
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
import { KXD_REPORT_COLORS } from "../kxd-report-engine/tokens.ts";
import { resolveKxdReportLogoAsset } from "../kxd-report-engine/logos.ts";
import { KXD_REPORT_BRAND } from "../kxd-report-engine/contact.ts";
import { formatProposalCalendarDate } from "./calendar-date.ts";
import {
  formatClientFacingBilling,
  formatClientFacingCreditAmount,
  formatClientFacingCreditType,
  formatClientFacingLineAmount,
  formatClientFacingMonthlyInvestment,
  formatClientFacingPaymentTiming,
} from "./client-facing-labels.ts";
import { formatProposalContactSummary } from "./document.ts";
import { buildProposalPdfFilenameExternal } from "./filename.ts";
import { formatCents } from "./money.ts";
import {
  coverOrganizationPresentation,
  distinctScopeOrganizationName,
  shouldShowRecurringInvestment,
} from "./presentation.ts";
import {
  ensureProposalPdfFonts,
  PROPOSAL_PDF_SANS,
  PROPOSAL_PDF_SERIF,
  splitCoverTitleLines,
} from "./pdf-fonts.ts";
import type { CanonicalProposal, ProposalScopeGroup } from "./types.ts";

// Register embedded TTFs before StyleSheet resolution so space metrics are correct.
ensureProposalPdfFonts();

const colors = KXD_REPORT_COLORS;

const styles = StyleSheet.create({
  coverPage: {
    backgroundColor: colors.richBlack,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 52,
    justifyContent: "flex-start",
  },
  coverLogo: { width: 104, height: 98, marginBottom: 16 },
  coverDocType: {
    fontSize: 8,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.mutedOnBlack,
    fontFamily: PROPOSAL_PDF_SANS,
    marginBottom: 8,
  },
  coverRule: {
    width: 42,
    height: 1,
    backgroundColor: colors.gold,
    marginBottom: 18,
  },
  coverTitleBlock: {
    maxWidth: 468,
    marginBottom: 22,
  },
  coverH1: {
    fontSize: 22,
    fontFamily: PROPOSAL_PDF_SERIF,
    fontWeight: 700,
    color: colors.ivoryOnBlack,
    lineHeight: 1.3,
    marginBottom: 2,
  },
  coverMeta: {
    fontSize: 9.5,
    color: colors.mutedOnBlack,
    fontFamily: PROPOSAL_PDF_SANS,
    marginBottom: 5,
    lineHeight: 1.45,
  },
  page: {
    paddingTop: 46,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontSize: 10,
    fontFamily: PROPOSAL_PDF_SANS,
    color: colors.ink,
    backgroundColor: colors.paper,
  },
  eyebrow: {
    fontSize: 7.5,
    letterSpacing: 0.45,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 5,
    fontFamily: PROPOSAL_PDF_SANS,
  },
  h2: {
    fontSize: 13,
    fontFamily: PROPOSAL_PDF_SERIF,
    fontWeight: 700,
    marginBottom: 8,
    marginTop: 2,
    lineHeight: 1.35,
  },
  h3: {
    fontSize: 8.5,
    marginBottom: 6,
    marginTop: 10,
    fontFamily: PROPOSAL_PDF_SANS,
    letterSpacing: 0.35,
    textTransform: "uppercase",
    color: colors.goldMuted,
  },
  p: {
    marginBottom: 8,
    lineHeight: 1.55,
    fontFamily: PROPOSAL_PDF_SANS,
    fontSize: 10,
  },
  bullet: {
    marginBottom: 4,
    paddingLeft: 8,
    lineHeight: 1.5,
    fontFamily: PROPOSAL_PDF_SANS,
    fontSize: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 7,
  },
  // Fixed column Views prevent flex from compressing space glyph widths.
  cell: {
    width: 268,
    paddingRight: 10,
  },
  cellType: {
    width: 140,
    paddingRight: 8,
  },
  cellRight: {
    width: 100,
  },
  cellText: {
    fontFamily: PROPOSAL_PDF_SANS,
    fontSize: 9,
    lineHeight: 1.4,
  },
  cellTextRight: {
    fontFamily: PROPOSAL_PDF_SANS,
    fontSize: 9,
    lineHeight: 1.4,
    textAlign: "right",
  },
  cellTextStrong: {
    fontFamily: PROPOSAL_PDF_SANS,
    fontWeight: 700,
    fontSize: 9,
    lineHeight: 1.4,
  },
  totalsBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  totalsLabel: {
    fontFamily: PROPOSAL_PDF_SANS,
    fontSize: 9,
    lineHeight: 1.4,
  },
  totalsValue: {
    fontFamily: PROPOSAL_PDF_SANS,
    fontWeight: 700,
    fontSize: 9,
    lineHeight: 1.4,
  },
  disclosure: {
    marginTop: 12,
    padding: 10,
    backgroundColor: colors.panel,
    borderLeftWidth: 2,
    borderLeftColor: colors.gold,
  },
  footer: {
    position: "absolute",
    left: 48,
    right: 48,
    bottom: 28,
    fontSize: 8,
    fontFamily: PROPOSAL_PDF_SANS,
    color: colors.muted,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  section: { marginBottom: 14 },
  scopeBlock: { marginBottom: 16 },
});

function PriceRow({
  left,
  middle,
  right,
  header = false,
}: {
  left: string;
  middle: string;
  right: string;
  header?: boolean;
}) {
  const textStyle = header ? styles.cellTextStrong : styles.cellText;
  return (
    <View style={styles.row} wrap={false}>
      <View style={styles.cell}>
        <Text style={textStyle}>{left}</Text>
      </View>
      <View style={styles.cellType}>
        <Text style={textStyle}>{middle}</Text>
      </View>
      <View style={styles.cellRight}>
        <Text style={header ? styles.cellTextStrong : styles.cellTextRight}>{right}</Text>
      </View>
    </View>
  );
}

function Paragraph({ text }: { text?: string | null }) {
  if (!text?.trim()) return null;
  return <Text style={styles.p}>{text}</Text>;
}

function SectionBlock({
  eyebrow,
  title,
  children,
  minPresenceAhead = 110,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  minPresenceAhead?: number;
}) {
  // Keep heading with the start of its body so section titles never orphan alone.
  return (
    <View style={styles.section} wrap={false} minPresenceAhead={minPresenceAhead}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.h2}>{title}</Text>
      {children}
    </View>
  );
}

function PageFooter({ proposal }: { proposal: CanonicalProposal }) {
  return (
    <View style={styles.footer} fixed>
      <Text>
        {KXD_REPORT_BRAND} · {proposal.proposalNumber} · v{proposal.version}
      </Text>
      <Text
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

function ScopeSection({
  group,
  primaryOrganization,
}: {
  group: ProposalScopeGroup;
  primaryOrganization: string;
}) {
  const leadDeliverables = group.deliverables.slice(0, 3);
  const restDeliverables = group.deliverables.slice(3);
  const trailingDeliverables = restDeliverables.slice(0, -2);
  const closingDeliverables = restDeliverables.slice(-2);
  const scopeOrg = distinctScopeOrganizationName(group.organizationName, primaryOrganization);

  return (
    <View style={styles.scopeBlock} wrap>
      <View wrap={false} minPresenceAhead={120}>
        <Text style={styles.eyebrow}>Included work</Text>
        <Text style={styles.h2}>{group.title}</Text>
        {scopeOrg ? <Text style={styles.p}>{scopeOrg}</Text> : null}
        <Paragraph text={group.overview} />
        {group.deliverables.length > 0 ? (
          <Text style={styles.h3}>Deliverables</Text>
        ) : null}
        {leadDeliverables.map((d) => (
          <Text key={d.id} style={styles.bullet}>
            • {d.title}
            {d.description ? `: ${d.description}` : ""}
          </Text>
        ))}
      </View>
      {trailingDeliverables.map((d) => (
        <Text key={d.id} style={styles.bullet}>
          • {d.title}
          {d.description ? `: ${d.description}` : ""}
        </Text>
      ))}
      <View wrap={false} minPresenceAhead={90}>
        {closingDeliverables.map((d) => (
          <Text key={d.id} style={styles.bullet}>
            • {d.title}
            {d.description ? `: ${d.description}` : ""}
          </Text>
        ))}
        {group.estimatedTimeline ? (
          <Text style={styles.p}>Timeline: {group.estimatedTimeline}</Text>
        ) : null}
      </View>
    </View>
  );
}

function ProposalPdfDocument({
  proposal,
  logoSrc,
}: {
  proposal: CanonicalProposal;
  logoSrc: string | null;
}) {
  const { preparedFor, additionalOrganizations } = coverOrganizationPresentation(
    proposal.primaryOrganization,
    proposal.organizations,
  );
  const additionalOrgs = additionalOrganizations.join(" · ");
  const contactSummary = formatProposalContactSummary(proposal.primaryContact);
  const sponsorshipNotes = proposal.credits
    .map((c) => c.notes?.trim())
    .filter(Boolean) as string[];

  const termSections: Array<{ key: keyof CanonicalProposal["terms"]; eyebrow: string; title: string }> = [
    { key: "proposalTerms", eyebrow: "Terms", title: "Terms" },
    { key: "paymentAssumptions", eyebrow: "Payment", title: "Payment schedule" },
    { key: "timelineAssumptions", eyebrow: "Timeline", title: "Project timeline" },
    { key: "expirationLanguage", eyebrow: "Validity", title: "Proposal validity" },
    { key: "changeRequestLanguage", eyebrow: "Changes", title: "Scope changes" },
    { key: "intellectualPropertySummary", eyebrow: "Intellectual property", title: "Intellectual property" },
    { key: "cancellationSummary", eyebrow: "Cancellation", title: "Cancellation" },
    { key: "clientResponsibilities", eyebrow: "Responsibilities", title: "What we need from you" },
    { key: "exclusions", eyebrow: "Exclusions", title: "What's not included" },
  ];

  return (
    <Document
      title={proposal.title}
      author={KXD_REPORT_BRAND}
      subject={`Proposal ${proposal.proposalNumber}`}
    >
      <Page size="LETTER" style={styles.coverPage}>
        {/* react-pdf Image has no alt prop; decorative cover mark */}
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        {logoSrc ? <Image src={logoSrc} style={styles.coverLogo} /> : null}
        <Text style={styles.coverDocType}>Proposal</Text>
        <View style={styles.coverRule} />
        <View style={styles.coverTitleBlock}>
          {splitCoverTitleLines(proposal.title).map((line, index) => (
            <Text key={`${index}-${line}`} style={styles.coverH1}>
              {line}
            </Text>
          ))}
        </View>
        {preparedFor ? (
          <Text style={styles.coverMeta}>Prepared for {preparedFor}</Text>
        ) : null}
        {additionalOrgs ? <Text style={styles.coverMeta}>{additionalOrgs}</Text> : null}
        {contactSummary ? (
          <Text style={styles.coverMeta}>Primary contact · {contactSummary}</Text>
        ) : null}
        <Text style={styles.coverMeta}>
          {proposal.proposalNumber} · Version {proposal.version}
        </Text>
        <Text style={styles.coverMeta}>
          {formatProposalCalendarDate(proposal.proposalDate)} · Expires{" "}
          {formatProposalCalendarDate(proposal.expirationDate)}
        </Text>
        <Text style={styles.coverMeta}>Prepared by {proposal.preparedBy}</Text>
      </Page>

      <Page size="LETTER" style={styles.page} wrap>
        <PageFooter proposal={proposal} />
        {contactSummary ? (
          <SectionBlock eyebrow="Contact" title="Primary contact" minPresenceAhead={48}>
            <Text style={styles.p}>{contactSummary}</Text>
          </SectionBlock>
        ) : null}
        {proposal.executive.clientFacingIntro ? (
          <SectionBlock eyebrow="Introduction" title="A clear path forward">
            <Paragraph text={proposal.executive.clientFacingIntro} />
          </SectionBlock>
        ) : null}
        {proposal.executive.executiveSummary ? (
          <SectionBlock eyebrow="Executive summary" title="Where this begins">
            <Paragraph text={proposal.executive.executiveSummary} />
          </SectionBlock>
        ) : null}
        {proposal.executive.currentSituation ? (
          <SectionBlock eyebrow="Situation" title="Current situation">
            <Paragraph text={proposal.executive.currentSituation} />
          </SectionBlock>
        ) : null}
        {proposal.executive.objectives ? (
          <SectionBlock eyebrow="Objectives" title="What success requires">
            <Paragraph text={proposal.executive.objectives} />
          </SectionBlock>
        ) : null}
        {proposal.executive.recommendedDirection ? (
          <SectionBlock eyebrow="Direction" title="Recommended path">
            <Paragraph text={proposal.executive.recommendedDirection} />
          </SectionBlock>
        ) : null}
        {proposal.executive.desiredOutcomes ? (
          <SectionBlock eyebrow="Outcomes" title="Desired outcomes">
            <Paragraph text={proposal.executive.desiredOutcomes} />
          </SectionBlock>
        ) : null}
        {proposal.executive.clientContext ? (
          <SectionBlock eyebrow="Context" title="Client-specific context">
            <Paragraph text={proposal.executive.clientContext} />
          </SectionBlock>
        ) : null}

        {proposal.scopeGroups.map((g) => (
          <ScopeSection
            key={g.id}
            group={g}
            primaryOrganization={proposal.primaryOrganization}
          />
        ))}
      </Page>

      <Page size="LETTER" style={styles.page} wrap>
        <PageFooter proposal={proposal} />
        <View style={styles.section} minPresenceAhead={80}>
          <Text style={styles.eyebrow}>Investment</Text>
          <Text style={styles.h2}>Pricing</Text>
          <PriceRow left="Item" middle="Billing" right="Amount" header />
          {proposal.pricingLines.map((line) => (
            <PriceRow
              key={line.id}
              left={line.title}
              middle={
                line.inclusion === "optional" || line.isAddon
                  ? "Optional"
                  : formatClientFacingBilling(line.cadence)
              }
              right={formatClientFacingLineAmount(
                line.unitPriceCents * (line.quantity || 1),
                line.cadence,
                proposal.currency,
              )}
            />
          ))}
          {proposal.credits.map((credit) => (
            <PriceRow
              key={credit.id}
              left={credit.label}
              middle={formatClientFacingCreditType(credit.kind)}
              right={formatClientFacingCreditAmount(credit, proposal.currency)}
            />
          ))}
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>One-time investment</Text>
              <Text style={styles.totalsValue}>
                {formatCents(proposal.totals.oneTimeTotalCents, proposal.currency)}
              </Text>
            </View>
            {shouldShowRecurringInvestment(proposal.totals.monthlyTotalCents) ? (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Monthly investment</Text>
                <Text style={styles.totalsValue}>
                  {formatClientFacingMonthlyInvestment(
                    proposal.totals.monthlyTotalCents,
                    proposal.currency,
                  )}
                </Text>
              </View>
            ) : null}
            {shouldShowRecurringInvestment(proposal.totals.quarterlyTotalCents) ? (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Quarterly investment</Text>
                <Text style={styles.totalsValue}>
                  {formatCents(proposal.totals.quarterlyTotalCents, proposal.currency)}
                </Text>
              </View>
            ) : null}
            {shouldShowRecurringInvestment(proposal.totals.annualTotalCents) ? (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Annual investment</Text>
                <Text style={styles.totalsValue}>
                  {formatCents(proposal.totals.annualTotalCents, proposal.currency)}
                </Text>
              </View>
            ) : null}
            {proposal.totals.depositCents > 0 ? (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Deposit</Text>
                <Text style={styles.totalsValue}>
                  {formatCents(proposal.totals.depositCents, proposal.currency)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {proposal.paymentSchedule.length > 0 ? (
          <View style={styles.section} minPresenceAhead={72}>
            <Text style={styles.h3}>Payment schedule</Text>
            {proposal.paymentSchedule.map((item) => (
              <PriceRow
                key={item.id}
                left={item.label}
                middle={formatClientFacingPaymentTiming(item.due)}
                right={formatCents(item.amountCents, proposal.currency)}
              />
            ))}
          </View>
        ) : null}

        {sponsorshipNotes.length > 0 ? (
          <SectionBlock eyebrow="Sponsorship" title="Sponsorship condition">
            {sponsorshipNotes.map((note) => (
              <Paragraph key={note.slice(0, 24)} text={note} />
            ))}
          </SectionBlock>
        ) : null}
      </Page>

      <Page size="LETTER" style={styles.page} wrap>
        <PageFooter proposal={proposal} />
        {termSections.map(({ key, eyebrow, title }) => {
          const text = proposal.terms[key];
          if (!text?.trim()) return null;
          return (
            <SectionBlock key={key} eyebrow={eyebrow} title={title}>
              <Paragraph text={text} />
            </SectionBlock>
          );
        })}

        <SectionBlock eyebrow="Next step" title="How to begin" minPresenceAhead={96}>
          <Paragraph text={proposal.terms.nextSteps} />
          <Paragraph text={proposal.terms.closingNote} />
          <View style={styles.disclosure}>
            <Text style={styles.p}>{proposal.disclosures.acceptance}</Text>
            <Text style={styles.p}>{proposal.disclosures.contractRequired}</Text>
          </View>
        </SectionBlock>
      </Page>
    </Document>
  );
}

export async function renderProposalPdf(
  proposal: CanonicalProposal,
): Promise<{ buffer: Buffer; filename: string }> {
  ensureProposalPdfFonts(); // idempotent; also called at module load
  const logo = resolveKxdReportLogoAsset();
  const instance = pdf(
    <ProposalPdfDocument
      proposal={proposal}
      logoSrc={logo.exists ? logo.absolutePath : null}
    />,
  );
  const blob = await instance.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    filename: buildProposalPdfFilenameExternal(proposal),
  };
}
