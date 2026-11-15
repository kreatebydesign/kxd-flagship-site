/** Harlow staff experience — shared constants (safe for offline verify scripts). */

export const HARLOW_DISPLAY_NAME = "Harlow";

/**
 * Douglas County planning baseline (Nov 2026). Not activated until owner confirms
 * the legally applicable rate and sets CONFIRM_HARLOW_LEGAL_HOURLY_RATE on provision.
 */
export const HARLOW_DOUGLAS_COUNTY_PLANNING_HOURLY_RATE_CENTS = 1455;

/** Planning baseline alias — do not treat as payroll authorization. */
export const HARLOW_PROPOSED_HOURLY_RATE_CENTS = HARLOW_DOUGLAS_COUNTY_PLANNING_HOURLY_RATE_CENTS;

export const HARLOW_DEFAULT_EMPLOYMENT_START = "2026-11-01";

export const CONFIRM_HARLOW_LEGAL_HOURLY_RATE_ENV = "CONFIRM_HARLOW_LEGAL_HOURLY_RATE";