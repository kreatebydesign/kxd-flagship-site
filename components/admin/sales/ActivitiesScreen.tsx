import { KxdBadge, KxdEmptyState, KxdPage, KxdSection } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { fmtWhen, resolveName, type SalesUiDoc } from "./shared";

export function ActivitiesScreen({ activities }: { activities: SalesUiDoc[] }) {
  return (
    <OperationsShell activeId="sales-activities">
      <KxdPage>
        <OperationsPageHero
          eyebrow="Sales"
          title="Activities"
          lead="Calls, meetings, emails, and proposal events — published to Executive Timeline when a client is linked."
        />

        <KxdSection>
          {activities.length === 0 ? (
            <KxdEmptyState
              title="No activities"
              description="Sales activities are logged automatically and can be added in Payload."
            />
          ) : (
            <div className="kxd-os-card-list">
              {activities.map((a) => (
                <div key={a.id as number} className="kxd-os-card" style={{ marginBottom: "0.65rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                      <p className="kxd-os-meta">
                        {fmtWhen(a.occurredAt as string)} · {String(a.activityType ?? "note")}
                      </p>
                      <p className="kxd-os-card__title" style={{ marginTop: "0.3rem" }}>
                        {String(a.title ?? "Activity")}
                      </p>
                      {a.summary ? (
                        <p className="kxd-os-body" style={{ marginTop: "0.4rem" }}>
                          {String(a.summary)}
                        </p>
                      ) : null}
                      <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
                        {resolveName(a.lead, "No lead")}
                        {a.client ? ` · ${resolveName(a.client)}` : ""}
                      </p>
                    </div>
                    {a.timelinePublished ? (
                      <KxdBadge variant="success">Timeline</KxdBadge>
                    ) : (
                      <KxdBadge variant="default">Logged</KxdBadge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}
