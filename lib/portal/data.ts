import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { calculateOnboardingReadiness } from "@/lib/client-onboarding";
import { requirePortalSession, type PortalSession } from "./session";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export type PortalMediaAsset = {
  id: number;
  title: string;
  category: string;
  url: string;
  mimeType: string | null;
  alt: string;
};

async function scopedFind(
  collection: string,
  clientId: number,
  extra?: Record<string, unknown>,
) {
  const payload = await getPayload({ config });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return payload.find({
    collection: collection as any,
    where: {
      client: { equals: clientId },
      ...extra,
    },
    limit: 200,
    depth: 1,
    overrideAccess: true,
  });
}

export async function getPortalDashboard(session: PortalSession) {
  const clientId = session.clientId;
  const payload = await getPayload({ config });

  const [projectsR, requestsR, deliverablesR, clientR, onboardingR] = await Promise.allSettled([
    scopedFind("client-projects", clientId),
    scopedFind("client-requests", clientId),
    scopedFind("monthly-deliverables", clientId),
    payload.findByID({ collection: "clients", id: clientId, depth: 0, overrideAccess: true }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-onboarding" as any,
      where: { client: { equals: clientId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  const projects = projectsR.status === "fulfilled" ? projectsR.value.docs as AnyDoc[] : [];
  const requests = requestsR.status === "fulfilled" ? requestsR.value.docs as AnyDoc[] : [];
  const deliverables = deliverablesR.status === "fulfilled" ? deliverablesR.value.docs as AnyDoc[] : [];
  const client = clientR.status === "fulfilled" ? clientR.value as AnyDoc : null;
  const onboardingDoc =
    onboardingR.status === "fulfilled" && onboardingR.value.docs.length > 0
      ? onboardingR.value.docs[0] as AnyDoc
      : null;

  const activeProjects = projects.filter(
    (p) => !["archived", "launched"].includes(String(p.status)),
  ).length;

  const openRequests = requests.filter(
    (r) => !["complete", "declined"].includes(String(r.status)),
  ).length;

  const pendingDeliverables = deliverables.filter(
    (d) => d.status !== "complete",
  ).length;

  const completedDeliverables = deliverables.filter(
    (d) => d.status === "complete",
  ).length;

  const onboardingStatus = client?.osOnboardingStatus ?? "Not started";
  const readinessScore = client?.osOnboardingReadinessScore ?? (
    onboardingDoc ? calculateOnboardingReadiness(onboardingDoc).score : 0
  );

  const recentProjects = [...projects]
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, 5);

  const recentRequests = [...requests]
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, 5);

  const recentDeliverables = [...deliverables]
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, 5);

  return {
    activeProjects,
    openRequests,
    pendingDeliverables,
    completedDeliverables,
    onboardingStatus,
    readinessScore,
    recentProjects,
    recentRequests,
    recentDeliverables,
  };
}

export async function getPortalProjects(session: PortalSession) {
  const result = await scopedFind("client-projects", session.clientId);
  return result.docs as AnyDoc[];
}

export async function getPortalRequests(session: PortalSession) {
  const result = await scopedFind("client-requests", session.clientId);
  return result.docs as AnyDoc[];
}

export async function getPortalDeliverables(session: PortalSession) {
  const result = await scopedFind("monthly-deliverables", session.clientId);
  return result.docs as AnyDoc[];
}

function mediaFromDoc(doc: AnyDoc, category: string): PortalMediaAsset | null {
  if (!doc?.url) return null;
  return {
    id: doc.id as number,
    title: String(doc.filename ?? doc.alt ?? "Asset"),
    category,
    url: String(doc.url),
    mimeType: doc.mimeType ? String(doc.mimeType) : null,
    alt: String(doc.alt ?? doc.filename ?? "Asset"),
  };
}

function collectMediaFromRels(
  items: unknown,
  category: string,
): PortalMediaAsset[] {
  if (!Array.isArray(items)) return [];
  const assets: PortalMediaAsset[] = [];
  for (const item of items) {
    if (typeof item === "object" && item !== null && "url" in item) {
      const asset = mediaFromDoc(item as AnyDoc, category);
      if (asset) assets.push(asset);
    }
  }
  return assets;
}

export async function getPortalAssets(session: PortalSession): Promise<PortalMediaAsset[]> {
  const payload = await getPayload({ config });
  const clientId = session.clientId;
  const assets: PortalMediaAsset[] = [];

  const [onboardingR, brandKitAssetsR] = await Promise.allSettled([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-onboarding" as any,
      where: { client: { equals: clientId } },
      limit: 5,
      depth: 2,
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "brand-kit-assets" as any,
      where: { client: { equals: clientId } },
      limit: 100,
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  if (onboardingR.status === "fulfilled") {
    for (const doc of onboardingR.value.docs as AnyDoc[]) {
      assets.push(...collectMediaFromRels(doc.logoFiles, "Logo"));
      assets.push(...collectMediaFromRels(doc.brandGuidelines, "Brand Guidelines"));
      assets.push(...collectMediaFromRels(doc.marketingMaterials, "Marketing"));
      assets.push(...collectMediaFromRels(doc.photos, "Photos"));
      assets.push(...collectMediaFromRels(doc.videos, "Videos"));
    }
  }

  if (brandKitAssetsR.status === "fulfilled") {
    for (const doc of brandKitAssetsR.value.docs as AnyDoc[]) {
      if (doc.externalUrl) {
        assets.push({
          id: doc.id as number,
          title: String(doc.title ?? "Brand Asset"),
          category: String(doc.assetType ?? "Brand Asset"),
          url: String(doc.externalUrl),
          mimeType: null,
          alt: String(doc.title ?? "Brand Asset"),
        });
      }
    }
  }

  const seen = new Set<number>();
  return assets.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

export async function getPortalPageData() {
  const session = await requirePortalSession();
  return session;
}
