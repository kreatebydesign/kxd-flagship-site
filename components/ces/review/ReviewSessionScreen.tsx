"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReviewSessionBootstrap } from "@/lib/ces/modules/website-review/session-data";
import type { ReviewSessionMode, ReviewSessionPin, ReviewViewport } from "@/lib/ces/review";
import {
  loadSessionPins,
  nextPinNumberForPage,
  pageLabelFromPath,
  parsePagePathFromUrl,
  pinsForPageUrl,
  REVIEW_OVERLAY_EXTENSION_OPERATOR,
  reviewPageKey,
  saveSessionPins,
  summarizeReviewPages,
} from "@/lib/ces/review";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";
import { absolutePageUrl, derivePageLabel } from "@/lib/ces/modules/website-review/page-location";
import { ReviewFeedbackPopover } from "./ReviewFeedbackPopover";
import { ReviewOverlayLayer } from "./ReviewOverlayLayer";
import { ReviewSessionFab } from "./ReviewSessionFab";
import { ReviewSessionToolbar } from "./ReviewSessionToolbar";

function createSessionStorageId(bootstrap: ReviewSessionBootstrap): string {
  if (bootstrap.revisionId) return `revision-${bootstrap.revisionId}`;
  return `new-${bootstrap.clientId}-${bootstrap.websiteUrl}`;
}

type VisitedPage = { label: string; pagePath: string; pageUrl: string };

export interface ReviewSessionScreenProps {
  bootstrap: ReviewSessionBootstrap;
}

