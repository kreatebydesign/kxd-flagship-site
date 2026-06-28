import type { CollectionConfig } from "payload";
import { isAuthenticated } from "../access/index.ts";
import { PAYLOAD_GROUPS } from "../admin/groups.ts";

const LINKED_MODULES = [
  { label: "Projects", value: "Projects" },
  { label: "Reporting", value: "Reporting" },
  { label: "Sales", value: "Sales" },
  { label: "Infrastructure", value: "Infrastructure" },
  { label: "Creative", value: "Creative" },
  { label: "Strategy Vault", value: "Strategy Vault" },
  { label: "Timeline", value: "Timeline" },
  { label: "Automation", value: "Automation" },
  { label: "Portal", value: "Portal" },
  { label: "Launch", value: "Launch" },
  { label: "Onboarding", value: "Onboarding" },
] as const;

const AUTOMATION_TRIGGERS = [
  { label: "None", value: "none" },
  { label: "Create Deliverable", value: "create_deliverable" },
  { label: "Create Request", value: "create_request" },
  { label: "Generate Report", value: "generate_report" },
  { label: "Schedule Meeting", value: "schedule_meeting" },
  { label: "Create Executive Note", value: "create_executive_note" },
  { label: "Run Website Audit", value: "run_website_audit" },
  { label: "Launch Client", value: "launch_client" },
  { label: "Generate Proposal", value: "generate_proposal" },
  { label: "Send Portal Invite", value: "send_portal_invite" },
] as const;

export const PlaybookSteps: CollectionConfig = {
  slug: "playbook-steps",
  labels: { singular: "Playbook Step", plural: "Playbook Steps" },
  defaultSort: "order",
  lockDocuments: false,
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "playbook", "order", "required", "linkedModule", "updatedAt"],
    group: PAYLOAD_GROUPS.kxdOs,
    description: "Ordered steps for KXD playbooks",
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    {
      name: "playbook",
      type: "relationship",
      relationTo: "playbooks",
      required: true,
      label: "Playbook",
      admin: { position: "sidebar" },
    },
    {
      name: "order",
      type: "number",
      required: true,
      label: "Order",
      admin: { position: "sidebar" },
    },
    {
      name: "required",
      type: "checkbox",
      label: "Required",
      defaultValue: true,
      admin: { position: "sidebar" },
    },
    {
      name: "estimatedMinutes",
      type: "number",
      label: "Estimated Minutes",
      admin: { position: "sidebar" },
    },
    {
      name: "linkedModule",
      type: "select",
      label: "Linked Module",
      options: [...LINKED_MODULES],
      admin: { position: "sidebar" },
    },
    {
      name: "automationTrigger",
      type: "select",
      label: "Automation Trigger",
      options: [...AUTOMATION_TRIGGERS],
      defaultValue: "none",
      admin: { position: "sidebar" },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Step",
          fields: [
            { name: "title", type: "text", required: true, label: "Title" },
            { name: "description", type: "textarea", label: "Description" },
            { name: "instructions", type: "textarea", label: "Instructions" },
            { name: "completionRule", type: "text", label: "Completion Rule" },
            {
              name: "dependsOn",
              type: "relationship",
              relationTo: "playbook-steps",
              label: "Depends On Step",
            },
            { name: "notes", type: "textarea", label: "Notes" },
            {
              name: "attachments",
              type: "array",
              label: "Attachments",
              fields: [
                { name: "label", type: "text", label: "Label" },
                { name: "url", type: "text", label: "URL" },
              ],
            },
          ],
        },
      ],
    },
  ],
};
