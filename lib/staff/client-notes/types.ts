import type { StaffClientNoteKind } from "./policy";

export interface StaffClientNoteRecord {
  id: number;
  clientId: number;
  authorUserId: number;
  authorDisplayName: string;
  kind: StaffClientNoteKind;
  body: string;
  createdAt: string;
  updatedAt: string;
}
