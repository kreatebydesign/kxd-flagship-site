/**
 * KXD Network Phase 4 — private member directory + selected work.
 * Partner-facing surfaces never receive email, notes, earnings amounts,
 * referrals, bookings, invite status, or unpublished profiles/work.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { resolveMediaAssetUrl } from "@/lib/client-command/experience/media-url";
import { countPartnerPathMetrics } from "./path-metrics";
import {
  selectPublishedDirectoryMembers,
  selectPublishedShowcaseItems,
  type NetworkDirectoryMemberPublic,
  type NetworkDirectoryMemberSource,
  type NetworkDirectoryShowcasePublic,
  type NetworkDirectoryShowcaseSource,
  type NetworkDirectoryVisibility,
  type OwnerNetworkProfileFields,
  type OwnerNetworkShowcaseFields,
} from "./network-directory-rules";

export type {
  NetworkDirectoryMemberPublic,
  NetworkDirectoryRecognition,
  NetworkDirectoryShowcasePublic,
  NetworkDirectoryVisibility,
  OwnerNetworkProfileFields,
  OwnerNetworkShowcaseFields,
} from "./network-directory-rules";

export {
  buildNetworkDirectoryRecognitions,
  directoryPayloadContainsRestrictedKeys,
  selectPublishedDirectoryMembers,
  selectPublishedShowcaseItems,
} from "./network-directory-rules";

export type NetworkDirectoryPage = {
  members: NetworkDirectoryMemberPublic[];
  selectedWork: NetworkDirectoryShowcasePublic[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id: unknown }).id;
    if (typeof id === "number" && Number.isFinite(id)) return id;
    if (typeof id === "string" && /^\d+$/.test(id)) return Number(id);
  }
  return null;
}

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeVisibility(raw: unknown): NetworkDirectoryVisibility {
  return raw === "published" ? "published" : "private";
}

function collectLanes(...lanes: unknown[]): string[] {
  const out: string[] = [];
  for (const lane of lanes) {
    const value = trimOrNull(lane);
    if (value) out.push(value);
    if (out.length >= 3) break;
  }
  return out;
}

function sanitizePublicUrl(raw: unknown): string | null {
  const value = trimOrNull(raw);
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function mapOwnerProfile(doc: AnyDoc): OwnerNetworkProfileFields {
  return {
    partnerId: Number(doc.id),
    displayName: String(doc.displayName ?? "").trim() || "Partner",
    status:
      doc.status === "active"
        ? "active"
        : doc.status === "invited"
          ? "invited"
          : "inactive",
    directoryVisibility: normalizeVisibility(doc.directoryVisibility),
    cityMarket: String(doc.cityMarket ?? ""),
    companyOrRole: String(doc.companyOrRole ?? ""),
    connectionLane1: String(doc.connectionLane1 ?? ""),
    connectionLane2: String(doc.connectionLane2 ?? ""),
    connectionLane3: String(doc.connectionLane3 ?? ""),
    profileLine: String(doc.profileLine ?? ""),
    directoryMarkId: relId(doc.directoryMark),
    directoryMarkUrl: resolveMediaAssetUrl(doc.directoryMark),
    trustedPartner: doc.trustedPartner === true,
  };
}

function mapOwnerShowcase(
  doc: AnyDoc,
  partnerNames: Map<number, string>,
): OwnerNetworkShowcaseFields {
  const creditedPartnerId = relId(doc.creditedPartner);
  return {
    id: Number(doc.id),
    directoryVisibility: normalizeVisibility(doc.directoryVisibility),
    companyName: String(doc.companyName ?? ""),
    categoryMarket: String(doc.categoryMarket ?? ""),
    workDescription: String(doc.workDescription ?? ""),
    markId: relId(doc.mark),
    markUrl: resolveMediaAssetUrl(doc.mark),
    websiteUrl: String(doc.websiteUrl ?? ""),
    creditedPartnerId,
    creditedPartnerName:
      creditedPartnerId != null
        ? partnerNames.get(creditedPartnerId) ?? null
        : null,
    creditAttribution: doc.creditAttribution === true,
    ownerApprovedForNetwork: doc.ownerApprovedForNetwork === true,
    sortOrder: Number(doc.sortOrder ?? 0) || 0,
  };
}

async function loadPartnerFactMaps(partnerIds: number[]): Promise<{
  introByPartner: Map<number, boolean>;
  wonByPartner: Map<number, boolean>;
  paidByPartner: Map<number, boolean>;
}> {
  const introByPartner = new Map<number, boolean>();
  const wonByPartner = new Map<number, boolean>();
  const paidByPartner = new Map<number, boolean>();
  for (const id of partnerIds) {
    introByPartner.set(id, false);
    wonByPartner.set(id, false);
    paidByPartner.set(id, false);
  }
  if (partnerIds.length === 0) {
    return { introByPartner, wonByPartner, paidByPartner };
  }

  const payload = await getPayload({ config });
  const [referrals, bookings, earnings] = await Promise.all([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "partner-referrals" as any,
      where: { sourcedByPartner: { in: partnerIds } },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "partner-booking-requests" as any,
      where: {
        and: [
          { sourcedByPartner: { in: partnerIds } },
          { status: { in: ["submitted", "scheduled"] } },
        ],
      },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "partner-earnings" as any,
      where: {
        and: [
          { partner: { in: partnerIds } },
          { paymentStatus: { equals: "paid" } },
        ],
      },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  const visibilityByPartner = new Map<number, string[]>();
  for (const raw of referrals.docs) {
    const doc = raw as AnyDoc;
    const partnerId = relId(doc.sourcedByPartner);
    if (partnerId == null || !partnerIds.includes(partnerId)) continue;
    const list = visibilityByPartner.get(partnerId) ?? [];
    list.push(String(doc.partnerVisibilityState ?? "submitted"));
    visibilityByPartner.set(partnerId, list);
  }

  const openBookingsByPartner = new Map<number, number>();
  for (const raw of bookings.docs) {
    const doc = raw as AnyDoc;
    const partnerId = relId(doc.sourcedByPartner);
    if (partnerId == null || !partnerIds.includes(partnerId)) continue;
    openBookingsByPartner.set(
      partnerId,
      (openBookingsByPartner.get(partnerId) ?? 0) + 1,
    );
  }

  for (const partnerId of partnerIds) {
    const metrics = countPartnerPathMetrics({
      visibilityStates: visibilityByPartner.get(partnerId) ?? [],
      openBookingCount: openBookingsByPartner.get(partnerId) ?? 0,
    });
    introByPartner.set(partnerId, metrics.submittedLeads >= 1);
    wonByPartner.set(partnerId, metrics.wonClients >= 1);
  }

  for (const raw of earnings.docs) {
    const doc = raw as AnyDoc;
    const partnerId = relId(doc.partner);
    if (partnerId == null || !partnerIds.includes(partnerId)) continue;
    paidByPartner.set(partnerId, true);
  }

  return { introByPartner, wonByPartner, paidByPartner };
}

/**
 * Partner Home/Network loader. Requires an active partner session at the route.
 * Returns only published, active members and approved published selected work.
 */
