import type { KxdBadgeVariant } from "@/components/os";

export type ReviewInboxRequestStatus =
  | "new"
  | "triaged"
  | "approved"
  | "waiting-on-client"
  | "in-progress"
  | "complete"
  | "declined";

export type ReviewInboxExperienceModule = "website-review" | "website-workspace";

export interface ReviewInboxItem {
  id: number;
  title: string;
  clientName: string;
  clientId: number | null;
  submittedBy: string | null;
  submittedByEmail: string | null;
  pageLocation: string | null;
  priority: string;
  attachmentCount: number;
  submittedAt: string;
  status: ReviewInboxRequestStatus;
  experienceModule: ReviewInboxExperienceModule;
  notesPreview: string;
  /** Primary operator destination */
  workspaceUrl: string;
  /** Secondary — Payload admin record */
  payloadAdminUrl: string;
}

export interface ReviewWorkspaceAttachment {
  id: number;
  filename: string;
  mimeType: string;
  filesize: number;
  isImage: boolean;
  url: string;
}

export interface ReviewWorkspaceTimelineEvent {
  id: string;
  label: string;
  at: string;
  detail?: string;
}

export interface ReviewWorkspaceLocation {
  pageLabel: string | null;
  section: string | null;
  pagePath: string | null;
  pageUrl: string | null;
  display: string | null;
}

export interface ReviewWorkEngineLink {
  workId: number;
  workNumber: string;
  adminUrl: string;
}

export interface ReviewWorkspaceDetail {
  id: number;
  title: string;
  clientName: string;
  clientId: number;
  clientWebsiteUrl: string | null;
  submittedBy: string | null;
  submittedByEmail: string | null;
  submittedAt: string;
  priority: string;
  status: ReviewInboxRequestStatus;
  requestBody: string;
  updateTypeLabel: string | null;
  location: ReviewWorkspaceLocation;
  attachments: ReviewWorkspaceAttachment[];
  timeline: ReviewWorkspaceTimelineEvent[];
  internalNotes: string | null;
  payloadAdminUrl: string;
  clientPortalUrl: string;
  clientCommandUrl: string;
  workspaceUrl: string;
  workEngine: ReviewWorkEngineLink | null;
}

export interface ReviewInboxData {
  items: ReviewInboxItem[];
  newCount: number;
  activeCount: number;
}

export interface ReviewInboxStatusOption {
  value: ReviewInboxRequestStatus;
  label: string;
  variant: KxdBadgeVariant;
}
