import Link from "next/link";
import type { RitualMode } from "@/lib/rituals";

const RITUALS: Array<{ mode: RitualMode; label: string; href: string }> = [
  { mode: "morning", label: "Brief", href: "/admin/operations/brief" },
  { mode: "focus", label: "Focus", href: "/admin/operations/focus" },
  { mode: "review", label: "Review", href: "/admin/operations/review" },
];

export function RitualNav({ active }: { active: RitualMode }) {
  return (
    <nav className="kxd-os-ritual__nav" aria-label="Daily rituals">
      {RITUALS.map((ritual) => (
        <Link
          key={ritual.mode}
          href={ritual.href}
          className={`kxd-os-ritual__nav-link${active === ritual.mode ? " kxd-os-ritual__nav-link--active" : ""}`}
          aria-current={active === ritual.mode ? "page" : undefined}
        >
          {ritual.label}
        </Link>
      ))}
    </nav>
  );
}
