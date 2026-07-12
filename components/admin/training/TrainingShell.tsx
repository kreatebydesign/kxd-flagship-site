import Link from "next/link";
import type { ReactNode } from "react";
import { KxdShell } from "@/components/os";
import { ExecutiveWorkspaceShell } from "@/components/admin/executive-workspace";
import { TRAINING_HOME } from "@/lib/training/constants";

export function TrainingShell({
  children,
  active = "home",
}: {
  children: ReactNode;
  active?: "home" | "path" | "lesson";
}) {
  return (
    <KxdShell className="kxd-os-shell--ritual">
      <ExecutiveWorkspaceShell workspaceId="training">
        <div className="kxd-os-training">
          <header className="kxd-os-training__header kxd-os-training__header--secondary">
            <nav className="kxd-os-training__nav" aria-label="Operations Experience">
              <Link
                href={TRAINING_HOME}
                className={active === "home" ? "kxd-os-training__nav-active" : undefined}
              >
                Paths
              </Link>
              <Link href="/admin/work">Work</Link>
              <Link href="/admin/operations/today">Today</Link>
            </nav>
            <Link href="/admin/operations/intelligence" className="kxd-os-training__exit">
              Full workspace
            </Link>
          </header>
          <main className="kxd-os-training__main">{children}</main>
        </div>
      </ExecutiveWorkspaceShell>
    </KxdShell>
  );
}