export async function loadNetworkDirectoryForActivePartner(): Promise<NetworkDirectoryPage> {
  const payload = await getPayload({ config });
  const [profilesResult, showcaseResult] = await Promise.all([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "kxd-partner-profiles" as any,
      where: {
        and: [
          { status: { equals: "active" } },
          { directoryVisibility: { equals: "published" } },
        ],
      },
      limit: 200,
      depth: 1,
      sort: "displayName",
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "kxd-network-showcase" as any,
      where: {
        and: [
          { directoryVisibility: { equals: "published" } },
          { ownerApprovedForNetwork: { equals: true } },
        ],
      },
      limit: 100,
      depth: 1,
      sort: "sortOrder",
      overrideAccess: true,
    }),
  ]);

  const profileDocs = profilesResult.docs as AnyDoc[];
  const partnerIds = profileDocs
    .map((doc) => Number(doc.id))
    .filter((id) => Number.isFinite(id) && id > 0);
  const facts = await loadPartnerFactMaps(partnerIds);

  const memberSources: NetworkDirectoryMemberSource[] = profileDocs.map(
    (doc) => {
      const id = Number(doc.id);
      return {
        id,
        displayName: String(doc.displayName ?? "").trim() || "Partner",
        status: "active",
        directoryVisibility: normalizeVisibility(doc.directoryVisibility),
        cityMarket: trimOrNull(doc.cityMarket),
        companyOrRole: trimOrNull(doc.companyOrRole),
        connectionLanes: collectLanes(
          doc.connectionLane1,
          doc.connectionLane2,
          doc.connectionLane3,
        ),
        profileLine: trimOrNull(doc.profileLine),
        markUrl: resolveMediaAssetUrl(doc.directoryMark),
        trustedPartner: doc.trustedPartner === true,
        hasFirstIntroduction: facts.introByPartner.get(id) === true,
        hasClientWon: facts.wonByPartner.get(id) === true,
        hasPaidRecord: facts.paidByPartner.get(id) === true,
      };
    },
  );

  const partnerNames = new Map(
    memberSources.map((row) => [row.id, row.displayName] as const),
  );
  // Credited names may reference partners not published in the directory.
  const creditedIds = (showcaseResult.docs as AnyDoc[])
    .map((doc) => relId(doc.creditedPartner))
    .filter((id): id is number => id != null && !partnerNames.has(id));
  if (creditedIds.length > 0) {
    const credited = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "kxd-partner-profiles" as any,
      where: { id: { in: creditedIds } },
      limit: creditedIds.length,
      depth: 0,
      overrideAccess: true,
    });
    for (const raw of credited.docs) {
      const doc = raw as AnyDoc;
      const id = Number(doc.id);
      if (!Number.isFinite(id)) continue;
      partnerNames.set(id, String(doc.displayName ?? "").trim() || "Partner");
    }
  }

  const showcaseSources: NetworkDirectoryShowcaseSource[] = (
    showcaseResult.docs as AnyDoc[]
  ).map((doc) => {
    const creditedPartnerId = relId(doc.creditedPartner);
    return {
      id: Number(doc.id),
      directoryVisibility: normalizeVisibility(doc.directoryVisibility),
      ownerApprovedForNetwork: doc.ownerApprovedForNetwork === true,
      companyName: String(doc.companyName ?? ""),
      categoryMarket: trimOrNull(doc.categoryMarket),
      workDescription: trimOrNull(doc.workDescription),
      markUrl: resolveMediaAssetUrl(doc.mark),
      websiteUrl: sanitizePublicUrl(doc.websiteUrl),
      creditAttribution: doc.creditAttribution === true,
      creditedMemberName:
        creditedPartnerId != null
          ? partnerNames.get(creditedPartnerId) ?? null
          : null,
      sortOrder: Number(doc.sortOrder ?? 0) || 0,
    };
  });

  return {
    members: selectPublishedDirectoryMembers(memberSources),
    selectedWork: selectPublishedShowcaseItems(showcaseSources),
  };
}

