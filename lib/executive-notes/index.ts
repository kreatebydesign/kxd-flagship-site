export type {
  ClientStrategySummary,
  CreateExecutiveNoteInput,
  ExecutiveNoteDoc,
  ExecutiveNoteListItem,
  ExecutiveNotePriority,
  ExecutiveNoteType,
  RelationshipIntelligence,
  ReminderItem,
  StrategyVaultData,
  TimelinePromotionType,
  VaultView,
  FUTURE_CONNECTORS,
} from "./types";

export {
  convertNoteToTimeline,
  createExecutiveNote,
  getClientExecutiveNotes,
  getExecutiveNoteById,
  toNoteListItem,
} from "./engine";

export { searchExecutiveNotes, searchExecutiveNotesByTag } from "./search";

export {
  getClientReminders,
  getDailyBriefingReminders,
  getOverdueReminders,
  getRemindersDueToday,
  getUpcomingReminders,
} from "./reminders";

export { buildRelationshipIntelligence } from "./relationships";

export { getClientStrategySummary, getStrategyVaultData } from "./vault";
