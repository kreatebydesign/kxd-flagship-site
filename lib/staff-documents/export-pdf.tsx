/**
 * Staff policy + acknowledgment record PDFs — KXD agreement presentation.
 */

import React from "react";
import { Document, Page, Text, View, pdf } from "@react-pdf/renderer";
import {
  AgreementPdfBodyFromText,
  AgreementPdfBrandHeader,
  AgreementPdfSignatureBlock,
  agreementPdfStyles,
} from "@/lib/agreement-presentation/pdf-document.tsx";
import { ensureProposalPdfFonts } from "@/lib/proposal-builder/pdf-fonts.ts";
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
  const doc = (
    <Document>
      <Page size="LETTER" style={agreementPdfStyles.page}>
        <AgreementPdfBrandHeader eyebrow="Staff policy" />
        <Text style={agreementPdfStyles.h1}>{input.title}</Text>
        <Text style={agreementPdfStyles.meta}>
          {input.legalEntityName} · Version {input.templateVersion}
        </Text>
        <Text style={agreementPdfStyles.meta}>Document hash: {input.contentHash.slice(0, 16)}…</Text>
        <AgreementPdfBodyFromText body={input.body} />
        <Text style={agreementPdfStyles.footer} fixed>
          Kreate by Design — internal staff policy document
        </Text>
      </Page>
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
    <Document>
      <Page size="LETTER" style={agreementPdfStyles.page}>
        <AgreementPdfBrandHeader eyebrow="Acknowledgment record" />
        <Text style={agreementPdfStyles.h1}>Policy acknowledgment</Text>
        <Text style={agreementPdfStyles.meta}>Policy: {input.title}</Text>
        <Text style={agreementPdfStyles.meta}>
          {input.legalEntityName} · Version {input.templateVersion}
        </Text>
        <Text style={agreementPdfStyles.meta}>
          Policy document hash: {input.contentHash}
        </Text>
        <View style={agreementPdfStyles.signatureBlock}>
          <Text style={agreementPdfStyles.signatureTitle}>Acknowledged by</Text>
          <Text style={agreementPdfStyles.p}>{ack.legalName}</Text>
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
        <Text style={agreementPdfStyles.footer} fixed>
          Kreate by Design — acknowledgment record (electronic)
        </Text>
      </Page>
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
    <Document>
      <Page size="LETTER" style={agreementPdfStyles.page}>
        <AgreementPdfBrandHeader eyebrow="Fully executed staff agreement" />
        <Text style={agreementPdfStyles.h1}>{input.title}</Text>
        <Text style={agreementPdfStyles.meta}>
          {input.legalEntityName} · {input.kind} · Version {input.templateVersion}
        </Text>
        <Text style={agreementPdfStyles.meta}>Document content hash: {input.contentHash}</Text>
        <Text style={agreementPdfStyles.meta}>Executed {input.executedAt}</Text>
        <AgreementPdfBodyFromText body={input.body} />
        <AgreementPdfSignatureBlock
          title="Employee signature"
          signature={staffSignatureForPdf(input.employeeSignature)}
        />
        <AgreementPdfSignatureBlock
          title="Kreate by Design — authorized representative"
          signature={staffSignatureForPdf(input.operatorSignature)}
        />
        <View style={agreementPdfStyles.notice}>
          <Text style={agreementPdfStyles.p}>
            Employee signature hash: {input.employeeSignature.signatureHash}
          </Text>
          <Text style={agreementPdfStyles.p}>
            Operator signature hash: {input.operatorSignature.signatureHash}
          </Text>
          <Text style={agreementPdfStyles.p}>
            Operator binding prior hash: {input.operatorSignature.priorSignatureHash ?? "—"}
          </Text>
          <Text style={agreementPdfStyles.meta}>
            Consent version {input.employeeSignature.consentDisclosureVersion}. Typed electronic
            signatures are acknowledgments, not biometric identity verification.
          </Text>
        </View>
        {auditLines.length > 0 ? (
          <View style={agreementPdfStyles.notice}>
            <Text style={agreementPdfStyles.signatureTitle}>Execution audit trail</Text>
            {auditLines.map((line, i) => (
              <Text key={`audit-${i}`} style={agreementPdfStyles.meta}>{line}</Text>
            ))}
          </View>
        ) : null}
        <Text style={agreementPdfStyles.footer} fixed>
          Kreate by Design — executed staff agreement (immutable record)
        </Text>
      </Page>
    </Document>
  );
  const instance = pdf(doc);
  const blob = await instance.toBlob();
  return Buffer.from(await blob.arrayBuffer());
}
