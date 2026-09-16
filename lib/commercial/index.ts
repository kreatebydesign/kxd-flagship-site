/**
 * Mission 003B — Commercial Truth + Money Moves foundation.
 */
export type {
  CommercialCategory,
  CommercialTotals,
  HostingAutoChargeMode,
  HostingCommercialAuthority,
  HostingRenewalLifecycle,
  MoneyMoveItem,
  MoneyMoveKind,
  MoneyMoveState,
  PricingClassification,
  SalesMemoryItem,
  SalesMemoryKind,
} from "./types";

export {
  COMMERCIAL_CATEGORIES,
  HOSTING_AUTO_CHARGE_MODES,
  HOSTING_RENEWAL_LIFECYCLE,
  MONEY_MOVE_STATES,
  PRICING_CLASSIFICATIONS,
} from "./types";

export {
  buildCommercialMarker,
  parseCommercialMarkers,
  upsertMarkerInNotes,
  COMMERCIAL_MARKER_PREFIX,
} from "./markers";

export {
  classifyCommercialRelationship,
  parsePricingClassification,
  pricingClassificationFromNotes,
} from "./classification";

export {
  buildHostingCommercialAuthority,
  deriveRenewalLifecycle,
  extractHostingFromContractPackage,
} from "./hosting-authority";

export { loadMoneyMovesSnapshot } from "./money-moves";
export type { MoneyMovesSnapshot } from "./money-moves";

export { loadSalesMemory } from "./sales-memory";
