import type { CSSProperties, ReactNode } from "react";

/** Presentation-only: preserve exact wording while styling headings and bullets. */
export function AgreementDocumentBody({
  text,
  variant = "signing",
}: {
  text: string;
  variant?: "signing" | "workspace";
}) {
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let key = 0;

  function flushBullets() {
    if (!bulletBuffer.length) return;
    if (variant === "workspace") {
      blocks.push(
        <ul key={`ul-${key++}`} className="kxd-os-agreement-document__list">
          {bulletBuffer.map((item, i) => (
            <li key={`li-${key}-${i}`}>{item}</li>
          ))}
        </ul>,
      );
    } else {
      blocks.push(
        <ul key={`ul-${key++}`} style={bulletList}>
          {bulletBuffer.map((item, i) => (
            <li key={`li-${key}-${i}`} style={bulletItem}>
              {item}
            </li>
          ))}
        </ul>,
      );
    }
    bulletBuffer = [];
  }

  for (const raw of lines) {
    const line = raw;
    const trimmed = line.trim();
    if (!trimmed) {
      flushBullets();
      if (variant === "workspace") {
        blocks.push(<div key={`sp-${key++}`} className="kxd-os-agreement-document__gap" aria-hidden />);
      } else {
        blocks.push(<div key={`sp-${key++}`} style={sectionGap} aria-hidden />);
      }
      continue;
    }
    const bulletMatch = trimmed.match(/^[•\-\*]\s+(.*)$/);
    if (bulletMatch) {
      bulletBuffer.push(bulletMatch[1] ?? "");
      continue;
    }
    flushBullets();
    if (isSectionHeading(trimmed)) {
      if (variant === "workspace") {
        blocks.push(
          <h3 key={`h-${key++}`} className="kxd-os-agreement-document__heading">
            {trimmed}
          </h3>,
        );
      } else {
        blocks.push(
          <h3 key={`h-${key++}`} style={sectionHeading}>
            {trimmed}
          </h3>,
        );
      }
      continue;
    }
    if (variant === "workspace") {
      blocks.push(
        <p key={`p-${key++}`} className="kxd-os-agreement-document__paragraph">
          {line}
        </p>,
      );
    } else {
      blocks.push(
        <p key={`p-${key++}`} style={paragraph}>
          {line}
        </p>,
      );
    }
  }
  flushBullets();

  if (variant === "workspace") {
    return <div className="kxd-os-agreement-document">{blocks}</div>;
  }
  return <div style={documentInner}>{blocks}</div>;
}

export function isSectionHeading(line: string): boolean {
  if (line.length < 2 || line.length > 64) return false;
  if (/[.!?]$/.test(line)) return false;
  if (line.includes(":")) return false;
  return /^[A-Z0-9][A-Z0-9 &/\-]{0,62}$/.test(line);
}

const SANS = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const SERIF = "Georgia, 'Iowan Old Style', Palatino, serif";
const DOC_INK = "#2c2824";

const documentInner: CSSProperties = {
  maxWidth: 560,
  margin: "0 auto",
};

const sectionHeading: CSSProperties = {
  fontFamily: SANS,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#1f1c19",
  margin: "1.15rem 0 0.45rem",
  paddingBottom: "0.3rem",
  borderBottom: "1px solid rgba(44, 40, 36, 0.1)",
};

const paragraph: CSSProperties = {
  fontFamily: SERIF,
  fontSize: 15.5,
  lineHeight: 1.6,
  color: DOC_INK,
  margin: "0 0 0.55rem",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
};

const sectionGap: CSSProperties = {
  height: "0.55rem",
};

const bulletList: CSSProperties = {
  margin: "0.15rem 0 0.7rem",
  padding: "0 0 0 1.15rem",
  listStyleType: "disc",
};

const bulletItem: CSSProperties = {
  fontFamily: SERIF,
  fontSize: 15.5,
  lineHeight: 1.55,
  color: DOC_INK,
  marginBottom: "0.3rem",
  paddingLeft: "0.15rem",
};
