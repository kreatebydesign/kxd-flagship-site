import Link from "next/link";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";
import { CesPage } from "@/components/ces/primitives";

export function WebsiteReviewGone() {
  return (
    <CesPage className="kxd-ces-page--narrow">
      <div className="kxd-ces-empty kxd-ces-empty--gone">
        <h1 className="kxd-ces-empty__title">{PORTAL_CLIENT_LANGUAGE.revisionGoneTitle}</h1>
        <p className="kxd-ces-empty__lead">{PORTAL_CLIENT_LANGUAGE.revisionGoneLead}</p>
        <div className="kxd-ces-empty__actions">
          <Link href="/portal/website-review" className="kxd-ces-btn kxd-ces-btn--primary">
            {PORTAL_CLIENT_LANGUAGE.revisionGoneCta}
          </Link>
        </div>
      </div>
    </CesPage>
  );
}
