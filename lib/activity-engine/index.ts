/**
 * Executive Activity Engine — public surface.
 *
 * Event backbone for KXD OS. Publishes to executive-timeline-events.
 * Does not replace Timeline UI or Notification Center.
 */

export type {
  ActivityLink,
  ExecutiveActivityCenterData,
  ExecutiveActivityEventType,
  ExecutiveActivityFilters,
  ExecutiveActivityImportance,
  ExecutiveActivityItem,
  ExecutiveActivitySourceModule,
  PublishActivityInput,
  PublishActivityResult,
} from "./types";

export {
  buildActivityDedupeKey,
  categoryForEventType,
  defaultImportanceForEventType,
  timelineStatusForActivity,
} from "./rules";

export {
  activityItemId,
  importanceLabel,
  parseActivityItemId,
  resolveActivityHref,
} from "./href";

export { publishActivity } from "./publish";

export {
  getExecutiveActivityCenter,
  getRecentExecutiveActivity,
  getUnreadExecutiveActivity,
  markActivityRead,
  markAllActivityRead,
  publishExecutiveActivity,
} from "./services";

export { ACTIVITY_CENTER_OPEN_EVENT, openActivityCenter } from "./events";