export async function loadOwnerNetworkProfile(
  partnerId: number,
): Promise<OwnerNetworkProfileFields | null> {
  if (!Number.isFinite(partnerId) || partnerId <= 0) return null;
  const payload = await getPayload({ config });
  try {
    const doc = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "kxd-partner-profiles" as any,
      id: partnerId,
      depth: 1,
      overrideAccess: true,
    })) as AnyDoc;
    return mapOwnerProfile(doc);
  } catch {
    return null;
  }
}

export async function loadOwnerNetworkShowcaseList(): Promise<
  OwnerNetworkShowcaseFields[]
> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "kxd-network-showcase" as any,
    limit: 100,
    depth: 1,
    sort: "sortOrder",
    overrideAccess: true,
  });
  const partnerIds = [
    ...new Set(
      (result.docs as AnyDoc[])
        .map((doc) => relId(doc.creditedPartner))
        .filter((id): id is number => id != null),
    ),
  ];
  const partnerNames = new Map<number, string>();
  if (partnerIds.length > 0) {
    const partners = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "kxd-partner-profiles" as any,
      where: { id: { in: partnerIds } },
      limit: partnerIds.length,
      depth: 0,
      overrideAccess: true,
    });
    for (const raw of partners.docs) {
      const doc = raw as AnyDoc;
      partnerNames.set(
        Number(doc.id),
        String(doc.displayName ?? "").trim() || "Partner",
      );
    }
  }
  return (result.docs as AnyDoc[]).map((doc) =>
    mapOwnerShowcase(doc, partnerNames),
  );
}

