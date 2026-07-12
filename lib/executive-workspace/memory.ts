import type {
  ExecutiveWorkspaceId,
  WorkspaceMemoryState,
  WorkspaceRecentItem,
} from "./types";
import { EXECUTIVE_WORKSPACE_STORAGE_PREFIX } from "./constants";

function storageKey(workspaceId: ExecutiveWorkspaceId): string {
  return `${EXECUTIVE_WORKSPACE_STORAGE_PREFIX}:${workspaceId}`;
}

function emptyMemory(workspaceId: ExecutiveWorkspaceId): WorkspaceMemoryState {
  return {
    workspaceId,
    filters: {},
    scrollY: 0,
    expandedPanels: [],
    selectedTabs: {},
    recentlyViewed: [],
    updatedAt: new Date().toISOString(),
  };
}

function safeParse(raw: string | null): WorkspaceMemoryState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WorkspaceMemoryState;
    if (!parsed || typeof parsed !== "object" || !parsed.workspaceId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function loadWorkspaceMemory(
  workspaceId: ExecutiveWorkspaceId,
): WorkspaceMemoryState {
  if (typeof window === "undefined") return emptyMemory(workspaceId);
  const stored = safeParse(window.localStorage.getItem(storageKey(workspaceId)));
  if (!stored) return emptyMemory(workspaceId);
  return {
    ...emptyMemory(workspaceId),
    ...stored,
    workspaceId,
    recentlyViewed: Array.isArray(stored.recentlyViewed) ? stored.recentlyViewed : [],
    filters: stored.filters && typeof stored.filters === "object" ? stored.filters : {},
    expandedPanels: Array.isArray(stored.expandedPanels) ? stored.expandedPanels : [],
    selectedTabs:
      stored.selectedTabs && typeof stored.selectedTabs === "object"
        ? stored.selectedTabs
        : {},
  };
}

export function saveWorkspaceMemory(state: WorkspaceMemoryState): void {
  if (typeof window === "undefined") return;
  const next: WorkspaceMemoryState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(storageKey(state.workspaceId), JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

export function recordWorkspaceRecentView(input: {
  workspaceId: ExecutiveWorkspaceId;
  href: string;
  title: string;
}): WorkspaceMemoryState {
  const current = loadWorkspaceMemory(input.workspaceId);
  const item: WorkspaceRecentItem = {
    href: input.href,
    title: input.title,
    workspaceId: input.workspaceId,
    at: new Date().toISOString(),
  };
  const recentlyViewed = [
    item,
    ...current.recentlyViewed.filter((row) => row.href !== input.href),
  ].slice(0, 20);
  const next = { ...current, recentlyViewed };
  saveWorkspaceMemory(next);
  return next;
}

export function patchWorkspaceMemory(
  workspaceId: ExecutiveWorkspaceId,
  patch: Partial<
    Pick<
      WorkspaceMemoryState,
      "filters" | "scrollY" | "expandedPanels" | "selectedTabs"
    >
  >,
): WorkspaceMemoryState {
  const current = loadWorkspaceMemory(workspaceId);
  const next = { ...current, ...patch };
  saveWorkspaceMemory(next);
  return next;
}

export function restoreWorkspaceScroll(workspaceId: ExecutiveWorkspaceId): void {
  if (typeof window === "undefined") return;
  const memory = loadWorkspaceMemory(workspaceId);
  if (memory.scrollY > 0) {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: memory.scrollY, behavior: "instant" as ScrollBehavior });
    });
  }
}
