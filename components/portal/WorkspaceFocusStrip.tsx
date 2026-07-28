import Link from "next/link";
import type { WorkspacePersonalizationModel } from "@/lib/portal/workspace-personalization";

export interface WorkspaceFocusStripProps {
  personalization: WorkspacePersonalizationModel;
  /** When true, hide modules that are only the overview home. */
  hideOverview?: boolean;
}

/**
 * Calm priority modules + recommendations strip.
 * Presentation only — authorization remains on destination routes.
 */
export function WorkspaceFocusStrip({
  personalization,
  hideOverview = true,
}: WorkspaceFocusStripProps) {
  const modules = personalization.priorityModules
    .filter((m) => !(hideOverview && m.key === "overview"))
    .slice(0, 5);
  const recommendations = personalization.recommendations.slice(0, 2);

  if (modules.length === 0 && recommendations.length === 0) {
    return null;
  }

  return (
    <section
      className="kxd-os-section kxd-ws-focus"
      aria-labelledby="workspace-focus-heading"
      style={{ marginTop: "1.25rem" }}
    >
      <p id="workspace-focus-heading" className="kxd-os-section__label">
        Focus for {personalization.identity.clientName}
      </p>

      {recommendations.length > 0 ? (
        <div className="kxd-os-ops-quick-grid" style={{ marginBottom: "1rem" }}>
          {recommendations.map((rec) => (
            <Link
              key={rec.id}
              href={rec.action.href}
              className="kxd-os-ops-quick-cell"
            >
              <p className="kxd-os-card__title">{rec.title}</p>
              <p className="kxd-os-meta">{rec.lead}</p>
            </Link>
          ))}
        </div>
      ) : null}

      {modules.length > 0 ? (
        <nav aria-label="Priority workspace areas">
          <ul className="kxd-ws-focus__modules">
            {modules.map((mod) => (
              <li key={mod.key}>
                <Link href={mod.href} className="kxd-os-link-quiet">
                  {mod.label}
                </Link>
                <span className="kxd-os-meta"> — {mod.description}</span>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </section>
  );
}
