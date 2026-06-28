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
