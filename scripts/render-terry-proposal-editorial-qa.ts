import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { normalizeProposalDocument } from "../lib/proposal-builder/document.ts";
import { buildCanonicalProposal } from "../lib/proposal-builder/canonicalize.ts";
import { renderProposalPdf } from "../lib/proposal-builder/export-pdf.tsx";
import { renderProposalPreviewHtml } from "../lib/proposal-builder/export-html.ts";
import { renderProposalPlainText } from "../lib/proposal-builder/export-plaintext.ts";

async function main() {
  const out = "tmp/proposal-editorial-polish";
  mkdirSync(out, { recursive: true });
  const raw = JSON.parse(
    readFileSync("tmp/terry-proposal-production/source-builder-document.json", "utf8"),
  );
  const doc = normalizeProposalDocument(raw);

  const canonical = buildCanonicalProposal({
    id: 7,
    proposalNumber: "KXD-P-2026-0007",
    title: "Made for Trades + Sutherlin Throwdown Two-Website Rebuild Engagement",
    status: "approved-for-sharing",
    acceptanceMode: "accept-and-proceed-to-contract",
    proposalDate: "2026-09-12T12:00:00.000Z",
    expiresAt: "2026-09-26T12:00:00.000Z",
    revisionNumber: 1,
    builderDocument: doc,
  });

  const plain = renderProposalPlainText(canonical);
  writeFileSync(join(out, "terry-plaintext.txt"), plain);
  writeFileSync(join(out, "terry-preview.html"), renderProposalPreviewHtml(canonical));
  const { buffer, filename } = await renderProposalPdf(canonical);
  writeFileSync(join(out, filename), buffer);
  writeFileSync(join(out, "terry-pdf-name.txt"), filename);

  const stale = ["$4,500", "$500/month", "$1,250", "$625", "$11,000", "sponsorship credit", "deposit"];
  const required = [
    "Made for Trades",
    "Sutherlin Throwdown",
    "2,500",
    "299",
    "598",
    "September 26, 2026",
    "Paid in full upfront",
    "None required",
    "upfront project payment",
  ];
  console.log(
    JSON.stringify(
      {
        filename,
        bytes: buffer.length,
        required: Object.fromEntries(
          required.map((item) => [item, plain.toLowerCase().includes(item.toLowerCase())]),
        ),
        stale: Object.fromEntries(
          stale.map((item) => [item, plain.toLowerCase().includes(item.toLowerCase())]),
        ),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
