import type { CSSProperties, ReactNode } from "react";
import { kxdOsCn } from "./utils";

export type KxdSurfaceVariant = "default" | "panel" | "floating" | "raised" | "glass";

export function KxdSurface({
  children,
  variant = "default",
  className,
  style,
}: {
  children: ReactNode;
  variant?: KxdSurfaceVariant;
  className?: string;
  style?: CSSProperties;
}) {
  const variantClass =
    variant === "panel"
      ? "kxd-os-surface--panel"
      : variant === "floating"
        ? "kxd-os-surface--floating"
        : variant === "raised"
          ? "kxd-os-surface--raised"
          : variant === "glass"
            ? "kxd-os-surface--glass"
            : "";

  return (
    <div className={kxdOsCn("kxd-os-surface", variantClass, className)} style={style}>
      {children}
    </div>
  );
}
