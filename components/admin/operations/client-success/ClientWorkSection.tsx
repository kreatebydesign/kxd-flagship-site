"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { KxdSection } from "@/components/os";
import { OpsListRow, OpsSectionHead } from "@/components/admin/operations/shared/OpsBriefing";
import { WorkComposerTrigger } from "@/components/admin/work/composer";
import {
  WORK_COMPOSER_CREATED_EVENT,
  type WorkComposerCreatedDetail,
} from "@/lib/work/composer";
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
import { groupClientWork } from "@/lib/work/client-work";
import type { ClientWorkData, WorkListItem } from "@/lib/work/types";

function ClientWorkRow({ item }: { item: WorkListItem }) {
  const due = formatWorkDue(item.dueDate);
  const assignee = formatWorkAssignee(item.assignedTo);
  const age = formatWorkStateAge(item);

  return (
    <OpsListRow href={item.adminHref}>
      <p className="kxd-os-body">{item.title}</p>
      <p className="kxd-os-meta">
        {WORK_STATUS_LABELS[item.status]}
        {" · "}
        {WORK_PRIORITY_LABELS[item.priority]}
        {due ? ` · Due ${due}` : ""}
        {assignee ? ` · ${assignee}` : ""}
        {age ? ` · ${age}` : ""}
      </p>
    </OpsListRow>
  );
}

function WorkGroup({
  label,
  items,
  empty,
}: {
  label: string;
  items: WorkListItem[];
  empty: string;
}) {
  return (
    <div className="kxd-os-client-work__group">
      <p className="kxd-os-section__label">{label}</p>
      {items.length === 0 ? (
        <p className="kxd-os-meta">{empty}</p>
      ) : (
        <div className="kxd-os-list-stack">
          {items.map((item) => (
            <ClientWorkRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ClientWorkSection({
  clientId,
  initialWork,
}: {
  clientId: number;
  initialWork: ClientWorkData;
}) {
  const [work, setWork] = useState(initialWork);

  const mergeCreated = useCallback(
    (item: WorkListItem) => {
      if (item.clientId !== clientId) return;
      setWork((prev) => {
        const flat = [
          item,
          ...prev.active,
          ...prev.waitingOnClient,
          ...prev.waitingOnKxd,
          ...prev.upcoming,
          ...prev.completed,
        ].filter((w, i, arr) => arr.findIndex((x) => x.id === w.id) === i);
        return groupClientWork(clientId, flat);
      });
    },
    [clientId],
  );

  useEffect(() => {
    function onCreated(e: Event) {
      const detail = (e as CustomEvent<WorkComposerCreatedDetail>).detail;
      if (detail?.work) mergeCreated(detail.work);
    }
    window.addEventListener(WORK_COMPOSER_CREATED_EVENT, onCreated);
    return () => window.removeEventListener(WORK_COMPOSER_CREATED_EVENT, onCreated);
  }, [mergeCreated]);

  const totalVisible =
    work.active.length +
    work.waitingOnClient.length +
    work.waitingOnKxd.length +
    work.upcoming.length +
    work.completed.length;

  return (
    <KxdSection label="Work" className="kxd-os-operations-section kxd-os-client-work">
      <div className="kxd-os-client-work__head">
        <OpsSectionHead
          label="Operational work for this client"
          count={work.openCount}
          href={`${WORK_ENGINE_HOME}?client=${clientId}`}
        />
        <WorkComposerTrigger
          className="kxd-os-work-composer-trigger kxd-os-client-work__create"
          options={{ clientId }}
        >
          Create work
        </WorkComposerTrigger>
      </div>

      {totalVisible === 0 ? (
        <p className="kxd-os-meta">
          No work on file yet.{" "}
          <WorkComposerTrigger
            className="kxd-os-work-composer-trigger"
            options={{ clientId }}
          >
            Create the first item
          </WorkComposerTrigger>
          {" · "}
          <Link href={WORK_ENGINE_HOME} className="kxd-os-link-quiet">
            Open Work Engine
          </Link>
        </p>
      ) : (
        <div className="kxd-os-client-work__groups">
          <WorkGroup label="Active" items={work.active} empty="Nothing active." />
          <WorkGroup
            label="Waiting on Client"
            items={work.waitingOnClient}
            empty="Nothing waiting on the client."
          />
          <WorkGroup
            label="Waiting on KXD"
            items={work.waitingOnKxd}
            empty="Nothing waiting on the studio."
          />
          <WorkGroup
            label="Upcoming"
            items={work.upcoming}
            empty="No upcoming due dates."
          />
          <WorkGroup
            label="Completed"
            items={work.completed}
            empty="No completed work yet."
          />
        </div>
      )}
    </KxdSection>
  );
}
