/**
 * Future module extension points — reserved only.
 */

import type { ExecutiveExtensionSlot } from "./types";

export const EXECUTIVE_CONTEXT_EXTENSIONS: ExecutiveExtensionSlot[] = [
  {
    id: "calendar",
    status: "reserved",
    note: "Calendar events will feed waiting and upcoming when connected.",
  },
  {
    id: "finance",
    status: "reserved",
    note: "Finance signals will feed attention and priority when connected.",
  },
  {
    id: "business-development",
    status: "reserved",
    note: "Pipeline momentum will feed businessMomentum when connected.",
  },
  {
    id: "crm",
    status: "reserved",
    note: "CRM relationship state will enrich activeClients when connected.",
  },
  {
    id: "notifications",
    status: "reserved",
    note: "Notification Center may contribute attention without replacing Activity.",
  },
  {
    id: "scheduling",
    status: "reserved",
    note: "Phase 25B domain foundation exists (lib/scheduling). Context summary remains inactive until calendar connection.",
  },
];
