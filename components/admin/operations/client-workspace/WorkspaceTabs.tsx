import Link from "next/link";
import {
  EXECUTIVE_PRIORITY_LABEL,
  EXECUTIVE_STATUS_LABEL,
  EXECUTIVE_TIER_LABEL,
  fmtExecutiveMoney,
} from "@/lib/executive-client-profile";
import type { ClientWorkspaceData } from "@/lib/executive-client-workspace/fetch-client-workspace";
import { MARKETING_MODULE_SECTIONS, timelineTypeLabel } from "@/lib/executive-client-workspace/placeholders";
import { fmtWorkspaceDate, splitLines } from "@/lib/executive-client-workspace/theme";
import {
  WorkspaceKpiGrid,
  WorkspaceList,
  WorkspaceMetaRow,
  WorkspacePanel,
  WorkspacePlaceholderBadge,
  WorkspaceProse,
  WorkspaceFormattedText,
  WorkspaceExecutiveNotes,
  WorkspaceLabel,
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
    <div className="space-y-6">
      <WorkspaceKpiGrid
        items={[
          {
            label: "Tier",
            value: row.tier ? EXECUTIVE_TIER_LABEL[row.tier] : row.brandTier ?? "—",
          },
          { label: "Monthly Revenue", value: fmtExecutiveMoney(row.monthlyRevenue) },
          { label: "Est. Annual Value", value: fmtExecutiveMoney(annualValue) },
          { label: "Potential MRR", value: fmtExecutiveMoney(row.potentialMonthlyRevenue) },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <WorkspacePanel title="Executive Summary">
          <WorkspaceFormattedText
            text={
              (profile?.executiveSummary as string) ||
              (client.notes as string) ||
              "No executive summary recorded."
            }
          />
        </WorkspacePanel>

        <WorkspacePanel title="Revenue Snapshot">
          <WorkspaceMetaRow label="Current MRR" value={fmtExecutiveMoney(row.monthlyRevenue)} />
          <WorkspaceMetaRow label="Est. Annual Value" value={fmtExecutiveMoney(annualValue)} />
          <WorkspaceMetaRow
            label="Potential MRR"
            value={fmtExecutiveMoney(row.potentialMonthlyRevenue)}
          />
        </WorkspacePanel>

        <WorkspacePanel title="Relationship & Priority">
          <WorkspaceMetaRow
            label="Health Score"
            value={row.healthScore != null ? String(row.healthScore) : "—"}
          />
          <WorkspaceMetaRow
            label="Status"
            value={
              row.relationshipStatus
                ? EXECUTIVE_STATUS_LABEL[row.relationshipStatus]
                : statusLabelFromClient(client)
            }
          />
          <WorkspaceMetaRow
            label="Internal Priority"
            value={
              row.internalPriority ? EXECUTIVE_PRIORITY_LABEL[row.internalPriority] : "—"
            }
          />
          {profile?.primaryDecisionMaker && (
            <div style={{ marginTop: "0.75rem" }}>
              <WorkspaceProse>{profile.primaryDecisionMaker as string}</WorkspaceProse>
            </div>
          )}
        </WorkspacePanel>

        <WorkspacePanel title="Next Action">
          <WorkspaceFormattedText text={row.nextAction ?? "No next action set."} />
          <div style={{ marginTop: "0.75rem" }}>
            <WorkspaceMetaRow label="Due Date" value={fmtWorkspaceDate(row.nextActionDueDate)} />
          </div>
        </WorkspacePanel>
      </div>

      <WorkspacePanel title="Executive Notes">
        <WorkspaceExecutiveNotes
          text={
            (profile?.strategicNotes as string) ||
            (client.notes as string) ||
            "No executive notes recorded."
          }
        />
        {profile?.riskNotes && (
          <div
            style={{
              marginTop: "1.125rem",
              paddingTop: "0.875rem",
              borderTop: `1px solid rgba(255,255,255,0.08)`,
            }}
          >
            <WorkspaceLabel style={{ marginBottom: "0.5rem", color: "rgba(201,169,98,0.55)" }}>
              Risk context
            </WorkspaceLabel>
            <WorkspaceFormattedText text={profile.riskNotes as string} />
          </div>
        )}
      </WorkspacePanel>
    </div>
  );
}

export function TimelineTab({ data }: { data: ClientWorkspaceData }) {
  const events = data.timeline;

  if (events.length === 0) {
    return (
      <WorkspacePanel
        title="Activity Timeline"
        action={<span style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.3)" }}>Phase 2 — placeholder</span>}
      >
        <WorkspaceProse>
          Chronological client activity will populate here from deployments, invoices, meetings,
          marketing events, and milestones. No timeline events seeded for this client yet.
        </WorkspaceProse>
      </WorkspacePanel>
    );
  }

  return (
    <WorkspacePanel title="Activity Timeline">
      <div className="space-y-0">
        {events
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map((event, index) => (
            <div
              key={event.id}
              style={{
                display: "grid",
                gridTemplateColumns: "7rem 1fr",
                gap: "1rem",
                padding: "1rem 0",
                borderBottom:
                  index < events.length - 1 ? `1px solid rgba(255,255,255,0.08)` : "none",
              }}
            >
              <div>
                <p
                  style={{
                    fontFamily: "var(--font-outfit, sans-serif)",
                    fontSize: "0.6875rem",
                    color: "rgba(255,255,255,0.35)",
                    letterSpacing: "0.06em",
                  }}
                >
                  {fmtWorkspaceDate(event.date)}
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-outfit, sans-serif)",
                    fontSize: "0.5625rem",
                    fontWeight: 600,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#C9A962",
                    marginTop: "0.375rem",
                  }}
                >
                  {timelineTypeLabel(event.type)}
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontFamily: "var(--font-cormorant, serif)",
                    fontWeight: 300,
                    fontSize: "1.0625rem",
                    color: "#F5F1E8",
                  }}
                >
                  {event.title}
                </p>
                <WorkspaceProse>{event.summary}</WorkspaceProse>
                {event.source && (
                  <p
                    style={{
                      fontFamily: "var(--font-outfit, sans-serif)",
                      fontSize: "0.6875rem",
                      color: "rgba(255,255,255,0.25)",
                      marginTop: "0.375rem",
                    }}
                  >
                    Source: {event.source}
                  </p>
                )}
              </div>
            </div>
          ))}
      </div>
    </WorkspacePanel>
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
      <WorkspacePanel title="Linked Projects">
        <WorkspaceProse>
          No linked projects yet. Delivery projects from Client Projects will appear here when
          linked to this client.
        </WorkspaceProse>
        <Link
          href="/admin/collections/client-projects"
          style={{
            display: "inline-block",
            marginTop: "1rem",
            fontFamily: "var(--font-outfit, sans-serif)",
            fontSize: "0.6875rem",
            fontWeight: 500,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(201,169,98,0.55)",
            textDecoration: "none",
          }}
        >
          Open Client Projects →
        </Link>
      </WorkspacePanel>
    );
  }

  return (
    <WorkspacePanel title="Linked Projects">
      <div className="space-y-3">
        {projects.map((project) => (
          <div
            key={project.id as number}
            style={{
              border: `1px solid rgba(255,255,255,0.08)`,
              padding: "1rem 1.125rem",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p
                style={{
                  fontFamily: "var(--font-cormorant, serif)",
                  fontWeight: 300,
                  fontSize: "1.0625rem",
                  color: "#F5F1E8",
                }}
              >
                {project.projectName as string}
              </p>
              <span
                style={{
                  fontFamily: "var(--font-outfit, sans-serif)",
                  fontSize: "0.5625rem",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#C9A962",
                }}
              >
                {PROJECT_STATUS_LABEL[project.status as string] ?? project.status}
              </span>
            </div>
            <WorkspaceMetaRow
              label="Type"
              value={(project.projectType as string)?.replace(/-/g, " ") ?? "—"}
            />
            <WorkspaceMetaRow
              label="Target Launch"
              value={fmtWorkspaceDate(project.targetLaunchDate as string)}
            />
            {project.nextAction && (
              <WorkspaceMetaRow label="Next Action" value={project.nextAction as string} />
            )}
            <Link
              href={`/admin/collections/client-projects/${project.id}`}
              style={{
                fontFamily: "var(--font-outfit, sans-serif)",
                fontSize: "0.625rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(201,169,98,0.55)",
                textDecoration: "none",
                marginTop: "0.5rem",
                display: "inline-block",
              }}
            >
              Edit in Payload →
            </Link>
          </div>
        ))}
      </div>
    </WorkspacePanel>
  );
}

export function ServicesTab({ data }: { data: ClientWorkspaceData }) {
  const { profile, retainers } = data;
  const currentLines = splitLines(profile?.currentServices as string);
  const futureLines = splitLines(profile?.growthOpportunities as string).slice(0, 5);
  const completedLines = splitLines(profile?.activeProjectsSummary as string)
    .filter((line) => /completed|launched|live/i.test(line));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <WorkspacePanel title="Current Recurring">
        {currentLines.length > 0 ? (
          <WorkspaceList items={currentLines} />
        ) : (
          <WorkspaceProse>No recurring services documented in executive profile.</WorkspaceProse>
        )}
        {retainers.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <WorkspaceProse>
              {retainers.length} retainer agreement(s) in Retainers collection.
            </WorkspaceProse>
          </div>
        )}
      </WorkspacePanel>

      <WorkspacePanel title="Future Services">
        {futureLines.length > 0 ? (
          <WorkspaceList items={futureLines} />
        ) : (
          <WorkspaceProse>
            Future service opportunities will surface from growth and upsell fields.
          </WorkspaceProse>
        )}
      </WorkspacePanel>

      <WorkspacePanel title="Completed">
        {completedLines.length > 0 ? (
          <WorkspaceList items={completedLines} />
        ) : (
          <WorkspaceProse>
            Completed deliverables will link from Monthly Deliverables and project launches.
          </WorkspaceProse>
        )}
      </WorkspacePanel>
    </div>
  );
}

