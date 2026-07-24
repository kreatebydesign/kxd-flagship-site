"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KxdOsLogo } from "@/components/os";
import { openActivityCenter } from "@/lib/activity-engine/events";
import {
  EXECUTIVE_WORKSPACES,
  getExecutiveBusinessStatus,
  openQuickCreate,
  openUniversalSearch,
  resolveWorkspaceIdFromPath,
  workspaceLabel,
} from "@/lib/executive-workspace";

/** Shared operator chrome identity — visual only; not a security claim. */
const OPERATOR_IDENTITY_LABEL = "KXD OS // ENCRYPTED ACCESS · 1220";

export function ExecutiveHeader({
  userLabel = "Studio",
}: {
  userLabel?: string;
}) {
  const pathname = usePathname() || "/admin/operations";
  const workspaceId = resolveWorkspaceIdFromPath(pathname);
  const status = getExecutiveBusinessStatus();

  return (
    <header className="kxd-exec-header" aria-label="Executive Workspace">
      <div className="kxd-exec-header__left">
        <KxdOsLogo height={15} className="kxd-exec-header__brand" />
        <nav className="kxd-exec-header__workspaces" aria-label="Workspaces">
          {EXECUTIVE_WORKSPACES.map((workspace) => {
            const active =
              workspace.id === workspaceId ||
              (workspace.id === "today" &&
                (workspaceId === "brief" ||
                  workspaceId === "focus" ||
                  workspaceId === "review"));
            return (
              <Link
                key={workspace.id}
                href={workspace.href}
                className={`kxd-exec-header__workspace${active ? " is-active" : ""}`}
                title={workspace.description}
              >
                {workspace.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="kxd-exec-header__center">
        <span className="kxd-exec-header__current" aria-live="polite">
          {workspaceLabel(workspaceId)}
        </span>
      </div>

      <div className="kxd-exec-header__right">
        <button
          type="button"
          className="kxd-exec-header__action"
          onClick={() => openUniversalSearch()}
          aria-label="Universal Search"
        >
          Search
        </button>
        <button
          type="button"
          className="kxd-exec-header__action"
          onClick={() => openActivityCenter()}
          aria-label="Executive Activity"
        >
          Activity
        </button>
        <button
          type="button"
          className="kxd-exec-header__action kxd-exec-header__action--create"
          onClick={() => openQuickCreate()}
          aria-label="Quick Create"
        >
          Create
        </button>
        <div
          className={`kxd-exec-header__status kxd-exec-header__status--${status.tone}`}
          title={status.detail ?? OPERATOR_IDENTITY_LABEL}
        >
          <span className="kxd-exec-header__status-dot" aria-hidden />
          <span className="kxd-exec-header__identity">{OPERATOR_IDENTITY_LABEL}</span>
        </div>
        {/* userLabel retained for shell API compatibility; identity chrome supersedes Studio label */}
        <span className="kxd-exec-header__user">{userLabel}</span>
      </div>
    </header>
  );
}
