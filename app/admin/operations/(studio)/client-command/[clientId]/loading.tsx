export default function ClientCommandLoading() {
  return (
    <div className="kxd-os-page-loading" role="status" aria-live="polite" aria-busy="true">
      <p className="kxd-os-page-loading__brand">KXD OS</p>
      <p className="kxd-os-page-loading__line">Opening client workspace…</p>
    </div>
  );
}