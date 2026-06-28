import type { MergedExecutiveClientRow } from "@/lib/executive-client-profile";
import type { ClientCommandCenterData, CommandDoc } from "./types";

export interface CommandHubClientRow {
  clientId: number;
  name: string;
  slug: string | null;
  status: string;
  relationshipStatus: string | null;
  healthScore: number | null;
  monthlyRevenue: number | null;
  primaryContact: string | null;
  website: string | null;
  industry: string | null;
  href: string;
}

export interface WorkspaceTimelineEvent {
  id: string;
  occurredAt: string;
  icon: string;
  title: string;
  details: string;
  author: string | null;
  category: string;
  sourceModule: string | null;
  href: string | null;
  pinned: boolean;
}

export interface WorkspaceInvoiceRow {
  id: number;
  title: string;
  amount: number | null;
  status: string;
  date: string | null;
  href: string;
  source: "proposal" | "retainer";
}

export interface WorkspaceFileRow {
  id: number;
  title: string;
  type: string;
  status: string | null;
  url: string | null;
  href: string;
  updatedAt: string | null;
}

export interface WorkspaceDomainInfo {
  primaryDomain: string | null;
  registrar: string | null;
  expiration: string | null;
  sslStatus: string | null;
  hosting: string | null;
  dnsProvider: string | null;
  infrastructureScore: number | null;
  infrastructureStatus: string | null;
  href: string;
}

export interface WorkspaceAnalyticsSnapshot {
  revenueOverTime: Array<{ label: string; value: number }>;
  projectsCompleted: number;
  activeProjects: number;
  openRequests: number;
  openTasks: number;
  websiteAuditScore: number | null;
  averageTurnaroundDays: number | null;
  meetingCount: number;
  daysSinceLastContact: number | null;
}

export interface CommandWorkspaceQuickAction {
  id: string;
  label: string;
  href: string;
  external?: boolean;
}

export interface ClientWorkspaceBundle extends ClientCommandCenterData {
  client: CommandDoc;
  profile: CommandDoc | null;
  timelineEvents: WorkspaceTimelineEvent[];
  requestDocs: CommandDoc[];
  projectDocs: CommandDoc[];
  retainerDocs: CommandDoc[];
  invoices: WorkspaceInvoiceRow[];
  files: WorkspaceFileRow[];
  domains: WorkspaceDomainInfo | null;
  meetingDocs: CommandDoc[];
  noteDocs: CommandDoc[];
  portalUsers: CommandDoc[];
  taskDocs: CommandDoc[];
  workspaceQuickActions: CommandWorkspaceQuickAction[];
  analytics: WorkspaceAnalyticsSnapshot;
  header: {
    companyName: string;
    logoUrl: string | null;
    primaryContact: string | null;
    primaryEmail: string | null;
    status: string;
    website: string | null;
    industry: string | null;
    monthlyRevenue: number | null;
    lifetimeRevenue: number | null;
    clientSince: string | null;
    healthScore: number | null;
    relationshipStatus: string;
    row: MergedExecutiveClientRow | null;
  };
}
