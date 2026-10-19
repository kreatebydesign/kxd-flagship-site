import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { listActiveAssignedClientIds, staffMayAccessClient } from "../client-assignments";
import { listStaffClientNotesForClient } from "../client-notes/data";
import type { StaffActor } from "../types";
import { listWorkAssignedToStaffActor } from "@/lib/work/staff-assigned";
import {
  buildStaffSafeClientSummary,
  mapStaffSafeWorkRows,
} from "./safe-projection";
import { staffMyClientHref } from "./paths";
import type {
  StaffClientWorkspaceData,
  StaffMyClientListItem,
  StaffMyClientsData,
} from "./types";

export type { StaffMyClientListItem, StaffMyClientsData, StaffClientWorkspaceData } from "./types";
export { STAFF_MY_CLIENTS_PATH, staffMyClientHref } from "./paths";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export async function loadStaffMyClients(actor: StaffActor): Promise<StaffMyClientsData> {
  const assignedIds = await listActiveAssignedClientIds(actor.userId);
  if (assignedIds.length === 0) {
    return { clients: [], generatedAt: new Date().toISOString() };
  }

  const assignedWork = await listWorkAssignedToStaffActor(actor, {
    includeCompleted: false,
    limit: 300,
  });
  const openWorkByClient = new Map<number, number>();
  for (const work of assignedWork) {
    if (work.clientId == null) continue;
    openWorkByClient.set(work.clientId, (openWorkByClient.get(work.clientId) ?? 0) + 1);
  }

  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "clients",
    where: { id: { in: assignedIds } },
    limit: assignedIds.length,
    depth: 0,
    sort: "name",
    overrideAccess: true,
  });

  const clients: StaffMyClientListItem[] = (result.docs as AnyDoc[]).map((doc) => {
    const clientId = Number(doc.id);
    const website =
      typeof doc.companyWebsite === "string" && doc.companyWebsite.trim()
        ? doc.companyWebsite.trim()
        : null;
    return {
      clientId,
      name: String(doc.name ?? `Client ${clientId}`),
      engagementStatus: String(doc.status ?? "active"),
      relationshipHealth:
        typeof doc.relationshipStatus === "string" ? doc.relationshipStatus : null,
      websiteUrl: website,
      openWorkCount: openWorkByClient.get(clientId) ?? 0,
      href: staffMyClientHref(clientId),
    };
  });

  return { clients, generatedAt: new Date().toISOString() };
}

async function loadExecutiveProfile(clientId: number): Promise<AnyDoc | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "executive-client-profiles",
    where: { client: { equals: clientId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return (result.docs[0] as AnyDoc) ?? null;
}

async function loadActiveContacts(clientId: number): Promise<AnyDoc[]> {
  const payload = await getPayload({ config });
  try {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-contacts" as any,
      where: {
        and: [{ client: { equals: clientId } }, { status: { equals: "active" } }],
      },
      limit: 50,
      depth: 0,
      sort: "name",
      overrideAccess: true,
    });
    return result.docs as AnyDoc[];
  } catch {
    return [];
  }
}

async function loadClientProjects(clientId: number): Promise<AnyDoc[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "client-projects",
    where: { client: { equals: clientId } },
    limit: 30,
    depth: 0,
    sort: "-updatedAt",
    overrideAccess: true,
  });
  return result.docs as AnyDoc[];
}

async function resolvePortalHref(clientId: number): Promise<string | null> {
  const payload = await getPayload({ config });
  try {
    const result = await payload.find({
      collection: "client-experience-profiles",
      where: {
        and: [{ client: { equals: clientId } }, { status: { equals: "active" } }],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    if (!result.docs.length) return null;
    const client = await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    });
    const slug = (client as AnyDoc).slug;
    if (typeof slug === "string" && slug.trim()) {
      return `/portal/${slug.trim()}`;
    }
  } catch {
    return null;
  }
  return null;
}

export async function loadStaffClientWorkspace(
  actor: StaffActor,
  clientId: number,
): Promise<StaffClientWorkspaceData | null> {
  if (!Number.isFinite(clientId) || clientId <= 0) return null;
  const allowed = await staffMayAccessClient(actor, clientId);
  if (!allowed) return null;

  const payload = await getPayload({ config });
  let client: AnyDoc;
  try {
    client = (await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    return null;
  }

  const [profile, contacts, projects, portalHref, notes, assignedWork] = await Promise.all([
    loadExecutiveProfile(clientId),
    loadActiveContacts(clientId),
    loadClientProjects(clientId),
    resolvePortalHref(clientId),
    listStaffClientNotesForClient(clientId),
    listWorkAssignedToStaffActor(actor, { includeCompleted: false, limit: 200 }),
  ]);

  const workForClient = assignedWork
    .filter((w) => w.clientId === clientId)
    .map((w) => ({
      id: w.id,
      title: w.title,
      status: w.status,
      dueDate: w.dueDate,
      href: w.href,
      description: w.description,
      acceptanceCriteria: w.acceptanceCriteria,
    }));

  const summary = buildStaffSafeClientSummary({
    client,
    profile,
    contactDocs: contacts,
    projectDocs: projects,
    assignedWork: mapStaffSafeWorkRows(workForClient),
    portalHref,
  });

  const clientLabel = summary.name;

  return {
    summary,
    notes,
    permissions: {
      canAct: true,
      canAddNotes: true,
      clientLabel,
    },
    generatedAt: new Date().toISOString(),
  };
}
