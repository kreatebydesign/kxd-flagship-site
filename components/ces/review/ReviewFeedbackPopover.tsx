"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { CesField } from "@/components/ces/primitives";
import { WebsiteReviewAttachmentZone } from "@/components/ces/modules/website-review/WebsiteReviewAttachmentZone";
import {
  WebsiteReviewPageField,
  type WebsiteReviewPageFieldValue,
} from "@/components/ces/modules/website-review/WebsiteReviewPageField";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";
import type { ReviewSessionPin, ReviewViewport } from "@/lib/ces/review";
import { createReviewAnchor, pageLabelFromPath, parsePagePathFromUrl } from "@/lib/ces/review";
import { buildReviewContextFromDraft } from "@/lib/ces/modules/website-review/context";
import {
  buildReviewPageChoices,
  normalizeReviewPageInput,
} from "@/lib/ces/modules/website-review/page-location";
import type { WebsiteReviewPendingAttachment } from "@/lib/ces/modules/website-review/types";

const PRIORITY_OPTIONS = [
  { id: "low", label: "Low" },
  { id: "normal", label: "Normal" },
  { id: "high", label: "High" },
  { id: "urgent", label: "Urgent" },
] as const;

const DESKTOP_DRAG_MQ = "(min-width: 769px)";
const PANEL_MARGIN = 12;

type PopoverMode = "create" | "view";

export interface ReviewFeedbackPopoverProps {
  mode: PopoverMode;
  viewport: ReviewViewport | null;
  existingPin?: ReviewSessionPin | null;
  anchorPoint?: { x: number; y: number };
  nextPinNumber?: number;
  websiteBaseUrl?: string | null;
  workspacePages?: Array<{ title: string; path: string }>;
  sessionPages?: Array<{ label: string; pagePath: string; pageUrl?: string }>;
  onClose: () => void;
  onSaved: (pin: ReviewSessionPin, requestId: number) => void;
}

function pageValueFromViewport(
  viewport: ReviewViewport | null,
  websiteBaseUrl?: string | null,
): WebsiteReviewPageFieldValue {
  if (!viewport) return { pageLabel: "", pagePath: "", pageUrl: "" };
  const path = viewport.pagePath || parsePagePathFromUrl(viewport.pageUrl);
  const normalized = normalizeReviewPageInput(path || viewport.pageUrl, {
    websiteBaseUrl,
    preferredLabel: viewport.pageLabel,
  });
  if (normalized.ok) {
    return {
      pageLabel: normalized.page.pageLabel,
      pagePath: normalized.page.pagePath,
      pageUrl: normalized.page.pageUrl,
    };
  }
  return {
    pageLabel: viewport.pageLabel || pageLabelFromPath(path),
    pagePath: path,
    pageUrl: viewport.pageUrl,
  };
}

function resolveClientFacingSaveError(data: {
  message?: string;
  error?: string;
  code?: string;
}): string {
  if (data.code === "operator_preview_readonly") {
    return PORTAL_CLIENT_LANGUAGE.reviewSessionPreviewReadOnly;
  }
  if (typeof data.message === "string" && data.message.trim()) {
    return data.message.trim();
  }
  // Known safe operator message — avoid leaking raw security internals.
  if (
    typeof data.error === "string" &&
    data.error.trim() &&
    /read-only|preview|try again|unavailable|attach|upload|title|details|priority|session/i.test(
      data.error,
    )
  ) {
    return data.error.trim();
  }
  return PORTAL_CLIENT_LANGUAGE.reviewSessionSaveError;
}

function clampPosition(
  next: { x: number; y: number },
  stage: DOMRect,
  panel: DOMRect,
): { x: number; y: number } {
  const maxX = Math.max(PANEL_MARGIN, stage.width - panel.width - PANEL_MARGIN);
  const maxY = Math.max(PANEL_MARGIN, stage.height - panel.height - PANEL_MARGIN);
  return {
    x: Math.min(Math.max(PANEL_MARGIN, next.x), maxX),
    y: Math.min(Math.max(PANEL_MARGIN, next.y), maxY),
  };
}

