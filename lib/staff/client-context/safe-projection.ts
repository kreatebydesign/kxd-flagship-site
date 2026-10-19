/**
 * Explicit allowlist for staff My Clients surfaces.
 * Never pass raw client / profile documents to the client.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export interface StaffSafeContact {
  id: number | null;
  name: string;
  roleTitle: string | null;
  email: string | null;
  phone: string | null;
  source: "primary" | "client-contacts";
}

export interface StaffSafeProjectLink {
  label: string;
  url: string;
}

export interface StaffSafeProjectRow {
  id: number;
  name: string;
  projectType: string | null;
  status: string;
  liveUrl: string | null;
  nextAction: string | null;
  nextActionDueDate: string | null;
  approvedNotes: string | null;
}

export interface StaffSafeWorkRow {
  id: number;
  title: string;
  status: string;
  dueDate: string | null;
  href: string;
  instructions: string | null;
}

export interface StaffSafeClientSummary {
  clientId: number;
  name: string;
  slug: string;
  engagementStatus: string;
  relationshipHealth: string | null;
  websiteUrl: string | null;
  nextAction: string | null;
  nextActionDueDate: string | null;
  projectOverview: string | null;
  currentServices: string | null;
  contacts: StaffSafeContact[];
  projectLinks: StaffSafeProjectLink[];
  projects: StaffSafeProjectRow[];
  assignedWork: StaffSafeWorkRow[];
  portalHref: string | null;
}

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length ? t : null;
}

export function projectStatusLabel(status: string): string {
  return status.replace(/-/g, " ");
}

export function mapStaffSafeContacts(
  client: AnyDoc,
  contactDocs: AnyDoc[],
): StaffSafeContact[] {
  const rows: StaffSafeContact[] = [];

  const primaryName = trimOrNull(client.primaryContactName);
  const primaryEmail = trimOrNull(client.primaryContactEmail);
  if (primaryName || primaryEmail) {
    rows.push({
      id: null,
      name: primaryName ?? "Primary contact",
      roleTitle: "Primary contact",
      email: primaryEmail,
      phone: null,
      source: "primary",
    });
  }

  for (const doc of contactDocs) {
    if (String(doc.status ?? "active") !== "active") continue;
    const name = trimOrNull(doc.name);
    if (!name) continue;
    rows.push({
      id: Number(doc.id),
      name,
      roleTitle: trimOrNull(doc.roleTitle),
      email: trimOrNull(doc.email),
      phone: trimOrNull(doc.phone),
      source: "client-contacts",
    });
  }

  return rows;
}

export function mapStaffSafeProjects(docs: AnyDoc[]): StaffSafeProjectRow[] {
  return docs.map((doc) => ({
    id: Number(doc.id),
    name: String(doc.projectName ?? `Project ${doc.id}`),
    projectType: trimOrNull(doc.projectType),
    status: String(doc.status ?? "planning"),
    liveUrl: trimOrNull(doc.liveUrl),
    nextAction: trimOrNull(doc.nextAction),
    nextActionDueDate: doc.nextActionDueDate ? String(doc.nextActionDueDate) : null,
    approvedNotes: trimOrNull(doc.notes),
  }));
}

export function mapStaffSafeProjectLinks(input: {
  clientWebsite: string | null;
  profile: AnyDoc | null;
  projects: StaffSafeProjectRow[];
}): StaffSafeProjectLink[] {
  const links: StaffSafeProjectLink[] = [];
  const seen = new Set<string>();

  function push(label: string, url: string | null) {
    if (!url) return;
    const normalized = url.trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    links.push({ label, url: normalized });
  }

  push("Company website", input.clientWebsite);
  if (input.profile) {
    push("Production site", trimOrNull(input.profile.productionUrl));
    push("Preview site", trimOrNull(input.profile.stagingUrl));
    push("GitHub", trimOrNull(input.profile.githubRepo));
    push("Vercel", trimOrNull(input.profile.vercelProject));
    const important = input.profile.importantLinks;
    if (Array.isArray(important)) {
      for (const row of important) {
        if (!row || typeof row !== "object") continue;
        const label = trimOrNull((row as AnyDoc).label) ?? "Link";
        push(label, trimOrNull((row as AnyDoc).url));
      }
    }
  }

  for (const project of input.projects) {
    if (project.liveUrl) {
      push(`${project.name} (live)`, project.liveUrl);
    }
  }

  return links;
}

export function buildStaffSafeClientSummary(input: {
  client: AnyDoc;
  profile: AnyDoc | null;
  contactDocs: AnyDoc[];
  projectDocs: AnyDoc[];
  assignedWork: StaffSafeWorkRow[];
  portalHref: string | null;
}): StaffSafeClientSummary {
  const client = input.client;
  const clientId = Number(client.id);
  const projects = mapStaffSafeProjects(input.projectDocs);
  const websiteUrl = trimOrNull(client.companyWebsite);

  return {
    clientId,
    name: String(client.name ?? `Client ${clientId}`),
    slug: String(client.slug ?? clientId),
    engagementStatus: String(client.status ?? "active"),
    relationshipHealth: trimOrNull(client.relationshipStatus),
    websiteUrl,
    nextAction: trimOrNull(client.nextAction),
    nextActionDueDate: client.nextActionDueDate ? String(client.nextActionDueDate) : null,
    projectOverview: input.profile ? trimOrNull(input.profile.activeProjectsSummary) : null,
    currentServices: input.profile ? trimOrNull(input.profile.currentServices) : null,
    contacts: mapStaffSafeContacts(client, input.contactDocs),
    projectLinks: mapStaffSafeProjectLinks({
      clientWebsite: websiteUrl,
      profile: input.profile,
      projects,
    }),
    projects,
    assignedWork: input.assignedWork,
    portalHref: input.portalHref,
  };
}

export function mapStaffSafeWorkRows(
  workItems: Array<{
    id: number;
    title: string;
    status: string;
    dueDate: string | null;
    href: string;
    description: string | null;
    acceptanceCriteria: string | null;
  }>,
): StaffSafeWorkRow[] {
  return workItems.map((work) => {
    const parts = [work.description, work.acceptanceCriteria]
      .map((p) => (p ? p.trim() : ""))
      .filter(Boolean);
    return {
      id: work.id,
      title: work.title,
      status: work.status,
      dueDate: work.dueDate,
      href: work.href,
      instructions: parts.length ? parts.join("\n\n") : null,
    };
  });
}
