"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  WORK_VIEW_OVERFLOW_IDS,
  WORK_VIEW_PRIMARY_IDS,
  workViewNavCount,
  workViewNavLabel,
} from "@/lib/work/planning/view-navigation";
import { WORK_VIEW_IDS, type WorkViewId } from "@/lib/work/planning/types";

export function WorkPlanningViews({
  viewId,
  counts,
  onSelect,
}: {
  viewId: WorkViewId;
  counts: Record<WorkViewId, number>;
  onSelect: (id: WorkViewId) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);

  const overflowActive = WORK_VIEW_OVERFLOW_IDS.includes(viewId);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  function renderViewButton(id: WorkViewId, compact: boolean) {
    const count = workViewNavCount(id, counts);
    const active = viewId === id;
    return (
      <button
        key={id}
        type="button"
        className={
          active
            ? "kxd-os-work-engine__view kxd-os-work-engine__view--active"
            : "kxd-os-work-engine__view"
        }
        aria-current={active ? "page" : undefined}
        onClick={() => onSelect(id)}
      >
        <span>{workViewNavLabel(id, compact)}</span>
        <span className="kxd-os-work-engine__view-count" aria-hidden>
          {count}
        </span>
      </button>
    );
  }

  return (
    <nav
      className="kxd-os-work-engine__views kxd-os-work-engine__views--3d"
      aria-label="Work views"
    >
      <div className="kxd-os-work-engine__views-primary" aria-label="Primary work views">
        {WORK_VIEW_PRIMARY_IDS.map((id) => renderViewButton(id, true))}
      </div>

      <div className="kxd-os-work-engine__views-desktop" aria-label="All work views">
        {WORK_VIEW_IDS.map((id) => renderViewButton(id, false))}
      </div>

      <div className="kxd-os-work-engine__views-more" ref={menuRef}>
        <button
          type="button"
          className={[
            "kxd-os-work-engine__views-more-toggle",
            overflowActive || menuOpen ? "kxd-os-work-engine__views-more-toggle--active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          onClick={() => setMenuOpen((v) => !v)}
        >
          More views
        </button>
        {menuOpen ? (
          <div
            id={menuId}
            role="menu"
            className="kxd-os-work-engine__views-menu"
            aria-label="Additional work views"
          >
            {WORK_VIEW_OVERFLOW_IDS.map((id) => {
              const active = viewId === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  className={
                    active
                      ? "kxd-os-work-engine__views-menu-item kxd-os-work-engine__views-menu-item--active"
                      : "kxd-os-work-engine__views-menu-item"
                  }
                  onClick={() => {
                    onSelect(id);
                    setMenuOpen(false);
                  }}
                >
                  <span>{workViewNavLabel(id, false)}</span>
                  <span className="kxd-os-work-engine__view-count">{counts[id] ?? 0}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </nav>
  );
}