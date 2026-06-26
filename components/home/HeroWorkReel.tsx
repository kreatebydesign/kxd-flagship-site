"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { WORK_REEL_FRAMES } from "@/lib/homepage/work-reel";

const REEL_DOUBLED = [...WORK_REEL_FRAMES, ...WORK_REEL_FRAMES];

/**
 * Defers hero reel image requests until after first paint / idle time
 * so headline fonts and critical path stay unblocked on mobile.
 */
export function HeroWorkReel() {
  const [imagesReady, setImagesReady] = useState(false);

  useEffect(() => {
    const enable = () => setImagesReady(true);

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(enable, { timeout: 1800 });
      return () => window.cancelIdleCallback(id);
    }

    const timer = setTimeout(enable, 500);
    return () => clearTimeout(timer);
  }, []);

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
            {imagesReady ? (
              <Image
                src={frame.src}
                alt={frame.alt}
                fill
                className="object-cover"
                style={{ objectPosition: frame.objectPosition ?? "top center" }}
                sizes="240px"
                quality={75}
                loading="lazy"
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
