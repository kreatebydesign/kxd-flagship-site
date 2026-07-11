import Link from "next/link";
import type { ReactNode } from "react";
import { KxdOsLogo, KxdShell } from "@/components/os";
import { WorkComposerHost } from "@/components/admin/work/composer";
import type { RitualMode } from "@/lib/rituals";
import { RitualNav } from "./RitualNav";

export interface RitualShellProps {
  mode: RitualMode;
  children: ReactNode;
}

export function RitualShell({ mode, children }: RitualShellProps) {
  return (
    <KxdShell className="kxd-os-shell--ritual">
      <div className="kxd-os-ritual">
        <header className="kxd-os-ritual__header">
          <KxdOsLogo height={16} className="kxd-os-ritual__brand" />
          <RitualNav active={mode} />
          <Link href="/admin/operations/intelligence" className="kxd-os-ritual__exit">
            Full workspace
          </Link>
        </header>
        <main className="kxd-os-ritual__main">{children}</main>
      </div>
      <WorkComposerHost />
    </KxdShell>
  );
}
