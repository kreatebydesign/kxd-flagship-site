export {
  getClientInsights,
  getExecutiveSummary,
  getFounderInsights,
  getGrowthOpportunities,
  getInfrastructureInsights,
  getInsights,
  getProjectInsights,
  getRecommendations,
  getRelationshipInsights,
  loadIntelligenceContext,
} from "./engine";

export { buildClientRecommendations, buildPortfolioRecommendations } from "./recommendations";
export { buildGrowthOpportunities } from "./opportunities";
export { generateInsights } from "./insights";
export { buildExecutiveSummary, buildRevenueSummary, buildClientInsightSections } from "./summaries";

export type {
  ClientInsights,
  ClientRiskSummary,
  ExecutiveSummary,
  FounderInsightsBundle,
  GrowthOpportunity,
  InfrastructureInsight,
  InsightSummarySection,
  IntelligenceContext,
  IntelligenceDoc,
  IntelligenceInsight,
  IntelligenceRecommendation,
  IntelligenceUrgency,
  IntelligenceConfidence,
  MeetingInsight,
  ProjectInsights,
  RelationshipInsights,
  RevenueSummary,
} from "./types";
