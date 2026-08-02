/**
 * Phase 6 Batch C0/C1 — KXD Connect public surface.
 *
 * Server-only modules (audit, bootstrap, metering/service, messaging/service)
 * must be imported directly from their files — they are not re-exported here.
 */

export type {
  ConnectAccessDecision,
  ConnectAccessDenyReason,
  ConnectActorKind,
  ConnectAuditEventType,
  ConnectConversationParticipantRecord,
  ConnectConversationRecord,
  ConnectConversationStatus,
  ConnectConversationType,
  ConnectMembershipRecord,
  ConnectMembershipRole,
  ConnectMembershipStatus,
  ConnectMessageRecord,
  ConnectMeterKey,
  ConnectMeterPeriodKind,
  ConnectOrganizationRecord,
  ConnectOrganizationStatus,
  ConnectParticipantStatus,
  ConnectSubjectKind,
} from "./types";

export {
  CONNECT_KXD_ORGANIZATION_KEY,
  CONNECT_MESSAGE_MAX_LENGTH,
  CONNECT_MESSAGE_PAGE_SIZE_DEFAULT,
  CONNECT_MESSAGE_PAGE_SIZE_MAX,
} from "./types";

export {
  evaluateConnectAccess,
  canMutateConnectMemberships,
  isConnectEditionFeatureActive,
  isConnectGrantedByClientEntitlement,
} from "./access";

export {
  getConnectOrganizationAllowlist,
  getConnectStaffDogfoodEmails,
  isConnectKillSwitchActive,
  isConnectOperatorEnablementOn,
  isOrganizationKeyAllowlisted,
  isStaffEmailInConnectDogfoodAllowlist,
} from "./config";

export {
  CONNECT_LOCAL_ACTIVATION_RELATIVE_PATH,
  CONNECT_LOCAL_ACTIVATION_VERSION,
  CONNECT_OPS_LOG_RELATIVE_PATH,
  buildConnectLocalActivationFromEnv,
  createDisabledConnectLocalActivationState,
  getConnectActivationSnapshot,
  getEffectiveConnectOrganizationAllowlist,
  getEffectiveConnectStaffAllowlist,
  isConnectEnvironmentAllowed,
  isConnectLocalActivationEnabled,
  isConnectProductionEnvironment,
  logConnectOpsEvent,
  readConnectLocalActivationState,
  writeConnectLocalActivationState,
} from "./activation";

export type {
  ConnectActivationSnapshot,
  ConnectLocalActivationState,
  ConnectOpsEventType,
} from "./activation";

export {
  connectMembershipIdentityKey,
  detectDuplicateConnectMembership,
  validateConnectMembershipDraft,
} from "./memberships";

export {
  assertNoCrossOrganizationLeak,
  filterOrganizationsForActor,
  isConnectOrganizationDiscoverableByUnauthorized,
  normalizeConnectOrganizationKey,
  projectConnectOrganizationPublicSafe,
} from "./organizations";

export {
  CONNECT_METER_DEFINITIONS,
  getConnectMeterDefinition,
  isConnectMeterKey,
} from "./metering/definitions";

export {
  connectDailyPeriodKey,
  connectMeterAggregateKey,
} from "./metering/period";

export {
  InMemoryConnectMeterStore,
  type ConnectMeterAggregate,
  type ConnectMeterIncrementResult,
  type ConnectMeterStore,
} from "./metering/store";

export {
  createConnectPublicId,
  isConnectPublicId,
  normalizeConnectPublicId,
} from "./ids";

export {
  validateConnectMessageContent,
  validateConnectGroupTitle,
} from "./messaging/content";

export {
  buildDirectConversationPairKey,
  isClientSuppliedPairKeyAllowed,
} from "./messaging/pair-key";

export {
  authorizeConnectMessaging,
  connectMessagingSafeError,
} from "./messaging/authorization";

export {
  clampConnectMessagePageSize,
  compareConnectMessageOrder,
  decodeConnectMessageCursor,
  encodeConnectMessageCursor,
  paginateConnectMessages,
} from "./messaging/pagination";

export {
  assertPrivateUnreadIsolation,
  derivePrivateUnreadState,
  resolveMarkReadCursor,
} from "./messaging/read-state";

export {
  InMemoryConnectMessagingStore,
  createTestMessagingActor,
} from "./messaging/store";
