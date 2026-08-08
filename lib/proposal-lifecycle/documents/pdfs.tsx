/**
 * Executed commercial PDF generators — deterministic from sealed snapshots.
 */

import React from "react";
import { Document, Image, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { STANDARD_CANCELLATION_TERMINATION_AND_REFUNDS_TITLE } from "../../commercial-legal/standard-cancellation-refunds.ts";
import { KXD_REPORT_BRAND, kxdReportContactLine } from "../../kxd-report-engine/contact.ts";
import { resolveKxdReportLogoAsset } from "../../kxd-report-engine/logos.ts";
import { formatProposalCalendarDate } from "../../proposal-builder/calendar-date.ts";
import {
  ensureProposalPdfFonts,
  PROPOSAL_PDF_SANS,
  PROPOSAL_PDF_SERIF,
} from "../../proposal-builder/pdf-fonts.ts";
import { formatCents } from "../../proposal-builder/money.ts";
import type { CanonicalProposal } from "../../proposal-builder/types.ts";
import { sha256Hex, stableJsonHash } from "../hash.ts";
import type {
  ExecutionCertificate,
  StructuredPaymentTerms,
  TypedSignatureEvidence,
} from "../types.ts";

ensureProposalPdfFonts();

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    fontFamily: PROPOSAL_PDF_SANS,
    fontSize: 10,
    color: "#1a1a1a",
  },
  sentPage: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    fontFamily: PROPOSAL_PDF_SANS,
    fontSize: 10,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#8a7a5c",
    marginBottom: 8,
  },
  h1: {
    fontFamily: PROPOSAL_PDF_SERIF,
    fontSize: 20,
    marginBottom: 12,
  },
  h2: {
    fontFamily: PROPOSAL_PDF_SERIF,
    fontSize: 13,
    marginTop: 16,
    marginBottom: 6,
  },
  p: { marginBottom: 6, lineHeight: 1.45 },
  meta: { fontSize: 9, color: "#555", marginBottom: 4 },
  rule: { height: 1, backgroundColor: "#c5a65c", width: 40, marginBottom: 12 },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    fontSize: 8,
    color: "#777",
  },
  notice: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#f5f0e6",
    fontSize: 9,
    lineHeight: 1.4,
  },
  logo: {
    width: 52,
    height: 49,
    marginBottom: 18,
  },
  parties: {
    flexDirection: "row",
    gap: 28,
    marginTop: 4,
    marginBottom: 14,
  },
  partyCol: {
    flex: 1,
  },
  partyLabel: {
    fontSize: 8,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#8a7a5c",
    marginBottom: 6,
  },
  partyName: {
    fontFamily: PROPOSAL_PDF_SERIF,
    fontSize: 12,
    marginBottom: 3,
  },
  summaryBox: {
    marginTop: 4,
    marginBottom: 8,
    paddingTop: 10,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: "#e6e0d4",
  },
});

const DIRECT_AGREEMENT_BODY_SECTION_TITLES = [
  STANDARD_CANCELLATION_TERMINATION_AND_REFUNDS_TITLE,
  "Intellectual property",
  "Portfolio use",
  "Client responsibilities",
  "Overage / pre-approval",
  "Payment terms",
  "Renewal",
  "Scope",
  "Included services",
  "Exclusions",
] as const;

function isDirectAgreementBodySectionTitle(line: string): boolean {
  const normalized = line.trim().toLowerCase();
  if (!normalized) return false;
  return DIRECT_AGREEMENT_BODY_SECTION_TITLES.some(
    (title) => title.toLowerCase() === normalized,
  );
}

/** Split composed Direct Agreement body into titled sections and readable paragraphs. */
export function parseDirectAgreementBodySections(
  body: string,
): Array<{ title: string; paragraphs: string[] }> {
  const lines = String(body ?? "").replace(/\r\n/g, "\n").split("\n");
  const sections: Array<{ title: string; paragraphs: string[] }> = [];
  let title = "Scope";
  let paragraphs: string[] = [];
  let buffer: string[] = [];

  const flushParagraph = () => {
    const text = buffer.join(" ").replace(/\s+/g, " ").trim();
    if (text) paragraphs.push(text);
    buffer = [];
  };

  const flushSection = () => {
    flushParagraph();
    if (paragraphs.length > 0) {
      sections.push({ title, paragraphs });
    }
    paragraphs = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (isDirectAgreementBodySectionTitle(trimmed)) {
      flushSection();
      title = trimmed;
      continue;
    }
    if (!trimmed) {
      flushParagraph();
      continue;
    }
    buffer.push(trimmed);
  }
  flushSection();
  return sections;
}

