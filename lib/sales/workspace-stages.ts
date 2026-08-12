/**
 * Presentational Sales Pipeline stages mapped onto existing sales-leads.status.
 * No schema rewrite — operator language only.
 */

import type { LeadStatus } from "./types";

export const WORKSPACE_SECTIONS = [
  {
    id: "new-leads",
    label: "New Leads",
    description: "Newly accepted opportunities",
    statuses: ["new"] as const satisfies readonly LeadStatus[],
  },
  {
    id: "needs-response",
    label: "Needs Response",
    description: "Outreach or a reply is due",
    statuses: ["discovery"] as const satisfies readonly LeadStatus[],
  },
  {
    id: "in-conversation",
    label: "In Conversation",
    description: "Active communication",
    statuses: ["nurturing"] as const satisfies readonly LeadStatus[],
  },
  {
    id: "proposal-decision",
    label: "Proposal / Decision",
    description: "Pricing, proposal, or decision",
    statuses: ["proposal", "negotiation"] as const satisfies readonly LeadStatus[],
  },
  {
    id: "won",
    label: "Won",
    description: "Converted into business",
    statuses: ["won"] as const satisfies readonly LeadStatus[],
  },
  {
    id: "not-moving",
    label: "Not Moving",
    description: "Lost, declined, expired, or inactive",
    statuses: ["lost"] as const satisfies readonly LeadStatus[],
  },
] as const;

export type WorkspaceSectionId = (typeof WORKSPACE_SECTIONS)[number]["id"];

export const STATUS_TO_SECTION: Record<string, WorkspaceSectionId> = {
  new: "new-leads",
  discovery: "needs-response",
  nurturing: "in-conversation",
  proposal: "proposal-decision",
  negotiation: "proposal-decision",
  won: "won",
  lost: "not-moving",
};

export const SECTION_LABEL: Record<WorkspaceSectionId, string> = Object.fromEntries(
  WORKSPACE_SECTIONS.map((s) => [s.id, s.label]),
) as Record<WorkspaceSectionId, string>;

/** Operator-facing move targets (underlying status values). */
export const WORKSPACE_MOVES: Record<string, { status: LeadStatus; label: string }[]> = {
  new: [
    { status: "discovery", label: "Needs Response" },
    { status: "nurturing", label: "In Conversation" },
    { status: "lost", label: "Not Moving" },
  ],
  discovery: [
    { status: "nurturing", label: "In Conversation" },
    { status: "proposal", label: "Proposal / Decision" },
    { status: "lost", label: "Not Moving" },
  ],
  nurturing: [
    { status: "proposal", label: "Proposal / Decision" },
    { status: "discovery", label: "Needs Response" },
    { status: "lost", label: "Not Moving" },
  ],
  proposal: [
    { status: "negotiation", label: "Decision" },
    { status: "won", label: "Won" },
    { status: "lost", label: "Not Moving" },
  ],
  negotiation: [
    { status: "won", label: "Won" },
    { status: "lost", label: "Not Moving" },
  ],
};
