"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  isStudioPersistentChromeRoute,
  resolveClientIdFromPathname,
  resolveOperationsNavIdFromPathname,
  resolveStudioShowQuickActions,
} from "@/lib/admin/operations-nav-active";
import {
  OperationsChromeContext,
  type OperationsChromeState,
} from "./OperationsChromeContext";
import { OperationsShellFrame } from "./OperationsShell";

function defaultChromeState(pathname: string): OperationsChromeState {
  return {
    activeId: resolveOperationsNavIdFromPathname(pathname),
    clientId: resolveClientIdFromPathname(pathname),
    variant: "full",
    showQuickActions: resolveStudioShowQuickActions(pathname),
  };
}

export function StudioOperationsChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const persistent = isStudioPersistentChromeRoute(pathname);
  const routeDefaults = useMemo(() => defaultChromeState(pathname), [pathname]);

  const [state, setState] = useState<OperationsChromeState>(routeDefaults);

  useEffect(() => {
    setState(routeDefaults);
  }, [routeDefaults]);

  const patch = useCallback((partial: Partial<OperationsChromeState>) => {
    setState((current) => ({ ...current, ...partial }));
  }, []);

  const contextValue = useMemo(
    () => ({ mode: persistent ? ("layout" as const) : ("page" as const), patch }),
    [persistent, patch],
  );

  return (
    <OperationsChromeContext.Provider value={contextValue}>
      {persistent ? (
        <OperationsShellFrame {...state}>{children}</OperationsShellFrame>
      ) : (
        children
      )}
    </OperationsChromeContext.Provider>
  );
}