function Footer({ label }: { label: string }) {
  return (
    <Text style={styles.footer} fixed>
      {label} · Typed electronic signatures are acknowledgments, not biometric identity verification.
    </Text>
  );
}

export async function renderExecutedContractPdf(input: {
  title: string;
  body: string;
  proposalNumber: string;
  contractId: number;
  documentHash: string;
  operator: TypedSignatureEvidence;
  client: TypedSignatureEvidence;
  sealedAt: string;
  omitProposalLabel?: boolean;
}): Promise<{ buffer: Buffer; contentHash: string }> {
  const doc = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.eyebrow}>Fully executed agreement</Text>
        <View style={styles.rule} />
        <Text style={styles.h1}>{input.title}</Text>
        {input.omitProposalLabel ? (
          <Text style={styles.meta}>Direct Agreement (no proposal)</Text>
        ) : (
          <Text style={styles.meta}>Proposal {input.proposalNumber}</Text>
        )}
        <Text style={styles.meta}>Agreement ID AGR-{input.contractId}-1</Text>
        <Text style={styles.meta}>Document hash {input.documentHash.slice(0, 16)}…</Text>
        <Text style={styles.meta}>Sealed {input.sealedAt}</Text>
        <Text style={styles.h2}>Agreement</Text>
        <Text style={styles.p}>{input.body || "Agreement body on file."}</Text>
        <Text style={styles.h2}>Kreate by Design signature</Text>
        <Text style={styles.p}>
          {input.operator.legalName}, {input.operator.title} · {input.operator.entityName}
        </Text>
        <Text style={styles.meta}>
          Typed acknowledgment: {input.operator.typedAcknowledgment} · {input.operator.signedAt}
        </Text>
        <Text style={styles.h2}>Client signature</Text>
        <Text style={styles.p}>
          {input.client.legalName}, {input.client.title} · {input.client.entityName}
        </Text>
        <Text style={styles.meta}>
          Typed acknowledgment: {input.client.typedAcknowledgment} · {input.client.signedAt}
        </Text>
        <View style={styles.notice}>
          <Text>
            This document records typed electronic signatures with consent version{" "}
            {input.operator.consentDisclosureVersion}. It does not claim biometric or government-ID
            verification.
          </Text>
        </View>
        <Footer label="Executed agreement" />
      </Page>
    </Document>
  );
  const instance = pdf(doc);
  const blob = await instance.toBlob();
  const buffer = Buffer.from(await blob.arrayBuffer());
  return { buffer, contentHash: sha256Hex(buffer.toString("base64")) };
}

