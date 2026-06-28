export type {
  ClientSuccessDashboardData,
  ClientSuccessDetailData,
  ClientSuccessListItem,
  ClientSuccessMonthActivity,
  ClientSuccessSummary,
  CheckInListItem,
  SatisfactionLevel,
  NpsSurveyPlaceholder,
  ClientFeedbackFormPlaceholder,
  RenewalForecastPlaceholder,
  CustomerLifetimeValuePlaceholder,
  ReferralTrackingPlaceholder,
  AccountHealthTrendPlaceholder,
} from "./types";

export { SATISFACTION_LABELS } from "./types";

export {
  getClientSuccessDashboard,
  getClientSuccessDetail,
  getClientSuccessSummary,
  getClientSuccessActivityForMonth,
  getClientSuccessFounderSignals,
} from "./engine";

export {
  recordHealthDropTask,
  publishQuarterlyReviewDue,
  publishHighSatisfactionOpportunity,
  publishStaleMeetingAlert,
} from "./automation";

export { searchClientSuccessPlans, searchSuccessCheckIns } from "./search";
