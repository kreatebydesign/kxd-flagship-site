"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { WorkListItem } from "@/lib/work/types";

export function WorkOperatorReviewPanel({
  workId,
  assigneeLabel,
  onWorkUpdated,
}: {
  workId: number;
  assigneeLabel: string | null;
  onWorkUpdated: (work: WorkListItem) => void;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"approve" | "return" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refreshWork() {
    const res = await fetch(`/api/admin/work/${workId}`);
    const data = (await res.json()) as { ok?: boolean; work?: WorkListItem };
    if (data.ok && data.work) onWorkUpdated(data.work);
  }

  async function approve() {
    setBusy("approve");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/staff/work/${workId}/matt`, {
        method: "PUT",
      });
      const payload = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || payload.success === false) {
        throw new Error(payload.error ?? "Could not approve work.");
      }
      setMessage("Approved and marked complete.");
      await refreshWork();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve work.");
    } finally {
      setBusy(null);
    }
  }

  async function returnForRevision() {
    const trimmed = note.trim();
    if (!trimmed) {
      setError("Add a revision note so staff knows what to change.");
      return;
    }
    setBusy("return");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/staff/work/${workId}/matt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: trimmed }),
      });
      const payload = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || payload.success === false) {
        throw new Error(payload.error ?? "Could not return work.");
      }
      setMessage("Returned to staff for revision.");
      setNote("");
      await refreshWork();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not return work.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      className="kxd-os-work-detail__review-panel"
      aria-label="Staff submission review"
    >
      <h2 className="kxd-os-work-detail__review-title">Ready for your review</h2>
      <p className="kxd-os-meta">
        {assigneeLabel
          ? `${assigneeLabel} submitted this work for approval.`
          : "Staff submitted this work for approval."}
      </p>
      <label className="kxd-os-work-detail__review-field">
        <span className="kxd-os-work-detail__meta-label">Revision note (required to return)</span>
        <textarea
          className="kxd-os-work-detail__review-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What should change before this can be approved?"
        />
      </label>
      {error ? <p className="kxd-os-work-composer__error">{error}</p> : null}
      {message ? <p className="kxd-os-meta" role="status">{message}</p> : null}
      <div className="kxd-os-work-detail__action-group">
        <button
          type="button"
          className="kxd-os-work-detail__action kxd-os-work-detail__action--primary"
          disabled={busy != null}
          onClick={() => void approve()}
        >
          {busy === "approve" ? "Approving…" : "Approve & complete"}
        </button>
        <button
          type="button"
          className="kxd-os-work-detail__action"
          disabled={busy != null}
          onClick={() => void returnForRevision()}
        >
          {busy === "return" ? "Returning…" : "Return for revision"}
        </button>
      </div>
    </section>
  );
}
