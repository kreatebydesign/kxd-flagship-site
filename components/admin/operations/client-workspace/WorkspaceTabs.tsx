import Link from "next/link";
import {
  EXECUTIVE_PRIORITY_LABEL,
  EXECUTIVE_STATUS_LABEL,
  fmtExecutiveMoney,
} from "@/lib/executive-client-profile";
import type { ClientWorkspaceData } from "@/lib/executive-client-workspace/fetch-client-workspace";
import { MARKETING_MODULE_SECTIONS, timelineTypeLabel } from "@/lib/executive-client-workspace/placeholders";
import { fmtWorkspaceDate, splitLines } from "@/lib/executive-client-workspace/theme";
import {
  WorkspaceChapter,
  WorkspaceKpiGrid,
  WorkspaceList,
  WorkspaceMetaLine,
  WorkspacePlaceholderBadge,
  WorkspaceProse,
  WorkspaceFormattedText,
  WorkspaceExecutiveNotes,
  WorkspaceStat,
  WorkspaceStatRow,
} from "./WorkspacePrimitives";

function statusLabelFromClient(client: ClientWorkspaceData["client"]): string {
  const s = client.relationshipStatus as string;
  if (s === "healthy") return "Healthy";
  if (s === "needs-attention") return "Needs Attention";
  if (s === "at-risk") return "At Risk";
  if (s === "paused") return "Paused";
  return (client.status as string) ?? "—";
}

export function OverviewTab({ data }: { data: ClientWorkspaceData }) {
  const { client, profile, row, annualValue } = data;

  return (
    <div className="kxd-os-workspace-dossier">
      <WorkspaceChapter title="Executive summary">
        <WorkspaceFormattedText
          text={
            (profile?.executiveSummary as string) ||
            (client.notes as string) ||
            "No executive summary recorded."
          }
        />
      </WorkspaceChapter>

      <div className="kxd-os-workspace-dossier-columns">
        <WorkspaceChapter title="Relationship" variant="compact">
          <WorkspaceStatRow>
            <WorkspaceStat
              label="Health"
              value={row.healthScore != null ? String(row.healthScore) : "—"}
              prominence="large"
            />
            <WorkspaceStat
              label="Status"
              value={
                row.relationshipStatus
                  ? EXECUTIVE_STATUS_LABEL[row.relationshipStatus]
                  : statusLabelFromClient(client)
              }
            />
          </WorkspaceStatRow>
          <div className="kxd-os-workspace-meta-stack">
            <WorkspaceMetaLine
              label="Internal priority"
              value={
                row.internalPriority ? EXECUTIVE_PRIORITY_LABEL[row.internalPriority] : "—"
              }
            />
            {profile?.primaryDecisionMaker && (
              <WorkspaceMetaLine
                label="Decision maker"
                value={profile.primaryDecisionMaker as string}
              />
            )}
          </div>
        </WorkspaceChapter>

        <WorkspaceChapter title="Revenue" variant="compact">
          <WorkspaceStat
            label="Monthly revenue"
            value={fmtExecutiveMoney(row.monthlyRevenue)}
            prominence="hero"
          />
          <div className="kxd-os-workspace-meta-stack">
            <WorkspaceMetaLine
              label="Estimated annual"
              value={fmtExecutiveMoney(annualValue)}
            />
            <WorkspaceMetaLine
              label="Growth potential"
              value={fmtExecutiveMoney(row.potentialMonthlyRevenue)}
            />
          </div>
        </WorkspaceChapter>
      </div>

      <WorkspaceChapter title="Next action">
        <WorkspaceFormattedText text={row.nextAction ?? "No next action set."} />
        {row.nextActionDueDate && (
          <p className="kxd-os-workspace-chapter__aside">
            Due {fmtWorkspaceDate(row.nextActionDueDate)}
          </p>
        )}
      </WorkspaceChapter>

      <WorkspaceChapter title="Strategic notes">
        <WorkspaceExecutiveNotes
          text={
            (profile?.strategicNotes as string) ||
            (client.notes as string) ||
            "No executive notes recorded."
          }
        />
        {profile?.riskNotes && (
          <div className="kxd-os-workspace-risk">
            <p className="kxd-os-workspace-risk__label">Risk context</p>
            <WorkspaceFormattedText text={profile.riskNotes as string} />
          </div>
        )}
      </WorkspaceChapter>
    </div>
  );
}

