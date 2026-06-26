import { KxdBadge, KxdEmptyState, KxdPage } from "@/components/os";
import { NewRequestForm } from "@/components/portal/NewRequestForm";
import { ClientHqPageHero } from "./ClientHqPageHero";
import type { PortalDoc } from "@/lib/portal/types";
import { fmtPortalDate, statusLabel } from "@/lib/portal/format";

export function RequestsScreen({
  requests,
  projectOptions,
}: {
  requests: PortalDoc[];
  projectOptions: Array<{ id: number; name: string }>;
}) {
  return (
    <KxdPage className="kxd-os-page--ops">
      <ClientHqPageHero
        eyebrow="Work"
        title="Requests"
        lead="Submit changes, ask questions, and track responses from your KXD team."
      />

      <div className="kxd-os-operations-split">
        <div>
          {requests.length === 0 ? (
            <KxdEmptyState
              title="No requests yet"
              description="Use the form to submit your first request."
            />
          ) : (
            <div className="kxd-os-ops-list">
              {requests.map((req) => (
                <article key={req.id as number} className="kxd-os-card">
                  <p className="kxd-os-card__title">{String(req.requestTitle)}</p>
                  <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                    <KxdBadge variant="status">{statusLabel(req.status as string)}</KxdBadge>
                    <span className="kxd-os-meta">
                      Submitted {fmtPortalDate(req.createdAt as string)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="kxd-os-card">
          <p className="kxd-os-section__label">New request</p>
          <NewRequestForm projects={projectOptions} />
        </aside>
      </div>
    </KxdPage>
  );
}
