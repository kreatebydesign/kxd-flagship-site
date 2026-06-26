import Link from "next/link";
import type { ClientWorkspaceData } from "@/lib/executive-client-workspace/fetch-client-workspace";
import { getWorkspaceAtmosphere } from "@/lib/executive-client-workspace/atmosphere";
import type { WorkspaceTabId } from "@/lib/executive-client-workspace/theme";
import {
  EXECUTIVE_PRIORITY_LABEL,
  EXECUTIVE_STATUS_LABEL,
  EXECUTIVE_TIER_LABEL,
  fmtExecutiveMoney,
} from "@/lib/executive-client-profile";
import { WorkspaceTabContent } from "./WorkspaceTabContent";
import { WorkspaceTabNav } from "./WorkspaceTabNav";
import { WorkspaceStat } from "./WorkspacePrimitives";
import { ClientOpsNav } from "@/components/admin/operations/client-command/ClientOpsNav";

export interface ClientWorkspaceScreenProps {
  clientId: number;
  activeTab: WorkspaceTabId;
  data: ClientWorkspaceData;
}

export function ClientWorkspaceScreen({
  clientId,
  activeTab,
  data,
}: ClientWorkspaceScreenProps) {
  const { row, editProfileHref, profile } = data;
  const atmosphere = getWorkspaceAtmosphere(row.slug);

  const statusLabel = row.relationshipStatus
    ? EXECUTIVE_STATUS_LABEL[row.relationshipStatus]
    : null;
  const tierLabel = row.tier
    ? EXECUTIVE_TIER_LABEL[row.tier]
    : row.brandTier?.replace(/-/g, " ") ?? null;
  const priorityLabel = row.internalPriority
    ? EXECUTIVE_PRIORITY_LABEL[row.internalPriority]
    : null;

  const metaParts = [tierLabel, statusLabel, priorityLabel].filter(Boolean);

  return (
    <div className="kxd-os-workspace">
      {atmosphere.imageSrc && (
        <div className="kxd-os-workspace__atmosphere" aria-hidden="true">
          <div
            className="kxd-os-workspace__atmosphere-image"
            style={{ backgroundImage: `url(${atmosphere.imageSrc})` }}
          />
          {atmosphere.tint && (
            <div
              className="kxd-os-workspace__atmosphere-tint"
              style={{ background: atmosphere.tint }}
            />
          )}
          <div className="kxd-os-workspace__atmosphere-veil" />
        </div>
      )}

      <div className="kxd-os-shell kxd-os-workspace__canvas">
        <header className="kxd-os-workspace-cover">
          <div className="kxd-os-workspace-cover__top">
            <Link href="/admin/operations/clients" className="kxd-os-workspace-cover__back">
              Client Portfolio
            </Link>
            <Link href={editProfileHref} className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm">
              {profile ? "Edit profile" : "Create profile"}
            </Link>
          </div>

          <p className="kxd-os-eyebrow kxd-os-workspace-cover__eyebrow">Executive workspace</p>
          <h1 className="kxd-os-workspace-cover__title">{row.name}</h1>

          {metaParts.length > 0 && (
            <p className="kxd-os-workspace-cover__relationship">{metaParts.join(" · ")}</p>
          )}

          <div className="kxd-os-workspace-cover__metrics">
            <WorkspaceStat
              value={fmtExecutiveMoney(row.monthlyRevenue)}
              label="Monthly value"
              prominence="hero"
            />
            <WorkspaceStat
              value={row.healthScore != null ? String(row.healthScore) : "—"}
              label="Health"
              prominence="large"
            />
            {row.nextAction && (
              <div className="kxd-os-workspace-cover__action">
                <span className="kxd-os-workspace-cover__action-label">Next</span>
                <p className="kxd-os-workspace-cover__action-text">{row.nextAction}</p>
              </div>
            )}
          </div>
        </header>

        <div className="kxd-os-workspace__nav-wrap">
          <ClientOpsNav clientId={clientId} active="workspace" />
          <WorkspaceTabNav clientId={clientId} activeTab={activeTab} />
        </div>

        <main className="kxd-os-workspace__main">
          <WorkspaceTabContent tab={activeTab} data={data} />
        </main>
      </div>
    </div>
  );
}
