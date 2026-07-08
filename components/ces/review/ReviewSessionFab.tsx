"use client";

import type { ReviewSessionMode } from "@/lib/ces/review";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";

export interface ReviewSessionFabProps {
  mode: ReviewSessionMode;
  onToggle: () => void;
}

export function ReviewSessionFab({ mode, onToggle }: ReviewSessionFabProps) {
  const isComment = mode === "comment";
  const label = isComment
    ? PORTAL_CLIENT_LANGUAGE.reviewSessionFabActiveLabel
    : PORTAL_CLIENT_LANGUAGE.reviewSessionFabLabel;

  return (
    <button
      type="button"
      className={`kxd-review-fab${isComment ? " kxd-review-fab--active" : ""}`}
      onClick={onToggle}
      aria-pressed={isComment}
      aria-label={label}
      title={label}
    >
      <span className="kxd-review-fab__icon" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 4.5c-3.59 0-6.5 2.46-6.5 5.5 0 1.72.9 3.26 2.34 4.28L7.5 18.5l3.1-1.55c.45.08.92.12 1.4.12 3.59 0 6.5-2.46 6.5-5.5S15.59 4.5 12 4.5Z"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinejoin="round"
          />
          <circle cx="9.25" cy="10" r="0.75" fill="currentColor" />
          <circle cx="12" cy="10" r="0.75" fill="currentColor" />
          <circle cx="14.75" cy="10" r="0.75" fill="currentColor" />
        </svg>
      </span>
      <span className="kxd-review-fab__tooltip">{label}</span>
    </button>
  );
}
