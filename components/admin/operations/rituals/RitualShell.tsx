import Link from "next/link";
import type { ReactNode } from "react";
import { KxdShell } from "@/components/os";
import { ExecutiveWorkspaceShell } from "@/components/admin/executive-workspace";
import type { RitualMode } from "@/lib/rituals";
import { RitualNav } from "./RitualNav";

export interface RitualShellProps {
  mode: RitualMode;
  children: ReactNode;
}

export function RitualShell({ mode, children }: RitualShellProps) {
  const workspaceId =
    mode === "morning" || mode === "planning"
      ? "brief"
      : mode === "focus"
        ? "focus"
        : "review";

  return (
    <KxdShell className="kxd-os-shell--ritual">
      <ExecutiveWorkspaceShell workspaceId={workspaceId}>
        <div className="kxd-os-ritual">
          <header className="kxd-os-ritual__header kxd-os-ritual__header--secondary">
            <RitualNav active={mode} />
            <Link href="/admin/operations/intelligence" className="kxd-os-ritual__exit">
              Full workspace
            </Link>
          </header>
          <main className="kxd-os-ritual__main">{children}</main>
        </div>
      </ExecutiveWorkspaceShell>
    </KxdShell>
  );
}
