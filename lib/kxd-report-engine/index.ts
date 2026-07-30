/**
 * KXD Report Engine — reusable presentation foundations for client deliverables.
 *
 * Purpose
 * -------
 * Provide brand tokens, official logo resolution, contact formatting, score
 * display helpers, and metadata formatting shared across future report types
 * (monthly performance, SEO, Ads, launch, strategy, quarterly, project completion,
 * commercial summaries).
 *
 * Boundary
 * --------
 * - Shared here: visual system + brand identity + print-safe primitives.
 * - Not shared here: audit findings, scoring math, report sections, narrative
 *   language, or any other report-type domain model.
 * - Website Audit Report remains the first consumer. Other report migrations
 *   are intentionally out of scope until each type adopts these primitives.
 */

export * from "./tokens.ts";
export * from "./contact.ts";
export * from "./logos.ts";
export * from "./format.ts";
export * from "./score-display.ts";
export * from "./section.ts";