export function TimelineTab({ data }: { data: ClientWorkspaceData }) {
  const events = data.timeline;

  if (events.length === 0) {
    return (
      <WorkspaceChapter title="Timeline">
        <WorkspaceProse>
          Chronological client activity will populate here from deployments, invoices, meetings,
          marketing events, and milestones. No timeline events seeded for this client yet.
        </WorkspaceProse>
      </WorkspaceChapter>
    );
  }

  return (
    <WorkspaceChapter title="Timeline">
      <ol className="kxd-os-workspace-timeline">
        {events
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map((event) => (
            <li key={event.id} className="kxd-os-workspace-timeline__item">
              <div className="kxd-os-workspace-timeline__date">
                <time>{fmtWorkspaceDate(event.date)}</time>
                <span className="kxd-os-workspace-timeline__type">
                  {timelineTypeLabel(event.type)}
                </span>
              </div>
              <div className="kxd-os-workspace-timeline__body">
                <p className="kxd-os-workspace-timeline__title">{event.title}</p>
                <WorkspaceProse>{event.summary}</WorkspaceProse>
                {event.source && (
                  <p className="kxd-os-workspace-timeline__source">Source: {event.source}</p>
                )}
              </div>
            </li>
          ))}
      </ol>
    </WorkspaceChapter>
  );
}

const PROJECT_STATUS_LABEL: Record<string, string> = {
  planning: "Planning",
  active: "Active",
  "waiting-on-client": "Waiting on Client",
  review: "Review",
  launched: "Launched",
  paused: "Paused",
  archived: "Archived",
};

export function ProjectsTab({ data }: { data: ClientWorkspaceData }) {
  const projects = data.projects;

  if (projects.length === 0) {
    return (
      <WorkspaceChapter title="Projects">
        <WorkspaceProse>
          No linked projects yet. Delivery projects from Client Projects will appear here when
          linked to this client.
        </WorkspaceProse>
        <Link
          href="/admin/collections/client-projects"
          className="kxd-os-link-quiet kxd-os-workspace-inline-link"
        >
          Open client projects
        </Link>
      </WorkspaceChapter>
    );
  }

  return (
    <WorkspaceChapter title="Projects">
      <ul className="kxd-os-workspace-project-list">
        {projects.map((project) => (
          <li key={project.id as number} className="kxd-os-workspace-project">
            <div className="kxd-os-workspace-project__head">
              <p className="kxd-os-workspace-project__name">{project.projectName as string}</p>
              <span className="kxd-os-workspace-badge">
                {PROJECT_STATUS_LABEL[project.status as string] ?? project.status}
              </span>
            </div>
            <div className="kxd-os-workspace-meta-stack">
              <WorkspaceMetaLine
                label="Type"
                value={(project.projectType as string)?.replace(/-/g, " ") ?? "—"}
              />
              <WorkspaceMetaLine
                label="Target launch"
                value={fmtWorkspaceDate(project.targetLaunchDate as string)}
              />
              {project.nextAction && (
                <WorkspaceMetaLine label="Next action" value={project.nextAction as string} />
              )}
            </div>
            <Link
              href={`/admin/collections/client-projects/${project.id}`}
              className="kxd-os-link-quiet kxd-os-workspace-inline-link"
            >
              Edit in Payload
            </Link>
          </li>
        ))}
      </ul>
    </WorkspaceChapter>
  );
}

export function ServicesTab({ data }: { data: ClientWorkspaceData }) {
  const { profile, retainers } = data;
  const currentLines = splitLines(profile?.currentServices as string);
  const futureLines = splitLines(profile?.growthOpportunities as string).slice(0, 5);
  const completedLines = splitLines(profile?.activeProjectsSummary as string)
    .filter((line) => /completed|launched|live/i.test(line));

  return (
    <div className="kxd-os-workspace-dossier-columns kxd-os-workspace-dossier-columns--triple">
      <WorkspaceChapter title="Current" variant="compact">
        {currentLines.length > 0 ? (
          <WorkspaceList items={currentLines} />
        ) : (
          <WorkspaceProse>No recurring services documented in executive profile.</WorkspaceProse>
        )}
        {retainers.length > 0 && (
          <p className="kxd-os-workspace-chapter__aside">
            {retainers.length} retainer agreement{retainers.length === 1 ? "" : "s"} on file
          </p>
        )}
      </WorkspaceChapter>

      <WorkspaceChapter title="Future" variant="compact">
        {futureLines.length > 0 ? (
          <WorkspaceList items={futureLines} />
        ) : (
          <WorkspaceProse>
            Future service opportunities will surface from growth and upsell fields.
          </WorkspaceProse>
        )}
      </WorkspaceChapter>

      <WorkspaceChapter title="Completed" variant="compact">
        {completedLines.length > 0 ? (
          <WorkspaceList items={completedLines} />
        ) : (
          <WorkspaceProse>
            Completed deliverables will link from Monthly Deliverables and project launches.
          </WorkspaceProse>
        )}
      </WorkspaceChapter>
    </div>
  );
}

