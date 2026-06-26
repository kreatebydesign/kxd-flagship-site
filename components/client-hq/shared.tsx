import Link from "next/link";
import type { PortalDoc } from "@/lib/portal/types";
import { fmtPortalDate, statusLabel } from "@/lib/portal/format";

export function ClientHqTimelineFeed({
  events,
  emptyMessage = "Relationship history will appear here as milestones are logged.",
}: {
  events: PortalDoc[];
  emptyMessage?: string;
}) {
  if (events.length === 0) {
    return <p className="kxd-os-meta">{emptyMessage}</p>;
  }

  return (
    <div className="kxd-os-ops-list">
      {events.map((event) => (
        <div key={event.id as number} className="kxd-os-ops-list__row">
          <div>
            <p className="kxd-os-card__title">{String(event.title ?? "Event")}</p>
            <p className="kxd-os-meta">
              {statusLabel(String(event.eventType ?? "milestone"))} ·{" "}
              {fmtPortalDate(String(event.eventDate))}
            </p>
            {event.summary ? (
              <p className="kxd-os-body" style={{ marginTop: "0.5rem" }}>
                {String(event.summary)}
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ClientHqActivityList({
  title,
  items,
  field,
  href,
  emptyMessage,
}: {
  title: string;
  items: PortalDoc[];
  field: string;
  href: string;
  emptyMessage: string;
}) {
  return (
    <section className="kxd-os-card">
      <div className="kxd-os-ops-list__head">
        <p className="kxd-os-section__label">{title}</p>
        <Link href={href} className="kxd-os-meta" style={{ textDecoration: "none" }}>
          View all
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="kxd-os-meta">{emptyMessage}</p>
      ) : (
        <div className="kxd-os-ops-list">
          {items.map((item) => (
            <div key={item.id as number} className="kxd-os-ops-list__row">
              <p className="kxd-os-body">{String(item[field] ?? "—")}</p>
              <p className="kxd-os-meta">
                {statusLabel(item.status as string)} · {fmtPortalDate(item.updatedAt as string)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function ClientHqQuickActions({
  actions,
}: {
  actions: Array<{ label: string; href: string; description?: string }>;
}) {
  return (
    <div className="kxd-os-ops-quick-grid">
      {actions.map((action) => (
        <Link key={action.href + action.label} href={action.href} className="kxd-os-ops-quick-cell">
          <p className="kxd-os-card__title">{action.label}</p>
          {action.description ? <p className="kxd-os-meta">{action.description}</p> : null}
        </Link>
      ))}
    </div>
  );
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ClientHqMetricStrip({
  metrics,
}: {
  metrics: Array<{ label: string; value: string; sub?: string }>;
}) {
  return (
    <div className="kxd-os-ops-kpi-grid">
      {metrics.map((metric) => (
        <div key={metric.label} className="kxd-os-card">
          <p className="kxd-os-metric__label">{metric.label}</p>
          <p className="kxd-os-metric__value">{metric.value}</p>
          {metric.sub ? <p className="kxd-os-metric__sub">{metric.sub}</p> : null}
        </div>
      ))}
    </div>
  );
}

export { formatCurrency };
