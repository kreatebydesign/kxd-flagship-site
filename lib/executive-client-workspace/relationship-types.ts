/**
 * Phase 3 Batch B — typed relationship intelligence for the Client Workspace.
 * Operator-only. No scoring, no AI, no portal serialization.
 */

export type ContactStatus = "active" | "inactive";

export type RelationshipEventStatus = "planned" | "completed" | "cancelled";

export type RelationshipEventCategory =
  | "meeting"
  | "dinner"
  | "engagement"
  | "visit"
  | "other";

export interface WorkspaceContact {
  id: number;
  name: string;
  roleTitle: string | null;
  email: string | null;
  phone: string | null;
  status: ContactStatus;
  preferredCommunication: string | null;
  relationshipNotes: string | null;
  preferences: string | null;
  dietaryNotes: string | null;
  accessibilityNotes: string | null;
  internalOnly: boolean;
  updatedAt: string | null;
  href: string;
}

export interface WorkspaceRelationshipEvent {
  id: number;
  title: string;
  eventAt: string;
  eventCategory: RelationshipEventCategory;
  status: RelationshipEventStatus;
  location: string | null;
  contextNotes: string | null;
  followUpNotes: string | null;
  dietaryNotes: string | null;
  accessibilityNotes: string | null;
  contactNames: string[];
  href: string;
}

export interface RelationshipIntelligenceSummary {
  activeContactCount: number;
  totalContactCount: number;
  /** Most recently updated active contact — not labeled “primary”. */
  recentActiveContact: WorkspaceContact | null;
  nextPlannedEvent: WorkspaceRelationshipEvent | null;
  latestCompletedEvent: WorkspaceRelationshipEvent | null;
  preferenceHighlights: string[];
  accessHighlights: string[];
}

export const CONTACT_STATUS_LABEL: Record<ContactStatus, string> = {
  active: "Active",
  inactive: "Inactive",
};

export const EVENT_STATUS_LABEL: Record<RelationshipEventStatus, string> = {
  planned: "Planned",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const EVENT_CATEGORY_LABEL: Record<RelationshipEventCategory, string> = {
  meeting: "Meeting",
  dinner: "Dinner",
  engagement: "Engagement",
  visit: "Visit",
  other: "Other",
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  if (typeof value === "object" && value !== null && "id" in value) {
    return asId((value as { id: unknown }).id);
  }
  return null;
}

function asContactStatus(value: unknown): ContactStatus {
  return value === "inactive" ? "inactive" : "active";
}

function asEventStatus(value: unknown): RelationshipEventStatus {
  if (value === "completed" || value === "cancelled" || value === "planned") {
    return value;
  }
  return "planned";
}

function asEventCategory(value: unknown): RelationshipEventCategory {
  if (
    value === "meeting" ||
    value === "dinner" ||
    value === "engagement" ||
    value === "visit" ||
    value === "other"
  ) {
    return value;
  }
  return "meeting";
}

export function mapWorkspaceContact(doc: Record<string, unknown>): WorkspaceContact {
  const id = asId(doc.id) ?? 0;
  return {
    id,
    name: asString(doc.name) ?? "Untitled contact",
    roleTitle: asString(doc.roleTitle),
    email: asString(doc.email),
    phone: asString(doc.phone),
    status: asContactStatus(doc.status),
    preferredCommunication: asString(doc.preferredCommunication),
    relationshipNotes: asString(doc.relationshipNotes),
    preferences: asString(doc.preferences),
    dietaryNotes: asString(doc.dietaryNotes),
    accessibilityNotes: asString(doc.accessibilityNotes),
    internalOnly: doc.internalOnly !== false,
    updatedAt: asString(doc.updatedAt),
    href: `/admin/collections/client-contacts/${id}`,
  };
}

/**
 * Resolve event contact names only from the already-loaded client-scoped contact set.
 * Prevents cross-client name leakage if a stale relation id appears.
 */
export function mapWorkspaceRelationshipEvent(
  doc: Record<string, unknown>,
  contactsById: Map<number, WorkspaceContact>,
): WorkspaceRelationshipEvent {
  const id = asId(doc.id) ?? 0;
  const rawContacts = Array.isArray(doc.contacts) ? doc.contacts : [];
  const contactNames: string[] = [];
  for (const entry of rawContacts) {
    const contactId = asId(entry);
    if (contactId == null) continue;
    const match = contactsById.get(contactId);
    if (match) contactNames.push(match.name);
  }

  return {
    id,
    title: asString(doc.title) ?? "Untitled event",
    eventAt: asString(doc.eventAt) ?? "",
    eventCategory: asEventCategory(doc.eventCategory),
    status: asEventStatus(doc.status),
    location: asString(doc.location),
    contextNotes: asString(doc.contextNotes),
    followUpNotes: asString(doc.followUpNotes),
    dietaryNotes: asString(doc.dietaryNotes),
    accessibilityNotes: asString(doc.accessibilityNotes),
    contactNames,
    href: `/admin/collections/client-relationship-events/${id}`,
  };
}

export function buildRelationshipIntelligenceSummary(
  contacts: WorkspaceContact[],
  events: WorkspaceRelationshipEvent[],
): RelationshipIntelligenceSummary {
  const active = contacts.filter((c) => c.status === "active");
  const recentActiveContact =
    [...active].sort((a, b) => {
      const at = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bt - at;
    })[0] ?? null;

  const now = Date.now();
  const plannedFuture = events
    .filter((e) => e.status === "planned" && e.eventAt && new Date(e.eventAt).getTime() >= now)
    .sort((a, b) => new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime());
  const completed = events
    .filter((e) => e.status === "completed" && e.eventAt)
    .sort((a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime());

  const preferenceHighlights: string[] = [];
  const accessHighlights: string[] = [];
  for (const contact of active) {
    if (contact.preferences) {
      preferenceHighlights.push(`${contact.name}: ${contact.preferences}`);
    }
    if (contact.dietaryNotes) {
      preferenceHighlights.push(`${contact.name} · dietary: ${contact.dietaryNotes}`);
    }
    if (contact.accessibilityNotes) {
      accessHighlights.push(`${contact.name}: ${contact.accessibilityNotes}`);
    }
  }

  return {
    activeContactCount: active.length,
    totalContactCount: contacts.length,
    recentActiveContact,
    nextPlannedEvent: plannedFuture[0] ?? null,
    latestCompletedEvent: completed[0] ?? null,
    preferenceHighlights: preferenceHighlights.slice(0, 4),
    accessHighlights: accessHighlights.slice(0, 4),
  };
}
