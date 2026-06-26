import type { ReactNode } from "react";
import { kxdOsCn } from "./utils";

export type KxdBadgeVariant =
  | "default"
  | "health"
  | "tier"
  | "status"
  | "priority"
  | "pending"
  | "revenue"
  | "opportunity"
  | "critical"
  | "warning"
  | "success";

const VARIANT_CLASS: Record<KxdBadgeVariant, string> = {
  default: "",
  health: "kxd-os-badge--health",
  tier: "kxd-os-badge--tier",
  status: "kxd-os-badge--status",
  priority: "kxd-os-badge--priority",
  pending: "kxd-os-badge--pending",
  revenue: "kxd-os-badge--revenue",
  opportunity: "kxd-os-badge--opportunity",
  critical: "kxd-os-badge--critical",
  warning: "kxd-os-badge--warning",
  success: "kxd-os-badge--success",
};

export function KxdBadge({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: KxdBadgeVariant;
  className?: string;
}) {
  return (
    <span className={kxdOsCn("kxd-os-badge", VARIANT_CLASS[variant], className)}>
      {children}
    </span>
  );
}