export function TechnicalTab({ data }: { data: ClientWorkspaceData }) {
  const { profile } = data;
  const links = (profile?.importantLinks as Array<{ label?: string; url?: string }>) ?? [];

  return (
    <div className="kxd-os-workspace-dossier-columns">
      <WorkspaceChapter title="Infrastructure" variant="compact">
        <div className="kxd-os-workspace-meta-stack">
          <WorkspaceMetaLine label="Production" value={(profile?.productionUrl as string) || "—"} />
          <WorkspaceMetaLine label="Staging" value={(profile?.stagingUrl as string) || "—"} />
          <WorkspaceMetaLine label="GitHub" value={(profile?.githubRepo as string) || "—"} />
          <WorkspaceMetaLine label="Vercel" value={(profile?.vercelProject as string) || "—"} />
          <WorkspaceMetaLine label="Registrar" value={(profile?.domainRegistrar as string) || "—"} />
          <WorkspaceMetaLine label="DNS" value={(profile?.dnsProvider as string) || "—"} />
        </div>
      </WorkspaceChapter>

      <WorkspaceChapter title="Platforms" variant="compact">
        <div className="kxd-os-workspace-meta-stack">
          <WorkspaceMetaLine label="Google Workspace" value={(profile?.workspaceStatus as string) || "—"} />
          <WorkspaceMetaLine label="Analytics" value={(profile?.analyticsStatus as string) || "—"} />
          <WorkspaceMetaLine
            label="Search Console"
            value={(profile?.searchConsoleStatus as string) || "—"}
          />
        </div>
        {profile?.apiIntegrations && (
          <div className="kxd-os-workspace-chapter__aside">
            <WorkspaceProse>{profile.apiIntegrations as string}</WorkspaceProse>
          </div>
        )}
        {profile?.loginNotesReference && (
          <div className="kxd-os-workspace-chapter__aside">
            <WorkspaceProse>Secure references: {profile.loginNotesReference as string}</WorkspaceProse>
          </div>
        )}
      </WorkspaceChapter>

      {links.length > 0 && (
        <WorkspaceChapter title="Links" variant="compact">
          <WorkspaceList items={links.map((l) => `${l.label ?? "Link"}: ${l.url ?? ""}`)} />
        </WorkspaceChapter>
      )}
    </div>
  );
}

export function MarketingTab() {
  return (
    <WorkspaceChapter title="Marketing">
      <WorkspaceProse>
        Marketing modules will connect to SEO tooling, Google Ads, email campaigns, reviews,
        and analytics pipelines.
      </WorkspaceProse>
      <ul className="kxd-os-workspace-marketing-grid">
        {MARKETING_MODULE_SECTIONS.map((section) => (
          <li key={section} className="kxd-os-workspace-marketing-card">
            <WorkspacePlaceholderBadge label="Coming soon" />
            <p className="kxd-os-workspace-marketing-card__title">{section}</p>
            <WorkspaceProse>Future integration point.</WorkspaceProse>
          </li>
        ))}
      </ul>
    </WorkspaceChapter>
  );
}

export function RevenueTab({ data }: { data: ClientWorkspaceData }) {
  const { row, annualValue } = data;
  const monthly = row.monthlyRevenue ?? 0;
  const potential = row.potentialMonthlyRevenue ?? 0;
  const growthDelta = potential > monthly ? potential - monthly : 0;

  return (
    <div className="kxd-os-workspace-dossier">
      <WorkspaceKpiGrid
        items={[
          { label: "Monthly revenue", value: fmtExecutiveMoney(row.monthlyRevenue) },
          { label: "Annual estimate", value: fmtExecutiveMoney(annualValue) },
          { label: "Potential monthly", value: fmtExecutiveMoney(row.potentialMonthlyRevenue) },
          {
            label: "Growth opportunity",
            value: growthDelta > 0 ? fmtExecutiveMoney(growthDelta) : "—",
          },
        ]}
      />

      <WorkspaceChapter title="Growth outlook">
        <WorkspaceProse>
          {growthDelta > 0
            ? `Identified monthly expansion opportunity of ${fmtExecutiveMoney(growthDelta)} above current tracked revenue. Detailed charts and MRR history will connect from Retainers and billing intelligence in a future phase.`
            : "Track retainer growth and expansion opportunities as executive profiles and Retainers data are enriched."}
        </WorkspaceProse>
        {data.retainers.length > 0 && (
          <p className="kxd-os-workspace-chapter__aside">
            {data.retainers.length} linked retainer agreement
            {data.retainers.length === 1 ? "" : "s"}
          </p>
        )}
      </WorkspaceChapter>
    </div>
  );
}

