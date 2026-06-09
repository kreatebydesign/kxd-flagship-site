import Link from "next/link";

export function PlatformCapabilitySection() {
  return (
    <section className="relative border-t border-white/[0.06] py-24 lg:py-32">
      <div className="mx-auto max-w-[88rem] px-6 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="kxd-label">Platforms</p>
            <span aria-hidden className="kxd-accent-line mt-6" />
            <h2 className="mt-8 font-serif text-[2.25rem] font-semibold leading-[1.06] tracking-[-0.03em] text-white lg:text-[2.75rem]">
              When the website is only the beginning.
            </h2>
          </div>

          <div className="space-y-8">
            <p className="text-[1rem] leading-[1.78] text-white/58">
              KXD builds membership platforms, client portals, operational dashboards, and
              enterprise systems — always in service of the brand, never as standalone
              software products.
            </p>

            <ul className="grid gap-4 sm:grid-cols-2">
              {[
                "Membership platforms",
                "Client dashboards",
                "Operational systems",
                "Enterprise environments",
              ].map((item) => (
                <li
                  key={item}
                  className="rounded-[0.875rem] border border-white/[0.08] bg-white/[0.03] px-5 py-4 text-[0.9375rem] text-white/72"
                >
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/platforms"
              className="inline-flex text-[0.875rem] font-medium text-[var(--color-gold-accent)] transition hover:text-[var(--color-gold-400,#c9ad62)]"
            >
              Learn about platform work →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
