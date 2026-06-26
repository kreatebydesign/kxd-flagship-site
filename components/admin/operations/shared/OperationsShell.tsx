import type { ReactNode } from "react";
import { KxdLogo } from "@/components/ui/KxdLogo";
import { KxdHeader, KxdShell, KxdTabs } from "@/components/os";
import { NAV_ITEMS, type OperationsNavId } from "./operations-nav";

export interface OperationsShellProps {
  activeId: OperationsNavId;
  dateDisplay?: string;
  children: ReactNode;
}

export function OperationsShell({ activeId, dateDisplay, children }: OperationsShellProps) {
  return (
    <KxdShell>
      <KxdHeader className="kxd-os-header--ops">
        <div className="kxd-os-header__bar">
          <KxdLogo height={22} />
          {dateDisplay ? <time className="kxd-os-meta">{dateDisplay}</time> : null}
        </div>
        <KxdTabs items={[...NAV_ITEMS]} activeId={activeId} />
      </KxdHeader>
      {children}
    </KxdShell>
  );
}
