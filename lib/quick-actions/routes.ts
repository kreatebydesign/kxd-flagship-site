/** Route builders for quick actions — single source of truth */

export function proposalHref(clientId?: number): string {
  return clientId
    ? `/admin/sales/proposals/new?client=${clientId}`
    : "/admin/sales/proposals/new";
}

export function executiveNoteHref(clientId?: number): string {
  return clientId
    ? `/admin/collections/executive-notes/create?client=${clientId}`
    : "/admin/operations/strategy";
}

export function reportHref(clientId?: number): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (clientId) {
    return `/admin/operations/reports?client=${clientId}&month=${month}&year=${year}`;
  }
  return `/admin/operations/reports?month=${month}&year=${year}`;
}

export function playbookHref(slug?: string, clientId?: number): string {
  const params = new URLSearchParams();
  if (slug) params.set("playbook", slug);
  if (clientId) params.set("client", String(clientId));
  const q = params.toString();
  return q ? `/admin/operations/playbooks?${q}` : "/admin/operations/playbooks";
}

export function websiteAuditHref(clientId?: number): string {
  if (clientId) {
    return playbookHref("website-audit", clientId);
  }
  return "/admin/operations/audits";
}

export function clientCommandCenterHref(clientId?: number): string {
  return clientId
    ? `/admin/operations/client-command/${clientId}`
    : "/admin/operations/clients";
}

export function clientHqHref(clientId: number): string {
  return `/admin/operations/clients/${clientId}`;
}

export function timelineHref(clientId: number): string {
  return `/admin/operations/timeline/${clientId}`;
}

export function infrastructureHref(clientId: number): string {
  return `/admin/operations/infrastructure/${clientId}`;
}

export function clientSuccessHref(clientId?: number): string {
  return clientId
    ? `/admin/operations/client-success/${clientId}`
    : "/admin/operations/client-success";
}

export function successCheckInHref(clientId: number): string {
  return `/admin/collections/success-check-ins/create?client=${clientId}`;
}

export function resolveQuickActionHref(
  actionId: string,
  clientId?: number,
): string {
  switch (actionId) {
    case "create-proposal":
      return proposalHref(clientId);
    case "create-executive-note":
      return executiveNoteHref(clientId);
    case "generate-report":
    case "generate-monthly-report":
      return reportHref(clientId);
    case "launch-playbook":
      return playbookHref(undefined, clientId);
    case "launch-website-playbook":
      return playbookHref("website-launch", clientId);
    case "launch-quarterly-review":
      return playbookHref("quarterly-business-review", clientId);
    case "run-website-audit":
      return websiteAuditHref(clientId);
    case "open-client-command-center":
    case "open-command-center":
      return clientCommandCenterHref(clientId);
    case "open-client-hq":
      return clientId ? clientHqHref(clientId) : "/admin/operations/clients";
    case "open-timeline":
      return clientId ? timelineHref(clientId) : "/admin/operations/timeline";
    case "open-infrastructure":
      return clientId ? infrastructureHref(clientId) : "/admin/operations/infrastructure";
    case "open-notifications":
      return "#notifications";
    case "open-brain":
      return "/admin/operations/brain";
    case "open-sales-pipeline":
      return "/admin/sales";
    case "open-client-success":
      return clientSuccessHref(clientId);
    case "open-integrations":
      return "/admin/operations/integrations";
    case "create-success-check-in":
      return clientId ? successCheckInHref(clientId) : "/admin/operations/client-success";
    default:
      return "/admin/operations/command";
  }
}
