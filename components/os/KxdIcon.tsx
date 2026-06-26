import type { ReactNode, SVGAttributes } from "react";
import { kxdOsCn } from "./utils";

export type KxdIconSize = "xs" | "sm" | "md" | "lg";

export function KxdIcon({
  size = "md",
  className,
  children,
  ...props
}: SVGAttributes<SVGElement> & {
  size?: KxdIconSize;
  children?: ReactNode;
}) {
  const sizeClass =
    size === "xs"
      ? "kxd-os-icon--xs"
      : size === "sm"
        ? "kxd-os-icon--sm"
        : size === "lg"
          ? "kxd-os-icon--lg"
          : "kxd-os-icon--md";

  return (
    <svg
      className={kxdOsCn("kxd-os-icon", sizeClass, className)}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}
