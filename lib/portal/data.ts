import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { calculateOnboardingReadiness } from "@/lib/client-onboarding";
import { getPortalClientTasks } from "@/lib/client-tasks";
import { requirePortalSession, type PortalSession } from "./session";
import type {
  PortalDoc,
  PortalHealthSignal,
  PortalMeetingItem,
  PortalOverviewData,
  PortalResourceCategory,
  PortalTeamMember,
  PortalWebsiteAuditSummary,
  PortalWebsiteHealthData,
} from "./types";

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
  return payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// ── Client HQ data layer ──────────────────────────────────────────────────────

function linesFromTextarea(value: unknown): string[] {
  if (!value || typeof value !== "string") return [];
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatTierLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function earliestDate(...values: Array<string | null | undefined>): string | null {
  const valid = values.filter(Boolean) as string[];
  if (valid.length === 0) return null;
  return valid.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
}

function mediaUrl(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const doc = value as PortalDoc;
  return doc.url ? String(doc.url) : null;
}

export async function getPortalClient(session: PortalSession): Promise<PortalDoc | null> {
  const payload = await getPayload({ config });
  try {
    return (await payload.findByID({
      collection: "clients",
      id: session.clientId,
      depth: 0,
      overrideAccess: true,
    })) as PortalDoc;
  } catch {
    return null;
  }
}

export async function getPortalOnboarding(session: PortalSession): Promise<PortalDoc | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-onboarding" as any,
    where: { client: { equals: session.clientId } },
    limit: 1,
    depth: 2,
    overrideAccess: true,
  });
  return result.docs.length > 0 ? (result.docs[0] as PortalDoc) : null;
}

export async function getPortalExecutiveProfile(session: PortalSession): Promise<PortalDoc | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "executive-client-profiles" as any,
    where: { client: { equals: session.clientId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return result.docs.length > 0 ? (result.docs[0] as PortalDoc) : null;
}

export async function getPortalRetainers(session: PortalSession): Promise<PortalDoc[]> {
  const result = await scopedFind("retainers", session.clientId);
  return result.docs as PortalDoc[];
}

export async function getPortalTimeline(session: PortalSession): Promise<PortalDoc[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-timeline-events" as any,
    where: { client: { equals: session.clientId } },
    sort: "-eventDate",
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });
  return result.docs as PortalDoc[];
}

export async function getPortalMeetings(session: PortalSession): Promise<PortalMeetingItem[]> {
  const timeline = await getPortalTimeline(session);
  const now = Date.now();
  return timeline
    .filter((event) => String(event.eventType) === "meeting")
    .map((event) => {
      const eventDate = String(event.eventDate);
      return {
        id: event.id as number,
        title: String(event.title ?? "Meeting"),
        summary: event.summary ? String(event.summary) : null,
        eventDate,
        isUpcoming: new Date(eventDate).getTime() >= now,
      };
    });
}

async function getPortalWebsiteAudit(
  client: PortalDoc | null,
  onboarding: PortalDoc | null,
): Promise<PortalWebsiteAuditSummary | null> {
  const payload = await getPayload({ config });
  const website = String(onboarding?.currentWebsite ?? client?.companyWebsite ?? "").trim();

  // Require a client website match — never resolve audits by email/company alone
  // (shared contacts or company names could otherwise cross client boundaries).
  if (!website) return null;

  const websiteHost = website.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim();
  if (!websiteHost) return null;

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "website-audits" as any,
    where: { website: { contains: websiteHost } },
    sort: "-createdAt",
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  if (result.docs.length === 0) return null;
  const audit = result.docs[0] as PortalDoc;
  return {
    id: audit.id as number,
    website: String(audit.website ?? website),
    overallScore: typeof audit.overallScore === "number" ? audit.overallScore : null,
    grade: audit.grade ? String(audit.grade) : null,
    performanceScore: typeof audit.performanceScore === "number" ? audit.performanceScore : null,
    seoScore: typeof audit.seoScore === "number" ? audit.seoScore : null,
    mobileScore: typeof audit.mobileScore === "number" ? audit.mobileScore : null,
    conversionScore: typeof audit.conversionScore === "number" ? audit.conversionScore : null,
    brandScore: typeof audit.brandScore === "number" ? audit.brandScore : null,
    completedAt: audit.completedAt ? String(audit.completedAt) : null,
    strengths: linesFromTextarea(audit.strengths),
    opportunities: linesFromTextarea(audit.opportunities),
    recommendations: linesFromTextarea(audit.recommendations),
  };
}

