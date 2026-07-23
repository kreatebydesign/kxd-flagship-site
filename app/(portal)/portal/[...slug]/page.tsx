import { notFound } from "next/navigation";

/**
 * Catch unmatched /portal/* paths so the portal not-found UI is used
 * instead of the framework default 404 page.
 * Explicit portal routes remain more specific and take precedence.
 */
export default function PortalUnmatchedPathPage() {
  notFound();
}
