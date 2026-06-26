export default function PortalAppLoading() {
  return (
    <div className="kxd-os-page kxd-os-page--ops">
      <div className="kxd-os-ops-hero">
        <p className="kxd-os-eyebrow">Client HQ</p>
        <h1 className="kxd-os-headline kxd-os-ops-hero__title">Loading</h1>
      </div>
      <div className="kxd-os-ops-kpi-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="kxd-os-card" style={{ minHeight: "5rem", opacity: 0.5 }} />
        ))}
      </div>
    </div>
  );
}
