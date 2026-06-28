import Link from "next/link";
import type { QuickAction } from "@/lib/quick-actions";

export function QuickActionButton({
  action,
  compact,
}: {
  action: QuickAction;
  compact?: boolean;
}) {
  return (
    <Link
      href={action.href}
      className={`kxd-os-ops-quick-cell${compact ? " kxd-os-ops-quick-cell--compact" : ""}`}
    >
      <p className="kxd-os-ops-quick-cell__label">{action.label}</p>
      <p className="kxd-os-ops-quick-cell__sub">{action.sub}</p>
    </Link>
  );
}
