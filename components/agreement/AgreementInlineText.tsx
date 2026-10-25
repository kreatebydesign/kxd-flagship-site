import { Fragment } from "react";
import { parseAgreementInlineEmphasis } from "@/lib/agreement-presentation/inline-emphasis";

/** Renders agreement line copy with **bold** emphasis — no HTML injection. */
export function AgreementInlineText({ text }: { text: string }) {
  const spans = parseAgreementInlineEmphasis(text);
  return (
    <>
      {spans.map((span, index) =>
        span.kind === "strong" ? (
          <strong key={index} className="kxd-agreement-doc__strong">
            {span.text}
          </strong>
        ) : (
          <Fragment key={index}>{span.text}</Fragment>
        ),
      )}
    </>
  );
}
