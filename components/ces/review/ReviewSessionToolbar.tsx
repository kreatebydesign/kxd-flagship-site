"use client";

import Link from "next/link";
import type { ReviewSessionMode } from "@/lib/ces/review";
import type { ReviewPageSummary } from "@/lib/ces/review";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";

export interface ReviewSessionToolbarProps {
  iframeUrl: string;
  mode: ReviewSessionMode;
  pageSummaries: ReviewPageSummary[];
  activePageKey: string;
  pagePinCount: number;
  totalPinCount: number;
  onUrlChange: (url: string) => void;
  onNavigate: () => void;
  onSelectPage: (pageUrl: string) => void;
}

export function ReviewSessionToolbar({
  iframeUrl,
  mode,
  pageSummaries,
  activePageKey,
  pagePinCount,
  totalPinCount,
  onUrlChange,
  onNavigate,
  onSelectPage,
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
        <span className="kxd-review-toolbar__scope" aria-live="polite">
          {pagePinCount} on this page
          {totalPinCount > pagePinCount ? ` · ${totalPinCount} total` : ""}
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

      {pageSummaries.length > 0 ? (
        <div className="kxd-review-toolbar__pages" role="tablist" aria-label="Pages with feedback">
          {pageSummaries.map((page) => {
            const active = page.key === activePageKey;
            return (
              <button
                key={page.key}
                type="button"
                role="tab"
                aria-selected={active}
                className={`kxd-review-toolbar__page${active ? " kxd-review-toolbar__page--active" : ""}`}
                onClick={() => onSelectPage(page.pageUrl)}
              >
                <span>{page.pageLabel}</span>
                <span className="kxd-review-toolbar__page-count">{page.pinCount}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <Link href="/portal/website-review" className="kxd-ces-btn kxd-ces-btn--ghost kxd-review-toolbar__exit">
        {PORTAL_CLIENT_LANGUAGE.reviewSessionExit}
      </Link>
    </header>
  );
}
