import { KxdBadge, KxdEmptyState, KxdPage } from "@/components/os";
import { ClientHqPageHero } from "./ClientHqPageHero";
import type { PortalDoc } from "@/lib/portal/types";
import { fmtPortalDate, statusLabel } from "@/lib/portal/format";

function DeliverableSection({
  title,
  items,
  empty,
}: {
  title: string;
  items: PortalDoc[];
  empty: string;
}) {
  return (
    <section>
      <p className="kxd-os-section__label">{title}</p>
      {items.length === 0 ? (
        <p className="kxd-os-meta">{empty}</p>
      ) : (
        <div className="kxd-os-ops-list">
          {items.map((item) => (
            <div key={item.id as number} className="kxd-os-card">
              <p className="kxd-os-card__title">{String(item.title)}</p>
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                <KxdBadge variant="status">{statusLabel(item.status as string)}</KxdBadge>
                <span className="kxd-os-meta">
                  {item.completedDate
                    ? `Completed ${fmtPortalDate(String(item.completedDate))}`
                    : item.dueDate
                      ? `Due ${fmtPortalDate(String(item.dueDate))}`
                      : "No due date"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function DeliverablesScreen({ deliverables }: { deliverables: PortalDoc[] }) {
  const pending = deliverables.filter((d) => d.status !== "complete");
  const completed = deliverables.filter((d) => d.status === "complete");

  return (
    <KxdPage className="kxd-os-page--ops">
      <ClientHqPageHero
        eyebrow="Work"
        title="Deliverables"
        lead="What is in progress, what is due, and what has been completed."
      />

      {deliverables.length === 0 ? (
        <KxdEmptyState
          title="No deliverables yet"
          description="Monthly deliverables will appear here as your engagement progresses."
        />
      ) : (
        <div className="kxd-os-operations-split">
          <DeliverableSection title="Pending" items={pending} empty="No pending deliverables." />
          <DeliverableSection
            title="Completed"
            items={completed}
            empty="No completed deliverables yet."
          />
        </div>
      )}
    </KxdPage>
  );
}
