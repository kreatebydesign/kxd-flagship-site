import type { WebsiteWorkspaceClientStatus } from "@/lib/ces/vocabulary/website-workspace";

export type WebsiteWorkspaceSectionField =
  | "heading"
  | "body"
  | "cta"
  | "image"
  | "images";

export interface WebsiteWorkspaceSectionContent {
  heading?: string;
  body?: string;
  cta?: string;
  imageUrl?: string | null;
  imageAlt?: string;
}

export interface WebsiteWorkspaceSectionDefinition {
  id: string;
  title: string;
  fields: WebsiteWorkspaceSectionField[];
  current: WebsiteWorkspaceSectionContent;
}

export interface WebsiteWorkspacePageDefinition {
  slug: string;
  title: string;
  description: string;
  path: string;
  lastUpdated: string;
  sections: WebsiteWorkspaceSectionDefinition[];
}

export interface WebsiteWorkspaceSiteDefinition {
  clientSlug: string;
  websiteUrl: string;
  pages: WebsiteWorkspacePageDefinition[];
}

export interface WebsiteWorkspacePageCard {
  slug: string;
  title: string;
  description: string;
  path: string;
  lastUpdated: string;
  sectionCount: number;
  openRequestCount: number;
  href: string;
}

export interface WebsiteWorkspaceRequestItem {
  id: number;
  title: string;
  status: WebsiteWorkspaceClientStatus;
  pageSlug: string;
  pageTitle: string;
  sectionId: string;
  sectionTitle: string;
  submittedAt: string;
  submittedBy: string;
  notesPreview: string;
  href: string;
}

export interface WebsiteWorkspaceLandingData {
  websiteUrl: string | null;
  pages: WebsiteWorkspacePageCard[];
  recentRequests: WebsiteWorkspaceRequestItem[];
  openRequestCount: number;
}

export interface WebsiteWorkspaceUpdateContext {
  pageSlug: string;
  pageTitle: string;
  pagePath: string;
  sectionId: string;
  sectionTitle: string;
  current: WebsiteWorkspaceSectionContent;
  requested: WebsiteWorkspaceSectionContent;
  notes: string;
  source: "website-workspace";
}

export interface WebsiteWorkspaceAttachmentMeta {
  id: number;
  filename: string;
  mimeType: string;
  filesize: number;
  isImage: boolean;
  url: string;
}

export interface WebsiteWorkspaceRequestDetail {
  id: number;
  title: string;
  status: WebsiteWorkspaceClientStatus;
  submittedAt: string;
  submittedBy: string | null;
  pageTitle: string;
  pageSlug: string;
  sectionTitle: string;
  sectionId: string;
  current: WebsiteWorkspaceSectionContent;
  requested: WebsiteWorkspaceSectionContent;
  notes: string;
  attachments: WebsiteWorkspaceAttachmentMeta[];
  timeline: Array<{
    id: string;
    label: string;
    at: string;
    detail?: string;
  }>;
}
