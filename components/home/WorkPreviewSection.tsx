import Link from "next/link";

const featuredWork = [
  {
    client: "Primal Motorsports",
    industry: "Motorsports",
    type: "Luxury Website",
    href: "/work",
  },
  {
    client: "SBE",
    industry: "Hospitality",
    type: "Luxury Website",
    href: "/work",
  },
  {
    client: "Cusick Morgan",
    industry: "Motorsports",
    type: "Brand & Web",
    href: "/work",
  },
];

export function WorkPreviewSection() {
  return (
    <section className="relative border-t border-white/[0.06] py-24 lg:py-32">
      <div className="mx-auto max-w-[88rem] px-6 lg:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="kxd-label">Selected work</p>
            <span aria-hidden className="kxd-accent-line mt-6" />
            <h2 className="mt-8 font-serif text-[2.5rem] font-semibold leading-[1.04] tracking-[-0.035em] text-white lg:text-[3rem]">
              Proof over promises.
            </h2>
          </div>
          <Link
            href="/work"
            className="text-[0.875rem] font-medium text-white/60 transition hover:text-white"
          >
            View full portfolio →
          </Link>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {featuredWork.map((project, index) => (
            <Link
              key={project.client}
              href={project.href}
              className="kxd-card group block overflow-hidden"
            >
              <div className="aspect-[4/5] bg-[linear-gradient(180deg,rgb(12_36_71/0.8),rgb(3_11_24/0.95))] p-8">
                <p className="kxd-label">{String(index + 1).padStart(2, "0")}</p>
                <div className="mt-auto flex h-full flex-col justify-end">
                  <p className="text-[0.8125rem] uppercase tracking-[0.12em] text-white/42">
                    {project.industry}
                  </p>
                  <h3 className="mt-3 font-serif text-[1.75rem] font-semibold tracking-[-0.03em] text-white">
                    {project.client}
                  </h3>
                  <p className="mt-2 text-[0.875rem] text-white/50">{project.type}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
