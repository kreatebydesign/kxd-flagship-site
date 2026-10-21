/**
 * Shared @react-pdf agreement body + signature presentation.
 */

import React from "react";
import { Image, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { parseAgreementBodyBlocks } from "./parse-body-blocks.ts";
import { KXD_AGREEMENT_COLORS } from "./tokens.ts";
import {
  ensureProposalPdfFonts,
  PROPOSAL_PDF_SANS,
  PROPOSAL_PDF_SERIF,
} from "../proposal-builder/pdf-fonts.ts";
import { kxdReportContactLine } from "../kxd-report-engine/contact.ts";
import { resolveKxdReportLogoAsset } from "../kxd-report-engine/logos.ts";
import type { TypedSignatureEvidence } from "../proposal-lifecycle/types.ts";

ensureProposalPdfFonts();

export const agreementPdfStyles = StyleSheet.create({
  page: {
    paddingTop: 52,
    paddingBottom: 72,
    paddingHorizontal: 52,
    fontFamily: PROPOSAL_PDF_SANS,
    fontSize: 10,
    color: KXD_AGREEMENT_COLORS.ink,
    backgroundColor: KXD_AGREEMENT_COLORS.surface,
  },
  logo: {
    width: 52,
    height: 49,
    marginBottom: 14,
    objectFit: "contain",
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: "#8a7a5c",
    marginBottom: 6,
  },
  rule: {
    height: 1,
    backgroundColor: KXD_AGREEMENT_COLORS.gold,
    width: 44,
    marginBottom: 12,
  },
  h1: {
    fontFamily: PROPOSAL_PDF_SERIF,
    fontSize: 19,
    marginBottom: 10,
    color: KXD_AGREEMENT_COLORS.headingInk,
  },
  meta: {
    fontSize: 9,
    color: KXD_AGREEMENT_COLORS.inkMuted,
    marginBottom: 3,
    lineHeight: 1.35,
  },
  section: {
    fontFamily: PROPOSAL_PDF_SANS,
    fontSize: 8.5,
    fontWeight: 600,
    letterSpacing: 0.85,
    textTransform: "uppercase",
    color: KXD_AGREEMENT_COLORS.headingInk,
    marginTop: 14,
    marginBottom: 5,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(44, 40, 36, 0.12)",
  },
  subheading: {
    fontFamily: PROPOSAL_PDF_SANS,
    fontSize: 9.5,
    fontWeight: 600,
    color: KXD_AGREEMENT_COLORS.inkMuted,
    marginTop: 8,
    marginBottom: 4,
  },
  p: {
    fontFamily: PROPOSAL_PDF_SERIF,
    fontSize: 10.5,
    lineHeight: 1.5,
    marginBottom: 5,
    color: KXD_AGREEMENT_COLORS.ink,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 4,
  },
  bulletMark: {
    fontFamily: PROPOSAL_PDF_SERIF,
    width: 10,
    fontSize: 10.5,
  },
  bulletText: {
    fontFamily: PROPOSAL_PDF_SERIF,
    flex: 1,
    fontSize: 10.5,
    lineHeight: 1.45,
  },
  signatureBlock: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(194, 170, 114, 0.45)",
  },
  signatureTitle: {
    fontFamily: PROPOSAL_PDF_SANS,
    fontSize: 8.5,
    letterSpacing: 0.75,
    textTransform: "uppercase",
    color: "#8a7a5c",
    marginBottom: 5,
  },
  notice: {
    marginTop: 14,
    padding: 10,
    backgroundColor: KXD_AGREEMENT_COLORS.surfaceRaised,
    fontSize: 9,
    lineHeight: 1.4,
    borderWidth: 1,
    borderColor: "rgba(194, 170, 114, 0.25)",
  },
  /** @deprecated Prefer AgreementPdfPageFooter */
  footer: {
    position: "absolute",
    bottom: 28,
    left: 52,
    right: 52,
    fontSize: 8,
    color: KXD_AGREEMENT_COLORS.inkFaint,
  },
  continuedBanner: {
    position: "absolute",
    top: 18,
    left: 52,
    right: 52,
    fontSize: 7,
    letterSpacing: 0.45,
    textTransform: "uppercase",
    color: KXD_AGREEMENT_COLORS.inkMuted,
  },
  footerBar: {
    position: "absolute",
    left: 52,
    right: 52,
    bottom: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: KXD_AGREEMENT_COLORS.goldRule,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: KXD_AGREEMENT_COLORS.inkMuted,
    maxWidth: "72%",
    lineHeight: 1.35,
  },
  footerMark: {
    fontSize: 7,
    letterSpacing: 0.35,
    textTransform: "uppercase",
    color: "#8a7a5c",
  },
  footerPage: {
    position: "absolute",
    left: 52,
    right: 52,
    bottom: 22,
    textAlign: "center",
    fontSize: 7,
    letterSpacing: 0.3,
    color: KXD_AGREEMENT_COLORS.inkFaint,
  },
  signatureTypedName: {
    fontFamily: PROPOSAL_PDF_SERIF,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 2,
    color: KXD_AGREEMENT_COLORS.headingInk,
  },
  signatureRule: {
    height: 1,
    backgroundColor: KXD_AGREEMENT_COLORS.gold,
    width: 120,
    marginTop: 6,
    marginBottom: 8,
  },
});

