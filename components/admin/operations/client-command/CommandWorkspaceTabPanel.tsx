import Link from "next/link";
import { fmtExecutiveMoney } from "@/lib/executive-client-profile";
import { fmtWorkspaceDate } from "@/lib/executive-client-workspace/theme";
import type { ClientWorkspaceBundle } from "@/lib/client-command/workspace-types";
import type { CommandWorkspaceTabId } from "@/lib/client-command/tabs";
import {
  WorkspaceChapter,
  WorkspaceEmpty,
  WorkspaceKpiGrid,
  WorkspaceMetaLine,
  WorkspaceProse,
  WorkspaceStat,
  WorkspaceStatRow,
} from "@/components/admin/operations/client-workspace/WorkspacePrimitives";
import { ClientTimelinePanel } from "./ClientTimelinePanel";
import { ClientCommunicationsPanel } from "./ClientCommunicationsPanel";
import { ClientIntelligencePanel } from "./ClientIntelligencePanel";
import { ClientActionsPanel } from "./ClientActionsPanel";

function statusLabel(status: string): string {
  return status.replace(/-/g, " ");
}

export function CommandWorkspaceTabPanel({
  tab,
  data,
}: {
  tab: CommandWorkspaceTabId;
  data: ClientWorkspaceBundle;
}) {
  switch (tab) {
    case "overview":
      return <OverviewPanel data={data} />;
    case "timeline":
      return <ClientTimelinePanel data={data} />;
    case "projects":
      return <ProjectsPanel data={data} />;
    case "requests":
      return <RequestsPanel data={data} />;
    case "invoices":
      return <InvoicesPanel data={data} />;
    case "retainers":
      return <RetainersPanel data={data} />;
    case "files":
      return <FilesPanel data={data} />;
    case "domains":
      return <DomainsPanel data={data} />;
    case "emails":
      return <ClientCommunicationsPanel data={data} />;
    case "intelligence":
      return <ClientIntelligencePanel data={data} />;
    case "actions":
      return <ClientActionsPanel data={data} />;
    case "meetings":
      return <MeetingsPanel data={data} />;
    case "notes":
      return <NotesPanel data={data} />;
    case "analytics":
      return <AnalyticsPanel data={data} />;
    case "settings":
      return <SettingsPanel data={data} />;
    default:
      return <OverviewPanel data={data} />;
  }
}

