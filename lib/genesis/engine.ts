import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { getGenesisIntegrationMissingHints } from "@/lib/live-integrations/engine";
import type {
  GenesisCommandSummary,
  GenesisDiscoveryData,
  GenesisPhaseId,
  GenesisSessionDetail,
  GenesisSessionListItem,
  GenesisSessionStatus,
  GenesisTemplateId,
} from "./types";
import { EMPTY_GENESIS_DISCOVERY, countDiscoveryFields, recommendNextStep } from "./discovery";
import { generateGenesisBlueprints } from "./blueprints";

const COLLECTION = "genesis-sessions";

type GenesisDoc = Record<string, unknown>;

function parseDiscovery(raw: unknown): GenesisDiscoveryData {
  const merged = { ...EMPTY_GENESIS_DISCOVERY };
  if (!raw || typeof raw !== "object") return merged;
  const source = raw as Partial<GenesisDiscoveryData>;
  for (const key of Object.keys(EMPTY_GENESIS_DISCOVERY) as Array<keyof GenesisDiscoveryData>) {
    const section = source[key];
    if (section && typeof section === "object") {
      Object.assign(merged[key], section);
    }
  }
  return merged;
}

function clientIdFromRel(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    return Number((value as { id: number }).id);
  }
  return null;
}

function clientNameFromRel(value: unknown): string | null {
  if (typeof value === "object" && value !== null && "name" in value) {
    return String((value as { name: string }).name);
  }
  return null;
}

function toListItem(doc: GenesisDoc): GenesisSessionListItem {
  const id = doc.id as number;
  return {
    id,
    sessionLabel: String(doc.sessionLabel ?? "Genesis Session"),
    templateId: (doc.templateId as GenesisTemplateId) ?? "standard-business",
    status: (doc.status as GenesisSessionStatus) ?? "draft",
    currentPhase: (doc.currentPhase as GenesisPhaseId) ?? "business-foundation",
    progressPercent: Number(doc.progressPercent ?? 0),
    launchReadiness: Number(doc.launchReadiness ?? 0),
    clientId: clientIdFromRel(doc.client),
    clientName: clientNameFromRel(doc.client),
    updatedAt: String(doc.updatedAt ?? ""),
    href: `/admin/operations/genesis/${id}`,
  };
}

function toDetail(doc: GenesisDoc): GenesisSessionDetail {
  const discovery = parseDiscovery(doc.discoveryData);
  const { filled, total, missing } = countDiscoveryFields(discovery);
  const progressPercent = total ? Math.round((filled / total) * 100) : 0;
  const blueprintStatus = String(doc.blueprintStatus ?? "pending");
  const launchReadiness = Number(doc.launchReadiness ?? progressPercent);

  return {
    id: doc.id as number,
    sessionLabel: String(doc.sessionLabel ?? "Genesis Session"),
    templateId: (doc.templateId as GenesisTemplateId) ?? "standard-business",
    status: (doc.status as GenesisSessionStatus) ?? "draft",
    currentPhase: (doc.currentPhase as GenesisPhaseId) ?? "business-foundation",
    progressPercent,
    launchReadiness,
    blueprintStatus: blueprintStatus as GenesisSessionDetail["blueprintStatus"],
    recommendedNextStep: String(
      doc.recommendedNextStep ?? recommendNextStep(discovery, doc.currentPhase as GenesisPhaseId, blueprintStatus),
    ),
    missingFields: (doc.missingFields as string[]) ?? missing,
    discovery,
    blueprints: doc.blueprints as GenesisSessionDetail["blueprints"],
    clientId: clientIdFromRel(doc.client),
    projectId: clientIdFromRel(doc.project),
    createdAt: String(doc.createdAt ?? ""),
    updatedAt: String(doc.updatedAt ?? ""),
    completedAt: doc.completedAt ? String(doc.completedAt) : null,
  };
}

export async function listGenesisSessions(limit = 40): Promise<GenesisSessionListItem[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    limit,
    sort: "-updatedAt",
    depth: 1,
    overrideAccess: true,
  });
  return result.docs.map((d) => toListItem(d as GenesisDoc));
}

export async function listIncompleteGenesisSessions(): Promise<GenesisSessionListItem[]> {
  const items = await listGenesisSessions(50);
  return items.filter((s) => s.status !== "completed" && s.status !== "archived");
}

export async function getGenesisSession(id: number): Promise<GenesisSessionDetail | null> {
  const payload = await getPayload({ config });
  try {
    const doc = await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: COLLECTION as any,
      id,
      depth: 1,
      overrideAccess: true,
    });
    return toDetail(doc as GenesisDoc);
  } catch {
    return null;
  }
}

