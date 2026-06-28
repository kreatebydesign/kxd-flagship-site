import Link from "next/link";
import {
  EXECUTIVE_STATUS_LABEL,
  fmtExecutiveMoney,
} from "@/lib/executive-client-profile";
import { fmtWorkspaceDate } from "@/lib/executive-client-workspace/theme";
import type { ClientWorkspaceBundle } from "@/lib/client-command/workspace-types";
import {
  COMMAND_WORKSPACE_TABS,
  commandWorkspaceHref,
  type CommandWorkspaceTabId,
} from "@/lib/client-command/tabs";
import { CommandWorkspaceTabPanel } from "./CommandWorkspaceTabPanel";

export function ClientCommandWorkspace({
  data,
  activeTab,
}: {
  data: ClientWorkspaceBundle;
  activeTab: CommandWorkspaceTabId;
}) {
  const { header } = data;
  const statusLabel = header.relationshipStatus
    ? EXECUTIVE_STATUS_LABEL[header.relationshipStatus as keyof typeof EXECUTIVE_STATUS_LABEL] ??
      header.relationshipStatus.replace(/-/g, " ")
    : header.status;

  return (
    <div className="kxd-os-command-workspace">
      <header className="kxd-os-command-workspace__header">
        <div className="kxd-os-command-workspace__header-main">
          <Link href="/admin/operations/client-command" className="kxd-os-command-workspace__back">
            ← All clients
          </Link>

          <div className="kxd-os-command-workspace__identity">
            {header.logoUrl ? (
              <img
                src={header.logoUrl}
                alt=""
                className="kxd-os-command-workspace__logo"
              />
            ) : (
              <div className="kxd-os-command-workspace__logo kxd-os-command-workspace__logo--placeholder">
                {header.companyName.slice(0, 1)}
              </div>
            )}
            <div>
              <h1 className="kxd-os-command-workspace__title">{header.companyName}</h1>
              <p className="kxd-os-command-workspace__subtitle">
                {header.primaryContact ?? "No primary contact"}
                {header.website ? ` · ${header.website}` : ""}
              </p>
            </div>
          </div>

          <div className="kxd-os-command-workspace__metrics">
            <div className="kxd-os-command-workspace__metric">
              <span className="kxd-os-command-workspace__metric-value">{statusLabel}</span>
              <span className="kxd-os-command-workspace__metric-label">Status</span>
            </div>
            <div className="kxd-os-command-workspace__metric">
              <span className="kxd-os-command-workspace__metric-value">
                {header.healthScore != null ? `${header.healthScore}` : "—"}
              </span>
              <span className="kxd-os-command-workspace__metric-label">Health</span>
            </div>
            <div className="kxd-os-command-workspace__metric">
              <span className="kxd-os-command-workspace__metric-value">
                {fmtExecutiveMoney(header.monthlyRevenue)}
              </span>
              <span className="kxd-os-command-workspace__metric-label">Monthly</span>
            </div>
            <div className="kxd-os-command-workspace__metric">
              <span className="kxd-os-command-workspace__metric-value">
                {fmtExecutiveMoney(header.lifetimeRevenue)}
              </span>
              <span className="kxd-os-command-workspace__metric-label">Lifetime</span>
            </div>
            <div className="kxd-os-command-workspace__metric">
              <span className="kxd-os-command-workspace__metric-value">
                {header.clientSince ? fmtWorkspaceDate(header.clientSince) : "—"}
              </span>
              <span className="kxd-os-command-workspace__metric-label">Client since</span>
            </div>
          </div>
        </div>

        <div className="kxd-os-command-workspace__actions">
          <p className="kxd-os-command-workspace__actions-label">Quick actions</p>
          <div className="kxd-os-command-workspace__actions-grid">
            {data.workspaceQuickActions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className="kxd-os-command-workspace__action"
                target={action.external ? "_blank" : undefined}
                rel={action.external ? "noreferrer" : undefined}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <div className="kxd-os-command-workspace__body">
        <nav className="kxd-os-command-workspace__nav" aria-label="Client workspace">
          {COMMAND_WORKSPACE_TABS.map((tab) => (
            <Link
              key={tab.id}
              href={commandWorkspaceHref(data.clientId, tab.id)}
              className={`kxd-os-command-workspace__nav-item${
                activeTab === tab.id ? " kxd-os-command-workspace__nav-item--active" : ""
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <main className="kxd-os-command-workspace__content">
          <CommandWorkspaceTabPanel tab={activeTab} data={data} />
        </main>
      </div>
    </div>
  );
}
