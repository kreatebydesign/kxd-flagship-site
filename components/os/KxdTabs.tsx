import Link from "next/link";
import { kxdOsCn } from "./utils";

export type KxdTabItem = {
  id: string;
  label: string;
  href?: string;
};

export function KxdTabs({
  items,
  activeId,
  onChange,
  className,
}: {
  items: KxdTabItem[];
  activeId: string;
  onChange?: (id: string) => void;
  className?: string;
}) {
  return (
    <nav className={kxdOsCn("kxd-os-tabs", className)} aria-label="Tabs">
      {items.map((item) => {
        const isActive = item.id === activeId;
        const tabClass = kxdOsCn("kxd-os-tab", isActive && "kxd-os-tab--active");

        if (item.href) {
          return (
            <Link
              key={item.id}
              href={item.href}
              className={tabClass}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            className={tabClass}
            aria-selected={isActive}
            onClick={() => onChange?.(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
