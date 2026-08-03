/**
 * Decision Archive — public surface (P0-D).
 */

export { loadDecisionArchive } from "./load";
export type { DecisionArchiveResult } from "./load";
export { verifyDecisionArchiveIntegrity } from "./integrity";
export type { DecisionArchiveIntegrityReport } from "./integrity";
export { EDITION_1_DECISIONS, EDITION_1_DECISION_IDS } from "./decisions";
export { EDITION_1_PRODUCT_DNA, PRODUCT_DNA_OBJECT_ID } from "./product-dna-seed";
export { EDITION_1_DOCTRINE, DOCTRINE_OBJECT_ID } from "./doctrine-seed";
