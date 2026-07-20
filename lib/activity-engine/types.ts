import type {
  ExecutiveTimelineCategory,
  ExecutiveTimelineImportance,
  ExecutiveTimelineSourceModule,
} from "@/lib/executive-timeline/types";

/**
 * Phase 20E — Executive Activity Engine
 *
 * Event backbone for KXD OS. Not a notification service.
 * Persists to executive-timeline-events (relationship memory) when a client is present.
 */

export type ExecutiveActivityImportance = ExecutiveTimelineImportance;

export type ExecutiveActivitySourceModule =
  | ExecutiveTimelineSourceModule
  | "Client Command"
  | "Projects"
  | "Requests"
  | "Sales"
  | "Retainers"
  | "Client Success"
  | "Emails"
  | "Activity Engine";

/** Well-known event types — open string for future modules. */
export type ExecutiveActivityEventType =
  | "work.created"
  | "work.updated"
  | "work.completed"
  | "work.status-changed"
  | "work.started"
  | "work.waiting"
  | "work.blocked"
  | "work.review"
  | "work.archived"
  | "website-review.submitted"
  | "website-review.resolved"
  | "communication.needs-reply"
  | "client.created"
  | "proposal.accepted"
  | "work.schedule-proposed"
  | "work.schedule-approval-requested"
  | "work.schedule-approved"
  | "work.schedule-rejected"
  | "work.schedule-canceled"
  | "work.schedule-completed"
  | string;

export interface ActivityLink {
  label: string;
  href: string;
}

export interface PublishActivityInput {
  eventType: ExecutiveActivityEventType;
  title: string;
  summary?: string;
  description?: string;
  importance?: ExecutiveActivityImportance;
  occurredAt?: string;
  /** Required for durable timeline persistence today. */
  clientId?: number | null;
  workId?: number | null;
  requestId?: number | null;
  reviewId?: number | null;
  projectId?: number | null;
  infrastructureId?: number | null;
  deliverableId?: number | null;
  sourceModule: ExecutiveActivitySourceModule;
  sourceType?: string;
  sourceId?: string | number;
  author?: string;
  metadata?: Record<string, unknown>;
  relatedLinks?: ActivityLink[];
  attachments?: ActivityLink[];
  /** Default true — internal studio stream. */
  internalOnly?: boolean;
  pinned?: boolean;
  status?: string;
  category?: ExecutiveTimelineCategory;
  /**
   * When true (default if sourceId is set), skip create on matching dedupe key.
   * Lifecycle events that must always record should pass false.
   */
  dedupe?: boolean;
}

export interface PublishActivityResult {
  created: boolean;
  skipped: boolean;
  id?: number;
  dedupeKey?: string;
  reason?: string;
}

export interface ExecutiveActivityItem {
  id: string;
  timelineEventId: number;
  eventType: string;
  title: string;
  summary: string | null;
  occurredAt: string;
  importance: ExecutiveActivityImportance;
  sourceModule: string;
  category: string;
  clientId: number | null;
  clientName: string | null;
  workId: number | null;
  requestId: number | null;
  reviewId: number | null;
  href: string | null;
  internalOnly: boolean;
  read: boolean;
}

export interface ExecutiveActivityFilters {
  clientId?: number;
  limit?: number;
  unreadOnly?: boolean;
  importance?: ExecutiveActivityImportance | "all";
  sourceModule?: string | "all";
  /** When true, only client-visible timeline events (internalOnly === false). */
  clientVisibleOnly?: boolean;
}

export interface ExecutiveActivityCenterData {
  items: ExecutiveActivityItem[];
  unreadCount: number;
  generatedAt: string;
}
