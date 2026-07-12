/**
 * Future Operational Flow adapters — reserved, not implemented.
 */

import type { OperationalExtensionSlot } from "./types";

export const OPERATIONAL_FLOW_EXTENSIONS: OperationalExtensionSlot[] = [
  {
    id: "calendar",
    status: "reserved",
    note: "Phase 25B registers schedule.* flow kinds. Calendar adapter remains inactive until Google connection.",
  },
  {
    id: "finance",
    status: "reserved",
    note: "Invoice paid / overdue transitions will rebalance finance surfaces via the same contract.",
  },
  {
    id: "crm",
    status: "reserved",
    note: "Relationship state changes plug into resolveAffectedSystems.",
  },
  {
    id: "business-development",
    status: "reserved",
    note: "Proposal accepted / pipeline milestones extend preferredShift when Today is empty.",
  },
  {
    id: "brand-center",
    status: "reserved",
    note: "Brand deliverable completions will classify as operational milestones.",
  },
  {
    id: "knowledge",
    status: "reserved",
    note: "Knowledge updates remain read-side; flow only notes affected systems.",
  },
  {
    id: "notifications",
    status: "reserved",
    note: "Notification fan-out stays future — Flow records intent, does not send.",
  },
];
