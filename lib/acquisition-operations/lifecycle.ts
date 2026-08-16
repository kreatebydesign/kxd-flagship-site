/**
 * Shared lifecycle dimension terminology.
 * Distinct domains may use different enums; these labels keep language coherent.
 */

export const OPERATIONAL_STATES = [
  "new",
  "acknowledged",
  "in_progress",
  "closed",
] as const;

export type OperationalState = (typeof OPERATIONAL_STATES)[number];

export const VERIFICATION_STATES = [
  "unverified",
  "verified",
  "rejected",
  "spam",
  "duplicate",
] as const;

export type VerificationState = (typeof VERIFICATION_STATES)[number];

export const QUALIFICATION_STATES = [
  "unreviewed",
  "qualified",
  "unqualified",
] as const;

export type QualificationState = (typeof QUALIFICATION_STATES)[number];

export const OUTCOME_STATES = [
  "open",
  "won",
  "lost",
  "no_response",
  "not_applicable",
] as const;

export type OutcomeState = (typeof OUTCOME_STATES)[number];
