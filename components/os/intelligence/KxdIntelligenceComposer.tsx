"use client";

import { useId, useState, type KeyboardEvent } from "react";
import type { StaffHelpRequestView } from "@/lib/staff/types";
import { KxdButton } from "../KxdButton";
import { kxdOsCn } from "../utils";
import type { KxdIntelligenceComposerMode } from "./types";

function toView(request: StaffHelpRequestView): StaffHelpRequestView {
  return {
    id: request.id,
    question: request.question,
    pagePath: request.pagePath,
    status: request.status,
    intelligenceResponse: request.intelligenceResponse ?? null,
    responseSource: request.responseSource ?? "none",
    confidence: request.confidence ?? null,
    requiresMatt: Boolean(request.requiresMatt),
    mattResponse: request.mattResponse ?? null,
    workId: request.workId ?? null,
    workTitle: request.workTitle ?? null,
    clientLabel: request.clientLabel ?? null,
    createdAt: request.createdAt,
    answeredAt: request.answeredAt ?? null,
    href: request.href ?? null,
  };
}

export function KxdIntelligenceComposer({
  pagePath,
  workId = null,
  canAct,
  isPreview = false,
  mode = "intelligence",
  onModeChange,
  requiresMattCount = 0,
  onSubmitted,
  className,
}: {
  pagePath: string;
  workId?: number | null;
  canAct: boolean;
  isPreview?: boolean;
  mode?: KxdIntelligenceComposerMode;
  onModeChange?: (mode: KxdIntelligenceComposerMode) => void;
  /** Open items waiting on Matt — shown as contextual secondary, not a dual CTA. */
  requiresMattCount?: number;
  onSubmitted?: (request: StaffHelpRequestView) => void;
  className?: string;
}) {
  const formId = useId();
  const questionId = `${formId}-question`;
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const disabled = !canAct || isPreview;
  const mattMode = mode === "matt";

  async function submit() {
    if (disabled || busy || question.trim().length < 8) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/staff/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, pagePath, workId }),
      });
      const payload = (await res.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
        duplicate?: boolean;
        request?: StaffHelpRequestView & { id: number };
      };
      if (!res.ok || payload.success === false) {
        throw new Error(payload.error ?? "Could not send your question.");
      }
      setMessage(
        payload.message ??
          (payload.request?.requiresMatt
            ? "Requires Matt — queued for review."
            : "KXD Intelligence replied."),
      );
      setQuestion("");
      if (payload.request) {
        onSubmitted?.(toView(payload.request));
        if (payload.request.requiresMatt) {
          onModeChange?.("matt");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your question.");
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <div
      className={kxdOsCn(
        "kxd-os-intel-composer",
        mattMode && "kxd-os-intel-composer--matt",
        className,
      )}
    >
      <label className="kxd-os-intel-composer__label" htmlFor={questionId}>
        {mattMode ? "What does Matt need to decide?" : "Ask about this work"}
      </label>
      <textarea
        id={questionId}
        className="kxd-os-input kxd-os-intel-composer__input"
        value={question}
        disabled={disabled || busy}
        onChange={(event) => setQuestion(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={
          mattMode
            ? "Describe the decision and what you’ve prepared…"
            : "Ask one short question about this work…"
        }
        rows={mattMode ? 3 : 2}
      />
      <div className="kxd-os-intel-composer__actions">
        <KxdButton
          type="button"
          variant="intelligence"
          loading={busy}
          disabled={disabled || question.trim().length < 8}
          onClick={() => void submit()}
        >
          {mattMode ? "Send to Matt" : "Ask KXD Intelligence"}
        </KxdButton>
      </div>

      {mattMode ? (
        <div className="kxd-os-intel-composer__matt-context">
          <p className="kxd-os-intel-composer__hint">
            Pricing, access, external messages, and other sensitive calls stay with Matt.
            {requiresMattCount > 0
              ? ` ${requiresMattCount} open item${requiresMattCount === 1 ? "" : "s"} waiting.`
              : ""}
          </p>
          <button
            type="button"
            className="kxd-os-intel-composer__secondary"
            onClick={() => onModeChange?.("intelligence")}
          >
            Back to Intelligence
          </button>
        </div>
      ) : (
        <div className="kxd-os-intel-composer__secondary-row">
          <p className="kxd-os-intel-composer__hint">
            Enter submits · Shift+Enter for a new line.
          </p>
          {!disabled ? (
            <button
              type="button"
              className="kxd-os-intel-composer__secondary"
              onClick={() => onModeChange?.("matt")}
            >
              {requiresMattCount > 0
                ? `Prepare for Matt (${requiresMattCount})`
                : "Needs Matt’s judgment?"}
            </button>
          ) : null}
        </div>
      )}

      {error ? (
        <p className="kxd-os-intel-composer__error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="kxd-os-intel-composer__message">{message}</p> : null}
      {isPreview ? (
        <p className="kxd-os-intel-composer__hint">Preview mode — questions are disabled.</p>
      ) : null}
    </div>
  );
}
