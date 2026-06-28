"use client";

import { useCallback, useEffect, useState } from "react";
import type { NotificationCenterSummary } from "@/lib/notifications";

interface NotificationBellProps {
  onOpen: () => void;
  refreshKey?: number;
}

export function NotificationBell({ onOpen, refreshKey = 0 }: NotificationBellProps) {
  const [summary, setSummary] = useState<NotificationCenterSummary | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications?status=unread");
      const json = await res.json();
      if (json.success) {
        setSummary(json.data.summary);
      }
    } catch {
      /* quiet */
    }
  }, []);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary, refreshKey]);

  const unread = summary?.unread ?? 0;
  const critical = summary?.critical ?? 0;

  return (
    <button
      type="button"
      className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm kxd-notif-bell"
      onClick={onOpen}
      aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
    >
      <span className="kxd-notif-bell__icon" aria-hidden>
        ◉
      </span>
      <span>Inbox</span>
      {unread > 0 ? (
        <span
          className={`kxd-notif-bell__badge${critical > 0 ? " kxd-notif-bell__badge--critical" : ""}`}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </button>
  );
}
