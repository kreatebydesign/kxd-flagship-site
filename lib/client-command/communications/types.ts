export type ClientCommunicationType =
  | "email"
  | "call"
  | "meeting"
  | "text"
  | "note"
  | "form_submission"
  | "campaign_update"
  | "support_followup";

export type ClientCommunicationDirection = "inbound" | "outbound" | "internal";

export type ClientCommunicationStatus =
  | "logged"
  | "needs_reply"
  | "replied"
  | "resolved"
  | "archived";

export type ClientCommunicationPriority = "low" | "normal" | "high" | "urgent";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ClientCommunicationDoc = Record<string, any>;

export interface WorkspaceCommunicationRow {
  id: number;
  type: ClientCommunicationType;
  direction: ClientCommunicationDirection;
  subject: string | null;
  summary: string | null;
  bodyPreview: string | null;
  contactName: string | null;
  contactEmail: string | null;
  date: string;
  status: ClientCommunicationStatus;
  priority: ClientCommunicationPriority;
  followUpDate: string | null;
  source: string | null;
  relatedProjectId: number | null;
  relatedRequestId: number | null;
  href: string;
}

export interface WorkspaceCommunicationsSnapshot {
  communications: WorkspaceCommunicationRow[];
  upcomingFollowUps: WorkspaceCommunicationRow[];
  overdueFollowUps: WorkspaceCommunicationRow[];
  needsReplyCount: number;
  openCount: number;
  staleUnresolvedCount: number;
  hasStaleUnresolved: boolean;
}

export interface CreateClientCommunicationInput {
  clientId: number;
  type: ClientCommunicationType;
  direction?: ClientCommunicationDirection;
  subject?: string;
  summary?: string;
  bodyPreview?: string;
  contactName?: string;
  contactEmail?: string;
  date?: string;
  status?: ClientCommunicationStatus;
  priority?: ClientCommunicationPriority;
  followUpDate?: string;
  source?: string;
  relatedProjectId?: number;
  relatedRequestId?: number;
  participants?: Array<{ name?: string; email?: string }>;
  metadata?: Record<string, unknown>;
}

export interface UpdateClientCommunicationInput {
  status?: ClientCommunicationStatus;
  priority?: ClientCommunicationPriority;
  followUpDate?: string | null;
}
