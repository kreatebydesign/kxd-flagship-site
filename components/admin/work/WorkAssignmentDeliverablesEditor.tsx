"use client";

import { createDeliverableId } from "@/lib/staff/work-deliverables";

export type DeliverableDraftRow = {
  id: string;
  title: string;
  instructions: string;
  required: boolean;
};

export function emptyDeliverableRow(): DeliverableDraftRow {
  return {
    id: createDeliverableId(),
    title: "",
    instructions: "",
    required: true,
  };
}

export function deliverableDraftFromApi(
  items: Array<{
    id: string;
    title: string;
    instructions?: string | null;
    required: boolean;
  }>,
): DeliverableDraftRow[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    instructions: item.instructions ?? "",
    required: item.required,
  }));
}

export function serializeDeliverableDraft(rows: DeliverableDraftRow[]) {
  return rows
    .filter((row) => row.title.trim())
    .map((row) => ({
      id: row.id,
      title: row.title.trim(),
      instructions: row.instructions.trim() || null,
      required: row.required,
    }));
}

type WorkAssignmentDeliverablesEditorProps = {
  rows: DeliverableDraftRow[];
  onChange: (rows: DeliverableDraftRow[]) => void;
  disabled?: boolean;
  compact?: boolean;
};

export function WorkAssignmentDeliverablesEditor({
  rows,
  onChange,
  disabled = false,
  compact = false,
}: WorkAssignmentDeliverablesEditorProps) {
  function updateRow(index: number, patch: Partial<DeliverableDraftRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  function moveRow(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  }

  return (
    <div
      className={`kxd-os-work-deliverables-editor${
        compact ? " kxd-os-work-deliverables-editor--compact" : ""
      }`}
    >
      <div className="kxd-os-work-deliverables-editor__head">
        <p className="kxd-os-work-deliverables-editor__label">Assignment deliverables</p>
        <p className="kxd-os-meta kxd-os-work-deliverables-editor__hint">
          Measurable steps staff can check off. Separate from compliance confirmations at submit
          time.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="kxd-os-meta kxd-os-work-deliverables-editor__empty">
          No structured deliverables yet. Add steps staff should complete in order.
        </p>
      ) : (
        <ol className="kxd-os-work-deliverables-editor__list">
          {rows.map((row, index) => (
            <li key={row.id} className="kxd-os-work-deliverables-editor__row">
              <div className="kxd-os-work-deliverables-editor__row-top">
                <span className="kxd-os-work-deliverables-editor__index">{index + 1}</span>
                <input
                  type="text"
                  className="kxd-os-work-deliverables-editor__title"
                  value={row.title}
                  disabled={disabled}
                  placeholder="Deliverable title"
                  onChange={(e) => updateRow(index, { title: e.target.value })}
                />
                <label className="kxd-os-work-deliverables-editor__required">
                  <input
                    type="checkbox"
                    checked={row.required}
                    disabled={disabled}
                    onChange={(e) => updateRow(index, { required: e.target.checked })}
                  />
                  <span>Required</span>
                </label>
              </div>
              <textarea
                className="kxd-os-work-deliverables-editor__instructions"
                rows={2}
                value={row.instructions}
                disabled={disabled}
                placeholder="Optional instructions for this step"
                onChange={(e) => updateRow(index, { instructions: e.target.value })}
              />
              <div className="kxd-os-work-deliverables-editor__row-actions">
                <button
                  type="button"
                  className="kxd-os-work-deliverables-editor__action"
                  disabled={disabled || index === 0}
                  onClick={() => moveRow(index, -1)}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className="kxd-os-work-deliverables-editor__action"
                  disabled={disabled || index === rows.length - 1}
                  onClick={() => moveRow(index, 1)}
                >
                  Move down
                </button>
                <button
                  type="button"
                  className="kxd-os-work-deliverables-editor__action kxd-os-work-deliverables-editor__action--danger"
                  disabled={disabled}
                  onClick={() => removeRow(index)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <button
        type="button"
        className="kxd-os-work-deliverables-editor__add"
        disabled={disabled}
        onClick={() => onChange([...rows, emptyDeliverableRow()])}
      >
        Add deliverable
      </button>
    </div>
  );
}
