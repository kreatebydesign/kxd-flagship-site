import { getPayload } from "payload";
import config from "@payload-config";
import {
  calculateEstimatedAnnualValue,
  mergeClientWithExecutiveProfile,
  type AnyDoc,
} from "@/lib/executive-client-profile";
import {
  getPlaceholderRoadmap,
  getPlaceholderTimeline,
  type PlaceholderRoadmap,
  type PlaceholderTimelineEvent,
} from "./placeholders";

export interface ClientWorkspaceData {
  client: AnyDoc;
  profile: AnyDoc | null;
  row: ReturnType<typeof mergeClientWithExecutiveProfile>;
  annualValue: number | null;
  projects: AnyDoc[];
  retainers: AnyDoc[];
  timeline: PlaceholderTimelineEvent[];
  roadmap: PlaceholderRoadmap | null;
  editProfileHref: string;
}

export async function fetchClientWorkspace(clientId: number): Promise<ClientWorkspaceData | null> {
  const payload = await getPayload({ config });

  let client: AnyDoc;
  try {
    client = await payload.findByID({
      collection: "clients",
      id: clientId,
      depth: 0,
    }) as AnyDoc;
  } catch {
    return null;
  }

  const [profilesR, projectsR, retainersR, timelineR] = await Promise.allSettled([
    payload.find({
      collection: "executive-client-profiles",
      where: { client: { equals: clientId } },
      limit: 1,
      depth: 0,
    }),
    payload.find({
      collection: "client-projects",
      where: { client: { equals: clientId } },
      limit: 50,
      depth: 0,
      sort: "-updatedAt",
    }),
    payload.find({
      collection: "retainers",
      where: { client: { equals: clientId } },
      limit: 20,
      depth: 0,
      sort: "-updatedAt",
    }),
    payload.find({
      collection: "client-timeline-events",
      where: { client: { equals: clientId } },
      limit: 100,
      depth: 0,
      sort: "-eventDate",
    }),
  ]);

  const profile =
    profilesR.status === "fulfilled"
      ? (profilesR.value.docs[0] as AnyDoc | undefined) ?? null
      : null;

  const projects =
    projectsR.status === "fulfilled" ? (projectsR.value.docs as AnyDoc[]) : [];

  const retainers =
    retainersR.status === "fulfilled" ? (retainersR.value.docs as AnyDoc[]) : [];

  const dbTimeline =
    timelineR.status === "fulfilled" ? (timelineR.value.docs as AnyDoc[]) : [];

  const row = mergeClientWithExecutiveProfile(client, profile);
  const slug = row.slug;

  const timelineFromDb: PlaceholderTimelineEvent[] = dbTimeline.map((e) => ({
    id: String(e.id),
    type: (e.eventType as PlaceholderTimelineEvent["type"]) ?? "client-milestone",
    title: (e.title as string) || "Event",
    summary: (e.summary as string) || "",
    date: (e.eventDate as string) || new Date().toISOString(),
    source: (e.source as string) || (e.createdBy as string) || undefined,
  }));

  const timeline =
    timelineFromDb.length > 0 ? timelineFromDb : getPlaceholderTimeline(slug);

  const annualValue =
    calculateEstimatedAnnualValue(
      profile?.currentMonthlyRevenue as number | undefined,
      profile?.estimatedAnnualValue as number | undefined,
    ) ?? row.estimatedAnnualValue;

  const editProfileHref = profile
    ? `/admin/collections/executive-client-profiles/${profile.id}`
    : `/admin/collections/executive-client-profiles/create?client=${clientId}`;

  return {
    client,
    profile,
    row,
    annualValue,
    projects,
    retainers,
    timeline,
    roadmap: getPlaceholderRoadmap(slug),
    editProfileHref,
  };
}
