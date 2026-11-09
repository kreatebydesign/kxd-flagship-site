import type { PortalDoc } from "@/lib/portal/types";
import { resolvePortalDeliverableClientNotes } from "./client-notes";

/** Fields safe to pass into Client HQ and portal server components. */
export type PortalDeliverableSummary = PortalDoc & {
  clientNotes: string | null;
  notes?: never;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

/**
 * Strip internal operator notes from deliverable documents loaded for the portal.
 * Client-facing detail comes only from `clientNotes`.
 */
export function projectPortalDeliverable(doc: AnyDoc): PortalDeliverableSummary {
  const clientNotes = resolvePortalDeliverableClientNotes({
    clientNotes: doc.clientNotes,
    notes: doc.notes,
  });

  const out: PortalDeliverableSummary = {
    id: doc.id,
    title: doc.title,
    status: doc.status,
    category: doc.category,
    month: doc.month,
    year: doc.year,
    dueDate: doc.dueDate,
    completedDate: doc.completedDate,
    owner: doc.owner,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    clientNotes,
  };

  return out;
}

export function projectPortalDeliverables(docs: AnyDoc[]): PortalDeliverableSummary[] {
  return docs.map(projectPortalDeliverable);
}
