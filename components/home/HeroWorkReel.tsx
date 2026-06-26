import Image from "next/image";
import { WORK_REEL_FRAMES } from "@/lib/homepage/work-reel";

const REEL_DOUBLED = [...WORK_REEL_FRAMES, ...WORK_REEL_FRAMES];

/** Server-rendered reel — lazy/low-priority images; no client hydration cost. */
export function HeroWorkReel() {
  return (
    <div
      aria-hidden
      className="kxd-work-reel kxd-reveal kxd-reveal-delay-5 kxd-hero-reel-animate relative z-[1]"
    >
      <div className="kxd-work-reel__fade kxd-work-reel__fade--left" />
      <div className="kxd-work-reel__fade kxd-work-reel__fade--right" />

      <div className="kxd-reel-track kxd-work-reel__track">
        {REEL_DOUBLED.map((frame, i) => (
          <div key={`${frame.src}-${i}`} className="kxd-work-reel__frame">
            <Image
              src={frame.src}
              alt={frame.alt}
              fill
              className="object-cover"
              style={{ objectPosition: frame.objectPosition ?? "top center" }}
              sizes="240px"
              quality={70}
              loading="lazy"
              fetchPriority="low"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
