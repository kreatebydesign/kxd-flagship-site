import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { ExecutiveNoteDoc, ExecutiveNoteListItem, ExecutiveNoteSearchFilters } from "./types";
import { toNoteListItem } from "./engine";

const COLLECTION = "executive-notes";

function buildWhere(filters: ExecutiveNoteSearchFilters): ExecutiveNoteDoc {
  const and: ExecutiveNoteDoc[] = [{ status: { equals: filters.status ?? "active" } }];

  if (filters.clientId) and.push({ client: { equals: filters.clientId } });
  if (filters.priority) and.push({ priority: { equals: filters.priority } });
  if (filters.pinned != null) and.push({ pinned: { equals: filters.pinned } });
  if (filters.author?.trim()) and.push({ author: { contains: filters.author.trim() } });

  if (filters.noteType) {
    const types = Array.isArray(filters.noteType) ? filters.noteType : [filters.noteType];
    and.push({ noteType: { in: types } });
  }

  if (filters.projectId) {
    and.push({ relatedProjects: { contains: filters.projectId } });
  }

  if (filters.fromDate) and.push({ updatedAt: { greater_than_equal: filters.fromDate } });
  if (filters.toDate) and.push({ updatedAt: { less_than_equal: filters.toDate } });

  if (filters.q?.trim()) {
    const q = filters.q.trim();
    and.push({
      or: [
        { title: { contains: q } },
        { summary: { contains: q } },
        { searchKeywords: { contains: q.toLowerCase() } },
        { author: { contains: q } },
      ],
    });
  }

  if (and.length === 1) return and[0];
  return { and };
}

export async function searchExecutiveNotes(
  filters: ExecutiveNoteSearchFilters = {},
): Promise<ExecutiveNoteListItem[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: buildWhere(filters),
    sort: filters.pinned ? "-pinned,-updatedAt" : "-updatedAt",
    limit: filters.limit ?? 100,
    depth: 1,
    overrideAccess: true,
  });

  return (result.docs as ExecutiveNoteDoc[]).map(toNoteListItem);
}

export async function searchExecutiveNotesByTag(tag: string): Promise<ExecutiveNoteListItem[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: {
      and: [
        { status: { equals: "active" } },
        { "tags.tag": { contains: tag } },
      ],
    },
    sort: "-updatedAt",
    limit: 50,
    depth: 1,
    overrideAccess: true,
  });
  return (result.docs as ExecutiveNoteDoc[]).map(toNoteListItem);
}
