"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { OperationsNavGroup, OperationsNavId } from "./operations-nav";

export interface OperationsSidebarNavProps {
  navGroups: OperationsNavGroup[];
  activeId: OperationsNavId;
}

export function OperationsSidebarNav({ navGroups, activeId }: OperationsSidebarNavProps) {
  const [newReviewCount, setNewReviewCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      try {
        const res = await fetch("/api/admin/review-inbox/summary");
        if (!res.ok) return;
        const data = (await res.json()) as { newCount?: number };
        if (!cancelled) setNewReviewCount(data.newCount ?? 0);
      } catch {
        // Silent — badge is optional enhancement
      }
    }

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {navGroups.map((group, groupIndex) => (
        <div
          key={group.label}
          className={`kxd-os-sidebar__group${groupIndex > 0 ? " kxd-os-sidebar__group--sep" : ""}`}
        >
          <ul className="kxd-os-sidebar__list">
            {group.items.map((item) => {
              const isActive = item.id === activeId;
              const badgeCount = item.id === "review-inbox" ? newReviewCount : 0;

              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={`kxd-os-sidebar__link${isActive ? " kxd-os-sidebar__link--active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="kxd-os-sidebar__link-label">{item.label}</span>
                    {badgeCount > 0 ? (
                      <span className="kxd-os-sidebar__badge" aria-label={`${badgeCount} new revisions`}>
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}
