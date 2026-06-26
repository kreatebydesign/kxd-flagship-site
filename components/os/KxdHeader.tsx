import type { ReactNode } from "react";
import { kxdOsCn } from "./utils";

export function KxdHeader({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <header className={kxdOsCn("kxd-os-header", className)}>
      <div className={kxdOsCn("kxd-os-header__inner", innerClassName)}>{children}</div>
    </header>
  );
}
