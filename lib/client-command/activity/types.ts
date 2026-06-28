import type {
  ExecutiveTimelineCategory,
  ExecutiveTimelineImportance,
  ExecutiveTimelineSourceModule,
} from "@/lib/executive-timeline/types";

export type ClientActivitySourceModule =
  | ExecutiveTimelineSourceModule
  | "Client Command"
  | "Projects"
  | "Requests"
  | "Sales"
  | "Retainers"
  | "Client Success"
  | "Emails";

export type ClientActivityStatus =
  | "active"
  | "open"
  | "completed"
  | "archived"
  | "cancelled"
  | string;

export interface ClientActivityLink {
  label: string;
  href: string;
}

export interface ClientActivityAttachment {
  label: string;
  href: string;
}

/** Canonical activity payload — stored on executive-timeline-events via the publish layer. */
export interface ClientActivityInput {
  clientId: number;
  sourceModule: ClientActivitySourceModule;
  sourceType: string;
  sourceId: string | number;
  eventType: string;
  title: string;
  summary?: string;
  details?: string;
  author?: string;
  timestamp?: string;
  status?: ClientActivityStatus;
  priority?: ExecutiveTimelineImportance;
  metadata?: Record<string, unknown>;
  relatedLinks?: ClientActivityLink[];
  attachments?: ClientActivityAttachment[];
  projectId?: number;
  requestId?: number;
  infrastructureId?: number;
  deliverableId?: number;
  internalOnly?: boolean;
  pinned?: boolean;
}

export interface PublishActivityResult {
  created: boolean;
  skipped: boolean;
  id?: number;
  dedupeKey: string;
}

export interface ActivityBackfillResult {
  created: number;
  skipped: number;
  errors: string[];
  clientsProcessed: number;
}

export interface TimelineDateGroup<T> {
  dateKey: string;
  dateLabel: string;
  events: T[];
}

export type ActivityCategory = ExecutiveTimelineCategory;
