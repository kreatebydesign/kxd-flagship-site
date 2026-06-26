import Link from "next/link";
import { OpsSectionHead } from "@/components/admin/operations/shared/OpsBriefing";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { KxdBadge } from "@/components/os";
import type { FounderDashboardData, FounderFocusItem, FounderSnapshotMetric } from "@/lib/founder-dashboard";

const STATUS_LABEL: Record<string, string> = {
  healthy: "Healthy",
  "needs-attention": "Needs Attention",
  "at-risk": "At Risk",
  paused: "Paused",
};

function SectionHeader({
  label,
  sub,
  href,
  linkText,
}: {
  label: string;
  sub?: string;
  href?: string;
  linkText?: string;
}) {
  return (
    <div className="mb-6">
      <OpsSectionHead label={label} href={href} linkText={linkText} />
      {sub && <p className="kxd-os-section__description mt-2">{sub}</p>}
    </div>
  );
}

function SnapshotGrid({ metrics }: { metrics: FounderSnapshotMetric[] }) {
  return (
    <div className="kxd-os-founder-snapshot-grid">
      {metrics.map((m) => {
        const inner = (
          <div className="kxd-os-founder-snapshot-cell">
            <p className="kxd-os-metric__label">{m.label}</p>
            <p
              className={`kxd-os-metric__value${m.alert ? " kxd-os-ops-kpi-cell__value--alert" : ""}`}
            >
              {m.value}
            </p>
            <p className="kxd-os-metric__sub">{m.sub}</p>
          </div>
        );
        return m.href ? (
          <Link key={m.id} href={m.href}>
            {inner}
          </Link>
        ) : (
          <div key={m.id}>{inner}</div>
        );
      })}
    </div>
  );
}

function FocusStack({ items }: { items: FounderFocusItem[] }) {
  if (items.length === 0) {
    return (
      <div className="kxd-os-founder-panel">
        <p className="kxd-os-body">All clear for today.</p>
        <p className="kxd-os-meta mt-2">No critical items in the priority stack.</p>
      </div>
    );
  }

  return (
    <div className="kxd-os-founder-focus-stack">
      {items.map((item, i) => {
        const rowClass = `kxd-os-founder-focus-row${
          item.urgency === "critical"
            ? " kxd-os-founder-focus-row--critical"
            : item.urgency === "high"
              ? " kxd-os-founder-focus-row--high"
              : ""
        }`;
        const row = (
          <div className={rowClass}>
            <span className="kxd-os-meta">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="kxd-os-title text-base">{item.label}</p>
              <p className="kxd-os-meta mt-1">{item.detail}</p>
            </div>
            <KxdBadge variant={item.urgency === "critical" ? "critical" : item.urgency === "high" ? "warning" : "default"}>
              {item.urgency}
            </KxdBadge>
          </div>
        );
        return item.href ? (
          <Link key={item.id} href={item.href} className="no-underline text-inherit">
            {row}
          </Link>
        ) : (
          <div key={item.id}>{row}</div>
        );
      })}
    </div>
  );
}

function fmtMoneyCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

type Props = {
  data: FounderDashboardData;
  embedded?: boolean;
};

