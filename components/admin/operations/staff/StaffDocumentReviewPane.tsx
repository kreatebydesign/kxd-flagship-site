"use client";

import { AgreementDocumentBody } from "@/components/agreement/AgreementDocumentBody";
import { KxdAgreementDocument } from "@/components/agreement/KxdAgreementDocument";

export function StaffDocumentReviewPane(props: {
  eyebrow: string;
  title: string;
  metaLine: string;
  bodySnapshot: string;
  footerLabel: string;
  scrollHint?: string;
}) {
  return (
    <section className="kxd-staff-doc-review" aria-labelledby="staff-doc-review-heading">
      <div
        className="kxd-agreement-doc-card kxd-agreement-doc-island kxd-staff-doc-review__card"
        tabIndex={0}
        role="document"
        aria-label={`${props.title} — full text`}
      >
        <div className="kxd-agreement-doc-card__header">
          <h2 id="staff-doc-review-heading" className="kxd-agreement-doc-card__title">
            Review document
          </h2>
          <p className="kxd-agreement-doc-card__hint">
            {props.scrollHint ??
              "Scroll to read the complete document before signing or acknowledging."}
          </p>
        </div>
        <div className="kxd-agreement-doc-card__scroll">
          <KxdAgreementDocument
            variant="signing"
            eyebrow={props.eyebrow}
            showDocumentFooter
            documentFooterLabel={props.footerLabel}
          >
            <h1 className="kxd-agreement-doc__title">{props.title}</h1>
            <p className="kxd-agreement-doc__meta-line">{props.metaLine}</p>
            <AgreementDocumentBody text={props.bodySnapshot} variant="signing" />
          </KxdAgreementDocument>
        </div>
      </div>
    </section>
  );
}