export function AgreementPdfBrandHeader(props: { eyebrow: string }) {
  const logo = resolveKxdReportLogoAsset();
  return (
    <>
      {logo.exists ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image src={logo.absolutePath} style={agreementPdfStyles.logo} />
      ) : null}
      <Text style={agreementPdfStyles.eyebrow}>{props.eyebrow}</Text>
      <View style={agreementPdfStyles.rule} />
    </>
  );
}

export function AgreementPdfContinuedBanner(props: { label: string }) {
  return (
    <Text
      style={agreementPdfStyles.continuedBanner}
      fixed
      render={({ pageNumber }) => (pageNumber > 1 ? props.label : " ")}
    />
  );
}

export function AgreementPdfPageFooter(props: { label: string; showContact?: boolean }) {
  return (
    <>
      <View style={agreementPdfStyles.footerBar} fixed>
        <View style={{ maxWidth: "72%" }}>
          <Text style={agreementPdfStyles.footerText}>{props.label}</Text>
          {props.showContact ? (
            <Text style={[agreementPdfStyles.footerText, { marginTop: 2 }]}>
              {kxdReportContactLine()}
            </Text>
          ) : null}
        </View>
        <Text style={agreementPdfStyles.footerMark}>Kreate by Design</Text>
      </View>
      <Text
        style={agreementPdfStyles.footerPage}
        fixed
        render={({ pageNumber, totalPages }) =>
          totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : " "
        }
      />
    </>
  );
}

/** Letter page with KXD Classic ivory presentation, flowing body, and branded footer. */
export function AgreementPdfLetterPage(props: {
  children: React.ReactNode;
  footerLabel: string;
  continuedLabel?: string;
  showContactInFooter?: boolean;
}) {
  return (
    <Page size="LETTER" style={agreementPdfStyles.page} wrap>
      {props.continuedLabel ? (
        <AgreementPdfContinuedBanner label={props.continuedLabel} />
      ) : null}
      {props.children}
      <AgreementPdfPageFooter
        label={props.footerLabel}
        showContact={props.showContactInFooter}
      />
    </Page>
  );
}

export function AgreementPdfBodyFromText({ body }: { body: string }) {
  const blocks = parseAgreementBodyBlocks(body);
  return (
    <>
      {blocks.map((block, index) => {
        const key = `b-${index}`;
        switch (block.type) {
          case "section":
            return (
              <Text key={key} style={agreementPdfStyles.section} minPresenceAhead={20}>
                {block.title}
              </Text>
            );
          case "subheading":
            return (
              <Text key={key} style={agreementPdfStyles.subheading}>
                {block.text}
              </Text>
            );
          case "paragraph":
            return (
              <Text key={key} style={agreementPdfStyles.p}>
                {block.text}
              </Text>
            );
          case "bullets":
            return (
              <View key={key} style={{ marginBottom: 6 }}>
                {block.items.map((item, i) => (
                  <View key={`${key}-${i}`} style={agreementPdfStyles.bulletRow}>
                    <Text style={agreementPdfStyles.bulletMark}>•</Text>
                    <Text style={agreementPdfStyles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            );
          case "gap":
            return <View key={key} style={{ height: 4 }} />;
          default:
            return null;
        }
      })}
    </>
  );
}

export function AgreementPdfSignatureBlock(props: {
  title: string;
  signature: TypedSignatureEvidence;
}) {
  const sig = props.signature;
  return (
    <View style={agreementPdfStyles.signatureBlock} wrap={false}>
      <Text style={agreementPdfStyles.signatureTitle}>{props.title}</Text>
      <View style={agreementPdfStyles.signatureRule} />
      <Text style={agreementPdfStyles.signatureTypedName}>{sig.typedAcknowledgment}</Text>
      <Text style={agreementPdfStyles.meta}>
        {sig.legalName}
        {sig.title ? ` · ${sig.title}` : ""}
        {sig.entityName ? ` · ${sig.entityName}` : ""}
      </Text>
      <Text style={agreementPdfStyles.meta}>Signed {sig.signedAt}</Text>
      {sig.email ? <Text style={agreementPdfStyles.meta}>{sig.email}</Text> : null}
      {sig.signatureHash ? (
        <Text style={agreementPdfStyles.meta}>Signature hash: {sig.signatureHash}</Text>
      ) : null}
    </View>
  );
}
