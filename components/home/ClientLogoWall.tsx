import Image from "next/image";
import { CLIENT_LOGOS } from "@/lib/homepage";

/**
 * Height classes keyed by size tier.
 * Baseline (unset): h-7 / sm:h-8 → 28px / 32px
 */
const LOGO_SIZE_CLASSES: Record<string, string> = {
  md:    "h-[2.125rem] w-auto object-contain sm:h-10",
  lg:    "h-9 w-auto object-contain sm:h-[2.625rem]",
  xl:    "h-[2.375rem] w-auto object-contain sm:h-11",
  "2xl": "h-10 w-auto object-contain sm:h-12",
};
const LOGO_DEFAULT_CLASS = "h-7 w-auto object-contain sm:h-8";

export function ClientLogoWall() {
  return (
    <section
      className="kxd-section border-t"
      style={{
        background: "var(--kxd-black-deep)",
        borderColor: "var(--kxd-border-white)",
      }}
    >
      <div className="kxd-container">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="kxd-eyebrow">Selected Clients</p>
            <h2
              className="kxd-serif-title mt-4"
              style={{ fontSize: "clamp(1.375rem, 2.5vw, 1.875rem)", maxWidth: "26rem" }}
            >
              Brands that trusted KXD with their digital presence.
            </h2>
          </div>
        </div>

        {/* Divider */}
        <div className="kxd-gold-rule" />

        {/* Logo grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">
          {CLIENT_LOGOS.map((logo) => (
            <div
              key={logo.name}
              className="kxd-logo-item"
              style={{
                borderRight:  "1px solid var(--kxd-border-white)",
                borderBottom: "1px solid var(--kxd-border-white)",
                overflow: "hidden",
              }}
            >
              <Image
                src={logo.src}
                alt={logo.name}
                width={140}
                height={56}
                className={
                  logo.size
                    ? LOGO_SIZE_CLASSES[logo.size]
                    : LOGO_DEFAULT_CLASS
                }
                style={
                  logo.scale
                    ? { transform: `scale(${logo.scale})`, transformOrigin: "center" }
                    : undefined
                }
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
