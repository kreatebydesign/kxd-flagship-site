import Link from "next/link";
import type { ReactNode } from "react";
import { KxdLogo } from "@/components/ui/KxdLogo";
import { KxdShell } from "@/components/os";
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
          <Link href="/admin/operations/intelligence" className="kxd-os-ritual__brand" aria-label="KXD OS">
            <KxdLogo height={16} />
          </Link>
          <RitualNav active={mode} />
          <Link href="/admin/operations/intelligence" className="kxd-os-ritual__exit">
            Full workspace
          </Link>
        </header>
        <main className="kxd-os-ritual__main">{children}</main>
      </div>
    </KxdShell>
  );
}