export function TechnicalTab({ data }: { data: ClientWorkspaceData }) {
  const { profile } = data;
  const links = (profile?.importantLinks as Array<{ label?: string; url?: string }>) ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <WorkspacePanel title="Infrastructure">
        <WorkspaceMetaRow label="Production URL" value={(profile?.productionUrl as string) || "—"} />
        <WorkspaceMetaRow label="Staging URL" value={(profile?.stagingUrl as string) || "—"} />
        <WorkspaceMetaRow label="GitHub Repository" value={(profile?.githubRepo as string) || "—"} />
        <WorkspaceMetaRow label="Vercel Project" value={(profile?.vercelProject as string) || "—"} />
        <WorkspaceMetaRow label="Domain Registrar" value={(profile?.domainRegistrar as string) || "—"} />
        <WorkspaceMetaRow label="DNS Provider" value={(profile?.dnsProvider as string) || "—"} />
      </WorkspacePanel>

      <WorkspacePanel title="Platforms & Integrations">
        <WorkspaceMetaRow label="Google Workspace" value={(profile?.workspaceStatus as string) || "—"} />
        <WorkspaceMetaRow label="Analytics" value={(profile?.analyticsStatus as string) || "—"} />
        <WorkspaceMetaRow
          label="Search Console"
          value={(profile?.searchConsoleStatus as string) || "—"}
        />
        {profile?.apiIntegrations && (
          <div style={{ marginTop: "0.875rem" }}>
            <WorkspaceProse>{profile.apiIntegrations as string}</WorkspaceProse>
          </div>
        )}
        {profile?.loginNotesReference && (
          <div style={{ marginTop: "1rem" }}>
            <WorkspaceProse>
              <strong style={{ color: "rgba(255,255,255,0.45)" }}>Secure references: </strong>
              {profile.loginNotesReference as string}
            </WorkspaceProse>
          </div>
        )}
      </WorkspacePanel>

      {links.length > 0 && (
        <WorkspacePanel title="Important Links">
          <WorkspaceList items={links.map((l) => `${l.label ?? "Link"}: ${l.url ?? ""}`)} />
        </WorkspacePanel>
      )}
    </div>
  );
}

