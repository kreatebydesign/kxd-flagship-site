/**
 * Shared Core signature footer for Executive Performance workplaces.
 * Presentational only — no client forks, no marketing CTAs.
 * Single intentional maker’s mark for the client operating system.
 *
 * Colors / field match canonical brand SVG at `public/media/brand/kxd-logo.svg`
 * (gold wordmark on deep field). Geometry is cropped for signature scale so
 * the mark stays legible; the microscopic SVG descriptor is omitted at this size.
 * Inlined so the signature cannot break from static-asset deploy gaps
 * (CLI `.vercelignore` historically excluded `*.png` brand marks).
 */

function KxdSignatureMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 56"
      width={80}
      height={28}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="160" height="56" rx="2" fill="#080808" />
      <line
        x1="18"
        y1="12"
        x2="142"
        y2="12"
        stroke="#C5A65C"
        strokeWidth="0.75"
        opacity="0.45"
      />
      <text
        x="80"
        y="36"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="22"
        fontWeight="400"
        letterSpacing="6"
        textAnchor="middle"
        fill="#C5A65C"
      >
        KXD
      </text>
      <line
        x1="18"
        y1="44"
        x2="142"
        y2="44"
        stroke="#C5A65C"
        strokeWidth="0.75"
        opacity="0.45"
      />
    </svg>
  );
}

export function CesWorkspaceSignature() {
  return (
    <footer className="kxd-ces-exec__signature" aria-label="Kreate by Design signature">
      <div className="kxd-ces-exec__signature-rule" aria-hidden="true" />
      <div className="kxd-ces-exec__signature-inner">
        <KxdSignatureMark className="kxd-ces-exec__signature-mark" />
        <div className="kxd-ces-exec__signature-copy">
          <p className="kxd-ces-exec__signature-line">Managed by</p>
          <p className="kxd-ces-exec__signature-name">Kreate by Design</p>
        </div>
      </div>
    </footer>
  );
}
