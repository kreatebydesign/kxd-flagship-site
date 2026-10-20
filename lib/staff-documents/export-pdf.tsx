/**
 * Staff policy + acknowledgment record PDFs — KXD agreement presentation.
 */

import React from "react";
import { Document, Page, Text, View, pdf } from "@react-pdf/renderer";
import {
  AgreementPdfBodyFromText,
  AgreementPdfBrandHeader,
  agreementPdfStyles,
} from "@/lib/agreement-presentation/pdf-document.tsx";
import { ensureProposalPdfFonts } from "@/lib/proposal-builder/pdf-fonts.ts";
import type { StaffAcknowledgmentEvidence } from "./types.ts";

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
