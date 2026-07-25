"use client";

import { useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";
import {
  KxdButton,
  KxdIntelligenceBadge,
  KxdIntelligenceCallout,
  KxdIntelligenceResponse,
  useKxdIntelligenceOptional,
} from "@/components/os";
import type { StaffHelpRequestView } from "@/lib/staff/types";

export interface StaffAskHelpControlProps {
  pagePath: string;
  workId?: number | null;
  workTitle?: string | null;
  clientLabel?: string | null;
  canAct: boolean;
  isPreview?: boolean;
  existing?: StaffHelpRequestView[];
  defaultOpen?: boolean;
  onSubmitted?: () => void;
  /** When nested inside a full Intelligence panel, use quieter inset surface. */
  inset?: boolean;
  /**
   * @deprecated Embedded rail mode removed — opens global Intelligence workspace.
   */
  embedded?: boolean;
  mode?: "intelligence" | "matt";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onModeChange?: (mode: "intelligence" | "matt") => void;
  /** When false, caller renders recent guidance elsewhere. */
  showRecent?: boolean;
  /**
   * Prefer opening the global Intelligence workspace (default when provider is present).
   * Set false to force the local callout form.
   */
  preferWorkspace?: boolean;
  contextLabel?: string;
  contextKind?: "guided-work" | "training" | "staff-home" | "operations" | "generic";
}

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

function statusLabel(row: StaffHelpRequestView): string {
  if (row.mattResponse) {
    return row.status === "resolved" ? "Matt resolved" : "Matt responded";
  }
  if (row.requiresMatt) return "Waiting on Matt";
  if (row.intelligenceResponse) return "KXD Intelligence answered";
  if (row.status === "open") return "Waiting on Matt";
  if (row.status === "answered") return "Answered";
  return "Resolved";
}

export function StaffAskHelpControl({
  pagePath,
  workId = null,
  workTitle = null,
  clientLabel = null,
  canAct,
  isPreview = false,
  existing = [],
  defaultOpen = false,
  onSubmitted,
  inset = false,
  embedded = false,
  mode: modeProp,
  open: openProp,
  onOpenChange,
  showRecent = true,
  preferWorkspace = true,
  contextLabel,
  contextKind = "guided-work",
}: StaffAskHelpControlProps) {
  const intel = useKxdIntelligenceOptional();
  const useWorkspace = Boolean(preferWorkspace && intel);
  const formId = useId();
  const questionId = `${formId}-question`;
  const [internalOpen, setInternalOpen] = useState(defaultOpen && !useWorkspace);
  const open = openProp ?? internalOpen;
  const mode = modeProp ?? "intelligence";
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<StaffHelpRequestView[]>([]);
  const [latest, setLatest] = useState<StaffHelpRequestView | null>(null);

  const disabled = !canAct || isPreview;

  const configure = intel?.configure;
  useEffect(() => {
    if (!configure) return;
    configure({
      pagePath,
      workId,
      workTitle,
      clientLabel,
      helpRequests: existing,
      canAct,
      isPreview,
      contextKind,
      contextLabel: contextLabel ?? (workTitle ? `Work · ${workTitle}` : "Current work"),
    });
  }, [
    configure,
    pagePath,
    workId,
    workTitle,
    clientLabel,
    existing,
    canAct,
    isPreview,
    contextKind,
    contextLabel,
  ]);

  const localExisting = useMemo(() => {
    const seen = new Set<number>();
    const rows: StaffHelpRequestView[] = [];
    for (const row of submitted) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
    }
    for (const row of existing) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
    }
    return rows;
  }, [submitted, existing]);

  function setOpen(next: boolean) {
    onOpenChange?.(next);
    if (openProp === undefined) setInternalOpen(next);
  }

  function openWorkspace(nextMode: "intelligence" | "matt" = mode) {
    intel?.openWith({
      pagePath,
      workId,
      workTitle,
      clientLabel,
      helpRequests: localExisting,
      canAct,
      isPreview,
      contextKind,
      contextLabel: contextLabel ?? (workTitle ? `Work · ${workTitle}` : "Current work"),
    });
    intel?.setComposerMode(nextMode);
  }

  async function submit() {
    if (disabled) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    setLatest(null);
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
      setMessage(payload.message ?? "KXD Intelligence replied.");
      setQuestion("");
      if (payload.request) {
        const view = toView(payload.request);
        setLatest(view);
        setSubmitted((prev) => [view, ...prev.filter((row) => row.id !== view.id)]);
        intel?.upsertHelpRequest(view);
      }
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your question.");
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!disabled && !busy && question.trim().length >= 8) {
        void submit();
      }
    }
  }

  const recentMeaningful = localExisting.filter(
    (row) => row.intelligenceResponse || row.mattResponse || row.requiresMatt,
  );

  if (useWorkspace || embedded) {
    return (
      <KxdIntelligenceCallout
        title="Ask for help"
        description="Open KXD Intelligence for evidence-bound guidance. Sensitive decisions go to Matt."
        inset={inset}
        showMark={!inset}
        action={
          <KxdButton
            type="button"
            variant="intelligence"
            onClick={() => openWorkspace(defaultOpen || mode === "matt" ? "matt" : "intelligence")}
          >
            Open Intelligence
          </KxdButton>
        }
      >
        {showRecent && recentMeaningful.length > 0 ? (
          <div className="kxd-os-intel-recent">
            <p className="kxd-os-intel-rail__eyebrow">Recent guidance</p>
            {recentMeaningful.slice(0, 2).map((row) => (
              <div key={row.id} className="kxd-os-intel-recent__item">
                <div className="kxd-os-intel-recent__badges">
                  {row.mattResponse ? (
                    <KxdIntelligenceBadge source="matt">Matt</KxdIntelligenceBadge>
                  ) : row.requiresMatt ? (
                    <KxdIntelligenceBadge source="escalation" requiresMatt>
                      Requires Matt
                    </KxdIntelligenceBadge>
                  ) : (
                    <KxdIntelligenceBadge source="deterministic">
                      KXD Intelligence
                    </KxdIntelligenceBadge>
                  )}
                </div>
                <p className="kxd-os-intel-recent__question">{row.question}</p>
              </div>
            ))}
          </div>
        ) : null}
      </KxdIntelligenceCallout>
    );
  }

  const askForm = (
    <div id={`${formId}-form`} className="kxd-os-intel-ask-form">
      <label className="kxd-os-intel-rail__eyebrow" htmlFor={questionId}>
        {mode === "matt" ? "What does Matt need to decide?" : "Ask about this work…"}
      </label>
      <textarea
        id={questionId}
        className="kxd-os-input kxd-os-intel-ask-form__input"
        value={question}
        disabled={disabled || busy}
        onChange={(event) => setQuestion(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={
          mode === "matt"
            ? "Describe the decision and what you’ve prepared…"
            : "Ask one short question about this work…"
        }
        rows={3}
      />
      <div className="kxd-os-intel-ask-form__actions">
        <KxdButton
          type="button"
          variant="intelligence"
          loading={busy}
          disabled={disabled || question.trim().length < 8}
          onClick={submit}
        >
          {mode === "matt" ? "Send to Matt" : "Ask KXD Intelligence"}
        </KxdButton>
        {open ? (
          <KxdButton
            type="button"
            variant="ghost"
            className="kxd-os-intel-ask-form__cancel"
            onClick={() => setOpen(false)}
          >
            Cancel
          </KxdButton>
        ) : null}
      </div>
      <p className="kxd-os-intel-ask-form__hint">
        Enter submits · Shift+Enter for a new line. No automatic answers on page load.
      </p>
    </div>
  );

  const liveStatus = (
    <div className="kxd-os-intel-rail__live">
      {error ? (
        <p className="kxd-os-intel-ask-form__error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="kxd-os-intel-ask-form__message">{message}</p> : null}
      {latest?.intelligenceResponse ? (
        <KxdIntelligenceResponse
          source={latest.responseSource === "ai-assisted" ? "ai-assisted" : "deterministic"}
          requiresMatt={latest.requiresMatt}
          note={
            latest.requiresMatt
              ? "I need Matt to confirm this. It is in his review queue."
              : undefined
          }
        >
          <p>{latest.intelligenceResponse}</p>
        </KxdIntelligenceResponse>
      ) : null}
    </div>
  );

  const recentBlock = showRecent ? (
    <div className="kxd-os-intel-recent">
      <p className="kxd-os-intel-rail__eyebrow">Recent guidance</p>
      {recentMeaningful.length === 0 ? (
        <p className="kxd-os-intel-panel__desc" style={{ marginTop: "0.45rem" }}>
          No recent guidance yet. Ask a question or open Intelligence.
        </p>
      ) : (
        recentMeaningful.slice(0, 3).map((row) => (
          <div key={row.id} className="kxd-os-intel-recent__item">
            <div className="kxd-os-intel-recent__badges">
              {row.mattResponse ? (
                <KxdIntelligenceBadge source="matt">Matt</KxdIntelligenceBadge>
              ) : row.requiresMatt ? (
                <KxdIntelligenceBadge source="escalation" requiresMatt>
                  Requires Matt
                </KxdIntelligenceBadge>
              ) : row.responseSource === "ai-assisted" ? (
                <KxdIntelligenceBadge source="ai-assisted" />
              ) : (
                <KxdIntelligenceBadge source="deterministic">KXD Intelligence</KxdIntelligenceBadge>
              )}
            </div>
            <p className="kxd-os-intel-recent__question">{row.question}</p>
            <p className="kxd-os-intel-panel__desc" style={{ marginTop: "0.25rem" }}>
              {statusLabel(row)}
              {" · "}
              {new Date(row.createdAt).toLocaleString()}
            </p>
            {row.intelligenceResponse ? (
              <p className="kxd-os-intel-recent__body">{row.intelligenceResponse}</p>
            ) : null}
            {row.mattResponse ? (
              <p className="kxd-os-intel-recent__body">Matt: {row.mattResponse}</p>
            ) : null}
          </div>
        ))
      )}
    </div>
  ) : null;

  return (
    <KxdIntelligenceCallout
      title="Ask for help"
      description="Short question or blocker. Safe answers come from KXD Intelligence. Sensitive decisions go to Matt."
      inset={inset}
      showMark={!inset}
      action={
        <KxdButton
          type="button"
          variant="intelligence"
          disabled={disabled}
          aria-expanded={open}
          aria-controls={`${formId}-form`}
          onClick={() => setOpen(!open)}
        >
          {open ? "Close" : "Ask for help"}
        </KxdButton>
      }
    >
      {open ? askForm : null}
      {liveStatus}
      {recentBlock}
    </KxdIntelligenceCallout>
  );
}
