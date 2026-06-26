import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { ExecutiveNoteDoc, ReminderItem } from "./types";
import { toNoteListItem } from "./engine";

const COLLECTION = "executive-notes";
const MS_PER_DAY = 86_400_000;

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / MS_PER_DAY);
}

function toReminder(doc: ExecutiveNoteDoc): ReminderItem {
  const reminderDate = String(doc.reminderDate);
  const d = daysUntil(reminderDate);
  const item = toNoteListItem(doc);
  return {
    id: doc.id as number,
    noteId: doc.id as number,
    clientId: item.clientId,
    clientName: item.clientName,
    title: item.title,
    reminderDate,
    daysUntil: d,
    overdue: d < 0,
    priority: item.priority,
    href: item.href,
  };
}

export async function getUpcomingReminders(limit = 30): Promise<ReminderItem[]> {
  const payload = await getPayload({ config });
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 30);

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: {
      and: [
        { status: { equals: "active" } },
        { reminderDate: { exists: true } },
        { reminderDate: { less_than_equal: horizon.toISOString() } },
      ],
    },
    sort: "reminderDate",
    limit,
    depth: 1,
    overrideAccess: true,
  });

  return (result.docs as ExecutiveNoteDoc[]).map(toReminder);
}

export async function getOverdueReminders(limit = 20): Promise<ReminderItem[]> {
  const payload = await getPayload({ config });
  const now = new Date().toISOString();

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: {
      and: [
        { status: { equals: "active" } },
        { reminderDate: { exists: true } },
        { reminderDate: { less_than: now } },
      ],
    },
    sort: "reminderDate",
    limit,
    depth: 1,
    overrideAccess: true,
  });

  return (result.docs as ExecutiveNoteDoc[]).map(toReminder);
}

export async function getClientReminders(clientId: number, limit = 10): Promise<ReminderItem[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: {
      and: [
        { client: { equals: clientId } },
        { status: { equals: "active" } },
        { reminderDate: { exists: true } },
      ],
    },
    sort: "reminderDate",
    limit,
    depth: 1,
    overrideAccess: true,
  });
  return (result.docs as ExecutiveNoteDoc[]).map(toReminder);
}

export async function getRemindersDueToday(): Promise<ReminderItem[]> {
  const payload = await getPayload({ config });
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: {
      and: [
        { status: { equals: "active" } },
        { reminderDate: { greater_than_equal: start.toISOString() } },
        { reminderDate: { less_than_equal: end.toISOString() } },
      ],
    },
    sort: "reminderDate",
    limit: 50,
    depth: 1,
    overrideAccess: true,
  });

  return (result.docs as ExecutiveNoteDoc[]).map(toReminder);
}

export async function getDailyBriefingReminders(): Promise<{
  dueToday: ReminderItem[];
  overdue: ReminderItem[];
  upcoming: ReminderItem[];
}> {
  const [dueToday, overdue, upcoming] = await Promise.all([
    getRemindersDueToday(),
    getOverdueReminders(15),
    getUpcomingReminders(15),
  ]);
  return { dueToday, overdue, upcoming };
}
