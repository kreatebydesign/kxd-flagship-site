export type { QuickAction, QuickActionId, QuickActionCommandMatch } from "./types";

export {
  proposalHref,
  executiveNoteHref,
  reportHref,
  playbookHref,
  websiteAuditHref,
  clientCommandCenterHref,
  clientHqHref,
  timelineHref,
  infrastructureHref,
  clientSuccessHref,
  successCheckInHref,
  resolveQuickActionHref,
} from "./routes";

export { resolveClientIdFromPathname, matchClientFromQuery } from "./client-context";

export {
  getGlobalQuickActions,
  getClientQuickActions,
  matchQuickActionCommand,
} from "./actions";
