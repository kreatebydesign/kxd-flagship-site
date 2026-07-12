/**
 * Universal Quick Create — permanent framework.
 * Individual workflows plug in over time; do not duplicate composers here.
 */

import { openActivityCenter } from "@/lib/activity-engine/events";
import { openWorkComposer } from "@/lib/work/composer";
import { QUICK_CREATE_ACTIONS } from "./constants";
import type { QuickCreateAction, QuickCreateGroupId } from "./types";

export const QUICK_CREATE_OPEN_EVENT = "kxd:quick-create-open";
export const QUICK_NOTE_OPEN_EVENT = "kxd:quick-note-open";

export function openQuickCreate(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(QUICK_CREATE_OPEN_EVENT));
}

export function openQuickNote(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(QUICK_NOTE_OPEN_EVENT));
}

export function openUniversalSearch(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("kxd:command-palette-open"));
}

export function listQuickCreateActions(): QuickCreateAction[] {
  return QUICK_CREATE_ACTIONS;
}

export function listQuickCreateByGroup(): Record<QuickCreateGroupId, QuickCreateAction[]> {
  const groups: Record<QuickCreateGroupId, QuickCreateAction[]> = {
    work: [],
    clients: [],
    reviews: [],
    communications: [],
    finance: [],
    training: [],
    notes: [],
    calendar: [],
  };
  for (const action of QUICK_CREATE_ACTIONS) {
    groups[action.group].push(action);
  }
  return groups;
}

export function runQuickCreateAction(action: QuickCreateAction): void {
  if (!action.available) return;

  if (action.event === "work-composer") {
    openWorkComposer();
    return;
  }
  if (action.event === "command-palette") {
    openUniversalSearch();
    return;
  }
  if (action.event === "activity") {
    openActivityCenter();
    return;
  }
  if (action.event === "quick-note") {
    openQuickNote();
    return;
  }
  if (action.href) {
    window.location.assign(action.href);
  }
}
