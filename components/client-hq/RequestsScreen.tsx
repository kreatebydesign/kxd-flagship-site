import { KxdBadge } from "@/components/os";
import { CesEmptyState, CesHero, CesPage } from "@/components/ces/primitives";
import { NewRequestForm } from "@/components/portal/NewRequestForm";
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
    <CesPage className="kxd-client-module kxd-client-module--requests">
      <CesHero
        eyebrow="Work"
        title="Requests"
        lead="Submit changes, ask questions, and track responses from your KXD team."
      />

      <div className="kxd-os-operations-split">
        <div>
          {requests.length === 0 ? (
            <CesEmptyState
              title="No requests yet"
              lead="Use the form to share the first change or question with your KXD team."
            />
          ) : (
            <div className="kxd-os-ops-list">
              {requests.map((req) => (
                <article key={req.id as number} className="kxd-os-card">
                  <p className="kxd-os-card__title">{String(req.requestTitle)}</p>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      marginTop: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
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
    </CesPage>
  );
}