export function ReviewSessionScreen({ bootstrap }: ReviewSessionScreenProps) {
  const sessionStorageId = useMemo(() => createSessionStorageId(bootstrap), [bootstrap]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [mode, setMode] = useState<ReviewSessionMode>("browse");
  const [iframeUrl, setIframeUrl] = useState(bootstrap.iframeUrl);
  const [activeUrl, setActiveUrl] = useState(bootstrap.iframeUrl);
  const [visitedPages, setVisitedPages] = useState<VisitedPage[]>(() => {
    const path = parsePagePathFromUrl(bootstrap.iframeUrl);
    return [
      {
        label: pageLabelFromPath(path),
        pagePath: path,
        pageUrl: bootstrap.iframeUrl,
      },
    ];
  });
  const [pins, setPins] = useState<ReviewSessionPin[]>(() =>
    typeof window === "undefined" ? [] : loadSessionPins(sessionStorageId),
  );
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [popoverMode, setPopoverMode] = useState<"create" | "view" | null>(null);
  const [pendingViewport, setPendingViewport] = useState<ReviewViewport | null>(null);
  const [anchorPoint, setAnchorPoint] = useState<{ x: number; y: number } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setPins(loadSessionPins(sessionStorageId));
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, [sessionStorageId]);

  useEffect(() => {
    if (!hydrated) return;
    saveSessionPins(sessionStorageId, pins);
  }, [hydrated, pins, sessionStorageId]);

  const pagePins = useMemo(
    () => pinsForPageUrl(pins, activeUrl),
    [pins, activeUrl],
  );
  const pageSummaries = useMemo(() => summarizeReviewPages(pins), [pins]);
  const activePin = pagePins.find((pin) => pin.id === activePinId) ?? null;
  const popoverOpen = popoverMode != null;
  const isCommentMode = mode === "comment";
  const activePagePath = parsePagePathFromUrl(activeUrl);
  const activePageLabel = derivePageLabel(activePagePath);

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

  const rememberVisited = useCallback((nextUrl: string) => {
    const pagePath = parsePagePathFromUrl(nextUrl);
    const label = pageLabelFromPath(pagePath);
    setVisitedPages((prev) => {
      if (prev.some((page) => reviewPageKey(page.pageUrl) === reviewPageKey(nextUrl))) {
        return prev;
      }
      return [...prev, { label, pagePath, pageUrl: nextUrl }];
    });
  }, []);

  const syncActiveUrl = useCallback(
    (nextUrl: string) => {
      const trimmed = nextUrl.trim();
      if (!trimmed) return;
      if (reviewPageKey(trimmed) !== reviewPageKey(activeUrl)) {
        setActivePinId(null);
        setPopoverMode(null);
        setPendingViewport(null);
        setAnchorPoint(null);
      }
      setActiveUrl(trimmed);
      setIframeUrl(trimmed);
      rememberVisited(trimmed);
    },
    [activeUrl, rememberVisited],
  );

  const handleNavigate = useCallback(() => {
    // Toolbar Go is the supported cross-origin navigation/page-context mechanism.
    const next = iframeUrl.trim();
    if (!next) return;
    // Allow relative paths typed into the toolbar
    const absolute = next.startsWith("http")
      ? next
      : absolutePageUrl(next.startsWith("/") ? next : `/${next}`, bootstrap.websiteUrl);
    syncActiveUrl(absolute);
  }, [iframeUrl, bootstrap.websiteUrl, syncActiveUrl]);

  const handleIframeLoad = useCallback(() => {
    try {
      const href = iframeRef.current?.contentWindow?.location?.href;
      if (href && href !== "about:blank" && reviewPageKey(href) !== reviewPageKey(activeUrl)) {
        syncActiveUrl(href);
      }
    } catch {
      // Cross-origin preview/production (expected). Toolbar URL remains the source of truth.
    }
  }, [activeUrl, syncActiveUrl]);

  const exitCommentMode = useCallback(() => {
    setMode("browse");
  }, []);

  const handleFabToggle = useCallback(() => {
    if (popoverOpen) return;
    setMode((current) => (current === "comment" ? "browse" : "comment"));
  }, [popoverOpen]);

  const handleCapture = useCallback((viewport: ReviewViewport, point: { x: number; y: number }) => {
    // Re-bind capture to the toolbar's active URL (cross-origin iframe may be stale).
    const pagePath = parsePagePathFromUrl(activeUrl);
    const rebound: ReviewViewport = {
      ...viewport,
      pageUrl: activeUrl,
      pagePath,
      pageLabel: pageLabelFromPath(pagePath),
    };
    setPendingViewport(rebound);
    setAnchorPoint(point);
    setActivePinId(null);
    setPopoverMode("create");
  }, [activeUrl]);

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
      const pinPageUrl = draftPin.anchor.viewport.pageUrl || activeUrl;
      rememberVisited(pinPageUrl);
      // If the client changed the page in the popover, sync the session to that page.
      if (reviewPageKey(pinPageUrl) !== reviewPageKey(activeUrl)) {
        syncActiveUrl(pinPageUrl);
      }
      setPins((prev) => {
        const pinNumber =
          draftPin.number ||
          nextPinNumberForPage(prev, pinPageUrl);
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
    [activeUrl, handleClosePopover, rememberVisited, syncActiveUrl],
  );

  const handleSelectPage = useCallback(
    (pageUrl: string) => {
      syncActiveUrl(pageUrl);
    },
    [syncActiveUrl],
  );

  return (
    <div className={`kxd-review-session${isCommentMode ? " kxd-review-session--comment" : ""}`}>
      <ReviewSessionToolbar
        iframeUrl={iframeUrl}
        mode={mode}
        pageSummaries={pageSummaries}
        activePageKey={reviewPageKey(activeUrl)}
        activePageLabel={activePageLabel}
        activePagePath={activePagePath}
        pagePinCount={pagePins.length}
        totalPinCount={pins.length}
        onUrlChange={setIframeUrl}
        onNavigate={handleNavigate}
        onSelectPage={handleSelectPage}
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
          ref={iframeRef}
          title={PORTAL_CLIENT_LANGUAGE.reviewSessionIframeTitle}
          className="kxd-review-session__iframe"
          src={activeUrl}
          onLoad={handleIframeLoad}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
        <ReviewOverlayLayer
          pageUrl={activeUrl}
          mode={mode}
          pins={pagePins}
          activePinId={activePinId}
          popoverOpen={popoverOpen}
          onCapture={handleCapture}
          onPinSelect={handlePinSelect}
        />
        {popoverOpen ? (
          <ReviewFeedbackPopover
            key={`${popoverMode}-${pendingViewport?.pageUrl ?? "none"}-${activePinId ?? "new"}`}
            mode={popoverMode === "view" ? "view" : "create"}
            viewport={pendingViewport}
            existingPin={popoverMode === "view" ? activePin : null}
            anchorPoint={anchorPoint ?? undefined}
            nextPinNumber={nextPinNumberForPage(pins, activeUrl)}
            websiteBaseUrl={bootstrap.websiteUrl}
            workspacePages={bootstrap.workspacePages}
            sessionPages={visitedPages}
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
