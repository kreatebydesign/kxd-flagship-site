"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { fmtWorkspaceDate } from "@/lib/executive-client-workspace/theme";
import type {
  ClientActionPriority,
  ClientActionStatus,
  WorkspaceActionRow,
} from "@/lib/client-command/actions/types";
import type { ClientWorkspaceBundle } from "@/lib/client-command/workspace-types";
import {
  WorkspaceChapter,
  WorkspaceEmpty,
  WorkspaceKpiGrid,
} from "@/components/admin/operations/client-workspace/WorkspacePrimitives";

const OPEN_STATUSES = new Set<ClientActionStatus>(["pending", "in-progress", "waiting"]);

const PRIORITY_OPTIONS: Array<{ value: ClientActionPriority; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

function priorityClass(priority: string): string {
  if (priority === "critical") return "kxd-os-actions-priority--critical";
  if (priority === "high") return "kxd-os-actions-priority--high";
  if (priority === "low") return "kxd-os-actions-priority--low";
  return "";
}

function statusLabel(status: string): string {
  return status.replace(/-/g, " ");
}

function ActionSection({
  title,
  rows,
  selected,
  onToggle,
  onToggleAll,
}: {
  title: string;
  rows: WorkspaceActionRow[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  onToggleAll: (ids: number[], checked: boolean) => void;
}) {
  if (rows.length === 0) {
    return (
      <WorkspaceChapter title={title} variant="compact">
        <WorkspaceEmpty message="Nothing in this queue." />
      </WorkspaceChapter>
    );
  }

  const ids = rows.map((r) => r.id);
  const allSelected = ids.every((id) => selected.has(id));

  return (
    <WorkspaceChapter title={title} variant="compact">
      <div className="kxd-os-actions-section-head">
        <label className="kxd-os-actions-check">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => onToggleAll(ids, e.target.checked)}
          />
          <span>Select all</span>
        </label>
        <span className="kxd-os-actions-section-count">{rows.length}</span>
      </div>
      <ul className="kxd-os-actions-list">
        {rows.map((row) => (
          <li key={row.id} className="kxd-os-actions-list__item">
            <label className="kxd-os-actions-check kxd-os-actions-check--row">
              <input
                type="checkbox"
                checked={selected.has(row.id)}
                onChange={() => onToggle(row.id)}
              />
            </label>
            <div className="kxd-os-actions-list__body">
              <div className="kxd-os-actions-list__head">
                <Link href={row.href} className="kxd-os-actions-list__title">
                  {row.title}
                </Link>
                <span
                  className={`kxd-os-actions-priority ${priorityClass(row.priority)}`}
                >
                  {row.priority}
                </span>
                <span className="kxd-os-workspace-badge">{statusLabel(row.status)}</span>
              </div>
              {row.description ? (
                <p className="kxd-os-actions-list__detail">{row.description}</p>
              ) : null}
              <div className="kxd-os-actions-list__meta">
                <span>{row.source}</span>
                <span>{row.actionType.replace(/-/g, " ")}</span>
                {row.dueDate ? <span>Due {fmtWorkspaceDate(row.dueDate)}</span> : null}
                {row.assignedTo ? <span>→ {row.assignedTo}</span> : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </WorkspaceChapter>
  );
}

export function ClientActionsPanel({ data }: { data: ClientWorkspaceBundle }) {
  const router = useRouter();
  const snapshot = data.actions;
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<"idle" | "loading" | "error">("idle");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkPriority, setBulkPriority] = useState<ClientActionPriority>("medium");
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [bulkDueDate, setBulkDueDate] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [createStatus, setCreateStatus] = useState<"idle" | "loading" | "error">("idle");

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(ids: number[], checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  async function runBulk(
    patch: {
      status?: ClientActionStatus;
      priority?: ClientActionPriority;
      assignedTo?: string | null;
      dueDate?: string | null;
    },
  ) {
    if (!selectedIds.length) return;
    setBulkStatus("loading");
    setBulkError(null);
    try {
      const res = await fetch("/api/admin/client-command/actions/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, ...patch }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Bulk update failed.");
      }
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setBulkStatus("error");
      setBulkError(err instanceof Error ? err.message : "Bulk update failed.");
    } finally {
      setBulkStatus("idle");
    }
  }

  async function createManual() {
    if (!newTitle.trim()) return;
    setCreateStatus("loading");
    try {
      const res = await fetch("/api/admin/client-command/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: data.clientId,
          title: newTitle.trim(),
          source: "Manual",
          dueDate: newDueDate || undefined,
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Create failed.");
      }
      setNewTitle("");
      setNewDueDate("");
      router.refresh();
    } catch {
      setCreateStatus("error");
    } finally {
      setCreateStatus("idle");
    }
  }

  return (
    <div className="kxd-os-actions">
      <header className="kxd-os-actions__hero">
        <div>
          <p className="kxd-os-eyebrow">Executive workflow</p>
          <h2 className="kxd-os-actions__title">Client actions</h2>
          <p className="kxd-os-actions__lead">
            Intelligence recommendations and manual follow-ups — execute without leaving Client Command.
          </p>
        </div>
        <Link
          href={`/admin/operations/client-command/${data.clientId}?tab=intelligence`}
          className="kxd-os-link-quiet"
        >
          Intelligence →
        </Link>
      </header>

      <WorkspaceKpiGrid
        items={[
          { label: "Open", value: String(snapshot.openCount) },
          { label: "Critical", value: String(snapshot.criticalCount) },
          {
            label: "Overdue",
            value: String(snapshot.overdue.length),
          },
          {
            label: "Due today",
            value: String(
              snapshot.todayPriorities.filter(
                (a) => a.dueDate && OPEN_STATUSES.has(a.status),
              ).length,
            ),
          },
        ]}
      />

      {selectedIds.length > 0 ? (
        <div className="kxd-os-actions-bulk">
          <p className="kxd-os-actions-bulk__label">{selectedIds.length} selected</p>
          <div className="kxd-os-actions-bulk__row">
            <button
              type="button"
              className="kxd-os-comm-row-actions__btn"
              disabled={bulkStatus === "loading"}
              onClick={() => runBulk({ status: "completed" })}
            >
              Complete
            </button>
            <button
              type="button"
              className="kxd-os-comm-row-actions__btn"
              disabled={bulkStatus === "loading"}
              onClick={() => runBulk({ status: "dismissed" })}
            >
              Dismiss
            </button>
            <button
              type="button"
              className="kxd-os-comm-row-actions__btn"
              disabled={bulkStatus === "loading"}
              onClick={() => runBulk({ status: "archived" })}
            >
              Archive
            </button>
            <select
              className="kxd-os-comm-filters__select"
              value={bulkPriority}
              onChange={(e) => setBulkPriority(e.target.value as ClientActionPriority)}
            >
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              type="button"
              className="kxd-os-comm-row-actions__btn"
              disabled={bulkStatus === "loading"}
              onClick={() => runBulk({ priority: bulkPriority })}
            >
              Set priority
            </button>
            <input
              type="text"
              className="kxd-os-comm-filters__search"
              placeholder="Assign to…"
              value={bulkAssignee}
              onChange={(e) => setBulkAssignee(e.target.value)}
            />
            <button
              type="button"
              className="kxd-os-comm-row-actions__btn"
              disabled={bulkStatus === "loading" || !bulkAssignee.trim()}
              onClick={() =>
                runBulk({ assignedTo: bulkAssignee.trim(), status: "in-progress" })
              }
            >
              Assign
            </button>
            <input
              type="date"
              className="kxd-os-comm-filters__select"
              value={bulkDueDate}
              onChange={(e) => setBulkDueDate(e.target.value)}
            />
            <button
              type="button"
              className="kxd-os-comm-row-actions__btn"
              disabled={bulkStatus === "loading" || !bulkDueDate}
              onClick={() =>
                runBulk({ dueDate: new Date(bulkDueDate).toISOString() })
              }
            >
              Move due date
            </button>
          </div>
          {bulkError ? (
            <p className="kxd-os-command-timeline-form__error">{bulkError}</p>
          ) : null}
        </div>
      ) : null}

      <WorkspaceChapter title="New action" variant="compact">
        <div className="kxd-os-comm-form-row">
          <input
            type="text"
            className="kxd-os-comm-filters__search"
            placeholder="Action title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <input
            type="date"
            className="kxd-os-comm-filters__select"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
          />
          <button
            type="button"
            className="kxd-os-command-timeline-actions__btn kxd-os-command-timeline-actions__btn--primary"
            disabled={createStatus === "loading" || !newTitle.trim()}
            onClick={() => createManual()}
          >
            Add action
          </button>
        </div>
      </WorkspaceChapter>

      <div className="kxd-os-workspace-dossier-columns">
        <ActionSection
          title="Today's priorities"
          rows={snapshot.todayPriorities}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
        />
        <ActionSection
          title="Overdue"
          rows={snapshot.overdue}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
        />
      </div>

      <div className="kxd-os-workspace-dossier-columns">
        <ActionSection
          title="Upcoming"
          rows={snapshot.upcoming}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
        />
        <ActionSection
          title="Revenue opportunities"
          rows={snapshot.revenueOpportunities}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
        />
      </div>

      <div className="kxd-os-workspace-dossier-columns">
        <ActionSection
          title="Retention risks"
          rows={snapshot.retentionRisks}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
        />
        <ActionSection
          title="Completed recently"
          rows={snapshot.completedRecently}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
        />
      </div>
    </div>
  );
}
