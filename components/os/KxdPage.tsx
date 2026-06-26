import type { ReactNode } from "react";
import { kxdOsCn } from "./utils";

export function KxdPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <main className={kxdOsCn("kxd-os-page", className)}>{children}</main>;
}
