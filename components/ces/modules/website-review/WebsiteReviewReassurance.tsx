import Link from "next/link";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";

export interface WebsiteReviewReassuranceProps {
  className?: string;
}

export function WebsiteReviewReassurance({ className = "" }: WebsiteReviewReassuranceProps) {
  return (
    <aside className={`kxd-ces-review-reassurance${className ? ` ${className}` : ""}`}>
      <p className="kxd-ces-review-reassurance__line">{PORTAL_CLIENT_LANGUAGE.reviewReassuranceLine1}</p>
      <p className="kxd-ces-review-reassurance__line kxd-ces-review-reassurance__line--muted">
        {PORTAL_CLIENT_LANGUAGE.reviewReassuranceLine2}
      </p>
    </aside>
  );
}

export interface WebsiteReviewEmptyGuideProps {
  websiteUrl: string | null;
  showRequestCta?: boolean;
}

export function WebsiteReviewEmptyGuide({
  websiteUrl,
  showRequestCta = true,
}: WebsiteReviewEmptyGuideProps) {
  return (
    <section className="kxd-ces-empty-guide">
      <p className="kxd-ces-empty-guide__title">{PORTAL_CLIENT_LANGUAGE.reviewEmptyGuideTitle}</p>
      <ol className="kxd-ces-empty-guide__steps">
        {PORTAL_CLIENT_LANGUAGE.reviewEmptyGuideSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="kxd-ces-empty-guide__closing">{PORTAL_CLIENT_LANGUAGE.reviewEmptyGuideClosing}</p>
      <div className="kxd-ces-empty-guide__actions">
        {websiteUrl ? (
          <Link href="/portal/website-review/session/new" className="kxd-ces-btn kxd-ces-btn--primary">
            {PORTAL_CLIENT_LANGUAGE.reviewCtaVisual}
          </Link>
        ) : null}
        {showRequestCta ? (
          <Link href="/portal/website-review/request" className="kxd-ces-btn kxd-ces-btn--ghost">
            {PORTAL_CLIENT_LANGUAGE.reviewCtaPrimary}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
