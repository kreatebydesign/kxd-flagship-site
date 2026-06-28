import type { CommandSearchResult } from "@/lib/search/types";
import type { IntelligenceContext } from "@/lib/intelligence/types";
import { matchClientFromQuery } from "./client-context";
import type { QuickAction, QuickActionCommandMatch, QuickActionId } from "./types";
import {
  clientCommandCenterHref,
  clientHqHref,
  clientSuccessHref,
  executiveNoteHref,
  infrastructureHref,
  playbookHref,
  proposalHref,
  reportHref,
  successCheckInHref,
  timelineHref,
  websiteAuditHref,
} from "./routes";

export function getGlobalQuickActions(): QuickAction[] {
  return [
    {
      id: "create-proposal",
      label: "Create Proposal",
      sub: "Sales",
      href: proposalHref(),
      keywords: ["proposal", "create proposal"],
    },
    {
      id: "create-executive-note",
      label: "Create Executive Note",
      sub: "Strategy",
      href: executiveNoteHref(),
      keywords: ["note", "executive note"],
    },
    {
      id: "generate-report",
      label: "Generate Report",
      sub: "Reporting",
      href: reportHref(),
      keywords: ["report", "generate report"],
    },
    {
      id: "launch-playbook",
      label: "Launch Playbook",
      sub: "Execution",
      href: playbookHref(),
      keywords: ["playbook", "launch playbook"],
    },
    {
      id: "run-website-audit",
      label: "Run Website Audit",
      sub: "Audits",
      href: websiteAuditHref(),
      keywords: ["audit", "website audit"],
    },
    {
      id: "open-client-command-center",
      label: "Open Client Command Center",
      sub: "Clients",
      href: clientCommandCenterHref(),
      keywords: ["command center", "client command"],
    },
    {
      id: "open-notifications",
      label: "Open Notifications",
      sub: "Inbox",
      href: "#notifications",
      keywords: ["notifications", "inbox", "alerts"],
    },
    {
      id: "open-brain",
      label: "Open KXD Brain",
      sub: "Intelligence",
      href: "/admin/operations/brain",
      keywords: ["brain", "kxd brain"],
    },
    {
      id: "open-sales-pipeline",
      label: "Open Sales Pipeline",
      sub: "Sales",
      href: "/admin/sales",
      keywords: ["sales", "pipeline"],
    },
    {
      id: "open-client-success",
      label: "Open Client Success",
      sub: "Relationships",
      href: clientSuccessHref(),
      keywords: ["client success", "success"],
    },
    {
      id: "open-integrations",
      label: "Open Integrations",
      sub: "Hub",
      href: "/admin/operations/integrations",
      keywords: ["integrations", "integration hub"],
    },
  ];
}

export function getClientQuickActions(clientId: number): QuickAction[] {
  return [
    {
      id: "open-command-center",
      label: "Open Command Center",
      sub: "Client ops",
      href: clientCommandCenterHref(clientId),
    },
    {
      id: "open-client-hq",
      label: "Open Client HQ",
      sub: "Workspace",
      href: clientHqHref(clientId),
    },
    {
      id: "open-timeline",
      label: "Open Timeline",
      sub: "Relationship",
      href: timelineHref(clientId),
    },
    {
      id: "open-infrastructure",
      label: "Open Infrastructure",
      sub: "Technical",
      href: infrastructureHref(clientId),
    },
    {
      id: "generate-monthly-report",
      label: "Generate Monthly Report",
      sub: "Reporting",
      href: reportHref(clientId),
    },
    {
      id: "launch-website-playbook",
      label: "Launch Website Launch",
      sub: "Playbook",
      href: playbookHref("website-launch", clientId),
    },
    {
      id: "launch-quarterly-review",
      label: "Launch Quarterly Review",
      sub: "Playbook",
      href: playbookHref("quarterly-business-review", clientId),
    },
    {
      id: "create-success-check-in",
      label: "Create Success Check-In",
      sub: "Client Success",
      href: successCheckInHref(clientId),
    },
    {
      id: "create-executive-note",
      label: "Create Executive Note",
      sub: "Strategy",
      href: executiveNoteHref(clientId),
    },
    {
      id: "create-proposal",
      label: "Create Proposal",
      sub: "Sales",
      href: proposalHref(clientId),
    },
    {
      id: "run-website-audit",
      label: "Run Website Audit",
      sub: "Audits",
      href: websiteAuditHref(clientId),
    },
  ];
}

const COMMAND_VERBS: Array<{
  verbs: string[];
  actionId: QuickActionId;
  title: string;
  actionLabel: string;
  playbookSlug?: string;
}> = [
  {
    verbs: ["report"],
    actionId: "generate-report",
    title: "Generate Report",
    actionLabel: "Generate",
  },
  {
    verbs: ["note"],
    actionId: "create-executive-note",
    title: "Create Executive Note",
    actionLabel: "Create",
  },
  {
    verbs: ["launch"],
    actionId: "launch-website-playbook",
    title: "Launch Website Launch",
    actionLabel: "Launch",
    playbookSlug: "website-launch",
  },
  {
    verbs: ["command"],
    actionId: "open-command-center",
    title: "Open Command Center",
    actionLabel: "Open",
  },
  {
    verbs: ["audit"],
    actionId: "run-website-audit",
    title: "Run Website Audit",
    actionLabel: "Run",
  },
  {
    verbs: ["success"],
    actionId: "open-client-success",
    title: "Open Client Success",
    actionLabel: "Open",
  },
  {
    verbs: ["proposal"],
    actionId: "create-proposal",
    title: "Create Proposal",
    actionLabel: "Create",
  },
];

function parseQuickActionCommand(query: string): QuickActionCommandMatch | null {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed.includes(" ")) return null;

  for (const entry of COMMAND_VERBS) {
    for (const verb of entry.verbs) {
      if (trimmed.startsWith(`${verb} `)) {
        const clientToken = trimmed.slice(verb.length + 1).trim();
        if (clientToken.length >= 2) {
          return { actionId: entry.actionId, verb, clientToken };
        }
      }
    }
  }

  return null;
}

/** Deterministic client-scoped command match — e.g. "report primal", "note robin" */
export function matchQuickActionCommand(
  query: string,
  ctx: IntelligenceContext,
): CommandSearchResult | null {
  const parsed = parseQuickActionCommand(query);
  if (!parsed) return null;

  const client = matchClientFromQuery(parsed.clientToken, ctx);
  if (!client) return null;

  const verbEntry = COMMAND_VERBS.find((v) => v.actionId === parsed.actionId);
  if (!verbEntry) return null;

  let href: string;
  switch (parsed.actionId) {
    case "generate-report":
      href = reportHref(client.id);
      break;
    case "create-executive-note":
      href = executiveNoteHref(client.id);
      break;
    case "launch-website-playbook":
      href = playbookHref("website-launch", client.id);
      break;
    case "open-command-center":
      href = clientCommandCenterHref(client.id);
      break;
    case "run-website-audit":
      href = websiteAuditHref(client.id);
      break;
    case "open-client-success":
      href = clientSuccessHref(client.id);
      break;
    case "create-proposal":
      href = proposalHref(client.id);
      break;
    default:
      return null;
  }

  return {
    id: `qa-cmd-${parsed.actionId}-${client.id}`,
    type: "command",
    group: "commands",
    title: `${verbEntry.title} — ${client.name}`,
    subtitle: `Quick action · ${client.name}`,
    clientId: client.id,
    clientName: client.name,
    href,
    actionLabel: verbEntry.actionLabel,
    icon: "◆",
    pinned: true,
    score: 1000,
  };
}