export async function operatorUpdateNetworkProfile(input: {
  partnerId: number;
  directoryVisibility?: NetworkDirectoryVisibility;
  cityMarket?: string;
  companyOrRole?: string;
  connectionLane1?: string;
  connectionLane2?: string;
  connectionLane3?: string;
  profileLine?: string;
  directoryMarkId?: number | null;
  trustedPartner?: boolean;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!Number.isFinite(input.partnerId) || input.partnerId <= 0) {
    return { ok: false, message: "Invalid partner." };
  }
  const data: Record<string, unknown> = {};
  if (input.directoryVisibility === "private" || input.directoryVisibility === "published") {
    data.directoryVisibility = input.directoryVisibility;
  }
  if (typeof input.cityMarket === "string") {
    data.cityMarket = input.cityMarket.trim().slice(0, 120) || null;
  }
  if (typeof input.companyOrRole === "string") {
    data.companyOrRole = input.companyOrRole.trim().slice(0, 160) || null;
  }
  if (typeof input.connectionLane1 === "string") {
    data.connectionLane1 = input.connectionLane1.trim().slice(0, 80) || null;
  }
  if (typeof input.connectionLane2 === "string") {
    data.connectionLane2 = input.connectionLane2.trim().slice(0, 80) || null;
  }
  if (typeof input.connectionLane3 === "string") {
    data.connectionLane3 = input.connectionLane3.trim().slice(0, 80) || null;
  }
  if (typeof input.profileLine === "string") {
    data.profileLine = input.profileLine.trim().slice(0, 160) || null;
  }
  if (input.directoryMarkId === null) {
    data.directoryMark = null;
  } else if (
    typeof input.directoryMarkId === "number" &&
    Number.isFinite(input.directoryMarkId) &&
    input.directoryMarkId > 0
  ) {
    data.directoryMark = input.directoryMarkId;
  }
  if (typeof input.trustedPartner === "boolean") {
    data.trustedPartner = input.trustedPartner;
  }
  if (Object.keys(data).length === 0) {
    return { ok: false, message: "No profile fields to update." };
  }
  try {
    const payload = await getPayload({ config });
    await payload.update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "kxd-partner-profiles" as any,
      id: input.partnerId,
      data,
      overrideAccess: true,
    });
    return { ok: true };
  } catch {
    return { ok: false, message: "Failed to update Network profile." };
  }
}

export async function operatorUpsertNetworkShowcase(input: {
  id?: number;
  directoryVisibility?: NetworkDirectoryVisibility;
  companyName?: string;
  categoryMarket?: string;
  workDescription?: string;
  markId?: number | null;
  websiteUrl?: string;
  creditedPartnerId?: number | null;
  creditAttribution?: boolean;
  ownerApprovedForNetwork?: boolean;
  sortOrder?: number;
}): Promise<
  | { ok: true; id: number }
  | { ok: false; message: string }