export function ReviewFeedbackPopover({
  mode,
  viewport,
  existingPin,
  nextPinNumber = 1,
  websiteBaseUrl = null,
  workspacePages = [],
  sessionPages = [],
  onClose,
  onSaved,
}: ReviewFeedbackPopoverProps) {
  const dialogId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(existingPin?.title ?? "");
  const [details, setDetails] = useState(existingPin?.summary ?? "");
  const [priority, setPriority] = useState(existingPin?.priority ?? "normal");
  const [pageValue, setPageValue] = useState<WebsiteReviewPageFieldValue>(() =>
    pageValueFromViewport(viewport, websiteBaseUrl),
  );
  const [attachments, setAttachments] = useState<WebsiteReviewPendingAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef<{ x: number; y: number } | null>(null);

  const readyAttachmentIds = attachments
    .filter((a) => a.status === "ready" && a.id != null)
    .map((a) => a.id as number);
  const hasUploading = attachments.some((a) => a.status === "uploading");

  const pageChoices = useMemo(
    () =>
      buildReviewPageChoices({
        websiteBaseUrl,
        workspacePages,
        sessionPages,
        current: pageValue.pagePath
          ? {
              label: pageValue.pageLabel,
              pagePath: pageValue.pagePath,
              pageUrl: pageValue.pageUrl,
            }
          : null,
      }),
    [websiteBaseUrl, workspacePages, sessionPages, pageValue],
  );

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>("input, textarea, select, button")?.focus();
  }, [mode]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const captureCurrentPosition = useCallback((): { x: number; y: number } | null => {
    const panel = panelRef.current;
    const stage = panel?.offsetParent as HTMLElement | null;
    if (!panel || !stage) return null;
    const stageRect = stage.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    return clampPosition(
      {
        x: panelRect.left - stageRect.left,
        y: panelRect.top - stageRect.top,
      },
      stageRect,
      panelRect,
    );
  }, []);

  const onDragPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    if (typeof window !== "undefined" && !window.matchMedia(DESKTOP_DRAG_MQ).matches) return;
    const panel = panelRef.current;
    const stage = panel?.offsetParent as HTMLElement | null;
    if (!panel || !stage) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    const current = position ?? captureCurrentPosition();
    if (!current) return;
    if (position == null) setPosition(current);
    const stageRect = stage.getBoundingClientRect();
    dragOffset.current = {
      x: event.clientX - stageRect.left - current.x,
      y: event.clientY - stageRect.top - current.y,
    };
    setDragging(true);
  }, [captureCurrentPosition, position]);

  const onDragPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!dragging || !dragOffset.current) return;
    const panel = panelRef.current;
    const stage = panel?.offsetParent as HTMLElement | null;
    if (!panel || !stage) return;
    const stageRect = stage.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const next = clampPosition(
      {
        x: event.clientX - stageRect.left - dragOffset.current.x,
        y: event.clientY - stageRect.top - dragOffset.current.y,
      },
      stageRect,
      panelRect,
    );
    setPosition(next);
  }, [dragging]);

  const onDragPointerUp = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!dragging) return;
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    dragOffset.current = null;
    setDragging(false);
  }, [dragging]);

  async function handleSave() {
    if (!viewport) return;

    const trimmedTitle = title.trim();
    const trimmedDetails = details.trim();

    if (!trimmedTitle) {
      setError(PORTAL_CLIENT_LANGUAGE.reviewSessionTitleRequired);
      return;
    }

    if (!trimmedDetails || trimmedDetails.length < 8) {
      setError(PORTAL_CLIENT_LANGUAGE.reviewSessionDetailsRequired);
      return;
    }

    const pageCheck = normalizeReviewPageInput(pageValue.pagePath || pageValue.pageUrl, {
      websiteBaseUrl,
      preferredLabel: pageValue.pageLabel,
    });
    if (!pageCheck.ok) {
      setPageError(pageCheck.error);
      setError(null);
      return;
    }

    if (hasUploading) {
      setError(PORTAL_CLIENT_LANGUAGE.attachmentUploadError);
      return;
    }

    setSubmitting(true);
    setError(null);
    setPageError(null);

    const resolvedViewport: ReviewViewport = {
      ...viewport,
      pageUrl: pageCheck.page.pageUrl,
      pagePath: pageCheck.page.pagePath,
      pageLabel: pageCheck.page.pageLabel,
    };

    const reviewAnchor = createReviewAnchor(resolvedViewport, existingPin?.anchor.id);
    const pinNumber = existingPin?.number || nextPinNumber;
    const reviewContext = buildReviewContextFromDraft({
      pageLabel: pageCheck.page.pageLabel,
      pagePath: pageCheck.page.pagePath,
      pageUrl: pageCheck.page.pageUrl,
      source: "visual-review",
      reviewAnchor,
      markerNumber: pinNumber,
    });

    try {
      const res = await fetch("/api/portal/website-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updateType: "fix",
          requestTitle: trimmedTitle,
          details: trimmedDetails,
          priority,
          reviewContext,
          attachmentIds: readyAttachmentIds,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        id?: number;
        message?: string;
        error?: string;
        code?: string;
      };

      if (!res.ok || !data.ok || !data.id) {
        setError(resolveClientFacingSaveError(data));
        setSubmitting(false);
        return;
      }

      onSaved(
        {
          id: reviewAnchor.id,
          number: pinNumber,
          anchor: { ...reviewAnchor, requestId: data.id },
          title: trimmedTitle,
          summary: trimmedDetails,
          requestId: data.id,
          priority,
        },
        data.id,
      );
    } catch {
      setError(PORTAL_CLIENT_LANGUAGE.reviewSessionSaveError);
      setSubmitting(false);
    }
  }

  const panelStyle =
    position != null
      ? {
          left: `${position.x}px`,
          top: `${position.y}px`,
          right: "auto",
          bottom: "auto",
        }
      : undefined;

  if (mode === "view" && existingPin) {
    const pinPath =
      existingPin.anchor.viewport.pagePath ||
      parsePagePathFromUrl(existingPin.anchor.viewport.pageUrl);
    const pinLabel =
      existingPin.anchor.viewport.pageLabel || pageLabelFromPath(pinPath);
    return (
      <div
        ref={panelRef}
        className={`kxd-review-popover kxd-review-popover--view${dragging ? " kxd-review-popover--dragging" : ""}`}
        style={panelStyle}
        role="dialog"
        aria-labelledby={`${dialogId}-title`}
      >
        <div
          className="kxd-review-popover__head kxd-review-popover__head--drag"
          onPointerDown={onDragPointerDown}
          onPointerMove={onDragPointerMove}
          onPointerUp={onDragPointerUp}
          onPointerCancel={onDragPointerUp}
        >
          <span className="kxd-review-popover__drag" aria-hidden>
            <span />
            <span />
            <span />
          </span>
          <p className="kxd-review-popover__eyebrow">
            {PORTAL_CLIENT_LANGUAGE.reviewSessionPinLabel} {existingPin.number}
          </p>
          <h2 id={`${dialogId}-title`} className="kxd-review-popover__title">
            {existingPin.title}
          </h2>
          <p className="kxd-review-popover__page">
            <span>{pinLabel}</span>
          </p>
          <button
            type="button"
            className="kxd-review-popover__close"
            onClick={onClose}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label={PORTAL_CLIENT_LANGUAGE.reviewSessionClose}
          >
            ×
          </button>
        </div>
        <div className="kxd-review-popover__scroll">
          <p className="kxd-review-popover__body">{existingPin.summary}</p>
        </div>
        <div className="kxd-review-popover__actions">
          {existingPin.requestId ? (
            <Link
              href={`/portal/website-review/${existingPin.requestId}`}
              className="kxd-ces-btn kxd-ces-btn--primary"
            >
              {PORTAL_CLIENT_LANGUAGE.reviewSessionViewRevision}
            </Link>
          ) : null}
          <button type="button" className="kxd-ces-btn kxd-ces-btn--ghost" onClick={onClose}>
            {PORTAL_CLIENT_LANGUAGE.reviewSessionClose}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className={`kxd-review-popover kxd-review-popover--create${dragging ? " kxd-review-popover--dragging" : ""}`}
      style={panelStyle}
      role="dialog"
      aria-labelledby={`${dialogId}-title`}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className="kxd-review-popover__head kxd-review-popover__head--drag"
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        onPointerCancel={onDragPointerUp}
      >
        <span className="kxd-review-popover__drag" aria-hidden>
          <span />
          <span />
          <span />
        </span>
        <p className="kxd-review-popover__eyebrow">{PORTAL_CLIENT_LANGUAGE.reviewSessionNewPin}</p>
        <h2 id={`${dialogId}-title`} className="kxd-review-popover__title">
          {PORTAL_CLIENT_LANGUAGE.reviewSessionPopoverTitle}
        </h2>
        <button
          type="button"
          className="kxd-review-popover__close"
          onClick={onClose}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={PORTAL_CLIENT_LANGUAGE.reviewSessionCancel}
        >
          ×
        </button>
      </div>

      <div className="kxd-review-popover__scroll">
        <div className="kxd-review-popover__form">
          <WebsiteReviewPageField
            compact
            websiteBaseUrl={websiteBaseUrl}
            choices={pageChoices}
            value={pageValue}
            error={pageError ?? undefined}
            disabled={submitting}
            onChange={(next) => {
              setPageValue(next);
              setPageError(null);
            }}
          />

          <CesField label={PORTAL_CLIENT_LANGUAGE.reviewSessionFieldTitle} htmlFor={`${dialogId}-title-input`}>
            <input
              id={`${dialogId}-title-input`}
              className="kxd-ces-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={PORTAL_CLIENT_LANGUAGE.reviewSessionFieldTitlePlaceholder}
              disabled={submitting}
            />
          </CesField>

          <CesField label={PORTAL_CLIENT_LANGUAGE.reviewSessionFieldDetails} htmlFor={`${dialogId}-details`}>
            <textarea
              id={`${dialogId}-details`}
              className="kxd-ces-input kxd-ces-input--textarea kxd-review-popover__details"
              rows={3}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder={PORTAL_CLIENT_LANGUAGE.reviewSessionFieldDetailsPlaceholder}
              disabled={submitting}
            />
          </CesField>

          <WebsiteReviewAttachmentZone
            compact
            attachments={attachments}
            onChange={setAttachments}
            disabled={submitting}
          />

          <CesField
            label={PORTAL_CLIENT_LANGUAGE.reviewSessionFieldPriority}
            htmlFor={`${dialogId}-priority`}
          >
            <select
              id={`${dialogId}-priority`}
              className="kxd-ces-input kxd-review-popover__priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              disabled={submitting}
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </CesField>
        </div>

        {error ? <p className="kxd-review-popover__error">{error}</p> : null}
      </div>

      <div className="kxd-review-popover__actions">
        <button
          type="button"
          className="kxd-ces-btn kxd-ces-btn--primary"
          onClick={() => void handleSave()}
          disabled={submitting || hasUploading}
        >
          {submitting ? PORTAL_CLIENT_LANGUAGE.sendingRevision : PORTAL_CLIENT_LANGUAGE.reviewSessionSave}
        </button>
        <button
          type="button"
          className="kxd-ces-btn kxd-ces-btn--ghost"
          onClick={onClose}
          disabled={submitting}
        >
          {PORTAL_CLIENT_LANGUAGE.reviewSessionCancel}
        </button>
      </div>
    </div>
  );
}