export async function getPortalWebsiteHealth(session: PortalSession): Promise<PortalWebsiteHealthData> {
  const [client, onboarding, timeline] = await Promise.all([
    getPortalClient(session),
    getPortalOnboarding(session),
    getPortalTimeline(session),
  ]);
  const latestAudit = await getPortalWebsiteAudit(client, onboarding);

  const domain = String(onboarding?.currentWebsite ?? client?.companyWebsite ?? "").trim() || null;
  const hosting = onboarding?.hostingProvider ? String(onboarding.hostingProvider) : null;
  const domainRegistrar = onboarding?.domainRegistrar ? String(onboarding.domainRegistrar) : null;
  const analyticsConnected = Boolean(onboarding?.analyticsConnected);
  const usesHttps = domain ? /^https:\/\//i.test(domain) : false;

  const lastDeployment = timeline.find((event) =>
    ["deployment", "website-launch", "client-launch", "portal-launch"].includes(String(event.eventType)),
  );

  const scoreStatus = (score: number | null | undefined): PortalHealthSignal["status"] => {
    if (score == null) return "unknown";
    if (score >= 80) return "ok";
    if (score >= 60) return "warning";
    return "warning";
  };

  const signals: PortalHealthSignal[] = [
    {
      id: "domain",
      label: "Domain",
      value: domainRegistrar ?? (domain ? "Registered" : "Not on file"),
      status: domain ? "ok" : "unknown",
      detail: domain ?? undefined,
    },
    {
      id: "hosting",
      label: "Hosting",
      value: hosting ?? "Not on file",
      status: hosting ? "ok" : "unknown",
    },
    {
      id: "ssl",
      label: "SSL",
      value: domain ? (usesHttps ? "Secure (HTTPS)" : "Review recommended") : "Not on file",
      status: domain ? (usesHttps ? "ok" : "warning") : "unknown",
    },
    {
      id: "performance",
      label: "Performance",
      value: latestAudit?.performanceScore != null ? `${latestAudit.performanceScore}/100` : "Awaiting audit",
      status: scoreStatus(latestAudit?.performanceScore),
    },
    {
      id: "seo",
      label: "SEO score",
      value: latestAudit?.seoScore != null ? `${latestAudit.seoScore}/100` : "Awaiting audit",
      status: scoreStatus(latestAudit?.seoScore),
    },
    {
      id: "analytics",
      label: "Analytics connected",
      value: analyticsConnected ? "Connected" : "Not connected",
      status: analyticsConnected ? "ok" : "pending",
    },
    {
      id: "search-console",
      label: "Search Console connected",
      value: "Not on file",
      status: "unknown",
    },
    {
      id: "forms",
      label: "Forms",
      value: "Monitoring coming soon",
      status: "pending",
    },
    {
      id: "backups",
      label: "Backups",
      value: "Monitoring coming soon",
      status: "pending",
    },
    {
      id: "deployment",
      label: "Last deployment",
      value: lastDeployment ? String(lastDeployment.title) : "No deployments logged",
      status: lastDeployment ? "ok" : "unknown",
      detail: lastDeployment?.eventDate ? String(lastDeployment.eventDate) : undefined,
    },
  ];

  const knownIssues = latestAudit?.opportunities ?? [];

  return { domain, signals, latestAudit, knownIssues };
}

export async function getPortalTeam(session: PortalSession): Promise<PortalTeamMember[]> {
  const payload = await getPayload({ config });
  const [client, portalUsersR, teamMembersR] = await Promise.all([
    getPortalClient(session),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "portal-users" as any,
      where: { client: { equals: session.clientId } },
      limit: 20,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "team-members" as any,
      where: { status: { equals: "published" } },
      sort: "order",
      limit: 6,
      depth: 1,
      overrideAccess: true,
    }),
  ]);

  const members: PortalTeamMember[] = [];

  if (client?.primaryContactName) {
    members.push({
      id: `client-primary-${session.clientId}`,
      name: String(client.primaryContactName),
      role: "Primary contact",
      email: client.primaryContactEmail ? String(client.primaryContactEmail) : null,
      kind: "client",
    });
  }

  for (const user of portalUsersR.docs as PortalDoc[]) {
    members.push({
      id: `portal-user-${user.id}`,
      name: String(user.displayName ?? user.email ?? "Team member"),
      role: "Client user",
      email: user.email ? String(user.email) : null,
      kind: "client",
    });
  }

  for (const member of teamMembersR.docs as PortalDoc[]) {
    const portrait =
      member.portrait && typeof member.portrait === "object"
        ? mediaUrl(member.portrait)
        : null;
    members.push({
      id: `kxd-${member.id}`,
      name: String(member.name ?? "KXD Team"),
      role: String(member.role ?? "KXD Team"),
      kind: "kxd",
      portraitUrl: portrait,
    });
  }

  return members;
}

export function getPortalResourceCategories(): PortalResourceCategory[] {
  return [
    {
      id: "guides",
      title: "Guides",
      description: "Step-by-step documentation for your engagement.",
      items: [],
    },
    {
      id: "training",
      title: "Training",
      description: "Onboarding and platform training materials.",
      items: [],
    },
    {
      id: "videos",
      title: "Videos",
      description: "Walkthroughs, tutorials, and recorded sessions.",
      items: [],
    },
    {
      id: "support",
      title: "Support",
      description: "How to reach your KXD team and get help quickly.",
      items: [
        {
          title: "Submit a request",
          description: "Open a new request from your headquarters.",
          href: "/portal/requests",
        },
      ],
    },
    {
      id: "brand-standards",
      title: "Brand standards",
      description: "Logo usage, voice, and visual identity references.",
      items: [
        {
          title: "View brand assets",
          description: "Logos, guidelines, and marketing files.",
          href: "/portal/assets",
        },
      ],
    },
  ];
}

