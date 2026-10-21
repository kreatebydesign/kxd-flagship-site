/**
 * Staff policy + acknowledgment record PDFs — KXD agreement presentation.
 */

import React from "react";
import { Document, Text, View, pdf } from "@react-pdf/renderer";
import {
  AgreementPdfEvidencePanel,
  AgreementPdfEvidenceRow,
} from "@/lib/agreement-presentation/pdf-evidence.tsx";
import {
  AgreementPdfBodyFromText,
  AgreementPdfBrandHeader,
  AgreementPdfLetterPage,
  AgreementPdfSignatureBlock,
  agreementPdfStyles,
} from "@/lib/agreement-presentation/pdf-document.tsx";
import { ensureProposalPdfFonts } from "@/lib/proposal-builder/pdf-fonts.ts";
import { KXD_REPORT_BRAND } from "@/lib/kxd-report-engine/contact.ts";
import type {
  StaffAcknowledgmentEvidence,
  StaffDocumentAuditEvent,
  StaffSignatureEvidence,
} from "./types.ts";
import type { TypedSignatureEvidence } from "@/lib/proposal-lifecycle/types.ts";

ensureProposalPdfFonts();

export async function renderStaffPolicyPdf(input: {
  title: string;
  body: string;
  legalEntityName: string;
  templateVersion: number;
  contentHash: string;
}): Promise<Buffer> {
  const continued = `${input.title} · Staff policy`;
  const doc = (
    <Document title={input.title} author={KXD_REPORT_BRAND}>
      <AgreementPdfLetterPage
        footerLabel="Internal staff policy · Private"
        continuedLabel={`${continued} · Continued`}
        showContactInFooter
      >
        <AgreementPdfBrandHeader eyebrow="Staff policy" />
        <Text style={agreementPdfStyles.h1}>{input.title}</Text>
        <Text style={agreementPdfStyles.meta}>
          {input.legalEntityName} · Version {input.templateVersion}
        </Text>
        <Text style={agreementPdfStyles.meta}>Document hash: {input.contentHash}</Text>
        <AgreementPdfBodyFromText body={input.body} />
      </AgreementPdfLetterPage>
    </Document>
  );
  const instance = pdf(doc);
  const blob = await instance.toBlob();
  return Buffer.from(await blob.arrayBuffer());
}

export async function renderStaffAcknowledgmentRecordPdf(input: {
  title: string;
  legalEntityName: string;
  templateVersion: number;
  contentHash: string;
  acknowledgment: StaffAcknowledgmentEvidence;
}): Promise<Buffer> {
  const ack = input.acknowledgment;
  const doc = (
    <Document title={`${input.title} — Acknowledgment`} author={KXD_REPORT_BRAND}>
      <AgreementPdfLetterPage
        footerLabel="Policy acknowledgment record · Electronic"
        continuedLabel={`${input.title} · Acknowledgment record`}
        showContactInFooter
      >
        <AgreementPdfBrandHeader eyebrow="Acknowledgment record" />
        <Text style={agreementPdfStyles.h1}>Policy acknowledgment</Text>
        <Text style={agreementPdfStyles.meta}>Policy: {input.title}</Text>
        <Text style={agreementPdfStyles.meta}>
          {input.legalEntityName} · Version {input.templateVersion}
        </Text>
        <Text style={agreementPdfStyles.meta}>
          Policy document hash: {input.contentHash}
        </Text>
        <View style={agreementPdfStyles.signatureBlock} wrap={false}>
          <Text style={agreementPdfStyles.signatureTitle}>Acknowledged by</Text>
          <View style={agreementPdfStyles.signatureRule} />
          <Text style={agreementPdfStyles.signatureTypedName}>
            {ack.typedAcknowledgment || ack.legalName}
          </Text>
          <Text style={agreementPdfStyles.meta}>{ack.legalName}</Text>
          <Text style={agreementPdfStyles.meta}>{ack.email}</Text>
          <Text style={agreementPdfStyles.meta}>Recorded {ack.acknowledgedAt}</Text>
          <Text style={agreementPdfStyles.meta}>
            Acknowledgment hash: {ack.acknowledgmentHash}
          </Text>
        </View>
        <View style={agreementPdfStyles.notice}>
          <Text style={agreementPdfStyles.p}>{ack.consentText}</Text>
          <Text style={agreementPdfStyles.meta}>
            Consent version: {ack.consentDisclosureVersion}
          </Text>
        </View>
      </AgreementPdfLetterPage>
    </Document>
  );
  const instance = pdf(doc);
  const blob = await instance.toBlob();
  return Buffer.from(await blob.arrayBuffer());
}

