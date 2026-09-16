"use client";

/**
 * Thin indeterminate route progress. Visible while any in-tree operator
 * link reports useLinkStatus pending. No fake percentages.
 */
export function OperationsRouteProgress() {
  return (
    <div className="kxd-os-route-progress" aria-hidden="true">
      <div className="kxd-os-route-progress__bar" />
    </div>
  );
}
