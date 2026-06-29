export type {
  AutomationSection,
  ClientCommandCenterData,
  CommandHero,
  CommandListItem,
  CommandQuickAction,
  CommandRecommendation,
  CommandSections,
  CreativeSection,
  ProjectsSection,
  RelationshipSection,
  ReportingSection,
  RevenueSection,
  SalesSection,
  WebsiteSection,
} from "./types";

export { buildQuickActions } from "./actions";
export { buildExecutiveBrief, estimateImpact } from "./summary";
export { loadClientCommandCenter } from "./engine";
export { loadClientCommandHub } from "./hub";
export { loadClientWorkspaceBundle } from "./workspace-data";
export {
  COMMAND_WORKSPACE_TABS,
  commandWorkspaceHref,
  isCommandWorkspaceTabId,
} from "./tabs";
export type { CommandWorkspaceTabId } from "./tabs";
export type {
  ClientWorkspaceBundle,
  CommandHubClientRow,
  WorkspaceTimelineEvent,
} from "./workspace-types";

export {
  publishClientActivity,
  backfillClientActivity,
  loadClientActivityTimeline,
} from "./activity";

export {
  loadClientCommunications,
  createClientCommunication,
  publishCommunicationActivity,
} from "./communications";

export { buildClientMemory, loadClientMemoryFromBundle } from "./memory";
export type { ClientMemorySnapshot } from "./memory";

export {
  loadClientActions,
  createClientAction,
  syncIntelligenceActions,
} from "./actions/data";
export { loadClientPrioritiesWidget } from "./actions/dashboard";
export type { WorkspaceActionsSnapshot, ClientPrioritiesWidget } from "./actions/types";