function staffSignatureForPdf(sig: StaffSignatureEvidence): TypedSignatureEvidence {
  return {
    legalName: sig.legalName,
    title: sig.title,
    entityName: sig.entityName,
    email: sig.email,
    typedAcknowledgment: sig.typedAcknowledgment,
    authorityConfirmed: sig.authorityConfirmed,
    electronicRecordsConsent: sig.electronicRecordsConsent,
    consentDisclosureVersion: sig.consentDisclosureVersion,
    consentText: sig.consentText,
    signedAt: sig.signedAt,
    ipAddress: sig.ipAddress,
    userAgent: sig.userAgent,
    actorRole: sig.actorRole === "kxd-employer-representative" ? "kxd-operator" : "client",
    documentHash: sig.documentContentHash,
    signatureHash: sig.signatureHash,
  };
}

export async function renderStaffExecutedAgreementPdf(input: {
  title: string;
  body: string;
  legalEntityName: string;
  templateVersion: number;
  contentHash: string;
  kind: string;
  employeeSignature: StaffSignatureEvidence;
  operatorSignature: StaffSignatureEvidence;
  executedAt: string;
  auditEvents: StaffDocumentAuditEvent[];
}): Promise<Buffer> {
  const auditLines = input.auditEvents.slice(-12).map(
    (e) => `${e.at} · ${e.action}${e.actor ? ` · ${e.actor}` : ""}`,
  );

  const doc = (
    <Document title={`${input.title} — Executed`} author={KXD_REPORT_BRAND}>
      <AgreementPdfLetterPage
        footerLabel="Executed staff agreement · Immutable record"
        continuedLabel={`${input.title} · Continued`}
        showContactInFooter
      >
        <AgreementPdfBrandHeader eyebrow="Fully executed staff agreement" />
        <Text style={agreementPdfStyles.h1}>{input.title}</Text>
        <Text style={agreementPdfStyles.meta}>
          {input.legalEntityName} · {input.kind} · Version {input.templateVersion}
        </Text>
        <Text style={agreementPdfStyles.meta}>
          Document content hash: {input.contentHash}
        </Text>
        <Text style={agreementPdfStyles.meta}>Executed {input.executedAt}</Text>
        <AgreementPdfBodyFromText body={input.body} />
        <View break>
          <AgreementPdfSignatureBlock
            title="Employee signature"
            signature={staffSignatureForPdf(input.employeeSignature)}
          />
          <AgreementPdfSignatureBlock
            title="Kreate by Design — authorized representative"
            signature={staffSignatureForPdf(input.operatorSignature)}
          />
          <AgreementPdfEvidencePanel title="Signature integrity record">
            <AgreementPdfEvidenceRow
              label="Employee signature hash"
              value={input.employeeSignature.signatureHash}
            />
            <AgreementPdfEvidenceRow
              label="Operator signature hash"
              value={input.operatorSignature.signatureHash}
            />
            <AgreementPdfEvidenceRow
              label="Operator binding prior hash"
              value={input.operatorSignature.priorSignatureHash ?? "—"}
            />
            <Text style={agreementPdfStyles.meta}>
              Consent version {input.employeeSignature.consentDisclosureVersion}. Typed
              electronic signatures are acknowledgments, not biometric identity verification.
            </Text>
          </AgreementPdfEvidencePanel>
          {auditLines.length > 0 ? (
            <AgreementPdfEvidencePanel title="Execution audit trail">
              {auditLines.map((line, i) => (
                <Text key={`audit-${i}`} style={agreementPdfStyles.evidenceValue}>
                  {line}
                </Text>
              ))}
            </AgreementPdfEvidencePanel>
          ) : null}
        </View>
      </AgreementPdfLetterPage>
    </Document>
  );
  const instance = pdf(doc);
  const blob = await instance.toBlob();
  return Buffer.from(await blob.arrayBuffer());
}
