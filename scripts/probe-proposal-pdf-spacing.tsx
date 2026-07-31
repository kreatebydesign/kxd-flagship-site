/**
 * Visual probe for proposal PDF font/spacing behavior.
 *   npx tsx scripts/probe-proposal-pdf-spacing.tsx
 */
import React from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import {
  ensureProposalPdfFonts,
  PROPOSAL_PDF_SANS,
  PROPOSAL_PDF_SERIF,
} from "../lib/proposal-builder/pdf-fonts.ts";

ensureProposalPdfFonts();

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: PROPOSAL_PDF_SANS,
    fontSize: 11,
    letterSpacing: 0,
  },
  serif: {
    fontFamily: PROPOSAL_PDF_SERIF,
    fontWeight: 700,
    fontSize: 16,
    letterSpacing: 0,
    marginBottom: 12,
  },
  body: {
    fontFamily: PROPOSAL_PDF_SANS,
    letterSpacing: 0,
    marginBottom: 10,
    lineHeight: 1.5,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingVertical: 6,
  },
  cellFlex: { flexGrow: 1, flexShrink: 1, flexBasis: 0, paddingRight: 8 },
  cellFixed: { width: 140, flexShrink: 0 },
  cellAmt: { width: 96, flexShrink: 0, textAlign: "right" },
});

async function main() {
  const samples = [
    "Martin Condon referral consideration",
    "Project deposit — due upon proposal acceptance",
    "Standard ongoing management value",
    "Promotional adjustment",
    "logo placement and digital or event visibility",
    "Monthly investment",
  ];

  const doc = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.serif}>Spacing probe — serif heading</Text>
        {samples.map((s) => (
          <Text key={`b-${s}`} style={styles.body}>
            {s}
          </Text>
        ))}
        <Text style={{ ...styles.body, marginTop: 16 }}>Flex row table:</Text>
        {samples.map((s) => (
          <View key={`r-${s}`} style={styles.row} wrap={false}>
            <Text style={styles.cellFlex}>{s}</Text>
            <Text style={styles.cellFixed}>Partnership adjustment</Text>
            <Text style={styles.cellAmt}>-$3,250.00</Text>
          </View>
        ))}
      </Page>
    </Document>
  );

  const outDir = join(process.cwd(), "tmp/proposal-1-qa");
  mkdirSync(outDir, { recursive: true });
  const buf = Buffer.from(await (await pdf(doc).toBlob()).arrayBuffer());
  const out = join(outDir, "font-spacing-probe.pdf");
  writeFileSync(out, buf);
  console.log(
    JSON.stringify(
      {
        out,
        bytes: buf.length,
        sourceSans: buf.includes(Buffer.from("SourceSans")),
        sourceSerif: buf.includes(Buffer.from("SourceSerif")),
        helvetica: buf.includes(Buffer.from("Helvetica")),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
