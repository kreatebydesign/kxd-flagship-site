import type { ReactNode } from "react";
import { parseAgreementBodyBlocks } from "@/lib/agreement-presentation/parse-body-blocks";
import { isAgreementDocumentSectionHeading } from "@/lib/commercial-legal/agreement-document-sections";

/** Presentation-only: preserve exact wording while styling headings and bullets. */
export function AgreementDocumentBody({
  text,
  variant = "signing",
}: {
  text: string;
  variant?: "signing" | "workspace";
}) {
  const blocks = parseAgreementBodyBlocks(text);
  const nodes: ReactNode[] = [];
  let key = 0;

  for (const block of blocks) {
    switch (block.type) {
      case "section":
        nodes.push(
          <h3 key={`s-${key++}`} className="kxd-agreement-doc__section">
            {block.title}
          </h3>,
        );
        break;
      case "subheading":
        nodes.push(
          <h4 key={`sh-${key++}`} className="kxd-agreement-doc__subheading">
            {block.text}
          </h4>,
        );
        break;
      case "paragraph":
        nodes.push(
          <p key={`p-${key++}`} className="kxd-agreement-doc__paragraph">
            {block.text}
          </p>,
        );
        break;
      case "bullets":
        nodes.push(
          <ul key={`ul-${key++}`} className="kxd-agreement-doc__list">
            {block.items.map((item, i) => (
              <li key={`li-${key}-${i}`}>{item}</li>
            ))}
          </ul>,
        );
        break;
      case "gap":
        nodes.push(<div key={`g-${key++}`} className="kxd-agreement-doc__gap" aria-hidden />);
        break;
      default:
        break;
    }
  }

  void variant;
  return <>{nodes}</>;
}

/** @deprecated Use isAgreementDocumentSectionHeading from agreement-document-sections. */
export function isSectionHeading(line: string): boolean {
  return isAgreementDocumentSectionHeading(line);
}
