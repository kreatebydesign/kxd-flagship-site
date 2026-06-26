import "./rules";

export {
  createAutomationEvent,
  getAutomationDashboard,
  getFounderSignals,
  publishClientHealthUpdate,
  publishFounderSignal,
  publishNotification,
  publishTimelineEvent,
} from "./engine";

export { publishers } from "./publishers";
export { MODULE_REGISTRY } from "./registry";
export { getRegisteredRules, registerAutomationRule } from "./rules";
export { executeMatchingRules } from "./rule-runner";

export type {
  AutomationDashboardData,
  AutomationDoc,
  AutomationEventRecord,
  AutomationEventStatus,
  AutomationModule,
  AutomationRule,
  CreateAutomationEventInput,
  FounderSignalRecord,
  ModulePublisherInfo,
  NotificationSeverity,
  NotificationStatus,
  PublishClientHealthInput,
  PublishFounderSignalInput,
  PublishNotificationInput,
  PublishTimelineInput,
} from "./types";
