/**
 * Phase 20B — Executive Work Composer
 * Universal creation surface for Work Engine (and future OS entry points).
 */

import type { WorkPriority, WorkStatus } from "../types";

export type WorkComposerMode = "create" | "edit";

/** Prefill / invocation options for any OS surface. */
export interface WorkComposerOpenOptions {
  /** create (default) or edit existing work */
  mode?: WorkComposerMode;
  /** Required when mode is edit */
  workId?: number;
  /** Prefill title */
  title?: string;
  /** Prefill description */
  description?: string;
  /** Prefill client */
  clientId?: number | null;
  /** Prefill project label (maps to internalProject today) */
  project?: string;
  /** Prefill due date (YYYY-MM-DD) */
  dueDate?: string;
  /** Prefill start date (YYYY-MM-DD) */
  startDate?: string;
  /** Prefill planned-for date (YYYY-MM-DD) — daily plan, not due date */
  plannedForDate?: string;
  /** Prefill priority */
  priority?: WorkPriority;
  /** Prefill status */
  status?: WorkStatus;
  /** Prefill assignee */
  assignedToId?: number | null;
  /**
   * Prefill time budget in hours (maps to Work.estimatedEffort).
   * Prefer Time Budget presets when invoking from OS surfaces.
   */
  estimatedEffort?: number | null;
  /** Prefill Time Budget preset id (see TIME_BUDGET_PRESETS). */
  timeBudgetPresetId?: string;
  /** Prefill tags */
  tags?: string[];
  /** Source attribution for analytics / lineage */
  source?: string;
  /**
   * Future extension slot — subtasks, attachments, AI drafts, voice,
   * custom duration minutes, suggested budgets, etc.
   * Reserved; ignore unknown keys at runtime.
   */
  extensions?: Record<string, unknown>;
}

export interface WorkComposerClientOption {
  id: number;
  name: string;
}

export interface WorkComposerUserOption {
  id: number;
  email: string;
  displayName: string | null;
}

export interface WorkComposerOptionsPayload {
  clients: WorkComposerClientOption[];
  users: WorkComposerUserOption[];
  currentUser: WorkComposerUserOption | null;
  /** Calendar date for smart defaults (YYYY-MM-DD), server-local intent */
  today: string;
}

export interface WorkComposerDraft {
  mode: WorkComposerMode;
  workId: number | null;
  title: string;
  description: string;
  clientId: number | null;
  project: string;
  dueDate: string;
  priority: WorkPriority;
  status: WorkStatus;
  assignedToId: number | null;
  /**
   * Time Budget selection — preset id from TIME_BUDGET_PRESETS.
   * `custom` uses customHours / customMinutes.
   */
  timeBudgetPresetId: string;
  customHours: string;
  customMinutes: string;
  /** Resolved hours for persistence — null when unset. */
  estimatedEffort: number | null;
  tags: string;
  startDate: string;
  /** Daily plan date (YYYY-MM-DD) — independent of dueDate. */
  plannedForDate: string;
}

export type WorkComposerCreatedHandler = (work: import("../types").WorkListItem) => void;
