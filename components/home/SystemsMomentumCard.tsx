import Link from "next/link";
import Image from "next/image";
import type { WorkVisual } from "@/lib/homepage/work-visuals";

/**
 * Equal-weight systems showcase card — image + footer metadata.
 * Matches ProjectCard border language for visual consistency.
 */
export function SystemsMomentumCard({ visual }: { visual: WorkVisual }) {
  const imageBlock = (
    <div className="relative aspect-[16/10] overflow-hidden">
      <Image
        src={visual.src}
        alt={visual.alt}
        fill
        loading="lazy"
        sizes="(max-width: 768px) 100vw, 33vw"
        className="object-cover transition-transform duration-[800ms] ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:scale-[1.02]"
        style={{ objectPosition: visual.objectPosition ?? "top" }}
      />
      <div className="kxd-editorial-frame__shade" aria-hidden />
    </div>
  );

  return (
    <article className="kxd-systems-momentum-card group flex h-full flex-col">
      {visual.href ? (
        <Link href={visual.href} className="block" aria-label={visual.alt}>
          {imageBlock}
        </Link>
      ) : (
        imageBlock
      )}
      <div
        className="flex flex-1 flex-col justify-center px-5 py-4"
        style={{ borderTop: "1px solid var(--kxd-border-white)" }}
      >
        {visual.role ? (
          <p
            className="font-sans text-[0.5625rem] font-medium uppercase tracking-[0.16em]"
            style={{ color: "var(--kxd-gold)" }}
          >
            {visual.role}
          </p>
        ) : null}
        {visual.label ? (
          <p
            className="mt-1.5 font-serif font-light leading-tight"
            style={{
              fontSize: "clamp(0.9375rem, 1.2vw, 1.0625rem)",
              letterSpacing: "0.01em",
              color: "var(--kxd-cream)",
            }}
          >
            {visual.label}
          </p>
        ) : null}
      </div>
    </article>
  );
}
