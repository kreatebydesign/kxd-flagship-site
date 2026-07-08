"use client";

import type { ReviewSessionPin } from "@/lib/ces/review";

export interface ReviewPinProps {
  pin: ReviewSessionPin;
  active?: boolean;
  onSelect: (pin: ReviewSessionPin) => void;
}

export function ReviewPin({ pin, active = false, onSelect }: ReviewPinProps) {
  const { x, y } = pin.anchor.viewport.point;

  return (
    <button
      type="button"
      className={`kxd-review-pin${active ? " kxd-review-pin--active" : ""}`}
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
      }}
      aria-label={`Revision ${pin.number}: ${pin.title}`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(pin);
      }}
    >
      <span className="kxd-review-pin__mark" aria-hidden>
        <span className="kxd-review-pin__number">{pin.number}</span>
      </span>
      <span className="kxd-review-pin__tooltip" role="tooltip">
        <span className="kxd-review-pin__tooltip-title">{pin.title}</span>
        {pin.summary ? (
          <span className="kxd-review-pin__tooltip-summary">{pin.summary}</span>
        ) : null}
      </span>
    </button>
  );
}
