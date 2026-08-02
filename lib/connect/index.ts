/**
 * Phase 6 Batch C0 — KXD Connect foundation public surface.
 *
 * Server-only modules (audit, bootstrap, metering/service) must be imported
 * directly from their files — they are not re-exported here.
 */

export type {
  ConnectAccessDecision,
  ConnectAccessDenyReason,
  ConnectActorKind,
  ConnectAuditEventType,
  ConnectMembershipRecord,
  ConnectMembershipRole,
  ConnectMembershipStatus,
  ConnectMeterKey,
  ConnectMeterPeriodKind,
  ConnectOrganizationRecord,
  ConnectOrganizationStatus,
  ConnectSubjectKind,
} from "./types";

export { CONNECT_KXD_ORGANIZATION_KEY } from "./types";

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
