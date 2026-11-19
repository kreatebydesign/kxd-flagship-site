"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { OperatorNavLink } from "@/components/admin/operations/shared/OperatorNavLink";
import type { OperationsNavId } from "@/components/admin/operations/shared/operations-nav";
import {
  FOUNDER_PRIMARY_NAV,
  FOUNDER_SETTINGS_HREFS,
  getFounderAdvancedNavGroups,
  isFounderPrimaryNavActive,
} from "@/lib/admin/founder-hybrid/nav";

export interface FounderHybridSidebarNavProps {
  activeId: OperationsNavId;
}

export function FounderHybridSidebarNav({ activeId }: FounderHybridSidebarNavProps) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const advancedGroups = getFounderAdvancedNavGroups();

  return (
    <div className="kxd-founder-sidebar">
      <p className="kxd-founder-sidebar__mark" aria-hidden>
        KXD OS
      </p>
      <nav className="kxd-founder-sidebar__primary" aria-label="Founder">
        <ul className="kxd-founder-sidebar__list">
          {FOUNDER_PRIMARY_NAV.map((item) => {
            const isActive = isFounderPrimaryNavActive(activeId, item);
            return (
              <li key={item.id}>
                <OperatorNavLink
                  href={item.href}
                  className={[
                    "kxd-founder-sidebar__link",
                    isActive ? "kxd-founder-sidebar__link--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </OperatorNavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="kxd-founder-sidebar__foot">
        <nav className="kxd-founder-sidebar__settings" aria-label="Settings">
          {FOUNDER_SETTINGS_HREFS.map((item) => (
            <OperatorNavLink
              key={item.id}
              href={item.href}
              className={[
                "kxd-founder-sidebar__settings-link",
                activeId === item.id ? "kxd-founder-sidebar__link--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {item.label}
            </OperatorNavLink>
          ))}
        </nav>

        <button
          type="button"
          className="kxd-founder-sidebar__tools-toggle"
          aria-expanded={toolsOpen}
          onClick={() => setToolsOpen((open) => !open)}
        >
          {toolsOpen ? "Hide platform tools" : "Platform tools"}
        </button>

        {toolsOpen ? (
          <MotionSafe className="kxd-founder-sidebar__tools">
            {advancedGroups.map((group) => (
              <div key={group.label} className="kxd-founder-sidebar__tools-group">
                <p className="kxd-founder-sidebar__tools-label">{group.label}</p>
                <ul className="kxd-founder-sidebar__tools-list">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <OperatorNavLink
                        href={item.href}
                        className={[
                          "kxd-founder-sidebar__tools-link",
                          item.id === activeId ? "kxd-founder-sidebar__link--active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {item.label}
                      </OperatorNavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </MotionSafe>
        ) : null}
      </div>
    </div>
  );
}

/** Semantic wrapper only — avoids animation dependency. */
function MotionSafe({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={className}>{children}</div>;
}