import Link from "next/link";
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
import { getRegisteredRules } from "@/lib/automation/rules";
import type { AutomationDashboardData, AutomationDoc } from "@/lib/automation/types";

function statusVariant(status: string): KxdBadgeVariant {
  switch (status) {
    case "processed":
    case "operational":
      return "success";
    case "failed":
    case "degraded":
      return "critical";
    case "published":
      return "status";
    default:
      return "default";
  }
}

function severityVariant(severity: string): KxdBadgeVariant {
  switch (severity) {
    case "critical":
      return "critical";
    case "warning":
      return "warning";
    case "success":
      return "success";
    default:
      return "default";
  }
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function EventRow({ event }: { event: AutomationDoc }) {
  const clientName =
    typeof event.client === "object" && event.client !== null
      ? String((event.client as AutomationDoc).name ?? "Client")
      : undefined;

  return (
    <div className="kxd-os-card" style={{ marginBottom: "0.65rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <p className="kxd-os-meta">
            {formatWhen(event.createdAt as string)} · {String(event.module)} · {String(event.eventName)}
          </p>
          <p className="kxd-os-card__title" style={{ marginTop: "0.35rem" }}>
            {clientName ?? "System event"}
          </p>
          {event.errorMessage ? (
            <p className="kxd-os-body" style={{ marginTop: "0.45rem", color: "var(--kxd-os-critical)" }}>
              {String(event.errorMessage)}
            </p>
          ) : null}
        </div>
        <KxdBadge variant={statusVariant(String(event.status ?? "published"))}>
          {String(event.status ?? "published")}
        </KxdBadge>
      </div>
    </div>
  );
}

export function AutomationScreen({ data }: { data: AutomationDashboardData }) {
  const rules = getRegisteredRules();
  const systemLabel =
    data.systemStatus === "operational"
      ? "Operational"
      : data.systemStatus === "degraded"
        ? "Degraded"
        : "Offline";

  const kpis = [
    { label: "Events published", value: String(data.stats.eventsPublished) },
    { label: "Rules executed", value: String(data.stats.rulesExecuted) },
    { label: "Health recalculations", value: String(data.stats.healthRecalculations) },
    { label: "Notifications queued", value: String(data.stats.notificationsQueued) },
    { label: "Failed events", value: String(data.stats.failedEvents) },
    { label: "System status", value: systemLabel },
  ];

  return (
    <OperationsShell activeId="automation">
      <KxdPage className="kxd-os-page--ops">
        <OperationsPageHero
          eyebrow="KXD OS · Automation Engine"
          title="Event Engine"
          lead="Central automation layer — modules publish standardized events. Timeline records history. Founder Intelligence consumes signals."
        />

        <div className="kxd-os-ops-kpi-grid">
          {kpis.map((kpi) => (
            <KxdMetric key={kpi.label} label={kpi.label} value={kpi.value} />
          ))}
        </div>

        <div className="kxd-os-operations-split">
          <section>
            <KxdSection label="Recent automation events" />
            {data.recentEvents.length === 0 ? (
              <KxdEmptyState
                title="No automation events yet"
                description="Connected modules will publish events here as they trigger workflows."
              />
            ) : (
              data.recentEvents.slice(0, 12).map((event) => (
                <EventRow key={event.id as number} event={event} />
              ))
            )}
          </section>

          <section>
            <KxdSection label="System status" />
            <div className="kxd-os-card" style={{ marginBottom: "1.5rem" }}>
              <p className="kxd-os-card__title">{systemLabel}</p>
              <p className="kxd-os-body" style={{ marginTop: "0.5rem" }}>
                {data.connectedModules.filter((m) => m.connected).length} of{" "}
                {data.connectedModules.length} publishers connected. No external workers — synchronous
                rule execution on publish.
              </p>
              <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
                <Link href="/admin/collections/automation-events" className="kxd-os-link-quiet">
                  Events in Payload →
                </Link>
                {" · "}
                <Link href="/admin/collections/automation-notifications" className="kxd-os-link-quiet">
                  Notifications →
                </Link>
              </p>
            </div>

            <KxdSection label="Failed events" />
            {data.failedEvents.length === 0 ? (
              <p className="kxd-os-meta">No failed events.</p>
            ) : (
              data.failedEvents.map((event) => <EventRow key={event.id as number} event={event} />)
            )}
          </section>
        </div>

        <KxdSection label="Rule execution counts" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(14rem, 1fr))",
            gap: "0.75rem",
            marginBottom: "2rem",
          }}
        >
          {rules.map((rule) => {
            const count =
              data.ruleExecutionCounts.find((r) => r.ruleId === rule.id)?.count ?? 0;
            return (
              <div key={rule.id} className="kxd-os-card">
                <p className="kxd-os-metric__label">{rule.name}</p>
                <p className="kxd-os-card__title" style={{ marginTop: "0.35rem" }}>
                  {count}
                </p>
                <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
                  {rule.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="kxd-os-operations-split">
          <section>
            <KxdSection label="Notification queue" />
            {data.queuedNotifications.length === 0 ? (
              <p className="kxd-os-meta">No queued notifications.</p>
            ) : (
              data.queuedNotifications.map((note) => (
                <div key={note.id as number} className="kxd-os-card" style={{ marginBottom: "0.65rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                    <div>
                      <p className="kxd-os-card__title">{String(note.title)}</p>
                      {note.summary ? (
                        <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
                          {String(note.summary)}
                        </p>
                      ) : null}
                      <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
                        {String(note.module)} · {formatWhen(note.createdAt as string)}
                      </p>
                    </div>
                    <KxdBadge variant={severityVariant(String(note.severity ?? "info"))}>
                      {String(note.severity ?? "info")}
                    </KxdBadge>
                  </div>
                </div>
              ))
            )}
          </section>

          <section>
            <KxdSection label="Connected modules" />
            <div className="kxd-os-ops-list">
              {data.connectedModules.map((mod) => (
                <div key={mod.id} className="kxd-os-ops-list__row">
                  <p className="kxd-os-card__title">{mod.label}</p>
                  <p className="kxd-os-meta">{mod.description}</p>
                  <KxdBadge variant={mod.connected ? "success" : "default"}>
                    {mod.connected ? "Connected" : "Ready"}
                  </KxdBadge>
                </div>
              ))}
            </div>
          </section>
        </div>
      </KxdPage>
    </OperationsShell>
  );
}