export async function getPortalOverview(session: PortalSession): Promise<PortalOverviewData> {
  const dashboard = await getPortalDashboard(session);
  const [client, onboarding, executive, retainers, timeline, projects, deliverables, clientTasks] =
    await Promise.all([
      getPortalClient(session),
      getPortalOnboarding(session),
      getPortalExecutiveProfile(session),
      getPortalRetainers(session),
      getPortalTimeline(session),
      getPortalProjects(session),
      getPortalDeliverables(session),
      getPortalClientTasks(session.clientId),
    ]);

  const activeRetainer = retainers.find((r) =>
    ["active", "current", "upcoming"].includes(String(r.billingStatus)),
  );

  const logoFiles = onboarding?.logoFiles;
  const firstLogo = Array.isArray(logoFiles) ? logoFiles[0] : null;
  const logoUrl = mediaUrl(firstLogo);

  const relationshipStart = earliestDate(
    activeRetainer?.contractStartDate as string,
    activeRetainer?.startDate as string,
    client?.createdAt as string,
    timeline.length > 0 ? String(timeline[timeline.length - 1].eventDate) : null,
  );

  const monthlyInvestment =
    (typeof executive?.currentMonthlyRevenue === "number"
      ? executive.currentMonthlyRevenue
      : null) ??
    (typeof client?.monthlyRetainerAmount === "number" ? client.monthlyRetainerAmount : null) ??
    (typeof activeRetainer?.monthlyAmount === "number" ? activeRetainer.monthlyAmount : null);

  const healthScore =
    typeof executive?.clientHealthScore === "number"
      ? executive.clientHealthScore
      : dashboard.readinessScore;

  const healthLabel =
    executive?.relationshipStatus
      ? formatTierLabel(String(executive.relationshipStatus))
      : client?.relationshipStatus
        ? formatTierLabel(String(client.relationshipStatus))
        : dashboard.onboardingStatus;

  const upcomingMeeting = timeline.find((event) => {
    if (String(event.eventType) !== "meeting") return false;
    return new Date(String(event.eventDate)).getTime() >= Date.now();
  });

  const activeProject = projects.find(
    (p) => !["archived", "launched"].includes(String(p.status)),
  );

  const deliverablesDue = deliverables.filter(
    (d) => d.status !== "complete" && d.dueDate,
  ).length;

  const recentCompleted = deliverables
    .filter((d) => d.status === "complete")
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, 5);

  const timelineActivity = timeline.slice(0, 8);

  const openTasks = clientTasks.filter((t) => !t.completed).length;
  const waitingOnClientTasks = clientTasks.filter((t) => t.waitingOnClient).length;

  const quickActions = [
    {
      label: "Request an update",
      href: "/portal/requests",
      description: "Share a change or question with your KXD team.",
    },
    {
      label: "View deliverables",
      href: "/portal/deliverables",
      description: "See what's in progress and what's due.",
    },
    {
      label: "Website health",
      href: "/portal/website-health",
      description: "Performance, SEO, and site status at a glance.",
    },
    {
      label: "Your assets",
      href: "/portal/assets",
      description: "Logos, files, and brand materials.",
    },
  ];

  return {
    companyName: session.clientName,
    logoUrl,
    relationshipStart,
    plan: formatTierLabel(String(client?.brandTier ?? executive?.clientTier ?? activeRetainer?.retainerName)),
    monthlyInvestment,
    healthScore,
    healthLabel,
    accountManager: "KXD Account Team",
    accountManagerEmail: "hello@kreatebydesign.com",
    nextMeeting: upcomingMeeting
      ? {
          title: String(upcomingMeeting.title),
          date: String(upcomingMeeting.eventDate),
        }
      : null,
    currentPhase: activeProject
      ? String(activeProject.status ?? "active").replace(/-/g, " ")
      : dashboard.onboardingStatus,
    primaryGoals: onboarding?.primaryGoal ? String(onboarding.primaryGoal) : null,
    openRequests: dashboard.openRequests,
    deliverablesDue,
    activeProjects: dashboard.activeProjects,
    pendingDeliverables: dashboard.pendingDeliverables,
    completedDeliverables: dashboard.completedDeliverables,
    onboardingStatus: dashboard.onboardingStatus,
    readinessScore: dashboard.readinessScore,
    recentProjects: dashboard.recentProjects,
    recentRequests: dashboard.recentRequests,
    recentDeliverables: dashboard.recentDeliverables,
    recentCompleted,
    timelineActivity,
    quickActions,
    openTasks,
    waitingOnClientTasks,
    clientTasks: clientTasks.slice(0, 12),
  };
}
