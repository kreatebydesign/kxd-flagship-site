"use client";

import { useCallback, useEffect, useState } from "react";
import type { StaffDeliverableView } from "@/lib/staff/work-deliverables";
import {
  WorkAssignmentDeliverablesEditor,
  deliverableDraftFromApi,
  emptyDeliverableRow,
  serializeDeliverableDraft,
  type DeliverableDraftRow,
} from "./WorkAssignmentDeliverablesEditor";

type WorkAssignmentDeliverablesOversightProps = {
  workId: number;
  canEdit: boolean;
};

export function WorkAssignmentDeliverablesOversight({
  workId,
  canEdit,
}: WorkAssignmentDeliverablesOversightProps) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<DeliverableDraftRow[]>([]);
  const [deliverables, setDeliverables] = useState<StaffDeliverableView[]>([]);
  const [staffProgressPreview, setStaffProgressPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [blocked, setBlocked] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/work/${workId}/deliverables`);
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        items?: Array<{
          id: string;
          title: string;
          instructions?: string | null;
          required: boolean;
        }>;
        deliverables?: StaffDeliverableView[];
        staffProgressPreview?: string | null;
        status?: string;
        blocked?: boolean;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Could not load deliverables.");
      }
      setRows(
        data.items?.length ? deliverableDraftFromApi(data.items) : [],
      );
      setDeliverables(data.deliverables ?? []);
      setStaffProgressPreview(data.staffProgressPreview ?? null);
      setStatus(data.status ?? "");
      setBlocked(Boolean(data.blocked));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load deliverables.");
    } finally {
      setLoading(false);
    }
  }, [workId]);

  useEffect(() => {
    // Data fetch on mount — load updates local oversight state from the API.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional mount fetch
    void load();
  }, [load]);

  async function saveDefinition() {
    if (!canEdit) return;
    setBusy(true);
    setError(null);
    setSavedMessage(null);
    try {
      const res = await fetch(`/api/admin/work/${workId}/deliverables`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: serializeDeliverableDraft(rows) }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        deliverables?: StaffDeliverableView[];
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Could not save deliverables.");
      }
      setDeliverables(data.deliverables ?? []);
      setSavedMessage("Deliverables saved.");
      window.setTimeout(() => setSavedMessage(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save deliverables.");
    } finally {
      setBusy(false);
    }
  }

  const completed = deliverables.filter((d) => d.completed).length;
  const total = deliverables.length;
  const requiredOutstanding = deliverables.filter((d) => d.required && !d.completed).length;

  return (
    <section
      className="kxd-os-work-detail__section kxd-os-work-detail__section--compact"
      aria-labelledby="work-deliverables-heading"
    >
      <h2 id="work-deliverables-heading" className="kxd-os-work-detail__section-title">
        Assignment deliverables
      </h2>

      {loading ? (
        <p className="kxd-os-work-detail__hint">Loading deliverable progress…</p>
      ) : (
        <>
          {total > 0 ? (
            <div className="kxd-os-work-deliverables-oversight__summary" aria-live="polite">
              <p className="kxd-os-work-deliverables-oversight__progress">
                <strong>{completed}</strong> of <strong>{total}</strong> complete
                {requiredOutstanding > 0
                  ? ` · ${requiredOutstanding} required outstanding`
                  : " · all required complete"}
              </p>
              {blocked ? (
                <p className="kxd-os-meta kxd-os-work-deliverables-oversight__blocked">
                  Assignment is blocked — staff may need a decision before finishing deliverables.
                </p>
              ) : null}
              {status === "review" ? (
                <p className="kxd-os-meta kxd-os-work-deliverables-oversight__review">
                  Ready for operator review.
                </p>
              ) : null}
              <ul className="kxd-os-work-deliverables-oversight__staff-list">
                {deliverables.map((item) => (
                  <li
                    key={item.id}
                    className={
                      item.completed
                        ? "kxd-os-work-deliverables-oversight__staff-item kxd-os-work-deliverables-oversight__staff-item--done"
                        : "kxd-os-work-deliverables-oversight__staff-item"
                    }
                  >
                    <span aria-hidden>{item.completed ? "✓" : "○"}</span>
                    <span>
                      {item.title}
                      {item.required ? "" : " (optional)"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="kxd-os-work-detail__hint">
              No structured deliverables on this assignment yet. Add steps below when assigning
              staff work.
            </p>
          )}

          {staffProgressPreview ? (
            <div className="kxd-os-work-deliverables-oversight__notes">
              <p className="kxd-os-work-engine__eyebrow">Latest staff progress</p>
              <p className="kxd-os-work-detail__description">{staffProgressPreview}</p>
            </div>
          ) : null}

          {canEdit ? (
            <>
              <WorkAssignmentDeliverablesEditor
                rows={rows.length ? rows : [emptyDeliverableRow()]}
                onChange={setRows}
                disabled={busy}
              />
              <div className="kxd-os-work-deliverables-oversight__actions">
                <button
                  type="button"
                  className="kxd-os-work-detail__action"
                  disabled={busy}
                  onClick={() => void saveDefinition()}
                >
                  {busy ? "Saving…" : "Save deliverables"}
                </button>
                {savedMessage ? (
                  <span className="kxd-os-meta kxd-os-work-deliverables-oversight__saved">
                    {savedMessage}
                  </span>
                ) : null}
              </div>
            </>
          ) : null}

          {error ? <p className="kxd-os-work-composer__error">{error}</p> : null}
        </>
      )}
    </section>
  );
}
