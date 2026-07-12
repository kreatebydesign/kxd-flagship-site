/**
 * Phase 20B — Executive Work Composer public API.
 * Invoke from Command Palette, Morning Brief, notifications, Quick Capture, etc.
 */

export type {
  WorkComposerClientOption,
  WorkComposerCreatedHandler,
  WorkComposerDraft,
  WorkComposerOpenOptions,
  WorkComposerOptionsPayload,
  WorkComposerUserOption,
} from "./types";

export {
  applyComposerPrefill,
  createEmptyComposerDraft,
  localDateString,
  parseComposerTags,
  shouldExpandComposerMoreDetails,
} from "./defaults";

export {
  TIME_BUDGET_CUSTOM_ID,
  TIME_BUDGET_PRESETS,
  customPartsFromHours,
  formatTimeBudgetHours,
  hoursFromCustomParts,
  hoursFromTimeBudgetPreset,
  isTimeBudgetCustom,
  resolveTimeBudgetHours,
  timeBudgetPresetFromHours,
} from "./time-budget";
export type { TimeBudgetPreset } from "./time-budget";

export {
  WORK_COMPOSER_CLOSE_EVENT,
  WORK_COMPOSER_CREATED_EVENT,
  WORK_COMPOSER_OPEN_EVENT,
  WORK_COMPOSER_UPDATED_EVENT,
  closeWorkComposer,
  emitWorkComposerCreated,
  emitWorkComposerUpdated,
  openWorkComposer,
} from "./events";
export type { WorkComposerCreatedDetail, WorkComposerUpdatedDetail } from "./events";

export { openWorkComposerForEdit } from "./edit";


