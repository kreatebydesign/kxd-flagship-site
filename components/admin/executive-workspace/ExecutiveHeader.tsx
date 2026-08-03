"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KxdIntelligenceTrigger, KxdOsLogo } from "@/components/os";
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
/** Arrival / Today — quieter held shell; not security theater. */
const ARRIVAL_IDENTITY_LABEL = "KXD OS";

/**
 * Executive header.
 * Experience Refinement Phase 2 Batch B — on Today, navigation is Effortless / Held:
 * available without dominating the Morning Answer.
 */
export function ExecutiveHeader({
  userLabel = "Studio",
  arrival = false,
}: {
  userLabel?: string;
  /** When true (Today), restrain chrome so arrival owns attention. */
  arrival?: boolean;
}) {
  const pathname = usePathname() || "/admin/operations";
  const workspaceId = resolveWorkspaceIdFromPath(pathname);
  const status = getExecutiveBusinessStatus();
  const identityLabel = arrival ? ARRIVAL_IDENTITY_LABEL : OPERATOR_IDENTITY_LABEL;

  return (
    <header
      className={`kxd-exec-header${arrival ? " kxd-exec-header--arrival" : ""}`}
      aria-label="Executive Workspace"
      data-experience={arrival ? "held" : undefined}
    >
      <div className="kxd-exec-header__left">
        <KxdOsLogo height={15} className="kxd-exec-header__brand" />
        <nav
          className="kxd-exec-header__workspaces"
          aria-label="Workspaces"
          data-experience={arrival ? "effortless" : undefined}
        >
          {EXECUTIVE_WORKSPACES.map((workspace) => {
            const active =
              workspace.id === workspaceId ||
              (workspace.id === "today" &&
                (workspaceId === "brief" ||
                  workspaceId === "focus" ||
                  workspaceId === "review"));
            const home = workspace.id === "today";
            const workspaceClass = [
              "kxd-exec-header__workspace",
              active ? "is-active" : null,
              arrival && home ? "kxd-exec-header__workspace--home" : null,
              arrival && !home ? "kxd-exec-header__workspace--depth" : null,
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <Link
                key={workspace.id}
                href={workspace.href}
                className={workspaceClass}
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
        {!arrival ? (
          <KxdIntelligenceTrigger className="kxd-exec-header__intel" compact />
        ) : null}
        <button
          type="button"
          className="kxd-exec-header__action kxd-exec-header__action--utility"
          onClick={() => openUniversalSearch()}
          aria-label="Search"
        >
          Search
        </button>
        <button
          type="button"
          className="kxd-exec-header__action kxd-exec-header__action--utility"
          onClick={() => openActivityCenter()}
          aria-label="Activity"
        >
          Activity
        </button>
        <button
          type="button"
          className="kxd-exec-header__action kxd-exec-header__action--create kxd-exec-header__action--utility"
          onClick={() => openQuickCreate()}
          aria-label="Create"
        >
          Create
        </button>
        <div
          className={`kxd-exec-header__status kxd-exec-header__status--${status.tone}`}
          title={status.detail ?? identityLabel}
        >
          <span className="kxd-exec-header__status-dot" aria-hidden />
          <span className="kxd-exec-header__identity">{identityLabel}</span>
        </div>
        {/* userLabel retained for shell API compatibility; identity chrome supersedes Studio label */}
        <span className="kxd-exec-header__user">{userLabel}</span>
      </div>
    </header>
  );
}
