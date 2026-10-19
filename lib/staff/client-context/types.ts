import type { StaffClientNoteRecord } from "../client-notes/types";
import type { StaffSafeClientSummary } from "./safe-projection";

export interface StaffMyClientListItem {
  clientId: number;
  name: string;
  engagementStatus: string;
  relationshipHealth: string | null;
  websiteUrl: string | null;
  openWorkCount: number;
  href: string;
}

export interface StaffMyClientsData {
  clients: StaffMyClientListItem[];
  generatedAt: string;
}

export interface StaffClientWorkspaceData {
  summary: StaffSafeClientSummary;
  notes: StaffClientNoteRecord[];
  permissions: {
    canAct: boolean;
    canAddNotes: boolean;
    clientLabel: string;
  };
  generatedAt: string;
}
