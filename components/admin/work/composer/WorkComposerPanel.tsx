"use client";

/**
 * Phase 24C — Executive Work Composer v2
 * Premium capture: four primary fields, calm More details, reserved intelligence slot.
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  WORK_PRIORITIES,
  WORK_PRIORITY_LABELS,
  WORK_STATUSES,
  WORK_STATUS_LABELS,
} from "@/lib/work/constants";
import {
  WORK_COMPOSER_CLOSE_EVENT,
  WORK_COMPOSER_OPEN_EVENT,
  TIME_BUDGET_PRESETS,
  applyComposerPrefill,
  createEmptyComposerDraft,
  emitWorkComposerCreated,
  emitWorkComposerUpdated,
  hoursFromTimeBudgetPreset,
  isTimeBudgetCustom,
  localDateString,
  parseComposerTags,
  resolveTimeBudgetHours,
  shouldExpandComposerMoreDetails,
} from "@/lib/work/composer";
import type {
  WorkComposerDraft,
  WorkComposerOpenOptions,
  WorkComposerOptionsPayload,
  WorkComposerUserOption,
} from "@/lib/work/composer";
import type { WorkListItem, WorkPriority, WorkStatus } from "@/lib/work/types";

type WorkComposerPanelProps = {
  currentUser?: WorkComposerUserOption | null;
  onCreated?: (work: WorkListItem) => void;
  onUpdated?: (work: WorkListItem) => void;
};

/** Reserved — hide completely until KXD Intelligence has real suggestions. */
type ComposerSuggestion = {
  id: string;
  label: string;
};

