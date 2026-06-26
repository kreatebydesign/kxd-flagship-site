// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExecutiveNoteDoc = Record<string, any>;

export type ExecutiveNoteType =
  | "strategy"
  | "meeting"
  | "opportunity"
  | "research"
  | "sales"
  | "website"
  | "infrastructure"
  | "marketing"
  | "finance"
  | "relationship"
  | "personal"
  | "follow-up"
  | "internal";

export type ExecutiveNotePriority = "low" | "normal" | "high" | "critical";
export type ExecutiveNoteStatus = "active" | "archived";

export type VaultView =
  | "all"
  | "by-client"
  | "pinned"
  | "recent"
  | "reminders"
  | "opportunities"
  | "research"
  | "search";

export type TimelinePromotionType =
  | "meeting-summary"
  | "decision"
  | "major-milestone"
  | "opportunity"
  | "follow-up";

export interface CreateExecutiveNoteInput {
  clientId: number;
  title: string;
  summary?: string;
  noteType?: ExecutiveNoteType;
  priority?: ExecutiveNotePriority;
  pinned?: boolean;
  private?: boolean;
  reminderDate?: string;
  author?: string;
  tags?: string[];
}

export interface ExecutiveNoteSearchFilters {
  q?: string;
  clientId?: number;
  noteType?: ExecutiveNoteType | ExecutiveNoteType[];
  priority?: ExecutiveNotePriority;
  pinned?: boolean;
  author?: string;
  status?: ExecutiveNoteStatus;
  projectId?: number;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export interface ExecutiveNoteListItem {
  id: number;
  clientId: number;
  clientName: string;
  title: string;
  summary: string | null;
  noteType: string;
  priority: string;
  pinned: boolean;
  reminderDate: string | null;
  author: string | null;
  updatedAt: string;
  href: string;
}

export interface ReminderItem {
  id: number;
  noteId: number;
  clientId: number;
  clientName: string;
  title: string;
  reminderDate: string;
  daysUntil: number;
  overdue: boolean;
  priority: string;
  href: string;
}

export interface RelationshipIntelligence {
  openOpportunities: string[];
  promisesMade: string[];
  pendingFollowUps: string[];
  personalInformation: string[];
  businessGoals: string[];
  growthIdeas: string[];
  risks: string[];
  nextConversationTopics: string[];
}

export interface StrategyVaultData {
  view: VaultView;
  notes: ExecutiveNoteListItem[];
  reminders: ReminderItem[];
  clients: Array<{ id: number; name: string; noteCount: number }>;
  totalCount: number;
  searchQuery?: string;
  clientId?: number;
}

export interface ClientStrategySummary {
  latestNotes: ExecutiveNoteListItem[];
  pinnedStrategy: ExecutiveNoteListItem[];
  upcomingReminders: ReminderItem[];
  relationshipInsights: RelationshipIntelligence;
  recentDecisions: ExecutiveNoteListItem[];
}

/** Future-ready connector interfaces — no AI in Phase 6E */
export interface SemanticSearchConnector {
  id: string;
  isConfigured(): boolean;
  search?(query: string, clientId?: number): Promise<number[]>;
}

export interface TranscriptionConnector {
  id: string;
  isConfigured(): boolean;
  transcribe?(mediaId: number): Promise<string | null>;
}

export const FUTURE_CONNECTORS = {
  semanticSearch: { id: "semantic-search", status: "not-configured" as const },
  voiceTranscription: { id: "voice-transcription", status: "not-configured" as const },
  meetingTranscription: { id: "meeting-transcription", status: "not-configured" as const },
  ideaClustering: { id: "idea-clustering", status: "not-configured" as const },
};
