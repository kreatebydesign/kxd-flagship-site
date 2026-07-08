"use client";

import Link from "next/link";
import type { ReviewSessionMode } from "@/lib/ces/review";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";

export interface ReviewSessionToolbarProps {
  iframeUrl: string;
  mode: ReviewSessionMode;
  onUrlChange: (url: string) => void;
  onNavigate: () => void;
}

export function ReviewSessionToolbar({
  iframeUrl,
  mode,
  onUrlChange,
  onNavigate,
}: ReviewSessionToolbarProps) {
  const hint =
    mode === "comment"
      ? PORTAL_CLIENT_LANGUAGE.reviewSessionHintComment
      : PORTAL_CLIENT_LANGUAGE.reviewSessionHintBrowse;

  return (
    <header className="kxd-review-toolbar" aria-label={PORTAL_CLIENT_LANGUAGE.reviewSessionToolbarLabel}>
      <div className="kxd-review-toolbar__brand">
        <span className="kxd-review-toolbar__title">{PORTAL_CLIENT_LANGUAGE.reviewSessionTitle}</span>
        <span
          className={`kxd-review-toolbar__hint${mode === "comment" ? " kxd-review-toolbar__hint--active" : ""}`}
        >
          {hint}
        </span>
      </div>

      <div className="kxd-review-toolbar__url">
        <label className="kxd-review-toolbar__url-label" htmlFor="kxd-review-page-url">
          {PORTAL_CLIENT_LANGUAGE.reviewSessionPageLabel}
        </label>
        <input
          id="kxd-review-page-url"
          className="kxd-review-toolbar__url-input"
          type="url"
          value={iframeUrl}
          onChange={(event) => onUrlChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onNavigate();
            }
          }}
        />
        <button type="button" className="kxd-ces-btn kxd-ces-btn--ghost" onClick={onNavigate}>
          {PORTAL_CLIENT_LANGUAGE.reviewSessionGo}
        </button>
      </div>

      <Link href="/portal/website-review" className="kxd-ces-btn kxd-ces-btn--ghost kxd-review-toolbar__exit">
        {PORTAL_CLIENT_LANGUAGE.reviewSessionExit}
      </Link>
    </header>
  );
}
