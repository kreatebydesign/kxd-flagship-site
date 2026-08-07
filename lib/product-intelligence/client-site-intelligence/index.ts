/**
 * Client Site Intelligence — Product Intelligence pack.
 *
 * Decision authorized. csi-v1-a ingest foundation implemented locally.
 * Overall V1 incomplete — not shipped / not production-proven.
 */

export {
  CSI_IDS,
  CSI_RECORDED_AT,
  CSI_REVIEW_AT,
  CSI_V1A_RECORDED_AT,
  OTP_CARTS_LEAD_ATTRIBUTION_SHA,
  OTP_CARTS_PRODUCTION_URL,
} from "./ids";

export {
  CLIENT_SITE_INTELLIGENCE_IMPLEMENTATION_BATCHES,
  CLIENT_SITE_INTELLIGENCE_PI_VERDICT,
  CLIENT_SITE_INTELLIGENCE_PRE_BUILD_GATE,
  CLIENT_SITE_INTELLIGENCE_V1_SCOPE,
  MAJOR_CAPABILITY_PI_GATE,
} from "./architecture";

export {
  CLIENT_SITE_INTELLIGENCE_EVIDENCE,
  CLIENT_SITE_INTELLIGENCE_EVIDENCE_IDS,
} from "./evidence";

export {
  attachClientSiteIntelligenceMemory,
  loadClientSiteIntelligenceMemory,
  type ClientSiteIntelligenceMemoryPack,
} from "./memory";
