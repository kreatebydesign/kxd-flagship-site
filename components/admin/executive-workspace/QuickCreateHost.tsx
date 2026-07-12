"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  QUICK_CREATE_OPEN_EVENT,
  listQuickCreateActions,
  runQuickCreateAction,
  type QuickCreateAction,
} from "@/lib/executive-workspace";

const GROUP_LABEL: Record<string, string> = {
  work: "Work",
  clients: "Clients",
  reviews: "Reviews",
  communications: "Communications",
  finance: "Finance",
  training: "Learning",
  notes: "Notes",
  calendar: "Calendar",
};

export function QuickCreateHost() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const actions = useMemo(() => listQuickCreateActions(), []);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener(QUICK_CREATE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(QUICK_CREATE_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function select(action: QuickCreateAction) {
    if (!action.available) return;
    setOpen(false);
    runQuickCreateAction(action);
  }

  const grouped = useMemo(() => {
    const map = new Map<string, QuickCreateAction[]>();
    for (const action of actions) {
      const list = map.get(action.group) ?? [];
      list.push(action);
      map.set(action.group, list);
    }
    return [...map.entries()];
  }, [actions]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="kxd-exec-overlay"
        aria-label="Close create"
        onClick={() => setOpen(false)}
      />
      <aside className="kxd-exec-create" aria-label="Quick Create">
        <header className="kxd-exec-create__head">
          <div>
            <p className="kxd-os-meta">Create</p>
            <h2 className="kxd-exec-create__title">Start something</h2>
          </div>
          <button
            type="button"
            className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </header>
        <div className="kxd-exec-create__body">
          {grouped.map(([group, items]) => (
            <section key={group} className="kxd-exec-create__group">
              <h3 className="kxd-exec-create__group-label">{GROUP_LABEL[group] ?? group}</h3>
              <ul className="kxd-exec-create__list">
                {items.map((action) => (
                  <li key={action.id}>
                    {action.available ? (
                      <button
                        type="button"
                        className="kxd-exec-create__item"
                        onClick={() => select(action)}
                      >
                        <span className="kxd-exec-create__item-title">{action.label}</span>
                        <span className="kxd-exec-create__item-desc">{action.description}</span>
                      </button>
                    ) : (
                      <div className="kxd-exec-create__item kxd-exec-create__item--soon">
                        <span className="kxd-exec-create__item-title">{action.label}</span>
                        <span className="kxd-exec-create__item-desc">Coming soon</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="kxd-exec-create__foot">
            Prefer search?{" "}
            <Link href="#" onClick={(e) => {
              e.preventDefault();
              setOpen(false);
              window.dispatchEvent(new CustomEvent("kxd:command-palette-open"));
            }}>
              Open Universal Search
            </Link>
          </p>
        </div>
      </aside>
    </>
  );
}