function OverviewPanel({ data }: { data: ClientWorkspaceBundle }) {
  const { header, sections, currentWork, launchQa, domains } = data;
  const paidInvoices = data.invoices.filter((i) =>
    /paid|current|deposit-paid/i.test(i.status),
  ).length;
  const outstanding = data.invoices.filter((i) =>
    /overdue|open|pending/i.test(i.status),
  );

  return (
    <div className="kxd-os-workspace-dossier">
      <WorkspaceKpiGrid
        items={[
          { label: "Active projects", value: String(sections.projects.active.length) },
          { label: "Open requests", value: String(sections.projects.requests.length) },
          { label: "Needs reply", value: String(data.communications.needsReplyCount) },
          { label: "Monthly revenue", value: fmtExecutiveMoney(header.monthlyRevenue) },
        ]}
      />

      {data.communications.hasStaleUnresolved ? (
        <p className="kxd-os-comm-stale-banner">
          {data.communications.staleUnresolvedCount} open communication
          {data.communications.staleUnresolvedCount === 1 ? "" : "s"} older than 7 days — review in Communications.
        </p>
      ) : null}

      {data.memory.scores.urgencyScore >= 65 ? (
        <p className="kxd-os-comm-stale-banner">
          Intelligence urgency {data.memory.scores.urgencyScore}/100 —{" "}
          <Link href={`/admin/operations/client-command/${data.clientId}?tab=intelligence`} className="kxd-os-link-quiet">
            open Intelligence →
          </Link>
        </p>
      ) : null}

      <div className="kxd-os-workspace-dossier-columns kxd-os-workspace-dossier-columns--triple">
        <WorkspaceChapter title="Relationship" variant="compact">
          <WorkspaceMetaLine label="Last contact" value={sections.relationship.lastContact} />
          <WorkspaceMetaLine label="Next follow-up" value={sections.relationship.nextFollowUp} />
          <WorkspaceMetaLine
            label="Portal"
            value={data.portalUsers.length > 0 ? `${data.portalUsers.length} user(s)` : "No portal users"}
          />
        </WorkspaceChapter>

        <WorkspaceChapter title="Website" variant="compact">
          <WorkspaceMetaLine
            label="Health"
            value={
              sections.website.healthScore != null
                ? String(sections.website.healthScore)
                : "—"
            }
          />
          <WorkspaceMetaLine label="Hosting" value={sections.website.hosting ?? "—"} />
          <WorkspaceMetaLine label="Domain" value={sections.website.primaryDomain ?? "—"} />
          <WorkspaceMetaLine label="Analytics" value={sections.website.analytics ?? "—"} />
        </WorkspaceChapter>

        <WorkspaceChapter title="Retainer" variant="compact">
          <WorkspaceMetaLine label="MRR" value={sections.revenue.mrr} />
          <WorkspaceMetaLine
            label="Launch QA"
            value={`${launchQa.readinessScore}% · ${launchQa.status.replace(/-/g, " ")}`}
          />
          <WorkspaceMetaLine
            label="Open work"
            value={`${currentWork.openCount} tasks · ${currentWork.blockedCount} blocked`}
          />
        </WorkspaceChapter>
      </div>

      <div className="kxd-os-workspace-dossier-columns">
        <WorkspaceChapter title="Communications" variant="compact">
          <WorkspaceMetaLine
            label="Open"
            value={String(data.communications.openCount)}
          />
          <WorkspaceMetaLine
            label="Needs reply"
            value={String(data.communications.needsReplyCount)}
          />
          <WorkspaceMetaLine
            label="Overdue follow-ups"
            value={String(data.communications.overdueFollowUps.length)}
          />
          {data.communications.upcomingFollowUps.length > 0 ? (
            <ul className="kxd-os-workspace-list">
              {data.communications.upcomingFollowUps.slice(0, 4).map((c) => (
                <li key={c.id} className="kxd-os-workspace-list__item">
                  <Link href={`/admin/operations/client-command/${data.clientId}?tab=emails`} className="kxd-os-link-quiet">
                    {c.subject ?? c.summary ?? c.type} · {fmtWorkspaceDate(c.followUpDate!)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <WorkspaceProse>No upcoming follow-ups scheduled.</WorkspaceProse>
          )}
        </WorkspaceChapter>

        <WorkspaceChapter title="Intelligence" variant="compact">
          <WorkspaceMetaLine label="Status" value={data.memory.currentStatus} />
          <WorkspaceMetaLine
            label="Health score"
            value={`${data.memory.scores.relationshipHealthScore}/100`}
          />
          <WorkspaceMetaLine
            label="Top action"
            value={data.memory.nextBestActions[0]?.label ?? "No actions flagged"}
          />
          <Link
            href={`/admin/operations/client-command/${data.clientId}?tab=intelligence`}
            className="kxd-os-link-quiet kxd-os-workspace-inline-link"
          >
            Full intelligence →
          </Link>
        </WorkspaceChapter>

        <WorkspaceChapter title="Actions" variant="compact">
          <WorkspaceMetaLine label="Open actions" value={String(data.actions.openCount)} />
          <WorkspaceMetaLine label="Critical" value={String(data.actions.criticalCount)} />
          <WorkspaceMetaLine
            label="Next due"
            value={
              data.actions.nextDue
                ? `${data.actions.nextDue.title} · ${fmtWorkspaceDate(data.actions.nextDue.dueDate!)}`
                : "—"
            }
          />
          <WorkspaceMetaLine
            label="Assigned to"
            value={data.actions.nextDue?.assignedTo ?? "Unassigned"}
          />
          <Link
            href={`/admin/operations/client-command/${data.clientId}?tab=actions`}
            className="kxd-os-link-quiet kxd-os-workspace-inline-link"
          >
            Open actions →
          </Link>
        </WorkspaceChapter>
      </div>

      <div className="kxd-os-workspace-dossier-columns">
        <WorkspaceChapter title="Recent activity" variant="compact">
          {data.timelineEvents.length === 0 ? (
            <WorkspaceEmpty message="Activity from timeline events will appear here." />
          ) : (
            <ul className="kxd-os-workspace-list">
              {data.timelineEvents.slice(0, 6).map((e) => (
                <li key={e.id} className="kxd-os-workspace-list__item">
                  <WorkspaceProse>
                    {e.title} · {fmtWorkspaceDate(e.occurredAt)}
                  </WorkspaceProse>
                </li>
              ))}
            </ul>
          )}
        </WorkspaceChapter>

        <WorkspaceChapter title="Invoices & balance" variant="compact">
          <WorkspaceStatRow>
            <WorkspaceStat label="Paid" value={String(paidInvoices)} />
            <WorkspaceStat label="Outstanding" value={String(outstanding.length)} />
          </WorkspaceStatRow>
          {outstanding.length > 0 ? (
            <ul className="kxd-os-workspace-list">
              {outstanding.slice(0, 4).map((i) => (
                <li key={i.id} className="kxd-os-workspace-list__item">
                  <Link href={i.href} className="kxd-os-link-quiet">
                    {i.title} · {i.status}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <WorkspaceProse>No outstanding invoice signals.</WorkspaceProse>
          )}
        </WorkspaceChapter>
      </div>

      <WorkspaceChapter title="Quick links">
        <div className="kxd-os-command-quick-links">
          {domains?.href ? (
            <Link href={domains.href} className="kxd-os-command-quick-links__item">Infrastructure</Link>
          ) : null}
          <Link href={`/admin/operations/timeline/${data.clientId}`} className="kxd-os-command-quick-links__item">
            Timeline
          </Link>
          <Link href={`/admin/operations/infrastructure/${data.clientId}`} className="kxd-os-command-quick-links__item">
            Domains & hosting
          </Link>
          <Link href="/admin/operations/integrations" className="kxd-os-command-quick-links__item">
            Integrations
          </Link>
          {header.website ? (
            <a href={header.website} className="kxd-os-command-quick-links__item" target="_blank" rel="noreferrer">
              Website
            </a>
          ) : null}
        </div>
      </WorkspaceChapter>
    </div>
  );
}

function ProjectsPanel({ data }: { data: ClientWorkspaceBundle }) {
  const projects = data.projectDocs;

  if (projects.length === 0) {
    return (
      <WorkspaceChapter title="Projects">
        <WorkspaceEmpty message="No projects linked to this client yet." />
        <Link
          href={`/admin/collections/client-projects/create?client=${data.clientId}`}
          className="kxd-os-link-quiet kxd-os-workspace-inline-link"
        >
          Create project →
        </Link>
      </WorkspaceChapter>
    );
  }

  return (
    <WorkspaceChapter title="Projects">
      <ul className="kxd-os-workspace-project-list">
        {projects.map((p) => (
          <li key={p.id} className="kxd-os-workspace-project-list__item">
            <Link href={`/admin/collections/client-projects/${p.id}`}>
              <span className="kxd-os-workspace-project-list__name">
                {String(p.projectName ?? "Project")}
              </span>
              <span className="kxd-os-workspace-project-list__meta">
                {statusLabel(String(p.status ?? ""))}
                {p.targetLaunchDate
                  ? ` · Launch ${fmtWorkspaceDate(String(p.targetLaunchDate))}`
                  : ""}
                {p.liveUrl ? ` · ${String(p.liveUrl)}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </WorkspaceChapter>
  );
}

function RequestsPanel({ data }: { data: ClientWorkspaceBundle }) {
  const requests = data.requestDocs;

  if (requests.length === 0) {
    return (
      <WorkspaceChapter title="Requests">
        <WorkspaceEmpty message="No client requests on record." />
        <Link
          href={`/admin/collections/client-requests/create?client=${data.clientId}`}
          className="kxd-os-link-quiet kxd-os-workspace-inline-link"
        >
          New request →
        </Link>
      </WorkspaceChapter>
    );
  }

  const groups = [
    { label: "Open", statuses: ["new", "triaged", "in-progress", "waiting-on-client"] },
    { label: "Completed", statuses: ["completed"] },
    { label: "Archived", statuses: ["archived", "cancelled"] },
  ];

  return (
    <div className="kxd-os-workspace-dossier">
      {groups.map((group) => {
        const items = requests.filter((r) => group.statuses.includes(String(r.status)));
        if (items.length === 0) return null;
        return (
          <WorkspaceChapter key={group.label} title={group.label} variant="compact">
            <ul className="kxd-os-workspace-list">
              {items.map((r) => (
                <li key={r.id} className="kxd-os-workspace-list__item">
                  <Link href={`/admin/collections/client-requests/${r.id}`} className="kxd-os-link-quiet">
                    {String(r.requestTitle ?? "Request")} · {statusLabel(String(r.status ?? ""))}
                  </Link>
                </li>
              ))}
            </ul>
          </WorkspaceChapter>
        );
      })}
    </div>
  );
}

function InvoicesPanel({ data }: { data: ClientWorkspaceBundle }) {
  const invoices = data.invoices;
  const total = invoices.reduce((s, i) => s + (i.amount ?? 0), 0);
  const paid = invoices.filter((i) => /paid|deposit-paid|current/i.test(i.status));

  if (invoices.length === 0) {
    return (
      <WorkspaceChapter title="Invoices">
        <WorkspaceEmpty
          message="Invoice history appears from proposals and retainer billing records. No payment records yet."
        />
      </WorkspaceChapter>
    );
  }

  return (
    <WorkspaceChapter title="Invoices">
      <WorkspaceStatRow>
        <WorkspaceStat label="Total tracked" value={fmtExecutiveMoney(total)} />
        <WorkspaceStat label="Paid signals" value={String(paid.length)} />
        <WorkspaceStat
          label="Average"
          value={
            invoices.length
              ? fmtExecutiveMoney(total / invoices.length)
              : "—"
          }
        />
      </WorkspaceStatRow>
      <ul className="kxd-os-workspace-list">
        {invoices.map((i) => (
          <li key={`${i.source}-${i.id}`} className="kxd-os-workspace-list__item">
            <Link href={i.href} className="kxd-os-link-quiet">
              {i.title} · {i.status}
              {i.amount != null ? ` · ${fmtExecutiveMoney(i.amount)}` : ""}
            </Link>
          </li>
        ))}
      </ul>
    </WorkspaceChapter>
  );
}

function RetainersPanel({ data }: { data: ClientWorkspaceBundle }) {
  const retainers = data.retainerDocs;

  if (retainers.length === 0) {
    return (
      <WorkspaceChapter title="Retainers">
        <WorkspaceEmpty message="No retainers configured for this client." />
        <Link
          href={`/admin/collections/retainers/create?client=${data.clientId}`}
          className="kxd-os-link-quiet kxd-os-workspace-inline-link"
        >
          Add retainer →
        </Link>
      </WorkspaceChapter>
    );
  }

  return (
    <WorkspaceChapter title="Retainers">
      <ul className="kxd-os-workspace-project-list">
        {retainers.map((r) => (
          <li key={r.id} className="kxd-os-workspace-project-list__item">
            <Link href={`/admin/collections/retainers/${r.id}`}>
              <span className="kxd-os-workspace-project-list__name">
                {String(r.retainerName ?? "Retainer")}
              </span>
              <span className="kxd-os-workspace-project-list__meta">
                {r.monthlyAmount != null ? fmtExecutiveMoney(Number(r.monthlyAmount)) : "—"} / mo
                {r.billingStatus ? ` · ${statusLabel(String(r.billingStatus))}` : ""}
                {r.renewalDate ? ` · Renews ${fmtWorkspaceDate(String(r.renewalDate))}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </WorkspaceChapter>
  );
}

function FilesPanel({ data }: { data: ClientWorkspaceBundle }) {
  const files = data.files;

  if (files.length === 0) {
    return (
      <WorkspaceChapter title="Files">
        <WorkspaceEmpty message="Upload brand files, contracts, and creative assets to build the client library." />
        <Link
          href={`/admin/collections/creative-assets/create?client=${data.clientId}`}
          className="kxd-os-link-quiet kxd-os-workspace-inline-link"
        >
          Upload file →
        </Link>
      </WorkspaceChapter>
    );
  }

  return (
    <WorkspaceChapter title="Files">
      <div className="kxd-os-command-files-grid">
        {files.map((f) => (
          <Link key={`${f.type}-${f.id}`} href={f.href} className="kxd-os-command-file-card">
            <span className="kxd-os-command-file-card__type">{f.type}</span>
            <span className="kxd-os-command-file-card__title">{f.title}</span>
            {f.status ? (
              <span className="kxd-os-command-file-card__meta">{f.status}</span>
            ) : null}
          </Link>
        ))}
      </div>
    </WorkspaceChapter>
  );
}

function DomainsPanel({ data }: { data: ClientWorkspaceBundle }) {
  const d = data.domains;

  if (!d) {
    return (
      <WorkspaceChapter title="Domains">
        <WorkspaceEmpty message="No infrastructure registry for this client yet." />
        <Link
          href={`/admin/operations/infrastructure/${data.clientId}`}
          className="kxd-os-link-quiet kxd-os-workspace-inline-link"
        >
          Open infrastructure →
        </Link>
      </WorkspaceChapter>
    );
  }

  return (
    <WorkspaceChapter title="Domains & hosting">
      <WorkspaceMetaLine label="Primary domain" value={d.primaryDomain ?? "—"} />
      <WorkspaceMetaLine label="Registrar" value={d.registrar ?? "—"} />
      <WorkspaceMetaLine label="Expiration" value={d.expiration ? fmtWorkspaceDate(d.expiration) : "—"} />
      <WorkspaceMetaLine label="SSL" value={d.sslStatus ?? "—"} />
      <WorkspaceMetaLine label="Hosting" value={d.hosting ?? "—"} />
      <WorkspaceMetaLine label="DNS" value={d.dnsProvider ?? "—"} />
      <WorkspaceMetaLine
        label="Infrastructure score"
        value={
          d.infrastructureScore != null
            ? `${d.infrastructureScore}/100`
            : d.infrastructureStatus ?? "—"
        }
      />
      <Link href={d.href} className="kxd-os-link-quiet kxd-os-workspace-inline-link">
        Full infrastructure registry →
      </Link>
    </WorkspaceChapter>
  );
}

function MeetingsPanel({ data }: { data: ClientWorkspaceBundle }) {
  const meetings = data.meetingDocs;

  if (meetings.length === 0) {
    return (
      <WorkspaceChapter title="Meetings">
        <WorkspaceEmpty message="No success check-ins or meeting records yet." />
        <Link
          href={`/admin/collections/success-check-ins/create?client=${data.clientId}`}
          className="kxd-os-link-quiet kxd-os-workspace-inline-link"
        >
          Log meeting →
        </Link>
      </WorkspaceChapter>
    );
  }

  return (
    <WorkspaceChapter title="Meetings">
      <ul className="kxd-os-workspace-list">
        {meetings.map((m) => (
          <li key={m.id} className="kxd-os-workspace-list__item">
            <Link href={`/admin/collections/success-check-ins/${m.id}`} className="kxd-os-link-quiet">
              {String(m.summary ?? "Check-in")} · {fmtWorkspaceDate(String(m.meetingDate ?? m.createdAt))}
            </Link>
          </li>
        ))}
      </ul>
    </WorkspaceChapter>
  );
}

function NotesPanel({ data }: { data: ClientWorkspaceBundle }) {
  const notes = data.noteDocs;

  if (notes.length === 0) {
    return (
      <WorkspaceChapter title="Notes">
        <WorkspaceEmpty message="Internal executive notes are private to KXD OS." />
        <Link
          href={`/admin/collections/executive-notes/create?client=${data.clientId}`}
          className="kxd-os-link-quiet kxd-os-workspace-inline-link"
        >
          Add note →
        </Link>
      </WorkspaceChapter>
    );
  }

  return (
    <WorkspaceChapter title="Notes">
      <ul className="kxd-os-workspace-list">
        {notes.map((n) => (
          <li key={n.id} className="kxd-os-workspace-list__item">
            <Link href={`/admin/collections/executive-notes/${n.id}`} className="kxd-os-link-quiet">
              {String(n.title ?? "Note")} · {String(n.noteType ?? "note")}
              {n.pinned ? " · pinned" : ""}
            </Link>
          </li>
        ))}
      </ul>
    </WorkspaceChapter>
  );
}

function AnalyticsPanel({ data }: { data: ClientWorkspaceBundle }) {
  const a = data.analytics;

  return (
    <div className="kxd-os-workspace-dossier">
      <WorkspaceKpiGrid
        items={[
          { label: "Projects completed", value: String(a.projectsCompleted) },
          { label: "Active projects", value: String(a.activeProjects) },
          { label: "Open requests", value: String(a.openRequests) },
          { label: "Open tasks", value: String(a.openTasks) },
        ]}
      />
      <WorkspaceChapter title="Client metrics" variant="compact">
        <WorkspaceMetaLine
          label="Website audit score"
          value={a.websiteAuditScore != null ? String(a.websiteAuditScore) : "—"}
        />
        <WorkspaceMetaLine label="Meetings logged" value={String(a.meetingCount)} />
        <WorkspaceMetaLine
          label="Days since contact"
          value={a.daysSinceLastContact != null ? String(a.daysSinceLastContact) : "—"}
        />
      </WorkspaceChapter>
      {a.revenueOverTime.length > 0 ? (
        <WorkspaceChapter title="Revenue streams" variant="compact">
          <ul className="kxd-os-workspace-list">
            {a.revenueOverTime.map((r) => (
              <li key={r.label} className="kxd-os-workspace-list__item">
                <WorkspaceProse>
                  {r.label} · {fmtExecutiveMoney(r.value)}
                </WorkspaceProse>
              </li>
            ))}
          </ul>
        </WorkspaceChapter>
      ) : null}
    </div>
  );
}

function SettingsPanel({ data }: { data: ClientWorkspaceBundle }) {
  const { header } = data;

  return (
    <WorkspaceChapter title="Settings">
      <ul className="kxd-os-workspace-list">
        {[
          {
            label: "Client record",
            detail: "Core identity, billing, relationship",
            href: `/admin/collections/clients/${data.clientId}`,
          },
          {
            label: "Executive profile",
            detail: header.row?.hasExecutiveProfile ? "Edit profile" : "Create profile",
            href: data.profile
              ? `/admin/collections/executive-client-profiles/${data.profile.id}`
              : `/admin/collections/executive-client-profiles/create?client=${data.clientId}`,
          },
          {
            label: "Infrastructure registry",
            detail: "Domains, hosting, stack",
            href: `/admin/operations/infrastructure/${data.clientId}`,
          },
          {
            label: "Client HQ",
            detail: "Portal administration",
            href: `/admin/operations/clients/${data.clientId}`,
          },
        ].map((item) => (
          <li key={item.label} className="kxd-os-workspace-list__item">
            <Link href={item.href} className="kxd-os-link-quiet">
              {item.label} — {item.detail}
            </Link>
          </li>
        ))}
      </ul>
    </WorkspaceChapter>
  );
}
