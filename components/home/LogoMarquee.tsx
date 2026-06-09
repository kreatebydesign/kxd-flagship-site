"use client";

import Image from "next/image";
import { CLIENT_LOGOS } from "@/lib/homepage";

type LogoItem = (typeof CLIENT_LOGOS)[number];

const ROW_A: LogoItem[] = [...CLIENT_LOGOS.slice(0, Math.ceil(CLIENT_LOGOS.length / 2))];
const ROW_B: LogoItem[] = [...CLIENT_LOGOS.slice(Math.ceil(CLIENT_LOGOS.length / 2))];

function LogoRow({
  logos,
  direction = "left",
}: {
  logos: LogoItem[];
  direction?: "left" | "right";
}) {
  const items = [...logos, ...logos];

  return (
    <div
      className={
        direction === "left" ? "kxd-logo-marquee kxd-logo-marquee--left" : "kxd-logo-marquee kxd-logo-marquee--right"
      }
    >
      <div className="kxd-logo-marquee__track">
        {items.map((logo, i) => (
          <div key={`${logo.name}-${i}`} className="kxd-logo-marquee__item">
            <Image
              src={logo.src}
              alt={logo.name}
              width={120}
              height={40}
              className="h-6 w-auto max-w-[6.5rem] object-contain lg:h-7 lg:max-w-[7.5rem]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LogoMarquee() {
  return (
    <div className="kxd-logo-fade-edges relative mt-16 overflow-hidden py-4">
      <LogoRow logos={ROW_A} direction="left" />
      <LogoRow logos={ROW_B} direction="right" />
    </div>
  );
}
