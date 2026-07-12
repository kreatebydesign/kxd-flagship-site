"use client";

/**
 * Phase 24A — Work row with understated quick actions.
 * Full row opens detail; actions stop propagation. No nested anchors.
 */

import {
  useCallback,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import { formatTimeBudgetHours } from "@/lib/work/composer/time-budget";
import {
  WORK_PRIORITY_LABELS,
  WORK_STATUS_LABELS,
} from "@/lib/work/constants";
import {
  formatWorkAssignee,
  formatWorkDue,
  formatWorkStateAge,
} from "@/lib/work/display";
import { dateKeyEquals, toLocalDateKey } from "@/lib/work/planning/client";
import { getWorkStatusActions } from "@/lib/work/transitions";
import type { WorkListItem, WorkStatus } from "@/lib/work/types";

type PlanAction = "today" | "tomorrow" | "remove" | "date";

export function WorkPlanningRow({
  item,
  onWorkChange,
}: {
  item: WorkListItem;
  onWorkChange: (work: WorkListItem) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [showDate, setShowDate] = useState(false);
  const [planDate, setPlanDate] = useState(item.plannedForDate?.slice(0, 10) ?? "");

  const due = formatWorkDue(item.dueDate);
  const planned = formatWorkDue(item.plannedForDate);
  const assignee = formatWorkAssignee(item.assignedTo);
  const age = formatWorkStateAge(item);
  const budget = formatTimeBudgetHours(item.estimatedEffort);
  const plannedToday = dateKeyEquals(item.plannedForDate);

  const openDetail = useCallback(() => {
    router.push(item.adminHref);
  }, [item.adminHref, router]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDetail();
    }
  }

  const runStatus = useCallback(
    async (status: WorkStatus, actionId: string, e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setBusy(actionId);
      try {
        const res = await fetch(`/api/admin/work/${item.id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          work?: WorkListItem;
          error?: string;
        };
        if (!res.ok || data.ok === false) return;
        if (data.work) {
          onWorkChange(data.work);
          return;
        }
        const refresh = await fetch(`/api/admin/work/${item.id}`);
        const refreshed = (await refresh.json()) as {
          ok?: boolean;
          work?: WorkListItem;
        };
        if (refreshed.ok && refreshed.work) onWorkChange(refreshed.work);
      } finally {
        setBusy(null);
      }
    },
    [item.id, onWorkChange],
  );

  const runPlan = useCallback(
    async (action: PlanAction, e: MouseEvent, date?: string) => {
      e.stopPropagation();
      e.preventDefault();
      setBusy(`plan-${action}`);
      try {
        const res = await fetch(`/api/admin/work/${item.id}/plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, date }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          work?: WorkListItem;
        };
        if (data.ok && data.work) {
          onWorkChange(data.work);
          setShowDate(false);
        }
      } finally {
        setBusy(null);
      }
    },
    [item.id, onWorkChange],
  );

  const statusActions = getWorkStatusActions(item.status);
  const canStart = statusActions.some((a) => a.id === "start");
  const canWaitClient = statusActions.some((a) => a.id === "waiting-on-client");
  const canWaitKxd = statusActions.some((a) => a.id === "waiting-on-kxd");
  const canComplete = statusActions.some((a) => a.id === "complete");

  const metaParts = [
    WORK_STATUS_LABELS[item.status],
    WORK_PRIORITY_LABELS[item.priority],
    due ? `Due ${due}` : null,
    planned ? `Planned ${planned}` : null,
    assignee,
    budget,
    age,
  ].filter(Boolean);

  return (
    <li id={`work-${item.id}`} className="kxd-os-work-engine__item">
      <div
        className="kxd-os-work-engine__row kxd-os-work-engine__row--planning"
        role="link"
        tabIndex={0}
        onClick={openDetail}
        onKeyDown={onKeyDown}
        aria-label={`Open ${item.title}`}
      >
        <div className="kxd-os-work-engine__link">
          <span className="kxd-os-work-engine__item-title">{item.title}</span>
          <span className="kxd-os-work-engine__item-meta">
            <span className="kxd-os-work-engine__client-inline">
              {item.clientName}
            </span>
            {" · "}
            {metaParts.join(" · ")}
          </span>
        </div>

        <div
          className="kxd-os-work-engine__actions"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {canStart ? (
            <button
              type="button"
              className="kxd-os-work-engine__action"
              disabled={busy != null}
              onClick={(e) => runStatus("in-progress", "start", e)}
            >
              Start
            </button>
          ) : null}
          {!plannedToday ? (
            <button
              type="button"
              className="kxd-os-work-engine__action"
              disabled={busy != null}
              onClick={(e) => runPlan("today", e)}
            >
              Add to Today
            </button>
          ) : (
            <button
              type="button"
              className="kxd-os-work-engine__action"
              disabled={busy != null}
              onClick={(e) => runPlan("remove", e)}
            >
              Remove from Today
            </button>
          )}
          <button
            type="button"
            className="kxd-os-work-engine__action"
            disabled={busy != null}
            onClick={(e) => runPlan("tomorrow", e)}
          >
            Tomorrow
          </button>
          <button
            type="button"
            className="kxd-os-work-engine__action"
            disabled={busy != null}
            onClick={(e) => {
              e.stopPropagation();
              setShowDate((v) => !v);
              setPlanDate(item.plannedForDate?.slice(0, 10) || toLocalDateKey());
            }}
          >
            Plan date
          </button>
          {canWaitClient ? (
            <button
              type="button"
              className="kxd-os-work-engine__action"
              disabled={busy != null}
              onClick={(e) => runStatus("waiting-on-client", "waiting-on-client", e)}
            >
              Waiting on Client
            </button>
          ) : null}
          {canWaitKxd ? (
            <button
              type="button"
              className="kxd-os-work-engine__action"
              disabled={busy != null}
              onClick={(e) => runStatus("waiting-on-kxd", "waiting-on-kxd", e)}
            >
              Waiting on KXD
            </button>
          ) : null}
          {canComplete ? (
            <button
              type="button"
              className="kxd-os-work-engine__action kxd-os-work-engine__action--emphasis"
              disabled={busy != null}
              onClick={(e) => runStatus("completed", "complete", e)}
            >
              Complete
            </button>
          ) : null}
        </div>

        {showDate ? (
          <div
            className="kxd-os-work-engine__plan-date"
            onClick={(e) => e.stopPropagation()}
          >
            <label className="kxd-os-work-engine__plan-date-label">
              Plan for
              <input
                type="date"
                value={planDate}
                onChange={(e) => setPlanDate(e.target.value)}
                className="kxd-os-work-engine__plan-date-input"
              />
            </label>
            <button
              type="button"
              className="kxd-os-work-engine__action"
              disabled={busy != null || !planDate}
              onClick={(e) => runPlan("date", e, planDate)}
            >
              Save
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