export function WorkComposerPanel({
  currentUser: seedUser,
  onCreated,
  onUpdated,
}: WorkComposerPanelProps) {
  const titleId = useId();
  const moreId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<WorkComposerDraft>(() =>
    createEmptyComposerDraft(localDateString(), seedUser?.id ?? null),
  );
  const [options, setOptions] = useState<WorkComposerOptionsPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [suggestions] = useState<ComposerSuggestion[]>([]);

  const resetDraft = useCallback(
    (prefill?: WorkComposerOpenOptions | null, user?: WorkComposerUserOption | null) => {
      const assignee = user?.id ?? seedUser?.id ?? null;
      const today = options?.today ?? localDateString();
      const base = createEmptyComposerDraft(today, assignee);
      const next = applyComposerPrefill(base, prefill);
      setDraft(next);
      setMoreOpen(shouldExpandComposerMoreDetails(next));
      setError(null);
    },
    [options?.today, seedUser?.id],
  );

  const close = useCallback(() => {
    setOpen(false);
    setBusy(false);
    setError(null);
    setMoreOpen(false);
  }, []);

  function setTimeBudgetPreset(presetId: string) {
    setDraft((prev) => {
      const next = {
        ...prev,
        timeBudgetPresetId: presetId,
        estimatedEffort: hoursFromTimeBudgetPreset(presetId),
      };
      if (!isTimeBudgetCustom(presetId)) {
        next.customHours = "";
        next.customMinutes = "";
      }
      next.estimatedEffort = resolveTimeBudgetHours(next);
      return next;
    });
  }

  const openComposer = useCallback(
    (prefill?: WorkComposerOpenOptions | null) => {
      resetDraft(prefill, options?.currentUser ?? seedUser);
      setOpen(true);
    },
    [options?.currentUser, resetDraft, seedUser],
  );

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<WorkComposerOpenOptions>).detail;
      openComposer(detail ?? {});
    }
    function onClose() {
      close();
    }
    window.addEventListener(WORK_COMPOSER_OPEN_EVENT, onOpen);
    window.addEventListener(WORK_COMPOSER_CLOSE_EVENT, onClose);
    return () => {
      window.removeEventListener(WORK_COMPOSER_OPEN_EVENT, onOpen);
      window.removeEventListener(WORK_COMPOSER_CLOSE_EVENT, onClose);
    };
  }, [close, openComposer]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      titleRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open || optionsLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/work/composer-options");
        const data = (await res.json()) as WorkComposerOptionsPayload & {
          ok?: boolean;
          error?: string;
        };
        if (cancelled || !res.ok || data.ok === false) return;
        setOptions(data);
        setOptionsLoaded(true);
        setDraft((prev) => {
          if (prev.mode === "edit" || prev.assignedToId != null) return prev;
          const id = data.currentUser?.id ?? seedUser?.id ?? null;
          return { ...prev, assignedToId: id, startDate: prev.startDate || data.today };
        });
      } catch {
        /* pickers degrade gracefully */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, optionsLoaded, seedUser?.id]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, open]);

  function patch<K extends keyof WorkComposerDraft>(key: K, value: WorkComposerDraft[K]) {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "customHours" || key === "customMinutes" || key === "timeBudgetPresetId") {
        next.estimatedEffort = resolveTimeBudgetHours(next);
      }
      return next;
    });
  }

  async function submit() {
    const title = draft.title.trim();
    if (!title || busy) return;
    if (draft.mode === "edit" && !draft.workId) {
      setError("Missing work id.");
      return;
    }

    const estimatedEffort = resolveTimeBudgetHours(draft);
    setBusy(true);
    setError(null);

    const payload = {
      title,
      description: draft.description.trim() || null,
      clientId: draft.clientId,
      project: draft.project.trim() || null,
      dueDate: draft.dueDate || null,
      startDate: draft.startDate || null,
      plannedForDate: draft.plannedForDate || null,
      priority: draft.priority,
      status: draft.status,
      assignedToId: draft.assignedToId,
      estimatedEffort,
      tags: parseComposerTags(draft.tags),
      source: "manual" as const,
    };

    try {
      const isEdit = draft.mode === "edit" && draft.workId != null;
      const res = await fetch(
        isEdit ? `/api/admin/work/${draft.workId}` : "/api/admin/work/create",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEdit
              ? {
                  ...payload,
                  internalProject: payload.project,
                }
              : payload,
          ),
        },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        work?: WorkListItem;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.work) {
        setError(data.error ?? (isEdit ? "Could not save work." : "Could not create work."));
        setBusy(false);
        return;
      }
      if (isEdit) {
        emitWorkComposerUpdated(data.work);
        onUpdated?.(data.work);
      } else {
        emitWorkComposerCreated(data.work);
        onCreated?.(data.work);
      }
      close();
      resetDraft(null, options?.currentUser ?? seedUser);
    } catch {
      setError(draft.mode === "edit" ? "Could not save work." : "Could not create work.");
      setBusy(false);
    }
  }

  function onFormSubmit(e: FormEvent) {
    e.preventDefault();
    void submit();
  }

  function onTitleKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      descriptionRef.current?.focus();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void submit();
    }
  }

  function onDescriptionKeyDown(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void submit();
    }
  }

  if (!open) return null;

  const users = options?.users ?? (seedUser ? [seedUser] : []);
  const clients = options?.clients ?? [];
  const isEdit = draft.mode === "edit";
  const titleReady = Boolean(draft.title.trim());
  const hasSuggestions = suggestions.length > 0;

  const modal = (
    <div
      className="kxd-os-work-composer-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="kxd-os-work-composer kxd-os-work-composer--v2"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <form className="kxd-os-work-composer__form" onSubmit={onFormSubmit}>
          <header className="kxd-os-work-composer__header">
            <div className="kxd-os-work-composer__header-copy">
              <h2 id={titleId} className="kxd-os-work-composer__headline">
                What needs to get done?
              </h2>
              <p className="kxd-os-work-composer__lede">
                Capture it once.
                <br />
                KXD OS will organize the rest.
              </p>
            </div>
            {isEdit ? (
              <p className="kxd-os-work-composer__mode">Edit</p>
            ) : null}
          </header>

          <div className="kxd-os-work-composer__scroll">
            <label className="kxd-os-work-composer__primary-field">
              <span className="kxd-os-work-composer__primary-label">Title</span>
              <input
                ref={titleRef}
                className="kxd-os-work-composer__title"
                placeholder="Name this work"
                value={draft.title}
                onChange={(e) => patch("title", e.target.value)}
                onKeyDown={onTitleKeyDown}
                required
                autoComplete="off"
                aria-label="Work title"
              />
            </label>

            <label className="kxd-os-work-composer__primary-field">
              <span className="kxd-os-work-composer__primary-label">Description</span>
              <textarea
                ref={descriptionRef}
                className="kxd-os-work-composer__description"
                placeholder="Add context if it helps"
                value={draft.description}
                onChange={(e) => patch("description", e.target.value)}
                onKeyDown={onDescriptionKeyDown}
                rows={3}
                aria-label="Description"
              />
            </label>

            <div className="kxd-os-work-composer__essentials">
              <label className="kxd-os-work-composer__field">
                <span>Client</span>
                <select
                  value={draft.clientId ?? ""}
                  onChange={(e) =>
                    patch("clientId", e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">Optional</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="kxd-os-work-composer__field">
                <span>Due date</span>
                <input
                  type="date"
                  value={draft.dueDate}
                  onChange={(e) => patch("dueDate", e.target.value)}
                />
              </label>
            </div>

            {hasSuggestions ? (
              <div
                className="kxd-os-work-composer__intelligence"
                aria-label="Suggestions"
              >
                <p className="kxd-os-work-composer__intelligence-label">Suggestions</p>
                <ul className="kxd-os-work-composer__intelligence-list">
                  {suggestions.map((item) => (
                    <li key={item.id}>{item.label}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="kxd-os-work-composer__more">
              <button
                type="button"
                className="kxd-os-work-composer__more-toggle"
                aria-expanded={moreOpen}
                aria-controls={moreId}
                onClick={() => setMoreOpen((v) => !v)}
              >
                More details
                <span className="kxd-os-work-composer__more-chevron" aria-hidden>
                  {moreOpen ? "–" : "+"}
                </span>
              </button>

              {moreOpen ? (
                <div
                  id={moreId}
                  className="kxd-os-work-composer__more-panel kxd-os-work-composer__more-panel--open"
                >
                  <div className="kxd-os-work-composer__meta">
                    <label className="kxd-os-work-composer__field">
                      <span>Project</span>
                      <input
                        type="text"
                        value={draft.project}
                        onChange={(e) => patch("project", e.target.value)}
                        placeholder="Optional"
                      />
                    </label>

                    <label className="kxd-os-work-composer__field">
                      <span>Start date</span>
                      <input
                        type="date"
                        value={draft.startDate}
                        onChange={(e) => patch("startDate", e.target.value)}
                      />
                    </label>

                    <label className="kxd-os-work-composer__field">
                      <span>Planned date</span>
                      <input
                        type="date"
                        value={draft.plannedForDate}
                        onChange={(e) => patch("plannedForDate", e.target.value)}
                      />
                    </label>

                    <label className="kxd-os-work-composer__field">
                      <span>Priority</span>
                      <select
                        value={draft.priority}
                        onChange={(e) =>
                          patch("priority", e.target.value as WorkPriority)
                        }
                      >
                        {WORK_PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {WORK_PRIORITY_LABELS[p]}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="kxd-os-work-composer__field">
                      <span>Status</span>
                      <select
                        value={draft.status}
                        onChange={(e) =>
                          patch("status", e.target.value as WorkStatus)
                        }
                      >
                        {WORK_STATUSES.filter((s) => s !== "archived").map((s) => (
                          <option key={s} value={s}>
                            {WORK_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="kxd-os-work-composer__field">
                      <span>Assigned to</span>
                      <select
                        value={draft.assignedToId ?? ""}
                        onChange={(e) =>
                          patch(
                            "assignedToId",
                            e.target.value ? Number(e.target.value) : null,
                          )
                        }
                      >
                        <option value="">Unassigned</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.displayName || u.email}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="kxd-os-work-composer__field">
                      <span>Time budget</span>
                      <select
                        value={draft.timeBudgetPresetId}
                        onChange={(e) => setTimeBudgetPreset(e.target.value)}
                        aria-label="Time budget"
                      >
                        {TIME_BUDGET_PRESETS.map((opt) => (
                          <option key={opt.id || "none"} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    {isTimeBudgetCustom(draft.timeBudgetPresetId) ? (
                      <div className="kxd-os-work-composer__field kxd-os-work-composer__field--wide kxd-os-work-composer__custom-budget">
                        <span>Custom duration</span>
                        <div className="kxd-os-work-composer__custom-budget-inputs">
                          <label>
                            <span className="kxd-os-work-composer__custom-budget-label">
                              Hours
                            </span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              inputMode="numeric"
                              value={draft.customHours}
                              onChange={(e) => patch("customHours", e.target.value)}
                              placeholder="0"
                              aria-label="Custom hours"
                            />
                          </label>
                          <label>
                            <span className="kxd-os-work-composer__custom-budget-label">
                              Minutes
                            </span>
                            <input
                              type="number"
                              min={0}
                              max={59}
                              step={1}
                              inputMode="numeric"
                              value={draft.customMinutes}
                              onChange={(e) => patch("customMinutes", e.target.value)}
                              placeholder="0"
                              aria-label="Custom minutes"
                            />
                          </label>
                        </div>
                      </div>
                    ) : null}

                    <label className="kxd-os-work-composer__field kxd-os-work-composer__field--wide">
                      <span>Tags</span>
                      <input
                        type="text"
                        value={draft.tags}
                        onChange={(e) => patch("tags", e.target.value)}
                        placeholder="Optional — comma separated"
                      />
                    </label>
                  </div>
                </div>
              ) : null}
            </div>

            {error ? <p className="kxd-os-work-composer__error">{error}</p> : null}
          </div>

          <footer className="kxd-os-work-composer__footer">
            <div className="kxd-os-work-composer__footer-hint" aria-live="polite">
              {titleReady ? (
                <span>
                  ⌘ Enter to {isEdit ? "save" : "create"} · Esc to close
                </span>
              ) : null}
            </div>
            <div className="kxd-os-work-composer__footer-actions">
              <button
                type="button"
                className="kxd-os-work-composer__cancel"
                onClick={close}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="kxd-os-work-composer__submit"
                disabled={busy || !titleReady}
              >
                {busy
                  ? isEdit
                    ? "Saving…"
                    : "Creating…"
                  : isEdit
                    ? "Save changes"
                    : "Create Work"}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
