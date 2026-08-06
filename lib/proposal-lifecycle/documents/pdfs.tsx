/**
 * Executed commercial PDF generators — deterministic from sealed snapshots.
 */

import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
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
});

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
}): Promise<{ buffer: Buffer; contentHash: string }> {
  const t = input.terms;
  const doc = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.eyebrow}>Direct Agreement · pending acceptance</Text>
        <View style={styles.rule} />
        <Text style={styles.h1}>{input.title}</Text>
        <Text style={styles.meta}>Agreement ID DA-{input.contractId}</Text>
        <Text style={styles.meta}>Terms version {input.termsVersion}</Text>
        <Text style={styles.meta}>{input.statusLabel}</Text>
        <Text style={styles.meta}>
          Commercial source: direct-agreement · No proposal record
        </Text>
        <Text style={styles.h2}>Agreement</Text>
        <Text style={styles.p}>{input.body || "Agreement body on file."}</Text>
        <Text style={styles.h2}>Payment summary</Text>
        <Text style={styles.p}>
          One-time {formatCents(t.oneTimeTotalCents, t.currency)} · Monthly{" "}
          {formatCents(t.monthlyTotalCents, t.currency)} ({t.recurring.cadence})
        </Text>
        <Text style={styles.p}>{t.initialPayment.dueTerms}</Text>
        <View style={styles.notice}>
          <Text>
            This PDF is an immutable finalized snapshot generated for sending. It is not executed
            until electronic signature or externally recorded acceptance is completed. Structured
            contract fields remain the source of truth.
          </Text>
        </View>
        <Footer label="Direct Agreement — sent snapshot" />
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
