"use client";

import { useCallback, useRef } from "react";
import type { ReviewSessionMode, ReviewSessionPin, ReviewViewport } from "@/lib/ces/review";
import { captureReviewViewport } from "@/lib/ces/review";
import { ReviewPin } from "./ReviewPin";

export interface ReviewOverlayLayerProps {
  pageUrl: string;
  mode: ReviewSessionMode;
  pins: ReviewSessionPin[];
  activePinId: string | null;
  popoverOpen: boolean;
  onCapture: (viewport: ReviewViewport, anchorPoint: { x: number; y: number }) => void;
  onPinSelect: (pin: ReviewSessionPin) => void;
}

export function ReviewOverlayLayer({
  pageUrl,
  mode,
  pins,
  activePinId,
  popoverOpen,
  onCapture,
  onPinSelect,
}: ReviewOverlayLayerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const isCommentMode = mode === "comment";

  const handleOverlayClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isCommentMode || popoverOpen) return;
      if ((event.target as HTMLElement).closest(".kxd-review-pin")) return;

      const overlay = overlayRef.current;
      if (!overlay) return;

      const rect = overlay.getBoundingClientRect();
      const viewport = captureReviewViewport({
        pageUrl,
        overlayRect: rect,
        clientX: event.clientX,
        clientY: event.clientY,
        scrollX: 0,
        scrollY: 0,
      });

      onCapture(viewport, {
        x: viewport.point.x,
        y: viewport.point.y,
      });
    },
    [isCommentMode, onCapture, pageUrl, popoverOpen],
  );

  const overlayClass = [
    "kxd-review-overlay",
    isCommentMode ? "kxd-review-overlay--comment" : "kxd-review-overlay--browse",
    popoverOpen ? "kxd-review-overlay--dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={overlayRef}
      className={overlayClass}
      onClick={handleOverlayClick}
      role="presentation"
      aria-hidden={!isCommentMode}
    >
      {isCommentMode ? <div className="kxd-review-overlay__grid" aria-hidden /> : null}
      {pins.map((pin) => (
        <ReviewPin
          key={pin.id}
          pin={pin}
          active={pin.id === activePinId}
          onSelect={onPinSelect}
        />
      ))}
    </div>
  );
}