export function MarketingTab() {
  return (
    <WorkspacePanel title="Marketing Intelligence">
      <WorkspaceProse>
        Marketing modules will connect to SEO tooling, Google Ads, email campaigns, reviews,
        and analytics pipelines. Placeholder structure below.
      </WorkspaceProse>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MARKETING_MODULE_SECTIONS.map((section) => (
          <div
            key={section}
            style={{
              border: `1px solid rgba(201,169,98,0.16)`,
              padding: "1rem 1.125rem",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <WorkspacePlaceholderBadge label="Coming soon" />
            <p
              style={{
                fontFamily: "var(--font-cormorant, serif)",
                fontWeight: 300,
                fontSize: "1rem",
                color: "#F5F1E8",
                marginTop: "0.625rem",
              }}
            >
              {section}
            </p>
            <WorkspaceProse>Future integration point.</WorkspaceProse>
          </div>
        ))}
      </div>
    </WorkspacePanel>
  );
}

export function RevenueTab({ data }: { data: ClientWorkspaceData }) {
  const { row, annualValue } = data;
  const monthly = row.monthlyRevenue ?? 0;
  const potential = row.potentialMonthlyRevenue ?? 0;
  const growthDelta = potential > monthly ? potential - monthly : 0;

  return (
    <div className="space-y-6">
      <WorkspaceKpiGrid
        items={[
          { label: "Current Monthly Revenue", value: fmtExecutiveMoney(row.monthlyRevenue) },
          { label: "Estimated Annual Revenue", value: fmtExecutiveMoney(annualValue) },
          { label: "Potential Monthly Revenue", value: fmtExecutiveMoney(row.potentialMonthlyRevenue) },
          {
            label: "Growth Opportunity",
            value: growthDelta > 0 ? fmtExecutiveMoney(growthDelta) : "—",
          },
        ]}
      />

      <WorkspacePanel title="Revenue Growth Card">
        <WorkspaceProse>
          {growthDelta > 0
            ? `Identified monthly expansion opportunity of ${fmtExecutiveMoney(growthDelta)} above current tracked revenue. Detailed charts and MRR history will connect from Retainers and billing intelligence in a future phase.`
            : "Track retainer growth and expansion opportunities as executive profiles and Retainers data are enriched."}
        </WorkspaceProse>
        {data.retainers.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <WorkspaceMetaRow
              label="Linked Retainers"
              value={`${data.retainers.length} agreement(s)`}
            />
          </div>
        )}
      </WorkspacePanel>
    </div>
  );
}

