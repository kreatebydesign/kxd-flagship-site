"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import type {
  ClientNotificationCenterData,
  ClientNotificationItem,
} from "@/lib/ces/modules/notifications/types";

function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function NotificationRow({
  item,
  busy,
  onRead,
  onNavigate,
}: {
  item: ClientNotificationItem;
  busy: boolean;
  onRead: (id: string) => void;
  onNavigate: () => void;
}) {
  return (
    <article
      className={`kxd-ces-notif-item${item.read ? " is-read" : " is-unread"}`}
    >
      <div className="kxd-ces-notif-item__icon" aria-hidden>
        {item.icon}
      </div>
      <div className="kxd-ces-notif-item__body">
        <div className="kxd-ces-notif-item__topline">
          <h3 className="kxd-ces-notif-item__title">{item.title}</h3>
          {!item.read ? (
            <span className="kxd-ces-notif-item__dot" aria-hidden />
          ) : null}
        </div>
        <p className="kxd-ces-notif-item__desc">{item.description}</p>
        <div className="kxd-ces-notif-item__meta">
          <time dateTime={item.occurredAt}>{formatRelativeTime(item.occurredAt)}</time>
          <div className="kxd-ces-notif-item__actions">
            {item.href && item.viewLabel ? (
              <Link
                href={item.href}
                className="kxd-ces-notif-item__link"
                onClick={onNavigate}
              >
                View
              </Link>
            ) : null}
            {!item.read ? (
              <button
                type="button"
                className="kxd-ces-notif-item__link"
                disabled={busy}
                onClick={() => onRead(item.id)}
              >
                Mark read
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export function ClientNotificationsCenter() {
  const titleId = useId();
  const pathname = usePathname();
  const isClient = useIsClient();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const snapshotRef = useRef<{
    data: ClientNotificationCenterData | null;
    unreadCount: number;
  } | null>(null);

  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [data, setData] = useState<ClientNotificationCenterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/notifications?summary=1", {
        credentials: "same-origin",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        summary?: { unreadCount?: number };
      };
      if (res.ok && json.ok) {
        setUnreadCount(Number(json.summary?.unreadCount ?? 0));
      }
    } catch {
      /* quiet */
    }
  }, []);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/notifications", {
        credentials: "same-origin",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: ClientNotificationCenterData;
        message?: string;
      };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.message || "Unable to load notifications.");
      }
      setData(json.data);
      setUnreadCount(json.data.unreadCount);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/portal/notifications?summary=1", { credentials: "same-origin" })
      .then((res) => res.json())
      .then((json: { ok?: boolean; summary?: { unreadCount?: number } }) => {
        if (!alive || !json?.ok) return;
        setUnreadCount(Number(json.summary?.unreadCount ?? 0));
      })
      .catch(() => {
        /* quiet */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Close on route change during render (React-recommended props→state sync).
  const [panelPath, setPanelPath] = useState(pathname);
  if (panelPath !== pathname) {
    setPanelPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarGap > 0) {
      document.body.style.paddingRight = `${scrollbarGap}px`;
    }

    const trigger = triggerRef.current;
    const focusTimer = window.setTimeout(() => {
      closeRef.current?.focus();
    }, 0);

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  async function markRead(id: string) {
    snapshotRef.current = { data, unreadCount };
    const wasUnread = Boolean(data?.items.find((item) => item.id === id && !item.read));
    setBusy(true);
    setData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((item) =>
              item.id === id ? { ...item, read: true } : item,
            ),
            unreadCount: Math.max(0, prev.unreadCount - (wasUnread ? 1 : 0)),
          }
        : prev,
    );
    if (wasUnread) setUnreadCount((n) => Math.max(0, n - 1));

    try {
      const res = await fetch(
        `/api/portal/notifications/${encodeURIComponent(id)}/read`,
        { method: "POST", credentials: "same-origin" },
      );
      if (!res.ok) throw new Error("Failed");
    } catch {
      if (snapshotRef.current) {
        setData(snapshotRef.current.data);
        setUnreadCount(snapshotRef.current.unreadCount);
      }
      await loadSummary();
    } finally {
      setBusy(false);
      snapshotRef.current = null;
    }
  }

  async function markAllRead() {
    snapshotRef.current = { data, unreadCount };
    setBusy(true);
    setData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((item) => ({ ...item, read: true })),
            unreadCount: 0,
          }
        : prev,
    );
    setUnreadCount(0);

    try {
      const res = await fetch("/api/portal/notifications/read-all", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      if (snapshotRef.current) {
        setData(snapshotRef.current.data);
        setUnreadCount(snapshotRef.current.unreadCount);
      }
      await loadSummary();
    } finally {
      setBusy(false);
      snapshotRef.current = null;
    }
  }

  function closePanel() {
    setOpen(false);
  }

  function openPanel() {
    setLoading(true);
    setError(null);
    setOpen(true);
    void loadFeed();
  }

  function onTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPanel();
    }
  }

  const panel =
    isClient && open
      ? createPortal(
          <div className="kxd-ces-notif-drawer" role="presentation">
            <button
              type="button"
              className="kxd-ces-notif-drawer__backdrop"
              aria-label="Close notifications"
              onClick={closePanel}
            />
            <aside
              className="kxd-ces-notif-drawer__panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <header className="kxd-ces-notif-drawer__head">
                <div>
                  <p className="kxd-ces-notif-drawer__eyebrow">Workspace</p>
                  <h2 id={titleId} className="kxd-ces-notif-drawer__title">
                    Notifications
                  </h2>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  className="kxd-ces-btn kxd-ces-btn--ghost"
                  onClick={closePanel}
                >
                  Close
                </button>
              </header>

              <div className="kxd-ces-notif-drawer__toolbar">
                <p className="kxd-ces-notif-drawer__count">
                  {loading && !data
                    ? "Loading…"
                    : data
                      ? `${data.unreadCount} unread`
                      : ""}
                </p>
                {data && data.unreadCount > 0 ? (
                  <button
                    type="button"
                    className="kxd-ces-notif-drawer__action"
                    disabled={busy || loading}
                    onClick={() => void markAllRead()}
                  >
                    Mark all read
                  </button>
                ) : null}
              </div>

              <div className="kxd-ces-notif-drawer__body">
                {error ? (
                  <div className="kxd-ces-notif-empty" role="alert">
                    <p className="kxd-ces-notif-empty__title">Couldn’t load updates</p>
                    <p className="kxd-ces-notif-empty__lead">{error}</p>
                    <button
                      type="button"
                      className="kxd-ces-btn kxd-ces-btn--ghost"
                      onClick={() => void loadFeed()}
                    >
                      Try again
                    </button>
                  </div>
                ) : null}

                {!error && loading && !data ? (
                  <div className="kxd-ces-notif-empty" aria-busy="true">
                    <p className="kxd-ces-notif-empty__title">Gathering updates…</p>
                  </div>
                ) : null}

                {!error && !loading && data && data.items.length === 0 ? (
                  <div className="kxd-ces-notif-empty">
                    <span className="kxd-ces-notif-empty__glyph" aria-hidden>
                      ◯
                    </span>
                    <p className="kxd-ces-notif-empty__title">You&apos;re all caught up.</p>
                    <p className="kxd-ces-notif-empty__lead">No new notifications.</p>
                  </div>
                ) : null}

                {!error && data && data.items.length > 0 ? (
                  <div className="kxd-ces-notif-list">
                    {data.items.map((item) => (
                      <NotificationRow
                        key={item.id}
                        item={item}
                        busy={busy}
                        onRead={(id) => void markRead(id)}
                        onNavigate={closePanel}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </aside>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="kxd-ces-notif-bell"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openPanel}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="kxd-ces-notif-bell__icon" aria-hidden>
          ◉
        </span>
        <span className="kxd-ces-notif-bell__label">Notifications</span>
        {unreadCount > 0 ? (
          <span className="kxd-ces-notif-bell__badge" aria-hidden>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>
      {panel}
    </>
  );
}
