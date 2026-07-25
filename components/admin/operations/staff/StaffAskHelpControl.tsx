"use client";

import { useState } from "react";
import { KxdButton } from "@/components/os";
import type { StaffHelpRequestView } from "@/lib/staff/types";

export interface StaffAskHelpControlProps {
  pagePath: string;
  workId?: number | null;
  canAct: boolean;
  isPreview?: boolean;
  existing?: StaffHelpRequestView[];
  defaultOpen?: boolean;
  onSubmitted?: () => void;
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
  canAct,
  isPreview = false,
  existing = [],
  defaultOpen = false,
  onSubmitted,
}: StaffAskHelpControlProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localExisting, setLocalExisting] = useState(existing);
  const [latest, setLatest] = useState<StaffHelpRequestView | null>(null);

  const disabled = !canAct || isPreview;

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
        setLocalExisting((prev) => {
          const next = prev.filter((row) => row.id !== view.id);
          return [view, ...next];
        });
      }
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your question.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kxd-os-card kxd-os-ops-card-padding">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          alignItems: "center",
        }}
      >
        <div>
          <p className="kxd-os-section__label">Ask KXD Intelligence</p>
          <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
            Short question or blocker. Safe answers come from KXD Intelligence.
            Sensitive decisions go to Matt.
          </p>
        </div>
        <KxdButton
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Ask for help"}
        </KxdButton>
      </div>

      {open ? (
        <div style={{ marginTop: "1rem" }}>
          <label className="kxd-os-meta" htmlFor="staff-help-question">
            What do you need help with?
          </label>
          <textarea
            id="staff-help-question"
            className="kxd-os-input"
            style={{ width: "100%", minHeight: "5rem", marginTop: "0.5rem" }}
            value={question}
            disabled={disabled || busy}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask one short question…"
          />
          <KxdButton
            type="button"
            style={{ marginTop: "0.75rem" }}
            loading={busy}
            disabled={disabled || question.trim().length < 8}
            onClick={submit}
          >
            Ask KXD Intelligence
          </KxdButton>
        </div>
      ) : null}

      {error ? (
        <p
          className="kxd-os-meta"
          role="alert"
          style={{ marginTop: "0.75rem", color: "var(--kxd-os-critical)" }}
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
          {message}
        </p>
      ) : null}

      {latest?.intelligenceResponse ? (
        <div
          className="kxd-os-card kxd-os-ops-card-inset"
          style={{ marginTop: "1rem" }}
          role="status"
        >
          <p className="kxd-os-section__label">KXD Intelligence</p>
          <p style={{ marginTop: "0.5rem" }}>{latest.intelligenceResponse}</p>
          {latest.requiresMatt ? (
            <p className="kxd-os-meta" style={{ marginTop: "0.5rem" }}>
              I need Matt to confirm this. It is in his review queue.
            </p>
          ) : null}
        </div>
      ) : null}

      {localExisting.length > 0 ? (
        <div style={{ marginTop: "1rem" }}>
          <p className="kxd-os-meta">Recent help</p>
          {localExisting.slice(0, 4).map((row) => (
            <div key={row.id} style={{ marginTop: "0.75rem" }}>
              <p className="kxd-os-ops-list-row__title" style={{ fontSize: "0.95rem" }}>
                {row.question}
              </p>
              <p className="kxd-os-meta" style={{ marginTop: "0.25rem" }}>
                {statusLabel(row)}
                {" · "}
                {new Date(row.createdAt).toLocaleString()}
              </p>
              {row.intelligenceResponse ? (
                <p style={{ marginTop: "0.35rem" }}>{row.intelligenceResponse}</p>
              ) : null}
              {row.requiresMatt && !row.mattResponse ? (
                <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
                  I need Matt to confirm this.
                </p>
              ) : null}
              {row.mattResponse ? (
                <p style={{ marginTop: "0.35rem" }}>
                  Matt: {row.mattResponse}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
