import type { ReactNode } from "react";
import { kxdOsCn } from "./utils";

export function KxdCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={kxdOsCn("kxd-os-card", className)}>{children}</div>;
}
