"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  NotificationCenterData,
  NotificationItem,
  NotificationReadState,
  NotificationSeverity,
} from "@/lib/notifications";
import { NotificationBell } from "./NotificationBell";

type StatusFilter = NotificationReadState | "all";
type SeverityFilter = NotificationSeverity | "all";

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

const SEVERITY_LABEL: Record<NotificationSeverity, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
  success: "Success",
};

const STATUS_LABEL: Record<NotificationReadState, string> = {
  unread: "Unread",
  read: "Read",
  resolved: "Resolved",
};

function severityClass(severity: NotificationSeverity): string {
  return `kxd-notif-severity kxd-notif-severity--${severity}`;
}

function NotificationRow({
  item,
  busy,
  onRead,
  onResolve,
}: {
  item: NotificationItem;
  busy: boolean;
  onRead: (id: string) => void;
  onResolve: (id: string) => void;
}) {
  return (
    <article className={`kxd-notif-item kxd-notif-item--${item.status}`}>
      <div className="kxd-notif-item__head">
        <span className={severityClass(item.severity)}>{SEVERITY_LABEL[item.severity]}</span>
        <span className="kxd-os-meta">{item.module}</span>
        <span className="kxd-os-meta">{STATUS_LABEL[item.status]}</span>
      </div>
      <h3 className="kxd-notif-item__title">{item.title}</h3>
      {item.message ? <p className="kxd-os-body kxd-notif-item__message">{item.message}</p> : null}
      <div className="kxd-notif-item__meta">
        {item.clientName ? <span>{item.clientName}</span> : null}
        <span>{fmtWhen(item.createdAt)}</span>
      </div>
      <div className="kxd-notif-item__actions">
        <Link href={item.href} className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm">
          {item.actionLabel ?? "Open"}
        </Link>
        {item.status === "unread" ? (
          <button
            type="button"
            className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
            disabled={busy}
            onClick={() => onRead(item.id)}
          >
            Mark read
          </button>
        ) : null}
        {item.status !== "resolved" ? (
          <button
            type="button"
            className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
            disabled={busy}
            onClick={() => onResolve(item.id)}
          >
            Resolve
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationCenterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");

  const openPanel = useCallback(() => setOpen(true), []);
  const closePanel = useCallback(() => setOpen(false), []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (severityFilter !== "all") params.set("severity", severityFilter);
      if (moduleFilter !== "all") params.set("module", moduleFilter);
      if (clientFilter !== "all") params.set("clientId", clientFilter);

      const res = await fetch(`/api/admin/notifications?${params.toString()}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter, moduleFilter, clientFilter]);

  useEffect(() => {
    function onOpenEvent() {
      openPanel();
    }
    window.addEventListener("kxd:notifications-open", onOpenEvent);
    return () => window.removeEventListener("kxd:notifications-open", onOpenEvent);
  }, [openPanel]);

  useEffect(() => {
    if (!open) return;
    void fetchData();
  }, [open, fetchData]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        closePanel();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closePanel]);

  const sections = useMemo(() => {
    if (!data) return { unread: [], critical: [], recent: [], resolved: [] as NotificationItem[] };
    const items = data.items;
    const critical = items.filter((i) => i.severity === "critical" && i.status !== "resolved");
    const criticalIds = new Set(critical.map((i) => i.id));
    return {
      critical,
      unread: items.filter((i) => i.status === "unread" && !criticalIds.has(i.id)),
      recent: items.filter((i) => i.status === "read").slice(0, 12),
      resolved: items.filter((i) => i.status === "resolved"),
    };
  }, [data]);

  async function postAction(path: string) {
    setBusy(true);
    try {
      await fetch(path, { method: "POST" });
      setRefreshKey((k) => k + 1);
      await fetchData();
    } finally {
      setBusy(false);
    }
  }

  function onRead(id: string) {
    void postAction(`/api/admin/notifications/${encodeURIComponent(id)}/read`);
  }

  function onResolve(id: string) {
    void postAction(`/api/admin/notifications/${encodeURIComponent(id)}/resolve`);
  }

  function onReadAll() {
    void postAction("/api/admin/notifications/read-all");
  }

  const showGrouped = statusFilter === "all" && severityFilter === "all";

  return (
    <>
      <NotificationBell onOpen={openPanel} refreshKey={refreshKey} />

      {open ? (
        <div className="kxd-notif-overlay" role="presentation" onClick={closePanel}>
          <aside
            className="kxd-notif-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Notification center"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="kxd-notif-drawer__head">
              <div>
                <p className="kxd-os-meta">KXD OS</p>
                <h2 className="kxd-os-headline kxd-os-headline--sm">Operating Inbox</h2>
              </div>
              <button
                type="button"
                className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
                onClick={closePanel}
                aria-label="Close notifications"
              >
                Close
              </button>
            </header>

            {data?.summary ? (
              <div className="kxd-notif-summary">
                <div className="kxd-notif-summary__cell">
                  <span className="kxd-notif-summary__value kxd-notif-summary__value--critical">
                    {data.summary.critical}
                  </span>
                  <span className="kxd-os-meta">Critical</span>
                </div>
                <div className="kxd-notif-summary__cell">
                  <span className="kxd-notif-summary__value">{data.summary.unread}</span>
                  <span className="kxd-os-meta">Unread</span>
                </div>
                <div className="kxd-notif-summary__cell">
                  <span className="kxd-notif-summary__value">{data.summary.dueToday}</span>
                  <span className="kxd-os-meta">Due Today</span>
                </div>
                <div className="kxd-notif-summary__cell">
                  <span className="kxd-notif-summary__value">{data.summary.recentlyResolved}</span>
                  <span className="kxd-os-meta">Resolved</span>
                </div>
              </div>
            ) : null}

            <div className="kxd-notif-filters">
              <select
                className="kxd-notif-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                aria-label="Filter by status"
              >
                <option value="all">All status</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
                <option value="resolved">Resolved</option>
              </select>
              <select
                className="kxd-notif-select"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
                aria-label="Filter by severity"
              >
                <option value="all">All severity</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
                <option value="success">Success</option>
              </select>
              <select
                className="kxd-notif-select"
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                aria-label="Filter by module"
              >
                <option value="all">All modules</option>
                {(data?.modules ?? []).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                className="kxd-notif-select"
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                aria-label="Filter by client"
              >
                <option value="all">All clients</option>
                {(data?.clients ?? []).map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="kxd-notif-toolbar">
              <button
                type="button"
                className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
                disabled={busy || !data?.summary?.unread}
                onClick={onReadAll}
              >
                Mark all read
              </button>
            </div>

            <div className="kxd-notif-list">
              {loading ? (
                <p className="kxd-os-meta kxd-notif-empty">Loading inbox…</p>
              ) : !data?.items.length ? (
                <div className="kxd-notif-empty-state">
                  <p className="kxd-os-headline kxd-os-headline--sm">Inbox clear</p>
                  <p className="kxd-os-meta">
                    No operational signals right now. Automation, Brain, and Founder Intelligence
                    will surface here when action is needed.
                  </p>
                </div>
              ) : showGrouped ? (
                <>
                  {sections.critical.length > 0 ? (
                    <section className="kxd-notif-section">
                      <h3 className="kxd-notif-section__label">Critical</h3>
                      {sections.critical.map((item) => (
                        <NotificationRow
                          key={item.id}
                          item={item}
                          busy={busy}
                          onRead={onRead}
                          onResolve={onResolve}
                        />
                      ))}
                    </section>
                  ) : null}
                  {sections.unread.length > 0 ? (
                    <section className="kxd-notif-section">
                      <h3 className="kxd-notif-section__label">Unread</h3>
                      {sections.unread.map((item) => (
                        <NotificationRow
                          key={item.id}
                          item={item}
                          busy={busy}
                          onRead={onRead}
                          onResolve={onResolve}
                        />
                      ))}
                    </section>
                  ) : null}
                  {sections.recent.length > 0 ? (
                    <section className="kxd-notif-section">
                      <h3 className="kxd-notif-section__label">Recent</h3>
                      {sections.recent.map((item) => (
                        <NotificationRow
                          key={item.id}
                          item={item}
                          busy={busy}
                          onRead={onRead}
                          onResolve={onResolve}
                        />
                      ))}
                    </section>
                  ) : null}
                  {sections.resolved.length > 0 ? (
                    <section className="kxd-notif-section">
                      <h3 className="kxd-notif-section__label">Resolved</h3>
                      {sections.resolved.map((item) => (
                        <NotificationRow
                          key={item.id}
                          item={item}
                          busy={busy}
                          onRead={onRead}
                          onResolve={onResolve}
                        />
                      ))}
                    </section>
                  ) : null}
                </>
              ) : (
                data.items.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    busy={busy}
                    onRead={onRead}
                    onResolve={onResolve}
                  />
                ))
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
