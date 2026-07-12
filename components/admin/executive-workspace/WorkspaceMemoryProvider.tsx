"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  loadWorkspaceMemory,
  patchWorkspaceMemory,
  recordWorkspaceRecentView,
  resolveWorkspaceIdFromPath,
  restoreWorkspaceScroll,
  type ExecutiveWorkspaceId,
  type WorkspaceMemoryState,
} from "@/lib/executive-workspace";

interface WorkspaceMemoryContextValue {
  workspaceId: ExecutiveWorkspaceId;
  memory: WorkspaceMemoryState;
  setFilter: (key: string, value: unknown) => void;
  setTab: (panel: string, tab: string) => void;
  togglePanel: (panelId: string) => void;
  rememberView: (href: string, title: string) => void;
}

const WorkspaceMemoryContext = createContext<WorkspaceMemoryContextValue | null>(null);

export function useWorkspaceMemory(): WorkspaceMemoryContextValue {
  const ctx = useContext(WorkspaceMemoryContext);
  if (!ctx) {
    throw new Error("useWorkspaceMemory requires WorkspaceMemoryProvider");
  }
  return ctx;
}

export function useWorkspaceMemoryOptional(): WorkspaceMemoryContextValue | null {
  return useContext(WorkspaceMemoryContext);
}

export function WorkspaceMemoryProvider({
  workspaceId: workspaceIdProp,
  children,
}: {
  workspaceId?: ExecutiveWorkspaceId;
  children: ReactNode;
}) {
  const pathname = usePathname() || "/admin/operations";
  const workspaceId = workspaceIdProp ?? resolveWorkspaceIdFromPath(pathname);
  const [memory, setMemory] = useState<WorkspaceMemoryState>(() =>
    loadWorkspaceMemory(workspaceId),
  );

  useEffect(() => {
    setMemory(loadWorkspaceMemory(workspaceId));
    restoreWorkspaceScroll(workspaceId);
  }, [workspaceId]);

  useEffect(() => {
    function onScroll() {
      patchWorkspaceMemory(workspaceId, { scrollY: window.scrollY });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [workspaceId]);

  useEffect(() => {
    const title =
      typeof document !== "undefined" ? document.title.replace(/^KXD OS ·\s*/i, "") : pathname;
    recordWorkspaceRecentView({ workspaceId, href: pathname, title });
  }, [pathname, workspaceId]);

  const setFilter = useCallback(
    (key: string, value: unknown) => {
      setMemory((prev) => {
        const next = patchWorkspaceMemory(workspaceId, {
          filters: { ...prev.filters, [key]: value },
        });
        return next;
      });
    },
    [workspaceId],
  );

  const setTab = useCallback(
    (panel: string, tab: string) => {
      setMemory((prev) =>
        patchWorkspaceMemory(workspaceId, {
          selectedTabs: { ...prev.selectedTabs, [panel]: tab },
        }),
      );
    },
    [workspaceId],
  );

  const togglePanel = useCallback(
    (panelId: string) => {
      setMemory((prev) => {
        const expanded = prev.expandedPanels.includes(panelId)
          ? prev.expandedPanels.filter((id) => id !== panelId)
          : [...prev.expandedPanels, panelId];
        return patchWorkspaceMemory(workspaceId, { expandedPanels: expanded });
      });
    },
    [workspaceId],
  );

  const rememberView = useCallback(
    (href: string, title: string) => {
      setMemory(recordWorkspaceRecentView({ workspaceId, href, title }));
    },
    [workspaceId],
  );

  const value = useMemo(
    () => ({
      workspaceId,
      memory,
      setFilter,
      setTab,
      togglePanel,
      rememberView,
    }),
    [workspaceId, memory, setFilter, setTab, togglePanel, rememberView],
  );

  return (
    <WorkspaceMemoryContext.Provider value={value}>{children}</WorkspaceMemoryContext.Provider>
  );
}
