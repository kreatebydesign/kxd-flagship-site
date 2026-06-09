import { cn } from "@/lib/utils";

type LuxuryBlackSurfaceProps = {
  children: React.ReactNode;
  className?: string;
  tone?: "deep" | "base" | "elevated";
  as?: "div" | "section";
};

const tones = {
  deep: "bg-[var(--kxd-black-deep)]",
  base: "bg-[var(--kxd-black-base)]",
  elevated: "bg-[var(--kxd-black-elevated)]",
};

export function LuxuryBlackSurface({
  children,
  className,
  tone = "base",
  as: Tag = "div",
}: LuxuryBlackSurfaceProps) {
  return (
    <Tag className={cn("relative", tones[tone], className)}>
      <div aria-hidden className="kxd-surface-radial pointer-events-none absolute inset-0" />
      {children}
    </Tag>
  );
}
