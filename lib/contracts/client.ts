/**
 * Client-safe exports for contracts.
 */
export type { ContractEventType, ContractMergeContext, ContractStatus, ContractType } from "./types";

export {
  CONTRACT_EVENT_TYPES,
  CONTRACT_STATUSES,
} from "./types";

export {
  CONTRACT_STATUS_LABELS,
  UNSIGNED_CONTRACT_STATUSES,
  displayContractStatus,
  isUnsignedContract,
  statusToContractEvent,
} from "./lifecycle";

export {
  applyContractMergeFields,
  buildContractMergeContext,
  formatPricingSummary,
  proposalTypeToContractType,
} from "./templates";
