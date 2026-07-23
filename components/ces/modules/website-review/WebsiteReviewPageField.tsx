"use client";

import { useId, useMemo, useState } from "react";
import { CesField } from "@/components/ces/primitives";
import {
  REVIEW_PAGE_CUSTOM_VALUE,
  buildReviewPageChoices,
  derivePageLabel,
  normalizeReviewPageInput,
  type ReviewPageChoice,
} from "@/lib/ces/modules/website-review/page-location";

export type WebsiteReviewPageFieldValue = {
  pageLabel: string;
  pagePath: string;
  pageUrl: string;
};

export interface WebsiteReviewPageFieldProps {
  websiteBaseUrl?: string | null;
  choices?: ReviewPageChoice[];
  workspacePages?: Array<{ title: string; path: string }>;
  sessionPages?: Array<{ label: string; pagePath: string; pageUrl?: string }>;
  value: WebsiteReviewPageFieldValue;
  onChange: (next: WebsiteReviewPageFieldValue) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  /** Compact popover layout */
  compact?: boolean;
}

function selectionFromValue(
  value: WebsiteReviewPageFieldValue,
  choices: ReviewPageChoice[],
): string {
  if (!value.pagePath) return "";
  const match = choices.find(
    (choice) =>
      choice.value !== REVIEW_PAGE_CUSTOM_VALUE &&
      (choice.pagePath === value.pagePath || choice.value === value.pagePath),
  );
  return match?.value ?? REVIEW_PAGE_CUSTOM_VALUE;
}

export function WebsiteReviewPageField({
  websiteBaseUrl,
  choices: choicesProp,
  workspacePages,
  sessionPages,
  value,
  onChange,
  error,
  disabled,
  required = true,
  compact = false,
}: WebsiteReviewPageFieldProps) {
  const fieldId = useId();
  const choices = useMemo(
    () =>
      choicesProp ??
      buildReviewPageChoices({
        websiteBaseUrl,
        workspacePages,
        sessionPages,
        current: value.pagePath
          ? { label: value.pageLabel, pagePath: value.pagePath, pageUrl: value.pageUrl }
          : null,
      }),
    [choicesProp, websiteBaseUrl, workspacePages, sessionPages, value.pageLabel, value.pagePath, value.pageUrl],
  );

  const derivedSelect = selectionFromValue(value, choices);
  const [forceCustom, setForceCustom] = useState(false);
  const isCustom = forceCustom || derivedSelect === REVIEW_PAGE_CUSTOM_VALUE;
  const selectValue = isCustom ? REVIEW_PAGE_CUSTOM_VALUE : derivedSelect;
  const [customRaw, setCustomRaw] = useState(() =>
    derivedSelect === REVIEW_PAGE_CUSTOM_VALUE ? value.pagePath : "",
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const shownError = error || localError;

  function applyNormalized(pathOrUrl: string, preferredLabel?: string) {
    const result = normalizeReviewPageInput(pathOrUrl, {
      websiteBaseUrl,
      preferredLabel,
    });
    if (!result.ok) {
      setLocalError(result.error);
      return false;
    }
    setLocalError(null);
    onChange({
      pageLabel: result.page.pageLabel,
      pagePath: result.page.pagePath,
      pageUrl: result.page.pageUrl,
    });
    return true;
  }

  function handleSelectChange(next: string) {
    setLocalError(null);
    if (next === REVIEW_PAGE_CUSTOM_VALUE) {
      setForceCustom(true);
      setCustomRaw(value.pagePath || "");
      onChange({ pageLabel: "", pagePath: "", pageUrl: "" });
      return;
    }
    setForceCustom(false);
    const choice = choices.find((item) => item.value === next);
    if (!choice) return;
    applyNormalized(choice.pagePath || choice.value, choice.label);
  }

  function handleCustomBlur() {
    if (!customRaw.trim()) {
      if (required) setLocalError("Enter a page path, such as /about.");
      return;
    }
    if (applyNormalized(customRaw)) {
      setForceCustom(false);
    }
  }

  const pathHint = value.pagePath
    ? value.pagePath
    : isCustom
      ? "Enter a path like /about or paste a link from your website"
      : null;

  return (
    <CesField
      label="Page"
      htmlFor={`${fieldId}-select`}
      hint="Select the page this request applies to."
      error={shownError ?? undefined}
      optional={!required}
    >
      <select
        id={`${fieldId}-select`}
        className="kxd-ces-input"
        value={selectValue || ""}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(shownError)}
        aria-describedby={pathHint ? `${fieldId}-path` : undefined}
        onChange={(event) => handleSelectChange(event.target.value)}
      >
        {!selectValue ? (
          <option value="" disabled>
            Choose a page…
          </option>
        ) : null}
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.value === REVIEW_PAGE_CUSTOM_VALUE
              ? choice.label
              : `${choice.label} — ${choice.pagePath}`}
          </option>
        ))}
      </select>

      {isCustom ? (
        <input
          id={`${fieldId}-custom`}
          type="text"
          className={`kxd-ces-input${compact ? "" : " kxd-ces-input--spaced"}`}
          style={compact ? { marginTop: "0.65rem" } : undefined}
          disabled={disabled}
          value={customRaw}
          placeholder="/about or https://yoursite.com/about"
          aria-label="Custom page path"
          aria-invalid={Boolean(shownError)}
          onChange={(event) => {
            setCustomRaw(event.target.value);
            setLocalError(null);
          }}
          onBlur={handleCustomBlur}
        />
      ) : null}

      {pathHint ? (
        <p id={`${fieldId}-path`} className="kxd-ces-page-field__path">
          {value.pageLabel || value.pagePath ? (
            <span className="kxd-ces-page-field__label">
              {value.pageLabel || derivePageLabel(value.pagePath)}
            </span>
          ) : null}
          {value.pagePath ? (
            <>
              <span className="kxd-ces-page-field__sep" aria-hidden>
                {" "}
              </span>
              <span className="kxd-ces-page-field__path-value">{value.pagePath}</span>
            </>
          ) : (
            <span className="kxd-ces-page-field__path-value">{pathHint}</span>
          )}
        </p>
      ) : null}
    </CesField>
  );
}
