import Link from "next/link";
import {
  WorkspaceChapter,
  WorkspaceEmpty,
  WorkspaceKpiGrid,
  WorkspaceMetaLine,
} from "@/components/admin/operations/client-workspace/WorkspacePrimitives";
import {
  OpsListRow,
} from "@/components/admin/operations/shared/OpsBriefing";
import {
  WORK_ITEM_SOURCE_LABELS,
  WORK_ITEM_STATUS_LABELS,
} from "@/lib/work-items/types";
import type { ClientWorkBoardData } from "@/lib/client-tasks/types";
import type { WorkItemSourceType } from "@/lib/work-items/types";

function sourceLabel(sourceType?: string | null): string {
  if (!sourceType) return "Manual";
  return WORK_ITEM_SOURCE_LABELS[sourceType as WorkItemSourceType] ?? sourceType.replace(/-/g, " ");
}

export function ClientWorkPanel({ board }: { board: ClientWorkBoardData | null }) {
  if (!board) {
    return (
      <WorkspaceChapter title="Work Items">
        <WorkspaceEmpty message="Unable to load work items for this client." />
      </WorkspaceChapter>
    );
  }

  const open = board.tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");
  const focus = board.stats.nextRecommendedTask;

  return (
    <div className="kxd-os-workspace-dossier">
      <WorkspaceKpiGrid
        items={[
          { label: "Open", value: String(board.stats.openCount) },
          { label: "Blocked", value: String(board.stats.blockedCount) },
          { label: "Due this week", value: String(board.stats.dueThisWeek) },
          { label: "Completed (month)", value: String(board.stats.completedThisMonth) },
        ]}
      />

      {focus ? (
        <WorkspaceChapter title="Next up" variant="compact">
          <WorkspaceMetaLine label="Recommended" value={focus.title} />
          <WorkspaceMetaLine
            label="Status"
            value={WORK_ITEM_STATUS_LABELS[focus.status] ?? focus.status}
          />
          {focus.sourceType ? (
            <WorkspaceMetaLine label="Source" value={sourceLabel(focus.sourceType)} />
          ) : null}
        </WorkspaceChapter>
      ) : null}

      <WorkspaceChapter title="Open work items" variant="compact">
        {open.length === 0 ? (
          <WorkspaceEmpty message="No open work items for this client." />
        ) : (
          <div className="kxd-os-list-stack">
            {open.slice(0, 12).map((task) => (
              <OpsListRow key={task.id} href={`/admin/collections/client-tasks/${task.id}`}>
                <p className="kxd-os-body">{task.title}</p>
                <p className="kxd-os-meta">
                  {WORK_ITEM_STATUS_LABELS[task.status] ?? task.status}
                  {task.dueDate ? ` · due ${task.dueDate}` : ""}
                  {task.sourceType ? ` · ${sourceLabel(task.sourceType)}` : ""}
                </p>
              </OpsListRow>
            ))}
          </div>
        )}
        <Link
          href={`/admin/operations/work/${board.clientId}`}
          className="kxd-os-link-quiet kxd-os-workspace-inline-link"
        >
          Full work board →
        </Link>
        <Link
          href={`/admin/collections/client-tasks/create?client=${board.clientId}`}
          className="kxd-os-link-quiet kxd-os-workspace-inline-link"
        >
          New work item →
        </Link>
      </WorkspaceChapter>
    </div>
  );
}
