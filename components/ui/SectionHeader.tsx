import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  label: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeader({
  label,
  title,
  description,
  align = "left",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      <p className="kxd-eyebrow">{label}</p>
      <h2 className="kxd-serif-title mt-5 text-[clamp(1.875rem,3.5vw,2.75rem)]">
        {title}
      </h2>
      {description ? (
        <p className="kxd-body mt-5 max-w-2xl">{description}</p>
      ) : null}
    </div>
  );
}
