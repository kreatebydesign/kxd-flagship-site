import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { loadIntelligenceContext } from "@/lib/intelligence/context";
import { searchExecutiveNotes } from "./search";
import { getUpcomingReminders, getOverdueReminders } from "./reminders";
import { buildRelationshipIntelligence } from "./relationships";
import { getClientExecutiveNotes, toNoteListItem } from "./engine";
import type {
  ClientStrategySummary,
  ExecutiveNoteDoc,
  ExecutiveNoteListItem,
  StrategyVaultData,
  VaultView,
} from "./types";

export async function getStrategyVaultData(input: {
  view?: VaultView;
  clientId?: number;
  q?: string;
}): Promise<StrategyVaultData> {
  const view = input.view ?? "all";
  const [reminders, overdue] = await Promise.all([
    getUpcomingReminders(20),
    getOverdueReminders(10),
  ]);
  const allReminders = [...overdue, ...reminders];

  let notes: ExecutiveNoteListItem[] = [];
  let searchQuery = input.q;

  switch (view) {
    case "pinned":
      notes = await searchExecutiveNotes({ pinned: true, limit: 60 });
      break;
    case "recent":
      notes = await searchExecutiveNotes({ limit: 40 });
      break;
    case "reminders":
      notes = await searchExecutiveNotes({
        limit: 60,
        q: undefined,
      });
      notes = notes.filter((n) => n.reminderDate);
      break;
    case "opportunities":
      notes = await searchExecutiveNotes({
        noteType: ["opportunity", "sales", "follow-up"],
        limit: 50,
      });
      break;
    case "research":
      notes = await searchExecutiveNotes({ noteType: "research", limit: 50 });
      break;
    case "search":
      notes = await searchExecutiveNotes({
        q: input.q,
        clientId: input.clientId,
        limit: 80,
      });
      break;
    case "by-client":
      notes = input.clientId
        ? await searchExecutiveNotes({ clientId: input.clientId, limit: 80 })
        : [];
      break;
    case "all":
    default:
      notes = await searchExecutiveNotes({
        clientId: input.clientId,
        q: input.q,
        limit: 80,
      });
  }

  const clients = await getClientNoteCounts();

  return {
    view,
    notes,
    reminders: allReminders,
    clients,
    totalCount: notes.length,
    searchQuery,
    clientId: input.clientId,
  };
}

async function getClientNoteCounts(): Promise<Array<{ id: number; name: string; noteCount: number }>> {
  const payload = await getPayload({ config });
  const [clientsR, notesR] = await Promise.all([
    payload.find({
      collection: "clients",
      where: { status: { equals: "active" } },
      limit: 200,
      depth: 0,
      sort: "name",
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "executive-notes" as any,
      where: { status: { equals: "active" } },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  const counts = new Map<number, number>();
  for (const note of notesR.docs as ExecutiveNoteDoc[]) {
    const cid =
      typeof note.client === "number" ? note.client : (note.client as { id: number })?.id;
    if (cid) counts.set(cid, (counts.get(cid) ?? 0) + 1);
  }

  return (clientsR.docs as ExecutiveNoteDoc[]).map((c) => ({
    id: c.id as number,
    name: String(c.name),
    noteCount: counts.get(c.id as number) ?? 0,
  }));
}

export async function getClientStrategySummary(clientId: number): Promise<ClientStrategySummary> {
  const [notes, ctx] = await Promise.all([
    getClientExecutiveNotes(clientId, 40),
    loadIntelligenceContext(),
  ]);

  const items = notes.map(toNoteListItem);
  const pinnedStrategy = items.filter(
    (n) => n.pinned && (n.noteType === "strategy" || n.noteType === "relationship"),
  );
  const latestNotes = items.slice(0, 6);
  const recentDecisions = items.filter(
    (n) => n.noteType === "strategy" || n.noteType === "meeting",
  ).slice(0, 5);

  const { getClientReminders } = await import("./reminders");
  const upcomingReminders = await getClientReminders(clientId, 8);

  return {
    latestNotes,
    pinnedStrategy,
    upcomingReminders,
    relationshipInsights: buildRelationshipIntelligence(clientId, notes, ctx),
    recentDecisions,
  };
}