export function FounderDashboard({ data, embedded = true }: Props) {
  const growthItems = [
    {
      label: "Website Audits",
      value: data.growthPipeline.auditsSubmitted,
      sub: `${data.growthPipeline.auditsNew30d} new in 30 days`,
    },
    {
      label: "Research Leads",
      value: data.growthPipeline.researchLeadsSubmitted,
      sub: `${data.growthPipeline.researchLeadsNew30d} new in 30 days`,
    },
    {
      label: "Qualified Opportunities",
      value: data.growthPipeline.qualifiedOpportunities,
      sub: "Qualified or further in pipeline",
    },
    {
      label: "Closed Opportunities",
      value: data.growthPipeline.closedOpportunities,
      sub: "Closed-won research leads",
    },
  ];

  return (
    <div className={embedded ? "kxd-os-page kxd-os-page--ops" : "kxd-os-shell"}>
      <main>
        <OperationsPageHero
          eyebrow="Founder Studio"
          title={data.dateDisplay}
          lead={`Loaded ${data.timeDisplay} · Live snapshot across clients, delivery, growth, and studio operations`}
          presence
        />

        <section className="kxd-os-section">
          <SectionHeader
            label="Founder Snapshot"
            sub="Real-time pulse of the business — one glance, full context"
          />
          <SnapshotGrid metrics={data.snapshot} />
        </section>

        <div className="kxd-os-operations-split">
          <section className="kxd-os-section">
            <SectionHeader
              label="Today's Focus"
              sub="Priority stack — overdue work, onboarding, requests, and creative blockers"
              href="/admin/operations/today"
              linkText="Studio Today"
            />
            <FocusStack items={data.todaysFocus} />
          </section>

          <section className="kxd-os-section">
            <SectionHeader
              label="Revenue View"
              sub="Retainer-based recurring revenue"
              href="/admin/collections/retainers"
              linkText="Retainers"
            />
            <div className="kxd-os-founder-panel">
              <p className="kxd-os-founder-revenue-value">{fmtMoneyCompact(data.revenue.mrr)}</p>
              <p className="kxd-os-meta mt-2">Monthly recurring revenue</p>
              <div className="mt-6 pt-6 kxd-os-operations-mini-grid kxd-os-founder-revenue-stats">
                <div>
                  <p className="kxd-os-metric__label">Est. ARR</p>
                  <p className="kxd-os-metric__value text-xl mt-2">{fmtMoneyCompact(data.revenue.arr)}</p>
                </div>
                <div>
                  <p className="kxd-os-metric__label">Active Retainers</p>
                  <p className="kxd-os-metric__value text-xl mt-2">{data.revenue.activeRetainers}</p>
                </div>
                <div>
                  <p className="kxd-os-metric__label">Retainer Clients</p>
                  <p className="kxd-os-metric__value text-xl mt-2">{data.revenue.retainerClients}</p>
                </div>
              </div>
              {data.revenue.topAccounts.length > 0 && (
                <div className="mt-6 pt-5 kxd-os-founder-revenue-stats">
                  <p className="kxd-os-metric__label mb-4">Top Accounts</p>
                  {data.revenue.topAccounts.map((a) => (
                    <div key={a.name} className="flex justify-between gap-2 mb-2">
                      <p className="kxd-os-body">{a.name}</p>
                      <p className="kxd-os-body">
                        {fmtMoneyCompact(a.mrr)}
                        <span className="kxd-os-meta ml-2">{a.pct}%</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="kxd-os-section">
          <SectionHeader
            label="Growth Pipeline"
            sub="Audits and research leads — early signal before revenue"
            href="/admin/operations/growth"
            linkText="Growth Systems"
          />
          <div className="kxd-os-founder-snapshot-grid kxd-os-founder-snapshot-grid--half">
            {growthItems.map((item) => (
              <div key={item.label} className="kxd-os-founder-snapshot-cell">
                <p className="kxd-os-metric__label">{item.label}</p>
                <p className="kxd-os-metric__value">{item.value}</p>
                <p className="kxd-os-metric__sub">{item.sub}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="kxd-os-operations-split">
          <section className="kxd-os-section">
            <SectionHeader
              label="Team Activity"
              sub="Junior Creators — research output and studio contribution"
              href="/admin/operations/junior-creators"
              linkText="Junior Creator Admin"
            />
            {data.teamActivity.length === 0 ? (
              <div className="kxd-os-founder-panel">
                <p className="kxd-os-meta">No junior creator accounts active.</p>
              </div>
            ) : (
              <div className="kxd-os-founder-focus-stack">
                {data.teamActivity.map((member) => (
                  <div key={member.id} className="kxd-os-founder-focus-row">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="kxd-os-title text-base">{member.displayName}</p>
                        {member.activeNow && <KxdBadge variant="success">Active now</KxdBadge>}
                      </div>
                      <p className="kxd-os-meta mt-1">{member.rankTitle}</p>
                      <p className="kxd-os-meta mt-2">
                        {member.leadsThisWeek} lead{member.leadsThisWeek === 1 ? "" : "s"} this week
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="kxd-os-body">{member.leadsSubmitted} leads</p>
                      <p className="kxd-os-meta mt-1">{member.hoursLabel} contributed</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="kxd-os-section">
            <SectionHeader
              label="Client Health"
              sub="Relationship status across the active client base"
              href="/admin/operations/accounts"
              linkText="Account Intelligence"
            />
            <div className="kxd-os-founder-snapshot-grid kxd-os-founder-snapshot-grid--third mb-4">
              {[
                { label: "Healthy", value: data.clientHealth.healthy },
                { label: "Needs Attention", value: data.clientHealth.needsAttention },
                { label: "At Risk", value: data.clientHealth.atRisk },
              ].map((s) => (
                <div key={s.label} className="kxd-os-founder-snapshot-cell text-center">
                  <p className="kxd-os-metric__value">{s.value}</p>
                  <p className="kxd-os-metric__label mt-2">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="kxd-os-founder-focus-stack">
              {data.clientHealth.topClients.map((client) => (
                <Link
                  key={client.clientId}
                  href={client.href}
                  className="kxd-os-founder-focus-row no-underline text-inherit"
                >
                  <div className="flex-1 min-w-0">
                    <p className="kxd-os-presence-name">{client.name}</p>
                    <p className="kxd-os-meta mt-1">
                      {STATUS_LABEL[client.status] ?? client.status} · Grade {client.grade}
                    </p>
                  </div>
                  <p className="kxd-os-body">{fmtMoneyCompact(client.mrr)}/mo</p>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <section className="kxd-os-section">
          <SectionHeader
            label="Founder Notes"
            sub="Priorities, reminders, and vision — your private studio notebook"
          />
          <div className="kxd-os-founder-note-grid">
            {data.founderNotes.map((note) => (
              <div key={note.id} className="kxd-os-founder-note-card">
                <p className="kxd-os-metric__label mb-3">{note.category}</p>
                <p className="kxd-os-founder-note-title">{note.title}</p>
                <p className="kxd-os-body">{note.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="kxd-os-section">
          <p className="kxd-os-metric__label mb-4">Studio Systems</p>
          <div className="kxd-os-founder-quick-grid">
            {[
              { label: "Executive", href: "/admin/operations/executive" },
              { label: "Today", href: "/admin/operations/today" },
              { label: "Accounts", href: "/admin/operations/accounts" },
              { label: "Creative", href: "/admin/operations/creative" },
              { label: "Research", href: "/admin/operations/research" },
              { label: "KXD OS", href: "/os" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="kxd-os-founder-quick-link">
                {link.label}
              </Link>
            ))}
          </div>
        </section>

        <p className="kxd-os-caption mt-10">
          KXD OS · Founder Studio · Live Payload data · Refreshes on each request
        </p>
      </main>
    </div>
  );
}
