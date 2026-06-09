import { cn } from "@/lib/utils";

type AmbientLayerProps = {
  vignette?: boolean;
  glow?: boolean;
  grain?: boolean;
  className?: string;
};

/** Static atmosphere only — no animation, strict black/gold palette. */
export function AmbientLayer({
  vignette = false,
  glow = false,
  grain = false,
  className,
}: AmbientLayerProps) {
  return (
    <>
      {vignette ? <div aria-hidden className={cn("kxd-vignette", className)} /> : null}
      {glow ? <div aria-hidden className="kxd-gold-leak" /> : null}
      {grain ? <div aria-hidden className="kxd-grain" /> : null}
    </>
  );
}
