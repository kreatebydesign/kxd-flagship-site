/**
 * Next.js server entry — re-exports pure scoring used by intelligence and automation.
 */
import "server-only";
import { cache } from "react";
import { loadHealthContext as loadHealthContextUncached } from "./scoring";

export type { ClientHealthResult, HealthContext } from "./scoring";
export {
  calculateClientHealth,
  calculateEngagementHealth,
  calculateFinancialHealth,
  calculateInfrastructureHealth,
  calculateProjectHealth,
  calculateRelationshipHealth,
} from "./scoring";

/** Request-memoized — hub + intelligence must not pay the 10-collection scan twice. */
export const loadHealthContext = cache(loadHealthContextUncached);
