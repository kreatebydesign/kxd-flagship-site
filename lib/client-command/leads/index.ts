/**
 * Client Command — Lead Command (Primal Phase 1, Build 1).
 * Portal-facing lead inbox built on the Managed Client Lead Operations (MCI)
 * ledger. `client-inquiries` stays the single system of record — this module
 * is a presentation + access lens, not a competing CRM.
 */

export * from "./types";
export * from "./presentation";
export * from "./attention";
export * from "./access";
export * from "./owners";
export * from "./load";
export * from "./apply-stage";
export * from "./update";
export * from "./overview";
