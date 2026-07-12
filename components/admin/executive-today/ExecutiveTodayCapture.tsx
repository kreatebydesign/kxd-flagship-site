"use client";

import { openQuickCreate, openQuickNote } from "@/lib/executive-workspace";
import { openWorkComposer } from "@/lib/work/composer";

/**
 * First-class capture surface — opens hosts already mounted in Executive Workspace.
 */
export function ExecutiveTodayCapture() {
  return (
    <div className="kxd-exec-today__capture">
      <p className="kxd-exec-today__capture-lede">
        Capture without leaving Today. Notes, work, and create stay one gesture away.
      </p>
      <div className="kxd-exec-today__capture-actions">
        <button
          type="button"
          className="kxd-exec-today__capture-btn kxd-exec-today__capture-btn--primary"
          onClick={() => openQuickNote()}
        >
          <span className="kxd-exec-today__capture-btn-label">Note</span>
          <span className="kxd-exec-today__capture-btn-hint">Quick thought</span>
        </button>
        <button
          type="button"
          className="kxd-exec-today__capture-btn"
          onClick={() => openWorkComposer()}
        >
          <span className="kxd-exec-today__capture-btn-label">Work</span>
          <span className="kxd-exec-today__capture-btn-hint">New work item</span>
        </button>
        <button
          type="button"
          className="kxd-exec-today__capture-btn"
          onClick={() => openQuickCreate()}
        >
          <span className="kxd-exec-today__capture-btn-label">Create</span>
          <span className="kxd-exec-today__capture-btn-hint">Everything else</span>
        </button>
      </div>
    </div>
  );
}
