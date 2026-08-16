/**
 * Acquisition & Lead Operations — provenance / source identity.
 *
 * Coordinates distinct canonical records. Does not replace collections.
 */

import type {
  AcquisitionContext,
  AcquisitionSourceRecordType,
} from "./contexts";

/** Stable reference to a source intake / opportunity record. */
export type SourceRecordIdentity = {
  context: AcquisitionContext;
  sourceRecordType: AcquisitionSourceRecordType;
  sourceRecordId: number;
  /** Optional human channel label (contact form, start-project, research, etc.). */
  origin?: string | null;
};

/** Result of promoting an intake record into a canonical opportunity. */
export type PromotionProvenance = SourceRecordIdentity & {
  promotedToType: "sales_lead" | "client_inquiry";
  promotedToId: number;
  promotedAt: string;
  created: boolean;
};

export function sourceRecordKey(identity: SourceRecordIdentity): string {
  return `${identity.context}:${identity.sourceRecordType}:${identity.sourceRecordId}`;
}

export function isValidSourceRecordId(id: unknown): id is number {
  return typeof id === "number" && Number.isFinite(id) && id > 0;
}
