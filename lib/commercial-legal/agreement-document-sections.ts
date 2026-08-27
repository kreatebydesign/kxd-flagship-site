import { STANDARD_CANCELLATION_TERMINATION_AND_REFUNDS_TITLE } from "./standard-cancellation-refunds";

const EXPLICIT_SECTION_TITLES = new Set(
  [
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
  ].map((title) => title.toLowerCase()),
);

/** Nested labels inside major agreement sections — not PDF/signing section breaks. */
const AGREEMENT_BODY_SUBHEADINGS = new Set(
  [
    "standard kxd rate",
    "your friends & family rate",
    "ongoing client savings",
    "annual value summary",
    "website management",
    "seo + search",
    "analytics + tracking",
    "facebook + instagram management",
    "kxd media vault",
    "front-end website editor",
    "filemaker server integration",
    "ongoing development",
    "third-party platforms",
  ].map((title) => title.toLowerCase()),
);

export function isAgreementBodySubheading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (AGREEMENT_BODY_SUBHEADINGS.has(lower)) return true;
  if (/\brate$/i.test(lower) && lower.length <= 32) return true;
  return false;
}

/** ALL-CAPS agreement section labels (PARTIES, SERVICE INVESTMENT, …). */
export function isAgreementDocumentSectionHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (isAgreementBodySubheading(trimmed)) return false;
  if (EXPLICIT_SECTION_TITLES.has(trimmed.toLowerCase())) return true;
  if (trimmed.length < 2 || trimmed.length > 64) return false;
  if (/[.!?]$/.test(trimmed)) return false;
  if (trimmed.includes(":")) return false;
  return /^[A-Z0-9][A-Z0-9 &/+.\-]{0,62}$/.test(trimmed);
}

/** Split agreement body into titled sections for PDFs and structured rendering. */
export function parseAgreementDocumentSections(
  body: string,
): Array<{ title: string; paragraphs: string[] }> {
  const lines = String(body ?? "").replace(/\r\n/g, "\n").split("\n");
  const sections: Array<{ title: string; paragraphs: string[] }> = [];
  let title = "Agreement";
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
    if (isAgreementDocumentSectionHeading(trimmed)) {
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