export function OpportunitiesTab({ data }: { data: ClientWorkspaceData }) {
  const { profile } = data;
  const expansionLines = splitLines(profile?.growthOpportunities as string);
  const upsellLines = splitLines(profile?.upsellOpportunities as string);

  return (
    <div className="kxd-os-workspace-dossier">
      <div className="kxd-os-workspace-dossier-columns">
        <WorkspaceChapter title="Upsells" variant="compact">
          {upsellLines.length > 0 ? (
            <WorkspaceList items={upsellLines} />
          ) : (
            <WorkspaceProse>No upsell opportunities documented.</WorkspaceProse>
          )}
        </WorkspaceChapter>

        <WorkspaceChapter title="Expansion" variant="compact">
          {expansionLines.length > 0 ? (
            <WorkspaceList items={expansionLines} />
          ) : (
            <WorkspaceProse>No growth opportunities documented.</WorkspaceProse>
          )}
        </WorkspaceChapter>
      </div>

      <WorkspaceChapter title="Potential">
        <ul className="kxd-os-workspace-potential-grid">
          {[
            { label: "Case study", value: profile?.caseStudyPotential },
            { label: "Referral", value: profile?.referralPotential },
            { label: "Productization", value: profile?.productizationPotential },
          ].map((item) => (
            <li key={item.label} className="kxd-os-workspace-potential-card">
              <WorkspacePlaceholderBadge label={item.label} />
              <p className="kxd-os-workspace-potential-card__value">
                {(item.value as string) || "—"}
              </p>
            </li>
          ))}
        </ul>
      </WorkspaceChapter>

      {profile?.riskNotes && (
        <WorkspaceChapter title="Risk Context">
          <WorkspaceProse>{profile.riskNotes as string}</WorkspaceProse>
        </WorkspaceChapter>
      )}
    </div>
  );
}

function RoadmapColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="kxd-os-workspace-roadmap-col">
      <WorkspacePlaceholderBadge label={title} />
      {items.length > 0 ? (
        <WorkspaceList items={items} />
      ) : (
        <WorkspaceProse>Nothing listed yet.</WorkspaceProse>
      )}
    </div>
  );
}

export function RoadmapTab({ data }: { data: ClientWorkspaceData }) {
  const roadmap = data.roadmap;

  if (!roadmap) {
    return (
      <WorkspaceChapter title="Roadmap">
        <WorkspaceProse>
          Ordered roadmap items will appear here per client. Seed roadmap data in workspace
          placeholders or a future Roadmap collection.
        </WorkspaceProse>
      </WorkspaceChapter>
    );
  }

  return (
    <WorkspaceChapter title="Roadmap">
      <div className="kxd-os-workspace-roadmap-grid">
        <RoadmapColumn title="Current" items={roadmap.current} />
        <RoadmapColumn title="Next" items={roadmap.next} />
        <RoadmapColumn title="Future" items={roadmap.future} />
        <RoadmapColumn title="Completed" items={roadmap.completed} />
      </div>
    </WorkspaceChapter>
  );
}

export function NotesTab({ data }: { data: ClientWorkspaceData }) {
  const { profile, client } = data;
  const strategic = (profile?.strategicNotes as string) || (client.notes as string);
  const summary = profile?.executiveSummary as string;

  return (
    <div className="kxd-os-workspace-dossier">
      <WorkspaceChapter title="Strategic notes">
        <WorkspaceProse>
          {strategic ||
            "Long-form strategic notes live in the executive profile. This is the executive memory layer."}
        </WorkspaceProse>
      </WorkspaceChapter>

      {summary && (
        <WorkspaceChapter title="Executive summary">
          <WorkspaceProse>{summary}</WorkspaceProse>
        </WorkspaceChapter>
      )}
    </div>
  );
}
