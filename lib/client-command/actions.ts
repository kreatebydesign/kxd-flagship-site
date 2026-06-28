import type { CommandQuickAction } from "./types";

export function buildQuickActions(clientId: number): CommandQuickAction[] {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  return [
    {
      label: "Create Proposal",
      sub: "Sales",
      href: `/admin/sales/proposals/new?client=${clientId}`,
    },
    {
      label: "Launch Project",
      sub: "Delivery",
      href: `/admin/collections/client-projects/create?client=${clientId}`,
    },
    {
      label: "Generate Report",
      sub: "Reporting",
      href: `/admin/operations/reports?client=${clientId}&month=${month}&year=${year}`,
    },
    {
      label: "Run Website Launch",
      sub: "Playbook",
      href: `/admin/operations/playbooks?playbook=website-launch&client=${clientId}`,
    },
    {
      label: "Run Monthly Report",
      sub: "Playbook",
      href: `/admin/operations/playbooks?playbook=monthly-reporting&client=${clientId}`,
    },
    {
      label: "Run Onboarding",
      sub: "Playbook",
      href: `/admin/operations/playbooks?playbook=client-onboarding&client=${clientId}`,
    },
    {
      label: "Quarterly Review",
      sub: "Playbook",
      href: `/admin/operations/playbooks?playbook=quarterly-business-review&client=${clientId}`,
    },
    {
      label: "SEO Checklist",
      sub: "Playbook",
      href: `/admin/operations/playbooks?playbook=seo-launch&client=${clientId}`,
    },
    {
      label: "Run Website Audit",
      sub: "Playbook",
      href: `/admin/operations/playbooks?playbook=website-audit&client=${clientId}`,
    },
    {
      label: "Launch Playbook",
      sub: "All templates",
      href: `/admin/operations/playbooks?client=${clientId}`,
    },
    {
      label: "Create Deliverable",
      sub: "Delivery",
      href: `/admin/collections/client-deliverables/create?client=${clientId}`,
    },
    {
      label: "Create Request",
      sub: "Operations",
      href: `/admin/operations/requests/new?client=${clientId}`,
    },
    {
      label: "Schedule Meeting",
      sub: "Relationship",
      href: `/admin/collections/client-timeline-events/create?client=${clientId}&eventType=meeting`,
    },
    {
      label: "Open Client HQ",
      sub: "Portal",
      href: `/portal`,
    },
    {
      label: "Open Infrastructure",
      sub: "Technical",
      href: `/admin/operations/infrastructure/${clientId}`,
    },
    {
      label: "Open Timeline",
      sub: "Relationship",
      href: `/admin/operations/timeline/${clientId}`,
    },
    {
      label: "Create Executive Note",
      sub: "Timeline",
      href: `/admin/collections/executive-timeline-events/create?client=${clientId}`,
    },
  ];
}
