import { cn } from "@/lib/utils";

type SectionDividerProps = {
  className?: string;
  variant?: "gold" | "white";
};

export function SectionDivider({ className, variant = "gold" }: SectionDividerProps) {
  return (
    <div
      aria-hidden
      className={cn(
        variant === "gold" ? "kxd-section-divider" : "kxd-section-divider-white",
        className,
      )}
    />
  );
}
