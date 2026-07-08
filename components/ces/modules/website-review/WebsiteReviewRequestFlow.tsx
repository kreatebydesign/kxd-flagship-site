"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CesConfirm,
  CesField,
  CesFlow,
  CesHero,
  CesPage,
  type CesFlowStep,
} from "@/components/ces/primitives";
import { useCesProfile } from "@/components/ces/providers/CesProfileProvider";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";
import {
  buildReviewContextFromDraft,
  formatPageContextDisplay,
  WEBSITE_REVIEW_PAGE_SUGGESTIONS,
} from "@/lib/ces/modules/website-review/context";
import type {
  WebsiteReviewPageContext,
  WebsiteReviewPendingAttachment,
  WebsiteReviewRequestDraft,
} from "@/lib/ces/modules/website-review/types";
import { WebsiteReviewAttachmentZone } from "./WebsiteReviewAttachmentZone";

const FLOW_STEPS: CesFlowStep[] = [
  { id: "focus", label: PORTAL_CLIENT_LANGUAGE.requestFlowStepFocus },
  { id: "details", label: PORTAL_CLIENT_LANGUAGE.requestFlowStepDetails },
  { id: "review", label: PORTAL_CLIENT_LANGUAGE.requestFlowStepConfirm },
];

const UPDATE_TYPES = [
  {
    id: "content",
    label: "Content update",
    hint: "Copy, headlines, or messaging changes",
  },
  {
    id: "section",
    label: "New section",
    hint: "Add or expand a page area",
  },
  {
    id: "fix",
    label: "Fix or correction",
    hint: "Something isn’t right — we’ll resolve it",
  },
  {
    id: "other",
    label: "Something else",
    hint: "Describe what you need in the next step",
  },
] as const;

type SubmitPhase = "idle" | "submitting" | "done" | "error";

function draftFromContext(initial?: WebsiteReviewPageContext): WebsiteReviewRequestDraft {
  return {
    updateType: "",
    details: "",
    pageLabel: initial?.pageLabel ?? "",
    section: initial?.section ?? "",
    reviewContext: initial,
  };
}

export interface WebsiteReviewRequestFlowProps {
  initialContext?: WebsiteReviewPageContext;
}

