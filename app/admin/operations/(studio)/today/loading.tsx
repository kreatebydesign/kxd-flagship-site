/**
 * Today arrival loading — restrained continuous handoff from login.
 * Experience Refinement Phase 2 Batch B.
 * No theatrical animation. Matches ritual shell. Reduced-motion safe.
 */
export default function TodayArrivalLoading() {
  return (
    <div
      className="kxd-os-shell kxd-os-shell--ritual kxd-today-arrival-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="kxd-today-arrival-loading__inner">
        <p className="kxd-today-arrival-loading__brand">KXD OS</p>
        <p className="kxd-today-arrival-loading__line">Entering your business…</p>
      </div>
    </div>
  );
}
