/**
 * Phase 14C — Work Integration Layer types
 * Canonical contract types for all subsystem integrations.
 */

import type { WorkCategory, WorkPriority, WorkSource, WorkStatus } from "../types";

/** Adapter keys — includes collection sources + future module keys (not all wired yet). */
export type WorkAdapterKey =
  | WorkSource
  | "deliverable"
  | "executive-recommendation"
  | "meeting"
  | "ai-concierge"
  | "proposal"
  | "invoice"
  | "brand-asset"
  | "campaign"
  | "timeline-event";

/** Entity types linkable to Work (many-to-many via metadata). */
export type WorkRelationshipType =
  | "website-review"
  | "client-request"
  | "communication"
  | "deliverable"
  | "proposal"
  | "invoice"
  | "brand-asset"
  | "meeting"
  | "campaign"
  | "timeline-event"
  | "report"
  | "playbook";

export interface WorkRelationshipRecord {
  type: WorkRelationshipType;
  entityId: string;
  label?: string;
  linkedAt: string;
  /** Optional role when multiple links of same type exist */
  role?: string;
}

/** Stored in Work.metadata — no collection migration required. */
export interface WorkIntegrationMetadata {
  workNumber?: string;
  relationships?: WorkRelationshipRecord[];
  integrationVersion?: number;
}

export type WorkLifecycleEvent =
  | "work.created"
  | "work.updated"
  | "work.started"
  | "work.blocked"
  | "work.waiting"
  | "work.review"
  | "work.completed"
  | "work.archived"
  | "work.status-changed";

/**
 * Work Health — separate from status. Prepared for future surfacing; not exposed in UI yet.
 */
export type WorkHealth =
  | "on-track"
  | "needs-attention"
  | "blocked"
  | "overdue"
  | "waiting-on-client";

export const WORK_HEALTH_LABELS: Record<WorkHealth, string> = {
  "on-track": "On Track",
  "needs-attention": "Needs Attention",
  blocked: "Blocked",
  overdue: "Overdue",
  "waiting-on-client": "Waiting on Client",
};

export interface WorkSourceAdapterDefinition {
  key: WorkAdapterKey;
  displayName: string;
  /** Collection `source` value used when spawning today */
  collectionSource: WorkSource;
  defaultCategory: WorkCategory;
  defaultPriority: WorkPriority;
  supportsSpawning: boolean;
  supportsCompletion: boolean;
  supportsRelationshipLinking: boolean;
  /** Maps adapter sourceId to default relationship type when linking */
  defaultRelationshipType?: WorkRelationshipType;
}

export interface SpawnWorkInput {
  clientId: number;
  title: string;
  summary?: string;
  adapterKey: WorkAdapterKey;
  sourceId: string;
  category?: WorkCategory;
  priority?: WorkPriority;
  clientVisible?: boolean;
  timelineEnabled?: boolean;
  createdBy?: string;
  assignedToId?: number;
  dueDate?: string;
  /** Link source entity on spawn when adapter supports relationship linking */
  linkSourceEntity?: boolean;
}

export interface SpawnWorkResult {
  ok: true;
  workId: number;
  workNumber: string;
  created: boolean;
}

export interface UpdateWorkInput {
  workId: number;
  status?: WorkStatus;
  priority?: WorkPriority;
  title?: string;
  summary?: string | null;
  description?: string | null;
  notes?: string | null;
  category?: WorkCategory;
  clientId?: number | null;
  assignedToId?: number | null;
  internalProject?: string | null;
  tags?: string[];
  estimatedEffort?: number | null;
  dueDate?: string | null;
  startDate?: string | null;
  plannedForDate?: string | null;
  actorEmail?: string;
}

export interface UpdateWorkResult {
  ok: true;
  workId: number;
  workNumber: string;
  status: WorkStatus;
}

export interface LinkRelationshipInput {
  workId: number;
  type: WorkRelationshipType;
  entityId: string;
  label?: string;
  role?: string;
}

export interface LinkRelationshipResult {
  ok: true;
  workId: number;
  relationships: WorkRelationshipRecord[];
}

export interface PublishWorkEventInput {
  workId: number;
  clientId: number;
  title: string;
  summary?: string | null;
  status: WorkStatus;
  source: WorkSource;
  sourceId?: string | null;
  workNumber?: string | null;
  relationshipType?: string | null;
  clientVisible: boolean;
  timelineEnabled: boolean;
  event: WorkLifecycleEvent;
  previousStatus?: WorkStatus;
  createdBy?: string | null;
}

/** Permanent Work ID format — WK-000001 */
export function formatWorkNumber(numericId: number): string {
  return `WK-${String(numericId).padStart(6, "0")}`;
}

export function parseWorkNumber(value: string): number | null {
  const match = /^WK-(\d+)$/i.exec(value.trim());
  if (!match?.[1]) return null;
  const id = Number.parseInt(match[1], 10);
  return Number.isFinite(id) ? id : null;
}

export const WORK_INTEGRATION_METADATA_VERSION = 1;