> {
  const companyName =
    typeof input.companyName === "string" ? input.companyName.trim() : "";
  const isCreate = !(typeof input.id === "number" && input.id > 0);
  if (isCreate && !companyName) {
    return { ok: false, message: "Company name is required." };
  }

  const data: Record<string, unknown> = {};
  if (input.directoryVisibility === "private" || input.directoryVisibility === "published") {
    data.directoryVisibility = input.directoryVisibility;
  }
  if (typeof input.companyName === "string") {
    data.companyName = companyName.slice(0, 160);
  }
  if (typeof input.categoryMarket === "string") {
    data.categoryMarket = input.categoryMarket.trim().slice(0, 120) || null;
  }
  if (typeof input.workDescription === "string") {
    data.workDescription = input.workDescription.trim().slice(0, 200) || null;
  }
  if (input.markId === null) {
    data.mark = null;
  } else if (
    typeof input.markId === "number" &&
    Number.isFinite(input.markId) &&
    input.markId > 0
  ) {
    data.mark = input.markId;
  }
  if (typeof input.websiteUrl === "string") {
    data.websiteUrl = sanitizePublicUrl(input.websiteUrl);
  }
  if (input.creditedPartnerId === null) {
    data.creditedPartner = null;
  } else if (
    typeof input.creditedPartnerId === "number" &&
    Number.isFinite(input.creditedPartnerId) &&
    input.creditedPartnerId > 0
  ) {
    data.creditedPartner = input.creditedPartnerId;
  }
  if (typeof input.creditAttribution === "boolean") {
    data.creditAttribution = input.creditAttribution;
  }
  if (typeof input.ownerApprovedForNetwork === "boolean") {
    data.ownerApprovedForNetwork = input.ownerApprovedForNetwork;
  }
  if (typeof input.sortOrder === "number" && Number.isFinite(input.sortOrder)) {
    data.sortOrder = Math.floor(input.sortOrder);
  }

  if (
    data.directoryVisibility === "published" &&
    data.ownerApprovedForNetwork !== true &&
    isCreate
  ) {
    // Creating as published still requires explicit approval flag in the same write.
    if (input.ownerApprovedForNetwork !== true) {
      return {
        ok: false,
        message: "Published selected work requires owner approval for Network display.",
      };
    }
  }

  try {
    const payload = await getPayload({ config });
    if (!isCreate) {
      const existing = (await payload.findByID({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "kxd-network-showcase" as any,
        id: input.id!,
        depth: 0,
        overrideAccess: true,
      })) as AnyDoc;
      const nextVisibility = normalizeVisibility(
        data.directoryVisibility ?? existing.directoryVisibility,
      );
      const nextApproved =
        typeof data.ownerApprovedForNetwork === "boolean"
          ? data.ownerApprovedForNetwork
          : existing.ownerApprovedForNetwork === true;
      if (nextVisibility === "published" && !nextApproved) {
        return {
          ok: false,
          message:
            "Published selected work requires owner approval for Network display.",
        };
      }
      await payload.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "kxd-network-showcase" as any,
        id: input.id!,
        data,
        overrideAccess: true,
      });
      return { ok: true, id: input.id! };
    }

    if (!data.companyName) {
      return { ok: false, message: "Company name is required." };
    }
    if (data.directoryVisibility == null) {
      data.directoryVisibility = "private";
    }
    if (data.ownerApprovedForNetwork == null) {
      data.ownerApprovedForNetwork = false;
    }
    if (data.creditAttribution == null) {
      data.creditAttribution = false;
    }
    if (
      data.directoryVisibility === "published" &&
      data.ownerApprovedForNetwork !== true
    ) {
      return {
        ok: false,
        message:
          "Published selected work requires owner approval for Network display.",
      };
    }
    const created = await payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "kxd-network-showcase" as any,
      data,
      overrideAccess: true,
    });
    return { ok: true, id: Number(created.id) };
  } catch {
    return { ok: false, message: "Failed to save selected work." };
  }
}
