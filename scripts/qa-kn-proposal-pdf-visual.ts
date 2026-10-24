/**
 * Page count + basic PDF integrity for Matt K&N final PDFs (no poppler required).
 *   npx tsx scripts/qa-kn-proposal-pdf-visual.ts
 */
import { readFileSync, statSync, existsSync } from "fs";
import { resolve } from "path";

const DIR = resolve(process.cwd(), "deliverables/kn-proposals-for-matt-approval");
const PDFS = [
  "KXD-P-2026-0009-KN-Option-A-Enterprise-UX-UI-FINAL.pdf",
  "KXD-P-2026-0010-KN-Option-B-Interactive-Code-First-FINAL.pdf",
];

function countPdfPages(buffer: Buffer): number {
  const text = buffer.toString("latin1");
  const countMatches = [...text.matchAll(/\/Count\s+(\d+)/g)].map((m) => Number(m[1]));
  const fromPagesDict = countMatches.length ? Math.max(...countMatches) : 0;
  if (fromPagesDict > 0) return fromPagesDict;
  return (text.match(/\/Type\s*\/Page\b(?!s)/g) || []).length;
}

function assertPdfHeader(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString() === "%PDF-";
}

let failed = 0;
for (const name of PDFS) {
  const pdf = resolve(DIR, name);
  if (!existsSync(pdf)) {
    console.error(`✗ missing ${pdf}`);
    failed += 1;
    continue;
  }
  const buffer = readFileSync(pdf);
  const pages = countPdfPages(buffer);
  const okHeader = assertPdfHeader(buffer);
  const okPages = pages >= 8 && pages <= 14;
  const sizeKb = Math.round(statSync(pdf).size / 1024);
  console.log(
    `${okHeader && okPages ? "✓" : "✗"} ${name} — ${pages} pages, ${sizeKb} KB, header ok=${okHeader}`,
  );
  if (!okHeader || !okPages) failed += 1;

  const htmlName = name.replace(/\.pdf$/i, ".html");
  const htmlPath = resolve(DIR, htmlName);
  if (!existsSync(htmlPath)) {
    console.error(`✗ missing companion HTML ${htmlPath}`);
    failed += 1;
  } else {
    const html = readFileSync(htmlPath, "utf8");
    const hasLogo = html.includes("kxd-logo-transparent");
    const hasInternal = /internal notes|marginnotes|working prices/i.test(html);
    console.log(
      `  html: ${html.length} chars, logo ref=${hasLogo}, internal leak=${hasInternal}`,
    );
    if (!hasLogo || hasInternal) failed += 1;
  }
}

process.exit(failed > 0 ? 1 : 0);
