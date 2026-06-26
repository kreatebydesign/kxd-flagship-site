import type { ReactNode } from "react";
import { kxdOsCn } from "./utils";

export function KxdShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={kxdOsCn("kxd-os-shell", className)}>{children}</div>;
}
