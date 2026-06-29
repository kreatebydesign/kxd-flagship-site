import {
  createTaskHref,
  executiveNoteHref,
  proposalHref,
  successCheckInHref,
} from "@/lib/quick-actions/routes";
import type { CommandWorkspaceQuickAction } from "./workspace-types";

export function buildWorkspaceQuickActions(
  clientId: number,
  primaryEmail: string | null,
): CommandWorkspaceQuickAction[] {
  const actions: CommandWorkspaceQuickAction[] = [
    { id: "new-task", label: "New Task", href: createTaskHref(clientId) },
    { id: "add-note", label: "Add Note", href: executiveNoteHref(clientId) },
    {
      id: "log-meeting",
      label: "Log Meeting",
      href: successCheckInHref(clientId),
    },
    {
      id: "log-communication",
      label: "Log Communication",
      href: `/admin/operations/client-command/${clientId}?tab=emails`,
    },
    {
      id: "follow-up",
      label: "Follow Up",
      href: `/admin/operations/client-command/${clientId}?tab=emails`,
    },
    {
      id: "add-timeline-event",
      label: "Add Timeline Event",
      href: `/admin/operations/client-command/${clientId}?tab=timeline`,
    },
    {
      id: "create-invoice",
      label: "Create Invoice",
      href: proposalHref(clientId),
    },
    {
      id: "new-project",
      label: "New Project",
      href: `/admin/collections/client-projects/create?client=${clientId}`,
    },
    {
      id: "upload-file",
      label: "Upload File",
      href: `/admin/collections/creative-assets/create?client=${clientId}`,
    },
    {
      id: "open-portal",
      label: "Open Portal",
      href: `/portal`,
      external: true,
    },
  ];

  if (primaryEmail) {
    actions.push({
      id: "email-client",
      label: "Email Client",
      href: `mailto:${primaryEmail}`,
      external: true,
    });
  }

  return actions;
}
