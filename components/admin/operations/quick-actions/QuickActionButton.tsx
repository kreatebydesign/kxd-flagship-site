import Link from "next/link";
import type { QuickAction } from "@/lib/quick-actions";

function isExternalHref(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://");
}

export function QuickActionButton({
  action,
  compact,
}: {
  action: QuickAction;
  compact?: boolean;
}) {
  const className = `kxd-os-ops-quick-cell${compact ? " kxd-os-ops-quick-cell--compact" : ""}`;

  if (isExternalHref(action.href)) {
    return (
      <a
        href={action.href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
      >
        <p className="kxd-os-ops-quick-cell__label">{action.label}</p>
        <p className="kxd-os-ops-quick-cell__sub">{action.sub}</p>
      </a>
    );
  }

  return (
    <Link href={action.href} className={className}>
      <p className="kxd-os-ops-quick-cell__label">{action.label}</p>
      <p className="kxd-os-ops-quick-cell__sub">{action.sub}</p>
    </Link>
  );
}
