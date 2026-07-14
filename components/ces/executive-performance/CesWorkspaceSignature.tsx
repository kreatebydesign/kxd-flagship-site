/**
 * Shared Core signature footer for Executive Performance workplaces.
 * Presentational only — no client forks, no marketing CTAs.
 * Single intentional maker’s mark for the client operating system.
 */

export function CesWorkspaceSignature() {
  return (
    <footer className="kxd-ces-exec__signature" aria-label="KXD OS signature">
      <div className="kxd-ces-exec__signature-rule" aria-hidden="true" />
      <div className="kxd-ces-exec__signature-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="kxd-ces-exec__signature-mark"
          src="/migrated-assets/brand/kxd-logo-transparent.png"
          alt=""
          width={36}
          height={26}
        />
        <div className="kxd-ces-exec__signature-copy">
          <p className="kxd-ces-exec__signature-line">Powered by KXD OS</p>
          <p className="kxd-ces-exec__signature-line kxd-ces-exec__signature-line--quiet">
            Designed by Kreate by Design
          </p>
        </div>
      </div>
    </footer>
  );
}
