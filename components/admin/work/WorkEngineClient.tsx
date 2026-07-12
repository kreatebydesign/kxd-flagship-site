"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type KeyboardEvent } from "react";
import { KxdShell } from "@/components/os";
import { ExecutiveWorkspaceShell } from "@/components/admin/executive-workspace";
import { WorkComposerHost, WorkComposerTrigger } from "@/components/admin/work/composer";
import {
  WORK_ENGINE_HOME,
  WORK_PRIORITY_LABELS,
  WORK_STATUS_LABELS,
} from "@/lib/work/constants";
import {
  formatWorkAssignee,
  formatWorkDue,
  formatWorkStateAge,
} from "@/lib/work/display";
import { filterTodayWork, isDueToday, isStartToday } from "@/lib/work/views";
import type { WorkComposerUserOption } from "@/lib/work/composer";
import type { WorkListItem, WorkWorkspaceData } from "@/lib/work/types";

function WorkRow({ item }: { item: WorkListItem }) {
  const router = useRouter();
  const due = formatWorkDue(item.dueDate);
  const assignee = formatWorkAssignee(item.assignedTo);
  const age = formatWorkStateAge(item);

  const openDetail = useCallback(() => {
    router.push(item.adminHref);
  }, [item.adminHref, router]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDetail();
    }
  }

  return (
    <li id={`work-${item.id}`} className="kxd-os-work-engine__item">
      <div
        className="kxd-os-work-engine__row"
        role="link"
        tabIndex={0}
        onClick={openDetail}
        onKeyDown={onKeyDown}
        aria-label={`Open ${item.title}`}
      >
        <div className="kxd-os-work-engine__link">
          <span className="kxd-os-work-engine__item-title">{item.title}</span>
          <span className="kxd-os-work-engine__item-meta">
            {WORK_STATUS_LABELS[item.status]}
            {" · "}
            {WORK_PRIORITY_LABELS[item.priority]}
            {due ? ` · Due ${due}` : ""}
            {assignee ? ` · ${assignee}` : ""}
            {age ? ` · ${age}` : ""}
          </span>
          {item.summary ? (
            <span className="kxd-os-work-engine__item-summary">{item.summary}</span>
          ) : null}
        </div>
        {item.clientId != null && item.clientSuccessHref ? (
          <Link
            href={item.clientSuccessHref}
            className="kxd-os-work-engine__client"
            onClick={(e) => e.stopPropagation()}
          >
            {item.clientName}
          </Link>
        ) : (
          <span className="kxd-os-work-engine__client kxd-os-work-engine__client--muted">
            {item.clientName}
          </span>
        )}
      </div>
    </li>
  );
}

function WorkSection({
  title,
  items,
  empty,
}: {
  title: string;
  items: WorkListItem[];
  empty: string;
}) {
  return (
    <section className="kxd-os-work-engine__section">
      <h2 className="kxd-os-work-engine__section-title">{title}</h2>
      {items.length === 0 ? (
        <p className="kxd-os-work-engine__empty">{empty}</p>
      ) : (
        <ul className="kxd-os-work-engine__list">
          {items.map((item) => (
            <WorkRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

function belongsInToday(item: WorkListItem): boolean {
  return filterTodayWork([item]).length > 0 || isStartToday(item) || isDueToday(item);
}

export function WorkEngineClient({
  data,
  greeting,
  dateDisplay,
  currentUser,
}: {
  data: WorkWorkspaceData;
  greeting: string;
  dateDisplay: string;
  currentUser?: WorkComposerUserOption | null;
}) {
  const [todayWork, setTodayWork] = useState(data.todayWork);
  const [waitingOnClient, setWaitingOnClient] = useState(data.waitingOnClient);
  const [waitingOnKxd, setWaitingOnKxd] = useState(data.waitingOnKxd);
  const [upcoming, setUpcoming] = useState(data.upcoming);
  const [openCount, setOpenCount] = useState(data.stats.openCount);

  const onCreated = useCallback((work: WorkListItem) => {
    setOpenCount((n) => n + 1);

    if (work.status === "waiting-on-client") {
      setWaitingOnClient((prev) => [work, ...prev.filter((w) => w.id !== work.id)]);
      return;
    }
    if (work.status === "waiting-on-kxd") {
      setWaitingOnKxd((prev) => [work, ...prev.filter((w) => w.id !== work.id)]);
      return;
    }
    if (belongsInToday(work)) {
      setTodayWork((prev) => [work, ...prev.filter((w) => w.id !== work.id)]);
      return;
    }
    if (work.dueDate) {
      setUpcoming((prev) => [work, ...prev.filter((w) => w.id !== work.id)]);
    }
  }, []);

  const onUpdated = useCallback((work: WorkListItem) => {
    const replace = (prev: WorkListItem[]) =>
      prev.map((item) => (item.id === work.id ? work : item));
    setTodayWork(replace);
    setWaitingOnClient(replace);
    setWaitingOnKxd(replace);
    setUpcoming(replace);
  }, []);

  const statsLine = useMemo(
    () =>
      `${openCount} open · ${data.stats.overdueCount} overdue · ${waitingOnClient.length} waiting on client · ${waitingOnKxd.length} waiting on KXD`,
    [data.stats.overdueCount, openCount, waitingOnClient.length, waitingOnKxd.length],
  );

  return (
    <KxdShell className="kxd-os-shell--ritual">
      <ExecutiveWorkspaceShell workspaceId="work" includeWorkComposer={false}>
        <div className="kxd-os-work-engine">
          <header className="kxd-os-work-engine__header kxd-os-work-engine__header--secondary">
            <nav className="kxd-os-work-engine__nav" aria-label="Work Engine">
              <span className="kxd-os-work-engine__nav-active">Work</span>
              <Link href="/admin/operations/today">Today</Link>
              <Link href="/admin/operations/review-inbox">Review Inbox</Link>
            </nav>
            <Link href="/admin/operations/intelligence" className="kxd-os-work-engine__exit">
              Full workspace
            </Link>
          </header>

          <main className="kxd-os-work-engine__main">
            <header className="kxd-os-work-engine__hero">
              <p className="kxd-os-work-engine__eyebrow">Work Engine</p>
              <h1 className="kxd-os-work-engine__headline">{greeting}</h1>
              <p className="kxd-os-work-engine__lede">
                {dateDisplay}. Execution for the studio — calm, ordered, ready to move.
              </p>
              <p className="kxd-os-work-engine__stats">{statsLine}</p>
            </header>

            <WorkSection
              title="Today's Work"
              items={todayWork}
              empty="Nothing due or in motion today."
            />

            <WorkSection
              title="Waiting on Client"
              items={waitingOnClient}
              empty="No work is waiting on a client."
            />

            <WorkSection
              title="Waiting on KXD"
              items={waitingOnKxd}
              empty="Nothing is waiting on the studio."
            />

            <WorkSection
              title="Upcoming"
              items={upcoming}
              empty="No upcoming due dates in the next two weeks."
            />

            <WorkSection
              title="Completed Today"
              items={data.completedToday}
              empty="No completions recorded today yet."
            />

            <p className="kxd-os-work-engine__footnote">
              <WorkComposerTrigger />
              {" · "}
              <Link href={WORK_ENGINE_HOME}>Refresh</Link>
            </p>
          </main>
        </div>

        <WorkComposerHost
          currentUser={currentUser}
          onCreated={onCreated}
          onUpdated={onUpdated}
        />
      </ExecutiveWorkspaceShell>
    </KxdShell>
  );
}