export function WebsiteReviewRequestFlow({ initialContext }: WebsiteReviewRequestFlowProps) {
  const profile = useCesProfile();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [stepId, setStepId] = useState("focus");
  const [draft, setDraft] = useState<WebsiteReviewRequestDraft>(() =>
    draftFromContext(initialContext),
  );
  const [attachments, setAttachments] = useState<WebsiteReviewPendingAttachment[]>([]);
  const [customPage, setCustomPage] = useState(() => {
    if (!initialContext?.pageLabel) return false;
    return !WEBSITE_REVIEW_PAGE_SUGGESTIONS.includes(
      initialContext.pageLabel as (typeof WEBSITE_REVIEW_PAGE_SUGGESTIONS)[number],
    );
  });
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle");
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const eyebrow =
    profile.terminology["website-review.request.eyebrow"] ??
    profile.hospitality.welcomeEyebrow;

  const selectedType = UPDATE_TYPES.find((t) => t.id === draft.updateType);
  const isSubmitting = submitPhase === "submitting";
  const hasUploading = attachments.some((a) => a.status === "uploading");
  const readyAttachmentIds = attachments
    .filter((a) => a.status === "ready" && a.id != null)
    .map((a) => a.id as number);

  const pageContextLabel = formatPageContextDisplay(
    buildReviewContextFromDraft({
      pageLabel: draft.pageLabel,
      section: draft.section,
      pagePath: draft.reviewContext?.pagePath,
      pageUrl: draft.reviewContext?.pageUrl,
      source: draft.reviewContext?.source,
    }),
  );

  useEffect(() => {
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      "button, textarea, input, [tabindex='0']",
    );
    focusable?.focus();
  }, [stepId]);

  function validateFocus(): boolean {
    if (!draft.updateType) {
      setErrors({ updateType: "Choose what you’d like updated." });
      return false;
    }
    setErrors({});
    return true;
  }

  function validateDetails(): boolean {
    const nextErrors: Record<string, string> = {};

    if (!draft.details.trim()) {
      nextErrors.details = "Add a few details so we know exactly what to change.";
    } else if (draft.details.trim().length < 12) {
      nextErrors.details = "A little more detail helps us move faster — even one sentence more.";
    }

    if (attachments.some((a) => a.status === "error")) {
      nextErrors.attachments = "Remove or re-upload files that didn’t upload correctly.";
    }

    if (hasUploading) {
      nextErrors.attachments = "Please wait for uploads to finish.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return false;
    }

    setErrors({});
    return true;
  }

  function goNext() {
    if (stepId === "focus" && !validateFocus()) return;
    if (stepId === "details" && !validateDetails()) return;
    if (stepId === "focus") setStepId("details");
    else if (stepId === "details") setStepId("review");
  }

  function goBack() {
    if (stepId === "details") setStepId("focus");
    else if (stepId === "review") setStepId("details");
  }

  function handleChoiceKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const buttons = event.currentTarget
      .closest('[role="radiogroup"]')
      ?.querySelectorAll<HTMLButtonElement>('button[role="radio"]');

    if (!buttons?.length) return;

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      buttons[(index + 1) % buttons.length]?.focus();
    }

    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      buttons[(index - 1 + buttons.length) % buttons.length]?.focus();
    }
  }

  async function handleSubmit() {
    if (!validateDetails()) {
      setStepId("details");
      return;
    }

    setSubmitPhase("submitting");
    setSubmitError(null);

    const reviewContext = buildReviewContextFromDraft({
      pageLabel: draft.pageLabel,
      section: draft.section,
      pagePath: draft.reviewContext?.pagePath,
      pageUrl: draft.reviewContext?.pageUrl,
      source: draft.reviewContext?.source ?? (initialContext ? "review-url" : "manual"),
    });

    try {
      const res = await fetch("/api/portal/website-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updateType: draft.updateType,
          details: draft.details.trim(),
          pageContext: pageContextLabel ?? undefined,
          reviewContext,
          attachmentIds: readyAttachmentIds,
        }),
      });

      const data = (await res.json()) as { ok?: boolean; id?: number; message?: string };

      if (!res.ok || !data.ok || !data.id) {
        setSubmitPhase("error");
        setSubmitError(data.message ?? PORTAL_CLIENT_LANGUAGE.submitError);
        return;
      }

      setCreatedId(data.id);
      setSubmitPhase("done");
    } catch {
      setSubmitPhase("error");
      setSubmitError(PORTAL_CLIENT_LANGUAGE.submitError);
    }
  }

  if (submitPhase === "done" && createdId != null) {
    return (
      <CesPage narrow>
        <CesConfirm
          title={PORTAL_CLIENT_LANGUAGE.confirmTitle}
          message={PORTAL_CLIENT_LANGUAGE.confirmMessage}
          reference={String(createdId)}
          referenceLabel={PORTAL_CLIENT_LANGUAGE.confirmReferenceLabel}
          actions={
            <div className="kxd-ces-confirm__action-row">
              <Link href={`/portal/website-review/${createdId}`} className="kxd-ces-btn kxd-ces-btn--primary">
                View your revision
              </Link>
              <Link href="/portal/website-review" className="kxd-ces-btn kxd-ces-btn--ghost">
                Back to Website Review
              </Link>
            </div>
          }
        />
      </CesPage>
    );
  }

  if (submitPhase === "error" && submitError) {
    return (
      <CesPage narrow>
        <CesConfirm
          title={PORTAL_CLIENT_LANGUAGE.confirmErrorTitle}
          message={submitError}
          actions={
            <div className="kxd-ces-confirm__action-row">
              <button
                type="button"
                className="kxd-ces-btn kxd-ces-btn--primary"
                onClick={() => {
                  setSubmitPhase("idle");
                  setSubmitError(null);
                }}
              >
                Try again
              </button>
              <Link href="/portal/website-review" className="kxd-ces-btn kxd-ces-btn--ghost">
                Back to Website Review
              </Link>
            </div>
          }
        />
      </CesPage>
    );
  }

  return (
    <CesPage narrow>
      <CesHero
        eyebrow={eyebrow}
        title={PORTAL_CLIENT_LANGUAGE.requestTitle}
        lead={PORTAL_CLIENT_LANGUAGE.requestLead}
      />

      {initialContext?.source === "review-url" ? (
        <p className="kxd-ces-context-note" role="status">
          {PORTAL_CLIENT_LANGUAGE.contextFromReviewUrl}
        </p>
      ) : null}

      {isSubmitting ? (
        <p className="kxd-ces-loading-hint" role="status" aria-live="polite">
          {PORTAL_CLIENT_LANGUAGE.sendingRevision}
        </p>
      ) : null}

      <CesFlow steps={FLOW_STEPS} currentStepId={stepId}>
        {stepId === "focus" ? (
          <div className="kxd-ces-flow-panel" ref={panelRef}>
            <p className="kxd-ces-flow-panel__intro">{PORTAL_CLIENT_LANGUAGE.requestFocusIntro}</p>
            <div className="kxd-ces-choice-grid" role="radiogroup" aria-label="Update type">
              {UPDATE_TYPES.map((type, index) => {
                const selected = draft.updateType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={isSubmitting}
                    className={`kxd-ces-choice${selected ? " kxd-ces-choice--selected" : ""}`}
                    onClick={() => {
                      setDraft((d) => ({ ...d, updateType: type.id }));
                      setErrors((e) => ({ ...e, updateType: "" }));
                    }}
                    onKeyDown={(event) => handleChoiceKeyDown(event, index)}
                  >
                    <span className="kxd-ces-choice__label">{type.label}</span>
                    <span className="kxd-ces-choice__hint">{type.hint}</span>
                  </button>
                );
              })}
            </div>
            {errors.updateType ? (
              <p className="kxd-ces-field__error" role="alert">
                {errors.updateType}
              </p>
            ) : null}
          </div>
        ) : null}

        {stepId === "details" ? (
          <div className="kxd-ces-flow-panel" ref={panelRef}>
            <CesField
              label="Describe the update"
              htmlFor="review-details"
              hint={PORTAL_CLIENT_LANGUAGE.requestDetailsHint}
              error={errors.details}
            >
              <textarea
                id="review-details"
                className="kxd-ces-input kxd-ces-input--textarea"
                rows={5}
                disabled={isSubmitting}
                value={draft.details}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, details: e.target.value }));
                  setErrors((err) => ({ ...err, details: "" }));
                }}
                placeholder="Example: Update the homepage hero headline to promote the summer driving school dates."
                aria-invalid={Boolean(errors.details)}
              />
            </CesField>

            <CesField
              label="Where on the site?"
              hint={PORTAL_CLIENT_LANGUAGE.requestLocationHint}
              optional
            >
              <div className="kxd-ces-page-picks" role="group" aria-label="Page location">
                {WEBSITE_REVIEW_PAGE_SUGGESTIONS.map((page) => {
                  const selected = !customPage && draft.pageLabel === page;
                  return (
                    <button
                      key={page}
                      type="button"
                      aria-pressed={selected}
                      disabled={isSubmitting}
                      className={`kxd-ces-page-pick${selected ? " kxd-ces-page-pick--selected" : ""}`}
                      onClick={() => {
                        setCustomPage(false);
                        setDraft((d) => ({ ...d, pageLabel: page }));
                      }}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-pressed={customPage}
                  disabled={isSubmitting}
                  className={`kxd-ces-page-pick${customPage ? " kxd-ces-page-pick--selected" : ""}`}
                  onClick={() => {
                    setCustomPage(true);
                    setDraft((d) => ({ ...d, pageLabel: "" }));
                  }}
                >
                  Other
                </button>
              </div>

              {customPage ? (
                <input
                  id="review-page-custom"
                  type="text"
                  className="kxd-ces-input kxd-ces-input--spaced"
                  disabled={isSubmitting}
                  value={draft.pageLabel ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, pageLabel: e.target.value }))}
                  placeholder="Page name or path"
                  aria-label="Custom page name or path"
                />
              ) : null}

              <input
                id="review-section"
                type="text"
                className="kxd-ces-input kxd-ces-input--spaced"
                disabled={isSubmitting}
                value={draft.section ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, section: e.target.value }))}
                placeholder="Section (optional) — e.g. Hero, Footer, Programs list"
                aria-label="Section on page"
              />
            </CesField>

            <WebsiteReviewAttachmentZone
              attachments={attachments}
              onChange={setAttachments}
              disabled={isSubmitting}
            />

            {errors.attachments ? (
              <p className="kxd-ces-field__error" role="alert">
                {errors.attachments}
              </p>
            ) : null}

            <div
              className="kxd-ces-extension-slot"
              data-ces-extension="website-review-annotations"
              aria-hidden="true"
            />
          </div>
        ) : null}

        {stepId === "review" ? (
          <div className="kxd-ces-flow-panel" ref={panelRef}>
            <p className="kxd-ces-flow-panel__intro">{PORTAL_CLIENT_LANGUAGE.requestConfirmIntro}</p>
            <dl className="kxd-ces-summary">
              <div className="kxd-ces-summary__row">
                <dt>Type</dt>
                <dd>{selectedType?.label ?? draft.updateType}</dd>
              </div>
              <div className="kxd-ces-summary__row">
                <dt>Details</dt>
                <dd>{draft.details}</dd>
              </div>
              {pageContextLabel ? (
                <div className="kxd-ces-summary__row">
                  <dt>Location</dt>
                  <dd>{pageContextLabel}</dd>
                </div>
              ) : null}
              {readyAttachmentIds.length > 0 ? (
                <div className="kxd-ces-summary__row">
                  <dt>Attachments</dt>
                  <dd>
                    {attachments
                      .filter((a) => a.status === "ready")
                      .map((a) => a.filename)
                      .join(", ")}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}

        <div className="kxd-ces-flow__actions">
          {stepId !== "focus" ? (
            <button
              type="button"
              className="kxd-ces-btn kxd-ces-btn--ghost"
              disabled={isSubmitting || hasUploading}
              onClick={goBack}
            >
              Back
            </button>
          ) : (
            <Link href="/portal/website-review" className="kxd-ces-btn kxd-ces-btn--ghost">
              Cancel
            </Link>
          )}
          {stepId === "review" ? (
            <button
              type="button"
              className="kxd-ces-btn kxd-ces-btn--primary"
              disabled={isSubmitting || hasUploading}
              onClick={handleSubmit}
            >
              {isSubmitting ? "Sending…" : PORTAL_CLIENT_LANGUAGE.sendRevision}
            </button>
          ) : (
            <button
              type="button"
              className="kxd-ces-btn kxd-ces-btn--primary"
              disabled={isSubmitting || hasUploading}
              onClick={goNext}
            >
              Continue
            </button>
          )}
        </div>
      </CesFlow>
    </CesPage>
  );
}
