import Link from "next/link";
import type { ReactNode } from "react";
import { KxdShell } from "@/components/os";
import { ExecutiveWorkspaceShell } from "@/components/admin/executive-workspace";
import { StaffSignOutButton } from "@/components/admin/operations/staff/StaffSignOutButton";
import { TRAINING_HOME } from "@/lib/training/constants";

export function TrainingShell({
  children,
  active = "home",
  variant = "full",
}: {
  children: ReactNode;
  active?: "home" | "path" | "lesson";
  /** Restricted staff chrome — no full workspace links. */
  variant?: "full" | "staff";
}) {
  const isStaff = variant === "staff";

  return (
    <KxdShell className="kxd-os-shell--ritual">
      <ExecutiveWorkspaceShell workspaceId="training">
        <div className="kxd-os-training">
          <header className="kxd-os-training__header kxd-os-training__header--secondary">
            <nav className="kxd-os-training__nav" aria-label="Operations Experience">
              {isStaff ? (
                <>
                  <Link href="/admin/operations/staff">Staff home</Link>
                  <Link
                    href={TRAINING_HOME}
                    className={active === "home" ? "kxd-os-training__nav-active" : undefined}
                  >
                    Training
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={TRAINING_HOME}
                    className={active === "home" ? "kxd-os-training__nav-active" : undefined}
                  >
                    Paths
                  </Link>
                  <Link href="/admin/work">Work</Link>
                  <Link href="/admin/operations/today">Today</Link>
                </>
              )}
            </nav>
            <div className="kxd-os-training__header-actions">
              {isStaff ? (
                <StaffSignOutButton />
              ) : (
                <Link href="/admin/operations/intelligence" className="kxd-os-training__exit">
                  Full workspace
                </Link>
              )}
            </div>
          </header>
          <main className="kxd-os-training__main">{children}</main>
        </div>
      </ExecutiveWorkspaceShell>
    </KxdShell>
  );
}
