export type {
  UpgradeRequestStatus,
  UpgradeEligibilityReason,
  EntitlementSnapshot,
  ClientUpgradeRequestRecord,
  PortalUpgradeRequestView,
  UpgradeCapabilityCard,
  CreateUpgradeRequestInput,
  UpdateUpgradeRequestStatusInput,
} from "./types";

export {
  ACTIVE_UPGRADE_REQUEST_STATUSES,
  UPGRADE_REQUEST_STATUSES,
} from "./types";

export {
  CLIENT_UPGRADE_ELIGIBLE_CAPABILITIES,
  isClientUpgradeEligibleModule,
  getUpgradeEligibleCapability,
  listUpgradeEligibleCapabilities,
} from "./catalog";

export {
  isUpgradeRequestStatus,
  isActiveUpgradeStatus,
  canTransitionUpgradeStatus,
  canClientCancelUpgradeStatus,
  evaluateUpgradeEligibility,
  upgradeStatusLabel,
  allowedNextUpgradeStatuses,
} from "./rules";

export { isUniqueConstraintError } from "./errors";

export {
  UpgradeRequestError,
  toPortalUpgradeRequestView,
  findActiveUpgradeRequest,
  canRequestClientUpgrade,
  listUpgradeCapabilityCards,
  createClientUpgradeRequest,
  listClientUpgradeRequests,
  getClientUpgradeRequest,
  listAdminUpgradeRequests,
  updateClientUpgradeRequestStatus,
  cancelClientUpgradeRequest,
} from "./service";
