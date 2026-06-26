import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { createExecutiveEvent } from "@/lib/executive-timeline/create-event";
import type { ExecutiveTimelineCategory, ExecutiveTimelineImportance } from "@/lib/executive-timeline/types";
import type {
  CreateExecutiveNoteInput,
  ExecutiveNoteDoc,
  ExecutiveNoteListItem,
  TimelinePromotionType,
} from "./types";

const COLLECTION = "executive-notes";

function clientIdFromRel(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    return Number((value as ExecutiveNoteDoc).id);
  }
  return null;
}

function clientNameFromRel(value: unknown): string {
  if (typeof value === "object" && value !== null && "name" in value) {
    return String((value as ExecutiveNoteDoc).name);
  }
  return "Client";
}

export function toNoteListItem(doc: ExecutiveNoteDoc): ExecutiveNoteListItem {
  return {
    id: doc.id as number,
    clientId: clientIdFromRel(doc.client) ?? 0,
    clientName: clientNameFromRel(doc.client),
    title: String(doc.title),
    summary: doc.summary ? String(doc.summary) : null,
    noteType: String(doc.noteType ?? "strategy"),
    priority: String(doc.priority ?? "normal"),
    pinned: Boolean(doc.pinned),
    reminderDate: doc.reminderDate ? String(doc.reminderDate) : null,
    author: doc.author ? String(doc.author) : null,
    updatedAt: String(doc.updatedAt),
    href: `/admin/collections/executive-notes/${doc.id}`,
  };
}

export async function getExecutiveNoteById(id: number): Promise<ExecutiveNoteDoc | null> {
  const payload = await getPayload({ config });
  try {
    const doc = await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      id,
      depth: 1,
      overrideAccess: true,
    });
    return doc as ExecutiveNoteDoc;
  } catch {
    return null;
  }
}

export async function getClientExecutiveNotes(
  clientId: number,
  limit = 50,
): Promise<ExecutiveNoteDoc[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: {
      and: [{ client: { equals: clientId } }, { status: { equals: "active" } }],
    },
    sort: "-updatedAt",
    limit,
    depth: 1,
    overrideAccess: true,
  });
  return result.docs as ExecutiveNoteDoc[];
}

export async function createExecutiveNote(
  input: CreateExecutiveNoteInput,
): Promise<ExecutiveNoteDoc> {
  const payload = await getPayload({ config });
  const doc = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    data: {
      client: input.clientId,
      title: input.title,
      summary: input.summary,
      noteType: input.noteType ?? "strategy",
      priority: input.priority ?? "normal",
      status: "active",
      pinned: input.pinned ?? false,
      private: input.private ?? false,
      reminderDate: input.reminderDate,
      author: input.author,
      tags: input.tags?.map((tag) => ({ tag })),
    },
    overrideAccess: true,
  });
  return doc as ExecutiveNoteDoc;
}

function mapPromotionToTimeline(
  promotionType: TimelinePromotionType,
  noteType: string,
): { eventType: string; category: ExecutiveTimelineCategory; importance: ExecutiveTimelineImportance } {
  switch (promotionType) {
    case "meeting-summary":
      return { eventType: "meeting-summary", category: "meeting", importance: "normal" };
    case "decision":
      return { eventType: "decision", category: "relationship", importance: "high" };
    case "major-milestone":
      return { eventType: "milestone", category: "launch", importance: "critical" };
    case "opportunity":
      return { eventType: "opportunity", category: "growth", importance: "high" };
    case "follow-up":
      return { eventType: "follow-up", category: "communication", importance: "normal" };
    default:
      return {
        eventType: noteType,
        category: noteType === "meeting" ? "meeting" : "relationship",
        importance: "normal",
      };
  }
}

export async function convertNoteToTimeline(
  noteId: number,
  promotionType: TimelinePromotionType,
): Promise<{ timelineEventId: number } | null> {
  const note = await getExecutiveNoteById(noteId);
  if (!note) return null;

  const clientId = clientIdFromRel(note.client);
  if (!clientId) return null;

  const mapping = mapPromotionToTimeline(promotionType, String(note.noteType));
  const event = await createExecutiveEvent({
    client: clientId,
    eventType: mapping.eventType,
    title: String(note.title),
    summary: note.summary ? String(note.summary) : undefined,
    description: note.summary ? String(note.summary) : undefined,
    category: mapping.category,
    importance: mapping.importance,
    sourceModule: "Executive Notes",
    pinned: Boolean(note.pinned),
    occurredAt: new Date().toISOString(),
  });

  const payload = await getPayload({ config });
  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    id: noteId,
    data: { timelineEvent: event.id },
    overrideAccess: true,
  });

  return { timelineEventId: event.id as number };
}
