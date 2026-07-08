"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReviewSessionBootstrap } from "@/lib/ces/modules/website-review/session-data";
import type { ReviewSessionMode, ReviewSessionPin, ReviewViewport } from "@/lib/ces/review";
import {
  loadSessionPins,
  nextPinNumber,
  REVIEW_OVERLAY_EXTENSION_OPERATOR,
  saveSessionPins,
} from "@/lib/ces/review";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";
import { ReviewFeedbackPopover } from "./ReviewFeedbackPopover";
import { ReviewOverlayLayer } from "./ReviewOverlayLayer";
import { ReviewSessionFab } from "./ReviewSessionFab";
import { ReviewSessionToolbar } from "./ReviewSessionToolbar";

function createSessionStorageId(bootstrap: ReviewSessionBootstrap): string {
  if (bootstrap.revisionId) return `revision-${bootstrap.revisionId}`;
  return `new-${bootstrap.clientId}-${bootstrap.websiteUrl}`;
}

export interface ReviewSessionScreenProps {
  bootstrap: ReviewSessionBootstrap;
}

export function ReviewSessionScreen({ bootstrap }: ReviewSessionScreenProps) {
  const sessionStorageId = useMemo(() => createSessionStorageId(bootstrap), [bootstrap]);

  const [mode, setMode] = useState<ReviewSessionMode>("browse");
  const [iframeUrl, setIframeUrl] = useState(bootstrap.iframeUrl);
  const [activeUrl, setActiveUrl] = useState(bootstrap.iframeUrl);
  const [pins, setPins] = useState<ReviewSessionPin[]>([]);
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [popoverMode, setPopoverMode] = useState<"create" | "view" | null>(null);
  const [pendingViewport, setPendingViewport] = useState<ReviewViewport | null>(null);
  const [anchorPoint, setAnchorPoint] = useState<{ x: number; y: number } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPins(loadSessionPins(sessionStorageId));
    setHydrated(true);
  }, [sessionStorageId]);

  useEffect(() => {
    if (!hydrated) return;
    saveSessionPins(sessionStorageId, pins);
  }, [hydrated, pins, sessionStorageId]);

  const activePin = pins.find((pin) => pin.id === activePinId) ?? null;
  const popoverOpen = popoverMode != null;
  const isCommentMode = mode === "comment";

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (popoverOpen) return;
      if (mode === "comment") {
        setMode("browse");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, popoverOpen]);

  const handleNavigate = useCallback(() => {
    const trimmed = iframeUrl.trim();
    if (!trimmed) return;
    setActiveUrl(trimmed);
  }, [iframeUrl]);

  const exitCommentMode = useCallback(() => {
    setMode("browse");
  }, []);

  const handleFabToggle = useCallback(() => {
    if (popoverOpen) return;
    setMode((current) => (current === "comment" ? "browse" : "comment"));
  }, [popoverOpen]);

  const handleCapture = useCallback((viewport: ReviewViewport, point: { x: number; y: number }) => {
    setPendingViewport(viewport);
    setAnchorPoint(point);
    setActivePinId(null);
    setPopoverMode("create");
  }, []);

  const handlePinSelect = useCallback((pin: ReviewSessionPin) => {
    setActivePinId(pin.id);
    setPendingViewport(pin.anchor.viewport);
    setAnchorPoint({ x: pin.anchor.viewport.point.x, y: pin.anchor.viewport.point.y });
    setPopoverMode("view");
  }, []);

  const handleClosePopover = useCallback(() => {
    setPopoverMode(null);
    setPendingViewport(null);
    setAnchorPoint(null);
    setActivePinId(null);
    exitCommentMode();
  }, [exitCommentMode]);

  const handleSaved = useCallback(
    (draftPin: ReviewSessionPin, requestId: number) => {
      setPins((prev) => {
        const pinNumber = draftPin.number || nextPinNumber(prev);
        const pin: ReviewSessionPin = {
          ...draftPin,
          number: pinNumber,
          requestId,
          anchor: { ...draftPin.anchor, requestId },
        };
        return [...prev, pin];
      });
      handleClosePopover();
    },
    [handleClosePopover],
  );

  return (
    <div className={`kxd-review-session${isCommentMode ? " kxd-review-session--comment" : ""}`}>
      <ReviewSessionToolbar
        iframeUrl={iframeUrl}
        mode={mode}
        onUrlChange={setIframeUrl}
        onNavigate={handleNavigate}
      />

      {isCommentMode && !popoverOpen ? (
        <p className="kxd-review-session__mode-banner" role="status">
          {PORTAL_CLIENT_LANGUAGE.reviewSessionCommentBanner}
        </p>
      ) : null}

      {bootstrap.parentRequestTitle ? (
        <p className="kxd-review-session__context">
          {PORTAL_CLIENT_LANGUAGE.reviewSessionParentContext}: {bootstrap.parentRequestTitle}
        </p>
      ) : null}

      <div className="kxd-review-session__stage">
        <iframe
          title={PORTAL_CLIENT_LANGUAGE.reviewSessionIframeTitle}
          className="kxd-review-session__iframe"
          src={activeUrl}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
        <ReviewOverlayLayer
          pageUrl={activeUrl}
          mode={mode}
          pins={pins}
          activePinId={activePinId}
          popoverOpen={popoverOpen}
          onCapture={handleCapture}
          onPinSelect={handlePinSelect}
        />
        {popoverOpen ? (
          <ReviewFeedbackPopover
            mode={popoverMode === "view" ? "view" : "create"}
            viewport={pendingViewport}
            existingPin={popoverMode === "view" ? activePin : null}
            anchorPoint={anchorPoint ?? undefined}
            onClose={handleClosePopover}
            onSaved={handleSaved}
          />
        ) : null}
        <ReviewSessionFab mode={mode} onToggle={handleFabToggle} />
      </div>

      {/* Operator overlay extension point — Phase 12F architecture only */}
      <div
        className="kxd-ces-extension-slot"
        data-kxd-extension={REVIEW_OVERLAY_EXTENSION_OPERATOR}
        aria-hidden
      />
    </div>
  );
}
