"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ACTIVITY_CENTER_OPEN_EVENT } from "@/lib/activity-engine/events";
import { importanceLabel } from "@/lib/activity-engine/href";
import type {
  ExecutiveActivityCenterData,
  ExecutiveActivityItem,
} from "@/lib/activity-engine/types";

function fmtWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function ActivityRow({
  item,
  busy,
  onRead,
}: {
  item: ExecutiveActivityItem;
  busy: boolean;
  onRead: (id: string) => void;
}) {
  return (
    <article
      className={`kxd-activity-item${item.read ? " kxd-activity-item--read" : ""}`}
    >
      <div className="kxd-activity-item__head">
        <span className={`kxd-activity-importance kxd-activity-importance--${item.importance}`}>
          {importanceLabel(item.importance)}
        </span>
        <span className="kxd-os-meta">{item.sourceModule}</span>
      </div>
      <h3 className="kxd-activity-item__title">{item.title}</h3>
      {item.summary ? (
        <p className="kxd-os-body kxd-activity-item__summary">{item.summary}</p>
      ) : null}
      <div className="kxd-activity-item__meta">
        {item.clientName ? <span>{item.clientName}</span> : null}
        <span>{fmtWhen(item.occurredAt)}</span>
      </div>
      <div className="kxd-activity-item__actions">
        {item.href ? (
          <Link href={item.href} className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm">
            Open
          </Link>
        ) : null}
        {!item.read ? (
          <button
            type="button"
            className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
            disabled={busy}
            onClick={() => onRead(item.id)}
          >
            Mark noted
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function ActivityCenter({ hideTrigger = false }: { hideTrigger?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<ExecutiveActivityCenterData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/activity");
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Unable to load activity.");
        return;
      }
      setData(json.data as ExecutiveActivityCenterData);
      setError(null);
    } catch {
      setError("Unable to load activity.");
    }
  }, []);

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener(ACTIVITY_CENTER_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(ACTIVITY_CENTER_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  const markRead = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        await fetch(`/api/admin/activity/${encodeURIComponent(id)}/read`, {
          method: "POST",
        });
        await load();
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const markAll = useCallback(async () => {
    setBusy(true);
    try {
      await fetch("/api/admin/activity/read-all", { method: "POST" });
      await load();
    } finally {
      setBusy(false);
    }
  }, [load]);

  const items = data?.items ?? [];
  const notable = items.filter(
    (item) => item.importance === "high" || item.importance === "critical",
  );
  const recent = items.filter(
    (item) => item.importance !== "high" && item.importance !== "critical",
  );

  return (
    <>
      {!hideTrigger ? (
        <button
          type="button"
          className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm kxd-activity-trigger"
          onClick={() => setOpen(true)}
          aria-label="Open activity"
        >
          <span className="kxd-activity-trigger__icon" aria-hidden>
            ⌁
          </span>
          <span>Activity</span>
        </button>
      ) : null}

      {open ? (
        <>
          <button
            type="button"
            className="kxd-activity-overlay"
            aria-label="Close activity"
            onClick={() => setOpen(false)}
          />
          <aside className="kxd-activity-drawer" aria-label="Executive Activity">
            <header className="kxd-activity-drawer__head">
              <div>
                <p className="kxd-os-meta">Executive Activity</p>
                <h2 className="kxd-activity-drawer__title">Studio brief</h2>
                <p className="kxd-os-body kxd-activity-drawer__lede">
                  What moved across the operating system — calm, ordered, evidence-bound.
                </p>
              </div>
              <button
                type="button"
                className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </header>

            <div className="kxd-activity-drawer__toolbar">
              <span className="kxd-os-meta">
                {data ? `${data.unreadCount} unnoted · ${items.length} recent` : "Loading…"}
              </span>
              {data && data.unreadCount > 0 ? (
                <button
                  type="button"
                  className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
                  disabled={busy}
                  onClick={() => void markAll()}
                >
                  Mark all noted
                </button>
              ) : null}
            </div>

            <div className="kxd-activity-drawer__list">
              {error ? <p className="kxd-os-body">{error}</p> : null}

              {!error && items.length === 0 ? (
                <div className="kxd-activity-empty">
                  <p className="kxd-activity-empty__title">Quiet for now</p>
                  <p className="kxd-os-meta">
                    Work, reviews, and client events will gather here as the studio moves.
                  </p>
                </div>
              ) : null}

              {notable.length > 0 ? (
                <section className="kxd-activity-section">
                  <h3 className="kxd-activity-section__label">Notable</h3>
                  {notable.map((item) => (
                    <ActivityRow
                      key={item.id}
                      item={item}
                      busy={busy}
                      onRead={(id) => void markRead(id)}
                    />
                  ))}
                </section>
              ) : null}

              {recent.length > 0 ? (
                <section className="kxd-activity-section">
                  <h3 className="kxd-activity-section__label">Recent</h3>
                  {recent.map((item) => (
                    <ActivityRow
                      key={item.id}
                      item={item}
                      busy={busy}
                      onRead={(id) => void markRead(id)}
                    />
                  ))}
                </section>
              ) : null}
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
