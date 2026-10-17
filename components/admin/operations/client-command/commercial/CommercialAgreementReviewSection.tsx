import { AgreementDocumentBody } from "@/components/agreement/AgreementDocumentBody";

export function CommercialAgreementReviewSection(props: {
  title: string;
  clientFacingBody: string;
}) {
  const body = props.clientFacingBody.trim();
  if (!body) return null;

  return (
    <section
      className="kxd-os-commercial-panel-card kxd-os-agreement-review"
      id="review-agreement"
      aria-labelledby="review-agreement-heading"
    >
      <div className="kxd-os-agreement-review__header">
        <div>
          <h3 id="review-agreement-heading">Review Agreement</h3>
          <p className="kxd-os-commercial-muted kxd-os-agreement-review__lead">
            Read-only preview of <strong>{props.title}</strong>. This is the same agreement text
            presented for client signature and on the executed PDF — not a summary.
          </p>
        </div>
      </div>
      <div className="kxd-os-agreement-review__doc" tabIndex={0} role="document" aria-label="Agreement text">
        <div className="kxd-os-agreement-review__scroll">
          <AgreementDocumentBody text={body} variant="workspace" />
        </div>
      </div>
    </section>
  );
}
