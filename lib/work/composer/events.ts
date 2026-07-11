import type { WorkComposerOpenOptions } from "./types";

/** Custom event — any OS surface can open the Executive Work Composer. */
export const WORK_COMPOSER_OPEN_EVENT = "kxd:work-composer-open";
export const WORK_COMPOSER_CLOSE_EVENT = "kxd:work-composer-close";
export const WORK_COMPOSER_CREATED_EVENT = "kxd:work-composer-created";
export const WORK_COMPOSER_UPDATED_EVENT = "kxd:work-composer-updated";

export function openWorkComposer(options?: WorkComposerOpenOptions): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(WORK_COMPOSER_OPEN_EVENT, { detail: options ?? {} }),
  );
}

export function closeWorkComposer(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WORK_COMPOSER_CLOSE_EVENT));
}

export type WorkComposerCreatedDetail = {
  work: import("../types").WorkListItem;
};

export type WorkComposerUpdatedDetail = {
  work: import("../types").WorkListItem;
};

export function emitWorkComposerCreated(work: WorkComposerCreatedDetail["work"]): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(WORK_COMPOSER_CREATED_EVENT, { detail: { work } }),
  );
}

export function emitWorkComposerUpdated(work: WorkComposerUpdatedDetail["work"]): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(WORK_COMPOSER_UPDATED_EVENT, { detail: { work } }),
  );
}

