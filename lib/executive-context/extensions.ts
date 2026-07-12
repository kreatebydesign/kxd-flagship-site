/**
 * Future module extension points — reserved only.
 */

import type { ExecutiveExtensionSlot } from "./types";

export const EXECUTIVE_CONTEXT_EXTENSIONS: ExecutiveExtensionSlot[] = [
  {
    id: "calendar",
    status: "active",
    note: "Phase 27B — day observation feeds Executive Today brief locally. Not promoted into global Signal scoring yet.",
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
    status: "active",
    note: "Phase 27B — WorkScheduleLinks correlate into Executive Today day flow and recovery attention.",
  },
];
