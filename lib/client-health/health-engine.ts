/**
 * Next.js server entry — re-exports pure scoring used by intelligence and automation.
 */
import "server-only";

export type { ClientHealthResult, HealthContext } from "./scoring";
export {
  calculateClientHealth,
  calculateEngagementHealth,
  calculateFinancialHealth,
  calculateInfrastructureHealth,
  calculateProjectHealth,
  calculateRelationshipHealth,
  loadHealthContext,
} from "./scoring";
