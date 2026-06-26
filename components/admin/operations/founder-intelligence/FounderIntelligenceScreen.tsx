import Link from "next/link";
import type { ReactNode } from "react";
import {
  KxdBadge,
  KxdEmptyState,
  KxdMetric,
  KxdPage,
  KxdSection,
  type KxdBadgeVariant,
} from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import type { FounderBriefingData, FounderPriority, PriorityUrgency } from "@/lib/founder-intelligence/types";

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function urgencyVariant(urgency: PriorityUrgency): KxdBadgeVariant {
  switch (urgency) {
    case "critical":
      return "critical";
    case "high":
      return "warning";
    case "medium":
      return "status";
    default:
      return "default";
  }
}

function PriorityStack({ items }: { items: FounderPriority[] }) {
  if (items.length === 0) {
    return (
      <div className="kxd-os-founder-panel">
        <p className="kxd-os-body">All clear for today.</p>
        <p className="kxd-os-meta mt-2">No ranked priorities across delivery, revenue, or infrastructure.</p>
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
              <p className="kxd-os-title text-base">{item.title}</p>
              <p className="kxd-os-meta mt-1">
                {item.client} · {item.sourceModule}
              </p>
              <p className="kxd-os-body mt-2">{item.whyItMatters}</p>
              <p className="kxd-os-meta mt-1">→ {item.recommendedAction}</p>
            </div>
            <KxdBadge variant={urgencyVariant(item.urgency)}>{item.urgency}</KxdBadge>
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

function ListPanel<T>({
  items,
  renderItem,
  empty,
}: {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="kxd-os-meta">{empty}</p>;
  }
  return <div className="kxd-os-ops-list">{items.map(renderItem)}</div>;
}

export function FounderIntelligenceScreen({ data }: { data: FounderBriefingData }) {
  const { revenue, projectMomentum } = data;

  return (
    <OperationsShell activeId="founder-intelligence">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Founder Intelligence"
          title={data.dateDisplay}
          lead={`Morning command brief · ${data.timeDisplay}`}
          presence
        />

        <section className="kxd-os-card" style={{ marginBottom: "2rem" }}>
          <p className="kxd-os-section__label">Morning brief</p>
          <p className="kxd-os-headline" style={{ fontSize: "1.25rem", marginTop: "0.75rem" }}>
            {data.morningBrief.summary}
          </p>
        </section>

        <KxdSection label="Priority stack" />
        <p className="kxd-os-section__description" style={{ marginBottom: "1.25rem" }}>
          What needs attention first — ranked by urgency across infrastructure, delivery, revenue, and
          growth.
        </p>
        <PriorityStack items={data.priorities} />

        <KxdSection label="Revenue intelligence" />
        <div className="kxd-os-ops-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <KxdMetric label="Active MRR" value={fmtMoney(revenue.activeMrr)} />
          <KxdMetric label="Upcoming MRR (30d)" value={fmtMoney(revenue.upcomingMrr)} />
          <KxdMetric
            label="Infrastructure margin"
            value={
              revenue.infrastructureMarginOpportunity != null
                ? fmtMoney(revenue.infrastructureMarginOpportunity)
                : "—"
            }
            sub="MRR minus monthly stack"
          />
          <KxdMetric
            label="Expansion opportunity"
            value={fmtMoney(revenue.potentialExpansionRevenue)}
            sub="Top signals combined"
          />
        </div>

        <div className="kxd-os-operations-split" style={{ marginBottom: "2rem" }}>
          <section className="kxd-os-card">
            <p className="kxd-os-section__label">Clients without retainers</p>
            {revenue.clientsWithoutRetainers.length === 0 ? (
              <p className="kxd-os-meta">All active clients have retainer data on file.</p>
            ) : (
              <ul className="kxd-os-body" style={{ marginTop: "0.75rem", paddingLeft: "1.25rem" }}>
                {revenue.clientsWithoutRetainers.slice(0, 6).map((c) => (
                  <li key={c.id as number}>
                    <Link href={`/admin/collections/clients/${c.id}`} className="kxd-os-link-quiet">
                      {String(c.name)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="kxd-os-card">
            <p className="kxd-os-section__label">Top opportunity clients</p>
            {revenue.topOpportunityClients.length === 0 ? (
              <p className="kxd-os-meta">No expansion opportunities flagged.</p>
            ) : (
              <div className="kxd-os-ops-list" style={{ marginTop: "0.75rem" }}>
                {revenue.topOpportunityClients.map((o) => (
                  <div key={o.clientId} className="kxd-os-ops-list__row">
                    <p className="kxd-os-card__title">{o.name}</p>
                    <p className="kxd-os-meta">
                      {o.reason} · {fmtMoney(o.value)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <KxdSection label="Client risk" />
        {data.clientRisks.length === 0 ? (
          <KxdEmptyState
            title="No elevated client risk"
            description="Active clients show no compound risk signals this morning."
          />
        ) : (
          <div className="kxd-os-ops-list" style={{ marginBottom: "2rem" }}>
            {data.clientRisks.map((risk) => (
              <Link
                key={risk.clientId}
                href={risk.href}
                className="kxd-os-card"
                style={{ display: "block", textDecoration: "none" }}
              >
                <div className="kxd-os-ops-list__head">
                  <p className="kxd-os-card__title">{risk.clientName}</p>
                  <KxdBadge variant={urgencyVariant(risk.urgency)}>{risk.urgency}</KxdBadge>
                </div>
                <ul className="kxd-os-meta" style={{ marginTop: "0.5rem", paddingLeft: "1.25rem" }}>
                  {risk.signals.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </Link>
            ))}
          </div>
        )}

        <KxdSection label="Project momentum" />
        <div className="kxd-os-operations-split" style={{ marginBottom: "2rem" }}>
          <section className="kxd-os-card">
            <p className="kxd-os-metric__label">Active projects</p>
            <p className="kxd-os-metric__value">{projectMomentum.activeProjects.length}</p>
            <ListPanel
              items={projectMomentum.activeProjects.slice(0, 5)}
              empty="No active projects."
              renderItem={(p) => (
                <div key={p.id as number} className="kxd-os-ops-list__row">
                  <p className="kxd-os-body">{String(p.projectName)}</p>
                  <p className="kxd-os-meta">{String(p.status)}</p>
                </div>
              )}
            />
          </section>
          <section className="kxd-os-card">
            <p className="kxd-os-metric__label">Stalled / blocked</p>
            <p className="kxd-os-metric__value">{projectMomentum.stalledProjects.length}</p>
            <ListPanel
              items={projectMomentum.stalledProjects.slice(0, 5)}
              empty="No stalled projects."
              renderItem={(p) => (
                <div key={p.id as number} className="kxd-os-ops-list__row">
                  <p className="kxd-os-body">{String(p.projectName)}</p>
                  <p className="kxd-os-meta">Stale activity</p>
                </div>
              )}
            />
          </section>
        </div>

        <div className="kxd-os-operations-split" style={{ marginBottom: "2rem" }}>
          <section className="kxd-os-card">
            <p className="kxd-os-section__label">Deliverables due soon</p>
            <ListPanel
              items={projectMomentum.deliverablesDueSoon.slice(0, 6)}
              empty="No deliverables due in the next 14 days."
              renderItem={(d) => (
                <div key={d.id as number} className="kxd-os-ops-list__row">
                  <p className="kxd-os-body">{String(d.title)}</p>
                  <p className="kxd-os-meta">Due {String(d.dueDate).slice(0, 10)}</p>
                </div>
              )}
            />
          </section>
          <section className="kxd-os-card">
            <p className="kxd-os-section__label">Creative in motion</p>
            <ListPanel
              items={projectMomentum.creativeInMotion}
              empty="No active creative requests."
              renderItem={(item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="kxd-os-ops-list__row"
                  style={{ textDecoration: "none", display: "block" }}
                >
                  <p className="kxd-os-body">{item.title}</p>
                  <p className="kxd-os-meta">
                    {item.type} · {item.client}
                  </p>
                </Link>
              )}
            />
          </section>
        </div>

        <KxdSection label="Infrastructure alerts" />
        {data.infrastructureAlerts.length === 0 ? (
          <p className="kxd-os-meta" style={{ marginBottom: "2rem" }}>
            No infrastructure alerts this morning.
          </p>
        ) : (
          <div className="kxd-os-ops-list" style={{ marginBottom: "2rem" }}>
            {data.infrastructureAlerts.map((alert) => (
              <div key={alert.id} className="kxd-os-card">
                <div className="kxd-os-ops-list__head">
                  <p className="kxd-os-card__title">{alert.title}</p>
                  <KxdBadge variant={urgencyVariant(alert.urgency)}>{alert.urgency}</KxdBadge>
                </div>
                <p className="kxd-os-meta">
                  {alert.client} · {alert.detail}
                </p>
                {alert.href ? (
                  <Link href={alert.href} className="kxd-os-link-quiet" style={{ marginTop: "0.75rem", display: "inline-block" }}>
                    Review →
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <div className="kxd-os-operations-split" style={{ marginBottom: "2rem" }}>
          <KxdSection label="Upcoming meetings">
            {data.upcomingMeetings.length === 0 ? (
              <p className="kxd-os-meta">No meetings in the next 30 days.</p>
            ) : (
              <div className="kxd-os-ops-list">
                {data.upcomingMeetings.map((m) => (
                  <div key={m.id} className="kxd-os-ops-list__row">
                    <p className="kxd-os-card__title">{m.title}</p>
                    <p className="kxd-os-meta">
                      {m.client} · in {m.daysUntil} day{m.daysUntil === 1 ? "" : "s"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </KxdSection>

          <KxdSection label="Opportunity signals">
            {data.opportunities.length === 0 ? (
              <p className="kxd-os-meta">No growth opportunities flagged.</p>
            ) : (
              <div className="kxd-os-ops-list">
                {data.opportunities.slice(0, 8).map((o) => (
                  <div key={o.id} className="kxd-os-ops-list__row">
                    <p className="kxd-os-card__title">{o.title}</p>
                    <p className="kxd-os-meta">
                      {o.client} · {o.category}
                      {o.estimatedValue != null ? ` · ${fmtMoney(o.estimatedValue)}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </KxdSection>
        </div>

        <KxdSection label="Today&apos;s focus" />
        <div className="kxd-os-founder-panel">
          {data.recommendedFocus.length === 0 ? (
            <p className="kxd-os-body">Review the priority stack and infrastructure watchlist.</p>
          ) : (
            <ol className="kxd-os-body" style={{ paddingLeft: "1.25rem", display: "grid", gap: "1rem" }}>
              {data.recommendedFocus.map((item) => (
                <li key={item.action}>
                  <strong>{item.action}</strong>
                  <p className="kxd-os-meta mt-1">{item.reason}</p>
                  {item.href ? (
                    <Link href={item.href} className="kxd-os-link-quiet" style={{ marginTop: "0.35rem", display: "inline-block" }}>
                      Open →
                    </Link>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      </KxdPage>
    </OperationsShell>
  );
}
