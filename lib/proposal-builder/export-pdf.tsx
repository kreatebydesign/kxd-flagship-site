/**
 * Proposal PDF from canonical snapshot — @react-pdf/renderer.
 * Premium editorial client-facing export; no internal fields or raw enum codes.
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
import {
  formatClientFacingCreditAmount,
  formatClientFacingCreditType,
} from "./client-facing-labels.ts";
import { buildProposalPdfFilenameExternal } from "./filename.ts";
import {
  composeClosingPresentation,
  composeCoverPresentation,
  composeInvestmentPresentation,
  composeOpeningSections,
  composeScopeWorkstream,
  composeTermsSectionPlan,
  proseKindForTermsKey,
  structureProposalProse,
  type ProposalProseBlock,
  type ScopeWorkstreamPresentation,
} from "./presentation.ts";
import {
  ensureProposalPdfFonts,
  PROPOSAL_PDF_SANS,
  PROPOSAL_PDF_SERIF,
} from "./pdf-fonts.ts";
import type { CanonicalProposal } from "./types.ts";

ensureProposalPdfFonts();

const colors = KXD_REPORT_COLORS;

const styles = StyleSheet.create({
  coverPage: {
    backgroundColor: colors.richBlack,
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 56,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  coverTop: {
    flexGrow: 0,
  },
  coverBottom: {
    flexGrow: 0,
    marginTop: 48,
  },
  coverLogo: { width: 92, height: 87, marginBottom: 36 },
  coverDocType: {
    fontSize: 9,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    color: colors.mutedOnBlack,
    fontFamily: PROPOSAL_PDF_SANS,
    marginBottom: 14,
  },
  coverRule: {
    width: 48,
    height: 1,
    backgroundColor: colors.gold,
    marginBottom: 36,
  },
  coverOrg: {
    fontSize: 28,
    fontFamily: PROPOSAL_PDF_SERIF,
    fontWeight: 700,
    color: colors.ivoryOnBlack,
    lineHeight: 1.18,
    marginBottom: 4,
    maxWidth: 320,
  },
  coverJoiner: {
    fontSize: 14,
    fontFamily: PROPOSAL_PDF_SANS,
    color: colors.gold,
    letterSpacing: 1.2,
    marginVertical: 10,
  },
  coverEngagement: {
    fontSize: 12,
    fontFamily: PROPOSAL_PDF_SANS,
    color: colors.mutedOnBlack,
    letterSpacing: 0.4,
    marginTop: 28,
    maxWidth: 300,
    lineHeight: 1.5,
  },
  coverPreparedLabel: {
    fontSize: 8,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: colors.mutedOnBlack,
    fontFamily: PROPOSAL_PDF_SANS,
    marginBottom: 6,
  },
  coverPreparedName: {
    fontSize: 13,
    fontFamily: PROPOSAL_PDF_SERIF,
    color: colors.ivoryOnBlack,
    marginBottom: 4,
  },
  coverPreparedDetail: {
    fontSize: 9.5,
    fontFamily: PROPOSAL_PDF_SANS,
    color: colors.mutedOnBlack,
    marginBottom: 18,
    lineHeight: 1.45,
  },
  coverMeta: {
    fontSize: 9,
    color: colors.mutedOnBlack,
    fontFamily: PROPOSAL_PDF_SANS,
    marginBottom: 4,
    lineHeight: 1.45,
  },
  coverStudio: {
    marginTop: 18,
    fontSize: 11,
    fontFamily: PROPOSAL_PDF_SERIF,
    color: colors.ivoryOnBlack,
  },
  page: {
    paddingTop: 46,
    paddingBottom: 52,
    paddingHorizontal: 52,
    fontSize: 10,
    fontFamily: PROPOSAL_PDF_SANS,
    color: colors.ink,
    backgroundColor: colors.paper,
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 7,
    fontFamily: PROPOSAL_PDF_SANS,
  },
  h2: {
    fontSize: 17,
    fontFamily: PROPOSAL_PDF_SERIF,
    fontWeight: 700,
    marginBottom: 12,
    marginTop: 0,
    lineHeight: 1.25,
    maxWidth: 420,
  },
  h3: {
    fontSize: 8.5,
    marginBottom: 8,
    marginTop: 4,
    fontFamily: PROPOSAL_PDF_SANS,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.goldMuted,
  },
  p: {
    marginBottom: 10,
    lineHeight: 1.58,
    fontFamily: PROPOSAL_PDF_SANS,
    fontSize: 10.25,
    maxWidth: 468,
  },
  pSupporting: {
    marginBottom: 9,
    lineHeight: 1.55,
    fontFamily: PROPOSAL_PDF_SANS,
    fontSize: 10,
    color: colors.ink,
    maxWidth: 468,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 8,
    paddingRight: 12,
    maxWidth: 480,
  },
  bulletMark: {
    width: 14,
    fontSize: 10,
    color: colors.goldMuted,
    fontFamily: PROPOSAL_PDF_SANS,
  },
  bulletBody: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.48,
    fontFamily: PROPOSAL_PDF_SANS,
  },
  bulletTitle: {
    fontFamily: PROPOSAL_PDF_SANS,
    fontWeight: 700,
    fontSize: 10,
    lineHeight: 1.42,
  },
  section: {
    marginBottom: 22,
  },
  sectionLead: {
    marginBottom: 26,
  },
  scopeBlock: {
    marginBottom: 26,
    paddingTop: 6,
  },
  scopeIndex: {
    fontSize: 9,
    letterSpacing: 2,
    color: colors.goldMuted,
    fontFamily: PROPOSAL_PDF_SANS,
    marginBottom: 8,
  },
  scopeTitle: {
    fontSize: 20,
    fontFamily: PROPOSAL_PDF_SERIF,
    fontWeight: 700,
    marginBottom: 4,
    lineHeight: 1.2,
  },
  scopeSubtitle: {
    fontSize: 10,
    fontFamily: PROPOSAL_PDF_SANS,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 12,
  },
  scopeRule: {
    width: 36,
    height: 1,
    backgroundColor: colors.gold,
    marginBottom: 12,
  },
  investmentHero: {
    marginTop: 6,
    marginBottom: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.panel,
    borderLeftWidth: 2,
    borderLeftColor: colors.gold,
  },
  investmentHeroEyebrow: {
    fontSize: 8,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: colors.muted,
    fontFamily: PROPOSAL_PDF_SANS,
    marginBottom: 8,
  },
  investmentHeroAmount: {
    fontSize: 28,
    fontFamily: PROPOSAL_PDF_SERIF,
    fontWeight: 700,
    color: colors.ink,
    marginBottom: 6,
  },
  investmentHeroCaption: {
    fontSize: 10,
    fontFamily: PROPOSAL_PDF_SANS,
    color: colors.muted,
    marginBottom: 4,
    lineHeight: 1.45,
  },
  investmentPayment: {
    fontSize: 11,
    fontFamily: PROPOSAL_PDF_SANS,
    fontWeight: 700,
    color: colors.ink,
    marginTop: 6,
  },
  investmentSubhead: {
    fontSize: 8.5,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.goldMuted,
    fontFamily: PROPOSAL_PDF_SANS,
    marginTop: 8,
    marginBottom: 8,
  },
  investmentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  investmentRowTitle: {
    width: 340,
    fontSize: 10,
    fontFamily: PROPOSAL_PDF_SANS,
    lineHeight: 1.4,
    paddingRight: 12,
  },
  investmentRowAmount: {
    width: 110,
    fontSize: 10,
    fontFamily: PROPOSAL_PDF_SANS,
    fontWeight: 700,
    textAlign: "right",
    lineHeight: 1.4,
  },
  investmentNote: {
    marginTop: 8,
    fontSize: 10,
    fontFamily: PROPOSAL_PDF_SANS,
    color: colors.muted,
  },
  editorialRow: {
    flexDirection: "row",
    gap: 18,
    marginBottom: 8,
  },
  editorialCol: {
    width: "48%",
  },
  disclosure: {
    marginTop: 14,
    padding: 12,
    backgroundColor: colors.paper,
    borderLeftWidth: 2,
    borderLeftColor: colors.gold,
  },
  closingPage: {
    paddingTop: 52,
    paddingBottom: 56,
    paddingHorizontal: 52,
    fontSize: 10,
    fontFamily: PROPOSAL_PDF_SANS,
    color: colors.ink,
    backgroundColor: colors.paper,
  },
  closingShell: {
    flexGrow: 1,
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 22,
    backgroundColor: colors.panel,
    justifyContent: "space-between",
    minHeight: 620,
  },
  closingTop: {
    maxWidth: 420,
  },
  closingAcceptCue: {
    marginTop: 22,
    fontSize: 13,
    fontFamily: PROPOSAL_PDF_SERIF,
    fontWeight: 700,
    color: colors.ink,
  },
  closingStudio: {
    marginTop: 28,
    fontSize: 14,
    fontFamily: PROPOSAL_PDF_SERIF,
    color: colors.ink,
  },
  footer: {
    position: "absolute",
    left: 52,
    right: 52,
    bottom: 28,
    fontSize: 8,
    fontFamily: PROPOSAL_PDF_SANS,
    color: colors.muted,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function chunkListItems<T>(items: T[], minChunkSize: number): T[][] {
  if (items.length === 0) return [];
  if (items.length <= minChunkSize) return [items];
  const chunks: T[][] = [];
  let index = 0;
  while (index < items.length) {
    const remaining = items.length - index;
    if (remaining <= minChunkSize + 2) {
      chunks.push(items.slice(index));
      break;
    }
    chunks.push(items.slice(index, index + minChunkSize));
    index += minChunkSize;
  }
  return chunks;
}

function Paragraph({
  text,
  supporting = false,
}: {
  text?: string | null;
  supporting?: boolean;
}) {
  if (!text?.trim()) return null;
  return <Text style={supporting ? styles.pSupporting : styles.p}>{text}</Text>;
}

function ProseBullet({ text, marker = "•" }: { text: string; marker?: string }) {
  return (
    <View style={styles.bulletRow} wrap={false}>
      <Text style={styles.bulletMark}>{marker}</Text>
      <Text style={styles.bulletBody}>{text}</Text>
    </View>
  );
}

function StructuredProse({ blocks }: { blocks: ProposalProseBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          return <Paragraph key={`p-${index}`} text={block.text} />;
        }
        if (block.type === "numbered") {
          return (
            <View key={`ol-${index}`}>
              {block.items.map((item, itemIndex) => (
                <ProseBullet
                  key={`ol-${index}-${itemIndex}`}
                  marker={`${itemIndex + 1}.`}
                  text={item}
                />
              ))}
            </View>
          );
        }
        return (
          <View key={`ul-${index}`}>
            {block.items.map((item, itemIndex) => (
              <ProseBullet key={`ul-${index}-${itemIndex}`} text={item} />
            ))}
          </View>
        );
      })}
    </>
  );
}

function PageFooter({ proposal }: { proposal: CanonicalProposal }) {
  return (
    <View style={styles.footer} fixed>
      <Text>
        {KXD_REPORT_BRAND} · {proposal.proposalNumber} · v{proposal.version}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function OpeningSectionView({
  eyebrow,
  title,
  paragraphs,
  emphasis,
}: {
  eyebrow: string;
  title: string;
  paragraphs: string[];
  emphasis?: "lead" | "supporting";
}) {
  return (
    <View
      style={emphasis === "lead" ? styles.sectionLead : styles.section}
      wrap
      minPresenceAhead={72}
    >
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.h2}>{title}</Text>
      {paragraphs.map((paragraph) => (
        <Paragraph
          key={paragraph.slice(0, 40)}
          text={paragraph}
          supporting={emphasis === "supporting"}
        />
      ))}
    </View>
  );
}

function ScopeSection({ workstream }: { workstream: ScopeWorkstreamPresentation }) {
  const deliverables = workstream.deliverables;
  const leadCount = deliverables.length >= 10 ? 5 : Math.min(4, deliverables.length);
  const lead = deliverables.slice(0, leadCount);
  const restChunks = chunkListItems(deliverables.slice(leadCount), 5);

  return (
    <View style={styles.scopeBlock} wrap>
      <View wrap={false} minPresenceAhead={150}>
        <Text style={styles.scopeIndex}>{workstream.indexLabel}</Text>
        <Text style={styles.scopeTitle}>{workstream.title}</Text>
        {workstream.subtitle ? (
          <Text style={styles.scopeSubtitle}>{workstream.subtitle}</Text>
        ) : null}
        <View style={styles.scopeRule} />
        <Paragraph text={workstream.overview} />
        {deliverables.length > 0 ? <Text style={styles.h3}>Deliverables</Text> : null}
        {lead.map((item) => (
          <View key={item.id} style={styles.bulletRow} wrap={false}>
            <Text style={styles.bulletMark}>•</Text>
            <Text style={styles.bulletBody}>
              <Text style={styles.bulletTitle}>{item.title}</Text>
              {item.description ? ` — ${item.description}` : ""}
            </Text>
          </View>
        ))}
      </View>
      {restChunks.map((chunk, index) => (
        <View key={`scope-rest-${index}`} wrap={false} minPresenceAhead={96}>
          {chunk.map((item) => (
            <View key={item.id} style={styles.bulletRow} wrap={false}>
              <Text style={styles.bulletMark}>•</Text>
              <Text style={styles.bulletBody}>
                <Text style={styles.bulletTitle}>{item.title}</Text>
                {item.description ? ` — ${item.description}` : ""}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function InvestmentSection({ proposal }: { proposal: CanonicalProposal }) {
  const investment = composeInvestmentPresentation(proposal);
  return (
    <View style={styles.section} wrap minPresenceAhead={160}>
      <Text style={styles.eyebrow}>{investment.eyebrow}</Text>
      <Text style={styles.h2}>{investment.title}</Text>

      <View style={styles.investmentHero} wrap={false}>
        <Text style={styles.investmentHeroEyebrow}>{investment.heroEyebrow}</Text>
        <Text style={styles.investmentHeroAmount}>{investment.heroAmount}</Text>
        <Text style={styles.investmentHeroCaption}>Total project investment</Text>
        {investment.paymentSummary ? (
          <Text style={styles.investmentPayment}>{investment.paymentSummary}</Text>
        ) : null}
      </View>

      {investment.annualLines.length > 0 ? (
        <View wrap={false} minPresenceAhead={88}>
          <Text style={styles.investmentSubhead}>Annual hosting</Text>
          {investment.annualLines.map((line) => (
            <View key={line.id} style={styles.investmentRow}>
              <Text style={styles.investmentRowTitle}>{line.title}</Text>
              <Text style={styles.investmentRowAmount}>{line.amountLabel}</Text>
            </View>
          ))}
          {investment.annualTotalLabel ? (
            <Text style={styles.investmentNote}>{investment.annualTotalLabel}</Text>
          ) : null}
        </View>
      ) : null}

      {investment.monthlyLines.length > 0 ? (
        <View wrap={false} minPresenceAhead={72}>
          <Text style={styles.investmentSubhead}>Monthly</Text>
          {investment.monthlyLines.map((line) => (
            <View key={line.id} style={styles.investmentRow}>
              <Text style={styles.investmentRowTitle}>{line.title}</Text>
              <Text style={styles.investmentRowAmount}>{line.amountLabel}</Text>
            </View>
          ))}
        </View>
      ) : investment.monthlyNoneLabel ? (
        <View wrap={false} minPresenceAhead={48}>
          <Text style={styles.investmentSubhead}>Monthly management</Text>
          <Text style={styles.investmentNote}>{investment.monthlyNoneLabel}</Text>
        </View>
      ) : null}

      {investment.quarterlyLines.length > 0 ? (
        <View wrap={false} minPresenceAhead={72}>
          <Text style={styles.investmentSubhead}>Quarterly</Text>
          {investment.quarterlyLines.map((line) => (
            <View key={line.id} style={styles.investmentRow}>
              <Text style={styles.investmentRowTitle}>{line.title}</Text>
              <Text style={styles.investmentRowAmount}>{line.amountLabel}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {investment.creditLines.length > 0 ? (
        <View wrap={false} minPresenceAhead={72}>
          <Text style={styles.investmentSubhead}>Credits & adjustments</Text>
          {proposal.credits.map((credit) => (
            <View key={credit.id} style={styles.investmentRow}>
              <Text style={styles.investmentRowTitle}>
                {credit.label} · {formatClientFacingCreditType(credit.kind)}
              </Text>
              <Text style={styles.investmentRowAmount}>
                {formatClientFacingCreditAmount(credit, proposal.currency)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {investment.showDetailedSchedule ? (
        <View wrap={false} minPresenceAhead={88}>
          <Text style={styles.investmentSubhead}>Payment schedule</Text>
          {investment.scheduleRows.map((row) => (
            <View key={row.id} style={styles.investmentRow}>
              <Text style={styles.investmentRowTitle}>
                {row.label}
                {"\n"}
                <Text style={{ color: colors.muted, fontWeight: 400 }}>{row.timing}</Text>
              </Text>
              <Text style={styles.investmentRowAmount}>{row.amount}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function TermsSectionView({
  sectionKey,
  eyebrow,
  title,
  text,
  layout,
}: {
  sectionKey: string;
  eyebrow: string;
  title: string;
  text: string;
  layout?: "stack" | "editorial";
}) {
  const blocks = structureProposalProse(
    text,
    proseKindForTermsKey(
      sectionKey as
        | "clientResponsibilities"
        | "exclusions"
        | "nextSteps"
        | "proposalTerms"
        | "paymentAssumptions"
        | "timelineAssumptions"
        | "expirationLanguage"
        | "changeRequestLanguage",
    ),
  );

  if (layout === "editorial") {
    const bulletBlocks = blocks.filter((block) => block.type !== "paragraph");
    const paragraphs = blocks.filter((block) => block.type === "paragraph");
    if (bulletBlocks.length >= 1) {
      const items = bulletBlocks.flatMap((block) =>
        block.type === "paragraph" ? [] : block.items,
      );
      const midpoint = Math.ceil(items.length / 2);
      const left = items.slice(0, midpoint);
      const right = items.slice(midpoint);
      return (
        <View style={styles.section} wrap minPresenceAhead={96}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.h2}>{title}</Text>
          {paragraphs.map((block, index) =>
            block.type === "paragraph" ? (
              <Paragraph key={`tp-${index}`} text={block.text} supporting />
            ) : null,
          )}
          <View style={styles.editorialRow}>
            <View style={styles.editorialCol}>
              {left.map((item) => (
                <ProseBullet key={`l-${item.slice(0, 24)}`} text={item} />
              ))}
            </View>
            <View style={styles.editorialCol}>
              {right.map((item) => (
                <ProseBullet key={`r-${item.slice(0, 24)}`} text={item} />
              ))}
            </View>
          </View>
        </View>
      );
    }
  }

  return (
    <View style={styles.section} wrap minPresenceAhead={88}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.h2}>{title}</Text>
      <StructuredProse blocks={blocks} />
    </View>
  );
}

function ClosingSection({ proposal }: { proposal: CanonicalProposal }) {
  const closing = composeClosingPresentation(proposal);
  const blocks = structureProposalProse(closing.nextSteps, "steps");
  return (
    <View style={styles.closingShell}>
      <View style={styles.closingTop}>
        <Text style={styles.eyebrow}>{closing.eyebrow}</Text>
        <Text style={styles.h2}>{closing.title}</Text>
        <Text style={styles.closingAcceptCue}>Accept this proposal</Text>
        <StructuredProse blocks={blocks} />
        {closing.closingNote ? <Paragraph text={closing.closingNote} /> : null}
        {closing.acceptance ? (
          <View style={styles.disclosure}>
            <Text style={styles.pSupporting}>{closing.acceptance}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.closingStudio}>{KXD_REPORT_BRAND}</Text>
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
  const cover = composeCoverPresentation(proposal);
  const opening = composeOpeningSections(proposal);
  const workstreams = proposal.scopeGroups.map((group, index) =>
    composeScopeWorkstream(group, index, proposal.scopeGroups.length),
  );
  const terms = composeTermsSectionPlan(proposal);
  const sponsorshipNotes = proposal.credits
    .map((credit) => credit.notes?.trim())
    .filter(Boolean) as string[];

  return (
    <Document
      title={proposal.title}
      author={KXD_REPORT_BRAND}
      subject={`Proposal ${proposal.proposalNumber}`}
    >
      <Page size="LETTER" style={styles.coverPage}>
        <View style={styles.coverTop}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          {logoSrc ? <Image src={logoSrc} style={styles.coverLogo} /> : null}
          <Text style={styles.coverDocType}>{cover.docType}</Text>
          <View style={styles.coverRule} />
          {cover.organizationLines.map((line, index) => (
            <React.Fragment key={`${index}-${line}`}>
              {index > 0 && cover.organizationJoiner ? (
                <Text style={styles.coverJoiner}>{cover.organizationJoiner}</Text>
              ) : null}
              <Text style={styles.coverOrg}>{line}</Text>
            </React.Fragment>
          ))}
          <Text style={styles.coverEngagement}>{cover.engagementTitle}</Text>
        </View>
        <View style={styles.coverBottom}>
          {cover.preparedForName ? (
            <>
              <Text style={styles.coverPreparedLabel}>Prepared for</Text>
              <Text style={styles.coverPreparedName}>{cover.preparedForName}</Text>
            </>
          ) : null}
          {cover.preparedForDetail ? (
            <Text style={styles.coverPreparedDetail}>{cover.preparedForDetail}</Text>
          ) : null}
          {cover.metaLines.map((line) => (
            <Text key={line} style={styles.coverMeta}>
              {line}
            </Text>
          ))}
          <Text style={styles.coverStudio}>{cover.studioLine}</Text>
        </View>
      </Page>

      <Page size="LETTER" style={styles.page} wrap>
        <PageFooter proposal={proposal} />
        {opening.map((section) => (
          <OpeningSectionView
            key={section.id}
            eyebrow={section.eyebrow}
            title={section.title}
            paragraphs={section.paragraphs}
            emphasis={section.emphasis}
          />
        ))}
        {workstreams.map((workstream) => (
          <ScopeSection key={`${workstream.indexLabel}-${workstream.title}`} workstream={workstream} />
        ))}
      </Page>

      <Page size="LETTER" style={styles.page} wrap>
        <PageFooter proposal={proposal} />
        <InvestmentSection proposal={proposal} />
        {sponsorshipNotes.map((note) => (
          <View key={note.slice(0, 24)} style={styles.section} minPresenceAhead={72}>
            <Text style={styles.eyebrow}>Sponsorship</Text>
            <Text style={styles.h2}>Sponsorship condition</Text>
            <Paragraph text={note} />
          </View>
        ))}
        {terms.map((section) => (
          <TermsSectionView
            key={section.key}
            sectionKey={section.key}
            eyebrow={section.eyebrow}
            title={section.title}
            text={section.text}
            layout={section.layout}
          />
        ))}
      </Page>

      <Page size="LETTER" style={styles.closingPage}>
        <PageFooter proposal={proposal} />
        <ClosingSection proposal={proposal} />
      </Page>
    </Document>
  );
}

export async function renderProposalPdf(
  proposal: CanonicalProposal,
): Promise<{ buffer: Buffer; filename: string }> {
  ensureProposalPdfFonts();
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
