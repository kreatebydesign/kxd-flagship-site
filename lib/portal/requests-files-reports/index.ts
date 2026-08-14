/**
 * Phase 4 Batch G — Requests, files, reports, and approval decision.
 *
 * Product decision (locked):
 * “Client approvals” means only existing portal-safe Website Review and request
 * states where client review/feedback/input is required (e.g. awaiting your
 * input). No Approvals product, route, nav item, collection, or staff queue.
 *
 * This module provides pure authorization/shaping helpers for isolation
 * verification and proven-gap hardening of existing per-active-account surfaces.
 */

export type {
  BatchGClientHqSurfaceId,
  PortalAttachmentAccessDecision,
  PortalCesModuleApiAccessDecision,
  PortalReportViewModel,
} from "./types";

export {
  BATCH_G_CLIENT_HQ_SURFACE_IDS,
  PORTAL_ATTACHMENT_NOT_FOUND_MESSAGE,
  PORTAL_REPORT_INTERNAL_FIELD_DENYLIST,
} from "./types";

export {
  decidePortalAttachmentAccess,
  portalAttachmentAccessDenied,
} from "./attachment-access";

export {
  decidePortalCesModuleApiAccess,
} from "./ces-api-access";

export {
  portalReportViewModelHasInternalLeak,
  toPortalReportViewModel,
} from "./report-view";

export { buildPortalAuditDeliverableViewModel } from "./audit-deliverable";

export { isBatchGClientHqSurfaceAvailable } from "./surface-access";

export {
  decidePortalRelatedProjectAccess,
  type PortalRelatedProjectAccessDecision,
} from "./related-project";
