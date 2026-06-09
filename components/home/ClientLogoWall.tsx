import Image from "next/image";
import { CLIENT_LOGOS } from "@/lib/homepage";

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
                borderRight: "1px solid var(--kxd-border-white)",
                borderBottom: "1px solid var(--kxd-border-white)",
              }}
            >
              <Image
                src={logo.src}
                alt={logo.name}
                width={100}
                height={40}
                className="h-7 w-auto object-contain sm:h-8"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
