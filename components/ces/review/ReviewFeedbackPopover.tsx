"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { CesField } from "@/components/ces/primitives";
import { WebsiteReviewAttachmentZone } from "@/components/ces/modules/website-review/WebsiteReviewAttachmentZone";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";
import type { ReviewSessionPin, ReviewViewport } from "@/lib/ces/review";
import { createReviewAnchor } from "@/lib/ces/review";
import { buildReviewContextFromDraft } from "@/lib/ces/modules/website-review/context";
import type { WebsiteReviewPendingAttachment } from "@/lib/ces/modules/website-review/types";

const PRIORITY_OPTIONS = [
  { id: "low", label: "Low" },
  { id: "normal", label: "Normal" },
  { id: "high", label: "High" },
  { id: "urgent", label: "Urgent" },
] as const;

type PopoverMode = "create" | "view";

export interface ReviewFeedbackPopoverProps {
  mode: PopoverMode;
  viewport: ReviewViewport | null;
  existingPin?: ReviewSessionPin | null;
  anchorPoint?: { x: number; y: number };
  onClose: () => void;
  onSaved: (pin: ReviewSessionPin, requestId: number) => void;
}

export function ReviewFeedbackPopover({
  mode,
  viewport,
  existingPin,
  anchorPoint,
  onClose,
  onSaved,
}: ReviewFeedbackPopoverProps) {
  const dialogId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(existingPin?.title ?? "");
  const [details, setDetails] = useState(existingPin?.summary ?? "");
  const [priority, setPriority] = useState(existingPin?.priority ?? "normal");
  const [attachments, setAttachments] = useState<WebsiteReviewPendingAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readyAttachmentIds = attachments
    .filter((a) => a.status === "ready" && a.id != null)
    .map((a) => a.id as number);
  const hasUploading = attachments.some((a) => a.status === "uploading");

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>("input, textarea, button")?.focus();
  }, [mode]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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

    if (hasUploading) {
      setError(PORTAL_CLIENT_LANGUAGE.attachmentUploadError);
      return;
    }

    setSubmitting(true);
    setError(null);

    const reviewAnchor = createReviewAnchor(viewport, existingPin?.anchor.id);
    const reviewContext = buildReviewContextFromDraft({
      pageLabel: viewport.pageLabel,
      pagePath: viewport.pagePath,
      pageUrl: viewport.pageUrl,
      source: "visual-review",
      reviewAnchor,
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

      const data = (await res.json()) as { ok?: boolean; id?: number; message?: string };

      if (!res.ok || !data.ok || !data.id) {
        setError(data.message ?? PORTAL_CLIENT_LANGUAGE.reviewSessionSaveError);
        setSubmitting(false);
        return;
      }

      onSaved(
        {
          id: reviewAnchor.id,
          number: existingPin?.number ?? 0,
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

  const style =
    anchorPoint != null
      ? {
          left: `clamp(1rem, ${anchorPoint.x * 100}%, calc(100% - 22rem))`,
          top: `clamp(5rem, ${anchorPoint.y * 100 + 2}%, calc(100% - 24rem))`,
        }
      : undefined;

  if (mode === "view" && existingPin) {
    return (
      <div
        ref={panelRef}
        className="kxd-review-popover"
        style={style}
        role="dialog"
        aria-labelledby={`${dialogId}-title`}
      >
        <div className="kxd-review-popover__head">
          <p className="kxd-review-popover__eyebrow">
            {PORTAL_CLIENT_LANGUAGE.reviewSessionPinLabel} {existingPin.number}
          </p>
          <h2 id={`${dialogId}-title`} className="kxd-review-popover__title">
            {existingPin.title}
          </h2>
        </div>
        <p className="kxd-review-popover__body">{existingPin.summary}</p>
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
      className="kxd-review-popover"
      style={style}
      role="dialog"
      aria-labelledby={`${dialogId}-title`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="kxd-review-popover__head">
        <p className="kxd-review-popover__eyebrow">{PORTAL_CLIENT_LANGUAGE.reviewSessionNewPin}</p>
        <h2 id={`${dialogId}-title`} className="kxd-review-popover__title">
          {PORTAL_CLIENT_LANGUAGE.reviewSessionPopoverTitle}
        </h2>
      </div>

      <div className="kxd-review-popover__form">
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
            className="kxd-ces-input kxd-ces-input--textarea"
            rows={4}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder={PORTAL_CLIENT_LANGUAGE.reviewSessionFieldDetailsPlaceholder}
            disabled={submitting}
          />
        </CesField>

        <CesField label={PORTAL_CLIENT_LANGUAGE.attachmentLabel}>
          <WebsiteReviewAttachmentZone
            attachments={attachments}
            onChange={setAttachments}
            disabled={submitting}
          />
        </CesField>

        <CesField label={PORTAL_CLIENT_LANGUAGE.reviewSessionFieldPriority} htmlFor={`${dialogId}-priority`}>
          <select
            id={`${dialogId}-priority`}
            className="kxd-ces-input"
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