export async function createGenesisSession(input: {
  templateId: GenesisTemplateId;
  sessionLabel?: string;
  createdByUserId?: number;
}): Promise<GenesisSessionDetail> {
  const payload = await getPayload({ config });
  const discovery = { ...EMPTY_GENESIS_DISCOVERY };
  const { filled, total, missing } = countDiscoveryFields(discovery);
  const progressPercent = total ? Math.round((filled / total) * 100) : 0;

  const doc = await payload.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    data: {
      sessionLabel: input.sessionLabel ?? "New Genesis Engagement",
      templateId: input.templateId,
      status: "draft",
      currentPhase: "business-foundation",
      progressPercent,
      launchReadiness: progressPercent,
      blueprintStatus: "pending",
      discoveryData: discovery,
      missingFields: missing,
      recommendedNextStep: "Begin with Business Foundation — capture the business name.",
      createdBy: input.createdByUserId,
    },
    overrideAccess: true,
  });

  return toDetail(doc as GenesisDoc);
}

export async function saveGenesisDiscovery(
  sessionId: number,
  input: {
    discovery: GenesisDiscoveryData;
    currentPhase?: GenesisPhaseId;
    templateId?: GenesisTemplateId;
  },
): Promise<GenesisSessionDetail | null> {
  const payload = await getPayload({ config });
  const discovery = parseDiscovery(input.discovery);
  const { filled, total, missing } = countDiscoveryFields(discovery);
  const progressPercent = total ? Math.round((filled / total) * 100) : 0;
  const sessionLabel =
    discovery.businessFoundation.businessName.trim() ||
    "New Genesis Engagement";

  const existing = await getGenesisSession(sessionId);
  if (!existing) return null;

  const blueprintStatus = existing.blueprintStatus;
  const launchReadiness = Math.min(
    100,
    progressPercent + (blueprintStatus === "generated" ? 15 : 0),
  );

  const doc = await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    id: sessionId,
    data: {
      sessionLabel,
      discoveryData: discovery,
      currentPhase: input.currentPhase ?? existing.currentPhase,
      templateId: input.templateId ?? existing.templateId,
      status: existing.status === "draft" ? "in-progress" : existing.status,
      progressPercent,
      launchReadiness,
      missingFields: missing,
      recommendedNextStep: recommendNextStep(
        discovery,
        input.currentPhase ?? existing.currentPhase,
        blueprintStatus,
      ),
    },
    overrideAccess: true,
  });

  return toDetail(doc as GenesisDoc);
}

export async function generateSessionBlueprints(sessionId: number): Promise<GenesisSessionDetail | null> {
  const session = await getGenesisSession(sessionId);
  if (!session) return null;

  const blueprints = generateGenesisBlueprints(session.discovery, session.templateId);
  const payload = await getPayload({ config });

  const doc = await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    id: sessionId,
    data: {
      blueprints,
      blueprintStatus: "generated",
      status: "blueprints-ready",
      launchReadiness: Math.min(100, session.progressPercent + 20),
      recommendedNextStep: "Finalize Genesis — apply blueprints and launch the client engagement.",
    },
    overrideAccess: true,
  });

  return toDetail(doc as GenesisDoc);
}

export async function getGenesisSummaryForClient(clientId: number): Promise<GenesisCommandSummary> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: COLLECTION as any,
    where: { client: { equals: clientId } },
    limit: 1,
    sort: "-updatedAt",
    depth: 0,
    overrideAccess: true,
  });

  const doc = result.docs[0] as GenesisDoc | undefined;
  if (!doc) {
    return {
      sessionId: null,
      href: null,
      discoveryProgress: 0,
      blueprintStatus: "none",
      launchReadiness: 0,
      missingInformation: ["No Genesis session — start engagement blueprinting"],
      recommendedNextStep: "Launch KXD Genesis for this client",
      status: "none",
    };
  }

  const detail = toDetail(doc);
  const integrationHints = getGenesisIntegrationMissingHints();
  const missingInformation = [
    ...detail.missingFields.slice(0, 6),
    ...integrationHints.slice(0, 2),
  ].slice(0, 6);

  return {
    sessionId: detail.id,
    href: `/admin/operations/genesis/${detail.id}`,
    discoveryProgress: detail.progressPercent,
    blueprintStatus: detail.blueprintStatus,
    launchReadiness: detail.launchReadiness,
    missingInformation,
    recommendedNextStep: detail.recommendedNextStep,
    status: detail.status,
  };
}
