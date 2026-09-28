export type {
  LeadershipReportDocument,
  LeadershipReportPeriodKind,
  LeadershipScoreStatus,
  LeadershipStatusItem,
  LeadershipQueryPosition,
  LeadershipRemediationItem,
  LeadershipKeywordExample,
  LeadershipPlanPhase,
} from "./types";

export type {
  LeadershipProgressReportDocument,
  LeadershipProgressScorecardItem,
  LeadershipProgressQueryRow,
  LeadershipProgressMovementKind,
} from "./progress-types";

export {
  PRIMAL_LEADERSHIP_REPORT,
  PRIMAL_LEADERSHIP_REPORT_ID,
} from "./primal-september-2026";

export {
  PRIMAL_LEADERSHIP_PROGRESS_UPDATE,
  PRIMAL_LEADERSHIP_PROGRESS_UPDATE_ID,
} from "./primal-september-2026-performance-update";

export {
  PRIMAL_LEADERSHIP_REPORT_CATALOG,
  PRIMAL_LATEST_LEADERSHIP_REPORT_ID,
  listPrimalLeadershipReports,
  getLatestPrimalLeadershipReportEntry,
  getPrimalLeadershipReportEntryById,
  resolvePrimalLeadershipReportEntry,
  getLatestPrimalLeadershipReportHref,
  type PrimalLeadershipReportEntry,
  type PrimalLeadershipReportKind,
} from "./registry";

export {
  canAccessPrimalLeadershipReport,
  getPrimalLeadershipReportForClient,
  getPrimalLeadershipReportEntryForClient,
  getLatestPrimalProgressReportForClient,
  getPrimalLeadershipReportEntryByIdForClient,
  isPrimalLeadershipReportClient,
  PRIMAL_LEADERSHIP_REPORT_HREF,
} from "./access";

export {
  listCuratedPrimalLeadershipReportItems,
  type CuratedLeadershipReportListItem,
} from "./portal-archive";

/* Period resolution lives in ./primal-reporting-period and must be imported
 * directly — it depends on server-only reporting persistence. */