export async function renderDirectAgreementSentPdf(input: {
  title: string;
  body: string;
  contractId: number;
  terms: StructuredPaymentTerms;
  termsVersion: number;
  statusLabel: string;
  clientName?: string | null;
  serviceStartDate?: string | null;
  serviceEndDate?: string | null;
}): Promise<{ buffer: Buffer; contentHash: string }> {
  const t = input.terms;
  const logo = resolveKxdReportLogoAsset();
  const clientName =
    String(input.clientName ?? "").trim() ||
    String(t.payerLegalName ?? "").trim() ||
    String(t.brandName ?? "").trim() ||
    "Client";
  const payerLegalName = String(t.payerLegalName ?? "").trim();
  const brandName = String(t.brandName ?? "").trim();
  const startLabel = input.serviceStartDate
    ? formatProposalCalendarDate(input.serviceStartDate)
    : "";
  const endLabel = input.serviceEndDate
    ? formatProposalCalendarDate(input.serviceEndDate)
    : "";
  const periodLabel =
    startLabel && startLabel !== "—" && endLabel && endLabel !== "—"
      ? `${startLabel} — ${endLabel}`
      : startLabel && startLabel !== "—"
        ? startLabel
        : null;
  const showMonthly = t.monthlyTotalCents > 0 && t.recurring.cadence !== "none";
  const sections = parseDirectAgreementBodySections(input.body);
  const bodySections =
    sections.length > 0
      ? sections
      : [{ title: "Scope", paragraphs: ["Agreement body on file."] }];
  void input.statusLabel;
  void input.termsVersion;

  const doc = (
    <Document
      title={input.title}
      author={KXD_REPORT_BRAND}
      subject={`Service agreement · ${clientName}`}
    >
      <Page size="LETTER" style={styles.sentPage}>
        {logo.exists ? (
          // react-pdf Image has no alt prop; decorative brand mark
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={logo.absolutePath} style={styles.logo} />
        ) : null}
        <Text style={styles.eyebrow}>Service agreement</Text>
        <View style={styles.rule} />
        <Text style={styles.h1}>{input.title}</Text>
        <Text style={styles.meta}>Agreement reference DA-{input.contractId}</Text>

        <View style={styles.parties}>
          <View style={styles.partyCol}>
            <Text style={styles.partyLabel}>Prepared by</Text>
            <Text style={styles.partyName}>{KXD_REPORT_BRAND}</Text>
            <Text style={styles.meta}>{kxdReportContactLine()}</Text>
          </View>
          <View style={styles.partyCol}>
            <Text style={styles.partyLabel}>Prepared for</Text>
            <Text style={styles.partyName}>{clientName}</Text>
            {payerLegalName && payerLegalName !== clientName ? (
              <Text style={styles.meta}>{payerLegalName}</Text>
            ) : null}
            {brandName && brandName !== clientName && brandName !== payerLegalName ? (
              <Text style={styles.meta}>{brandName}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.summaryBox}>
          {periodLabel ? (
            <>
              <Text style={styles.h2}>Service period</Text>
              <Text style={styles.p}>{periodLabel}</Text>
            </>
          ) : null}
          <Text style={styles.h2}>Investment</Text>
          <Text style={styles.p}>
            {formatCents(t.oneTimeTotalCents, t.currency)}
            {t.oneTimeTotalCents > 0 && !showMonthly ? " prepaid" : ""}
          </Text>
          {showMonthly ? (
            <Text style={styles.p}>
              {formatCents(t.monthlyTotalCents, t.currency)} per month
            </Text>
          ) : null}
          {t.initialPayment.dueTerms ? (
            <Text style={styles.p}>{t.initialPayment.dueTerms}</Text>
          ) : null}
        </View>

        {bodySections.map((section) => (
          <View key={section.title}>
            <View wrap={false}>
              <Text style={styles.h2}>{section.title}</Text>
              {section.paragraphs[0] ? (
                <Text style={styles.p}>{section.paragraphs[0]}</Text>
              ) : null}
            </View>
            {section.paragraphs.slice(1).map((paragraph, index) => (
              <Text key={`${section.title}-${index + 1}`} style={styles.p}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}

        <View style={styles.notice}>
          <Text>
            This agreement is provided for review. It is not executed until the client’s acceptance
            is confirmed.
          </Text>
        </View>
        <Text style={styles.footer} fixed>
          {kxdReportContactLine()}
        </Text>
      </Page>
    </Document>
  );
  const instance = pdf(doc);
  const blob = await instance.toBlob();
  const buffer = Buffer.from(await blob.arrayBuffer());
  return { buffer, contentHash: sha256Hex(buffer.toString("base64")) };
}

export async function renderExternalAcceptanceExecutedPdf(input: {
  title: string;
  body: string;
  contractId: number;
  documentHash: string;
  terms: StructuredPaymentTerms;
  externalAcceptance: import("../../direct-agreement/types.ts").ExternalAcceptanceRecord;
  operator: TypedSignatureEvidence;
  sealedAt: string;
}): Promise<{ buffer: Buffer; contentHash: string }> {
  const ea = input.externalAcceptance;
  const doc = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.eyebrow}>Executed via externally recorded acceptance</Text>
        <View style={styles.rule} />
        <Text style={styles.h1}>{input.title}</Text>
        <Text style={styles.meta}>Agreement ID AGR-{input.contractId}-1</Text>
        <Text style={styles.meta}>Document hash {input.documentHash.slice(0, 16)}…</Text>
        <Text style={styles.meta}>Sealed {input.sealedAt}</Text>
        <Text style={styles.meta}>Direct Agreement — no proposal</Text>
        <Text style={styles.h2}>Agreement</Text>
        <Text style={styles.p}>{input.body || "Agreement body on file."}</Text>
        <Text style={styles.h2}>Kreate by Design operator acknowledgment</Text>
        <Text style={styles.p}>
          {input.operator.legalName}, {input.operator.title} · {input.operator.entityName}
        </Text>
        <Text style={styles.meta}>Recorded {input.operator.signedAt}</Text>
        <Text style={styles.h2}>Externally recorded acceptance</Text>
        <Text style={styles.p}>
          This acceptance was recorded from external evidence and was not completed through KXD
          electronic signing.
        </Text>
        <Text style={styles.p}>Accepted by: {ea.acceptedBy}</Text>
        <Text style={styles.p}>Acceptance date: {ea.acceptedAt}</Text>
        <Text style={styles.p}>Method: {ea.method}</Text>
        <Text style={styles.p}>Evidence notes: {ea.evidenceNotes}</Text>
        <Text style={styles.meta}>
          Recorded by {ea.recordedBy} at {ea.recordedAt}
        </Text>
        {ea.evidenceReference ? (
          <Text style={styles.meta}>Evidence reference: {ea.evidenceReference}</Text>
        ) : null}
        <Text style={styles.h2}>Payment summary</Text>
        <Text style={styles.p}>
          One-time {formatCents(input.terms.oneTimeTotalCents, input.terms.currency)} · Monthly{" "}
          {formatCents(input.terms.monthlyTotalCents, input.terms.currency)}
        </Text>
        <View style={styles.notice}>
          <Text>
            Externally recorded acceptance is not an electronic signature. No signature image, IP
            address, or signer authentication was fabricated for this record.
          </Text>
        </View>
        <Footer label="Executed — external acceptance" />
      </Page>
    </Document>
  );
  const instance = pdf(doc);
  const blob = await instance.toBlob();
  const buffer = Buffer.from(await blob.arrayBuffer());
  return { buffer, contentHash: sha256Hex(buffer.toString("base64")) };
}

export async function renderCertificatePdf(
  cert: ExecutionCertificate,
): Promise<{ buffer: Buffer; contentHash: string }> {
  const external = cert.acceptanceMode === "external-acceptance";
  const directRef =
    !cert.proposalId ||
    cert.proposalNumber.startsWith("DIRECT-") ||
    cert.proposalId <= 0;
  const sourceLabel = directRef
    ? `Reference ${cert.proposalNumber} · v${cert.proposalVersion}`
    : `Proposal ${cert.proposalNumber} · v${cert.proposalVersion}`;
  const doc = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.eyebrow}>
          {external ? "Completion certificate · external acceptance" : "Completion certificate"}
        </Text>
        <View style={styles.rule} />
        <Text style={styles.h1}>
          {external ? "Acceptance certificate" : "Execution certificate"}
        </Text>
        <Text style={styles.p}>Agreement {cert.agreementId}</Text>
        <Text style={styles.meta}>{sourceLabel}</Text>
        <Text style={styles.meta}>Contract {cert.contractId} · v{cert.contractVersion}</Text>
        <Text style={styles.meta}>Verification {cert.verificationId}</Text>
        <Text style={styles.meta}>Document hash {cert.documentHash}</Text>
        <Text style={styles.h2}>{external ? "Parties" : "Signers"}</Text>
        <Text style={styles.p}>
          Kreate by Design: {cert.kxdSignerName} · {cert.kxdSignedAt}
        </Text>
        <Text style={styles.p}>
          Client: {cert.clientSignerName} · {cert.clientSignedAt}
        </Text>
        <Text style={styles.p}>Consent version {cert.consentVersion}</Text>
        <Text style={styles.p}>Sealed {cert.sealedAt}</Text>
        <View style={styles.notice}>
          <Text>
            {external
              ? "Certificate of externally recorded acceptance. This record documents operator-verified external evidence and is not an electronic signature. No signature image, IP address, or signer authentication was fabricated for this certificate."
              : "Certificate of electronic execution. Typed names are electronic acknowledgments with recorded consent — not biometric identity proof. IP and user-agent evidence is retained internally and omitted from this client certificate."}
          </Text>
        </View>
        <Footer label={external ? "Acceptance certificate" : "Execution certificate"} />
      </Page>
    </Document>
  );
  const instance = pdf(doc);
  const blob = await instance.toBlob();
  const buffer = Buffer.from(await blob.arrayBuffer());
  return { buffer, contentHash: sha256Hex(buffer.toString("base64")) };
}

export async function renderBillingSummaryPdf(input: {
  proposalNumber: string;
  contractId: number;
  terms: StructuredPaymentTerms;
  contractHash: string;
  testMode?: boolean;
}): Promise<{ buffer: Buffer; contentHash: string }> {
  const t = input.terms;
  const testMode = input.testMode !== false;
  const doc = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {testMode ? (
          <Text style={{ ...styles.eyebrow, color: "#c9a227" }}>
            TEST MODE — NOT A REAL INVOICE
          </Text>
        ) : null}
        <Text style={styles.eyebrow}>Billing terms summary · Kreate by Design</Text>
        <View style={styles.rule} />
        <Text style={styles.h1}>Billing terms (from executed contract)</Text>
        <Text style={styles.meta}>
          {input.proposalNumber.startsWith("DIRECT-") || t.commercialSource === "direct-agreement"
            ? `Reference ${input.proposalNumber}`
            : `Proposal ${input.proposalNumber}`}
        </Text>
        <Text style={styles.meta}>Agreement reference AGR-{input.contractId}-1</Text>
        <Text style={styles.meta}>Source hash {input.contractHash.slice(0, 16)}…</Text>
        <Text style={styles.meta}>Support: matt@kreatebydesign.com</Text>
        <Text style={styles.meta}>Currency USD · Taxes not collected in this pilot</Text>
        <Text style={styles.h2}>One-time</Text>
        <Text style={styles.p}>
          Total {formatCents(t.oneTimeTotalCents, t.currency)} · Deposit{" "}
          {formatCents(t.depositCents, t.currency)}
        </Text>
        {t.installments.map((i) => (
          <Text key={i.id} style={styles.p}>
            {i.label}: {formatCents(i.amountCents, t.currency)} · {i.dueTerms}
          </Text>
        ))}
        <Text style={styles.h2}>Recurring</Text>
        <Text style={styles.p}>
          {formatCents(t.recurring.amountCents, t.currency)} / {t.recurring.cadence} · Trigger{" "}
          {t.recurring.startTrigger}
          {t.recurring.minimumTermMonths
            ? ` · Min term ${t.recurring.minimumTermMonths} months`
            : ""}
        </Text>
        <Text style={styles.h2}>Tax</Text>
        <Text style={styles.p}>
          Tax: $0.00 (not collected) · Treatment: {t.taxes.treatment}
          {t.taxes.notes ? ` — ${t.taxes.notes}` : ""}
        </Text>
        <Text style={styles.meta}>
          Statement descriptor associated with payments: KREATE BY DESIGN. This summary is derived
          from the sealed contract snapshot — not a live Stripe demand letter.
        </Text>
      </Page>
    </Document>
  );
  const instance = pdf(doc);
  const blob = await instance.toBlob();
  const buffer = Buffer.from(await blob.arrayBuffer());
  return { buffer, contentHash: sha256Hex(buffer.toString("base64")) };
}

export function buildPackageManifest(input: {
  contractId: number;
  proposalId: number;
  proposalNumber: string;
  documents: Array<{ kind: string; contentHash: string; id: number }>;
  certificate: ExecutionCertificate;
}): { json: string; contentHash: string } {
  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    contractId: input.contractId,
    proposalId: input.proposalId,
    proposalNumber: input.proposalNumber,
    agreementId: input.certificate.agreementId,
    verificationId: input.certificate.verificationId,
    documents: input.documents,
    signatureLanguage:
      "Typed electronic signatures with consent — not biometric identity verification.",
  };
  const json = JSON.stringify(manifest, null, 2);
  return { json, contentHash: stableJsonHash(manifest) };
}

export function acceptedProposalSourceHash(canonical: CanonicalProposal): string {
  return stableJsonHash(canonical);
}
