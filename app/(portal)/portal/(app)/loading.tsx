export default function PortalAppLoading() {
  return (
    <div className="kxd-ces-page kxd-ces-page--loading" aria-busy="true" aria-live="polite">
      <div className="kxd-ces-loading-shimmer">
        <div className="kxd-ces-loading-shimmer__eyebrow" />
        <div className="kxd-ces-loading-shimmer__title" />
        <div className="kxd-ces-loading-shimmer__lead" />
      </div>
      <p className="kxd-ces-loading-hint">Opening your workspace…</p>
    </div>
  );
}
