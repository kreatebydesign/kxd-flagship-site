import Link from "next/link";
import { HOMEPAGE_SERVICES } from "@/lib/homepage";

export function ServicesOverviewSection() {
  const primary = HOMEPAGE_SERVICES.find((item) => item.primary);
  const secondary = HOMEPAGE_SERVICES.filter((item) => !item.primary);

  return (
    <section className="relative border-t border-white/[0.06] py-24 lg:py-32">
      <div className="mx-auto max-w-[88rem] px-6 lg:px-10">
        <div className="max-w-2xl">
          <p className="kxd-label">Services</p>
          <span aria-hidden className="kxd-accent-line mt-6" />
          <h2 className="mt-8 font-serif text-[2.5rem] font-semibold leading-[1.04] tracking-[-0.035em] text-white lg:text-[3.25rem]">
            Luxury websites first.
            <br />
            <span className="text-white/65">Everything else follows.</span>
          </h2>
          <p className="mt-6 max-w-xl text-[1rem] leading-[1.78] text-white/58">
            Most clients begin with a website. As the relationship deepens, we build
            ecommerce, growth infrastructure, and operational platforms — without losing
            the clarity of the original brand.
          </p>
        </div>

        {primary ? (
          <article className="kxd-card mt-14 overflow-hidden lg:mt-16">
            <div className="grid lg:grid-cols-[1.2fr_1fr]">
              <div className="border-b border-white/[0.06] p-8 lg:border-b-0 lg:border-r lg:p-12">
                <p className="kxd-label">Primary entry point</p>
                <h3 className="mt-5 font-serif text-[2rem] font-semibold tracking-[-0.03em] text-white">
                  {primary.title}
                </h3>
                <p className="mt-4 max-w-lg text-[1rem] leading-[1.75] text-white/62">
                  {primary.creates}
                </p>
                <Link
                  href={`/services/${primary.slug}`}
                  className="mt-8 inline-flex text-[0.875rem] font-medium text-[var(--color-gold-accent)] transition hover:text-[var(--color-gold-400,#c9ad62)]"
                >
                  Explore luxury websites →
                </Link>
              </div>
              <div className="border-l border-[var(--color-border)] bg-[#070707] p-8 lg:p-12">
                <p className="kxd-label">Also available</p>
                <ul className="mt-6 space-y-5">
                  {secondary.map((service) => (
                    <li key={service.slug}>
                      <Link
                        href={`/services/${service.slug}`}
                        className="group block"
                      >
                        <p className="text-[1rem] font-medium text-white transition group-hover:text-white/90">
                          {service.title}
                        </p>
                        <p className="mt-1 text-[0.875rem] leading-[1.65] text-white/48">
                          {service.creates}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
