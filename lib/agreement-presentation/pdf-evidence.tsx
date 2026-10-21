/**
 * PDF presentation for signature hashes and audit evidence (values unchanged).
 */

import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { agreementPdfStyles } from "./pdf-document.tsx";

export function AgreementPdfEvidenceRow(props: { label: string; value: string }) {
  return (
    <View style={agreementPdfStyles.evidenceRow}>
      <Text style={agreementPdfStyles.evidenceLabel}>{props.label}</Text>
      <Text style={agreementPdfStyles.evidenceValue}>{props.value}</Text>
    </View>
  );
}

export function AgreementPdfEvidencePanel(props: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={agreementPdfStyles.evidencePanel}>
      <View style={agreementPdfStyles.panelTopRule} />
      <Text style={agreementPdfStyles.evidencePanelTitle}>{props.title}</Text>
      {props.children}
    </View>
  );
}