export function OpportunitiesTab({ data }: { data: ClientWorkspaceData }) {
  const { profile } = data;
  const expansionLines = splitLines(profile?.growthOpportunities as string);
  const upsellLines = splitLines(profile?.upsellOpportunities as string);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <WorkspacePanel title="Upsells">
        {upsellLines.length > 0 ? (
          <WorkspaceList items={upsellLines} />
        ) : (
          <WorkspaceProse>No upsell opportunities documented.</WorkspaceProse>
        )}
      </WorkspacePanel>

      <WorkspacePanel title="Expansion Ideas">
        {expansionLines.length > 0 ? (
          <WorkspaceList items={expansionLines} />
        ) : (
          <WorkspaceProse>No growth opportunities documented.</WorkspaceProse>
        )}
      </WorkspacePanel>

      <WorkspacePanel title="Productization & Referral">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Case Study", value: profile?.caseStudyPotential },
            { label: "Referral", value: profile?.referralPotential },
            { label: "Productization", value: profile?.productizationPotential },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                border: `1px solid rgba(201,169,98,0.16)`,
                padding: "0.875rem",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <WorkspacePlaceholderBadge label={item.label} />
              <p
                style={{
                  fontFamily: "var(--font-outfit, sans-serif)",
                  fontSize: "0.8125rem",
                  color: "#C9A962",
                  marginTop: "0.5rem",
                  textTransform: "capitalize",
                }}
              >
                {(item.value as string) || "—"}
              </p>
            </div>
          ))}
        </div>
      </WorkspacePanel>

      {profile?.riskNotes && (
        <WorkspacePanel title="Risk Context">
          <WorkspaceProse>{profile.riskNotes as string}</WorkspaceProse>
        </WorkspacePanel>
      )}
    </div>
  );
}

function RoadmapColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div
      style={{
        border: `1px solid rgba(255,255,255,0.08)`,
        padding: "1rem 1.125rem",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <WorkspacePlaceholderBadge label={title} />
      {items.length > 0 ? (
        <WorkspaceList items={items} />
      ) : (
        <div style={{ marginTop: "0.75rem" }}>
          <WorkspaceProse>Nothing listed yet.</WorkspaceProse>
        </div>
      )}
    </div>
  );
}

export function RoadmapTab({ data }: { data: ClientWorkspaceData }) {
  const roadmap = data.roadmap;

  if (!roadmap) {
    return (
      <WorkspacePanel title="Strategic Roadmap">
        <WorkspaceProse>
          Ordered roadmap items will appear here per client. Seed roadmap data in workspace
          placeholders or a future Roadmap collection.
        </WorkspaceProse>
      </WorkspacePanel>
    );
  }

  return (
    <WorkspacePanel title="Strategic Roadmap">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RoadmapColumn title="Current" items={roadmap.current} />
        <RoadmapColumn title="Next" items={roadmap.next} />
        <RoadmapColumn title="Future" items={roadmap.future} />
        <RoadmapColumn title="Completed" items={roadmap.completed} />
      </div>
    </WorkspacePanel>
  );
}

export function NotesTab({ data }: { data: ClientWorkspaceData }) {
  const { profile, client } = data;
  const strategic = (profile?.strategicNotes as string) || (client.notes as string);
  const summary = profile?.executiveSummary as string;

  return (
    <div className="space-y-6">
      <WorkspacePanel title="CEO Notebook — Strategic Notes">
        <WorkspaceProse>
          {strategic || "Long-form strategic notes live in the executive profile. This is the executive memory layer."}
        </WorkspaceProse>
      </WorkspacePanel>

      {summary && (
        <WorkspacePanel title="Executive Summary Reference">
          <WorkspaceProse>{summary}</WorkspaceProse>
        </WorkspacePanel>
      )}

      <WorkspacePanel title="Integration">
        <WorkspaceProse>
          Future: sync meeting notes, founder voice memos, and decision logs without duplicating
          operational Client.notes fields.
        </WorkspaceProse>
      </WorkspacePanel>
    </div>
  );
}
