"use client";

import { useEffect, useRef } from "react";

/**
 * HeroCursorGlow
 *
 * Ultra-subtle cursor-follow ambient glow for the hero section.
 * Gold at 4% opacity, 44rem diameter, large radial blur.
 *
 * Design intent: supports the headline without drawing the eye.
 * The user should feel warmth, not see a spotlight.
 *
 * Technique:
 *   - RAF loop with linear interpolation (lerp factor 0.04 ≈ 700ms effective lag)
 *   - translate3d for GPU compositing with no layout recalc
 *   - Hidden via CSS on touch devices and viewport < 1024px
 *   - Respects prefers-reduced-motion via CSS
 */
export function HeroCursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only activate on large pointer-capable screens
    const mq = window.matchMedia("(min-width: 1024px) and (hover: hover)");
    if (!mq.matches) return;

    // Start centered slightly above-left (near headline origin)
    let curX = window.innerWidth  * 0.30;
    let curY = window.innerHeight * 0.38;
    let tgtX = curX;
    let tgtY = curY;
    let rafId: number;

    function onMove(e: MouseEvent) {
      tgtX = e.clientX;
      tgtY = e.clientY;
    }

    function tick() {
      // lerp ≈ 0.04 → ~700ms effective lag at 60 fps
      curX += (tgtX - curX) * 0.04;
      curY += (tgtY - curY) * 0.04;
      if (ref.current) {
        ref.current.style.transform = `translate3d(${curX}px, ${curY}px, 0)`;
      }
      rafId = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return <div ref={ref} aria-hidden className="kxd-cursor-glow" />;
}
