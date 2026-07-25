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
import { STAFF_GUIDANCE_PROMPTS } from "@/lib/staff/guidance";
import type {
  KxdIntelligenceComposerMode,
  KxdIntelligenceContextValue,
  KxdIntelligenceSessionConfig,
  KxdIntelligenceSessionState,
  KxdIntelligenceTimelineItem,
} from "./types";
import type { StaffGuidanceResponse } from "@/lib/staff/guidance";
import type { StaffHelpRequestView } from "@/lib/staff/types";

const IntelligenceContext = createContext<KxdIntelligenceContextValue | null>(null);

function inferContextKind(pathname: string): KxdIntelligenceSessionState["contextKind"] {
  if (pathname.includes("/admin/operations/staff/work/")) return "guided-work";
  if (pathname.includes("/admin/operations/staff")) return "staff-home";
  if (pathname.includes("/admin/training")) return "training";
  if (
    pathname.includes("/admin/operations/today") ||
    pathname.includes("/admin/operations/focus") ||
    pathname.includes("/admin/operations/review") ||
    pathname.includes("/admin/operations/brief")
  ) {
    return "executive";
  }
  if (pathname.includes("/admin/work")) return "work";
  if (pathname.includes("/admin/operations")) return "operations";
  return "generic";
}

function inferContextLabel(
  kind: KxdIntelligenceSessionState["contextKind"],
  pathname: string,
): string {
  switch (kind) {
    case "staff-home":
      return "Daily staff plan";
    case "guided-work":
      return "Guided work";
    case "training":
      return "Training";
    case "executive":
      return "Executive";
    case "work":
      return "Work Engine";
    case "operations":
      return "Operations";
    default:
      return pathname.startsWith("/admin") ? "KXD OS" : "Current page";
  }
}

function createDefaultSession(pathname: string): KxdIntelligenceSessionState {
  const contextKind = inferContextKind(pathname);
  return {
    pagePath: pathname || "/admin/operations",
    contextLabel: inferContextLabel(contextKind, pathname),
    contextKind,
    workId: null,
    clientLabel: null,
    workTitle: null,
    helpRequests: [],
    guidancePrompts: STAFF_GUIDANCE_PROMPTS,
    primaryAction: null,
    planState: null,
    canAct: true,
    isPreview: false,
    observation: null,
    recommendedActionLabel: null,
    recommendedActionHref: null,
    lastGuidance: null,
    sessionMessages: [],
    composerMode: "intelligence",
    historyOpen: false,
  };
}

function mergeSession(
  prev: KxdIntelligenceSessionState,
  patch: KxdIntelligenceSessionConfig,
  pathname: string,
): KxdIntelligenceSessionState {
  const pagePath = patch.pagePath ?? prev.pagePath ?? pathname;
  const contextKind = patch.contextKind ?? prev.contextKind ?? inferContextKind(pagePath);
  return {
    ...prev,
    pagePath,
    contextKind,
    contextLabel:
      patch.contextLabel ??
      prev.contextLabel ??
      inferContextLabel(contextKind, pagePath),
    workId: patch.workId !== undefined ? patch.workId : prev.workId,
    clientLabel: patch.clientLabel !== undefined ? patch.clientLabel : prev.clientLabel,
    workTitle: patch.workTitle !== undefined ? patch.workTitle : prev.workTitle,
    helpRequests: patch.helpRequests ?? prev.helpRequests,
    guidancePrompts: patch.guidancePrompts ?? prev.guidancePrompts,
    primaryAction:
      patch.primaryAction !== undefined ? patch.primaryAction : prev.primaryAction,
    planState: patch.planState !== undefined ? patch.planState : prev.planState,
    canAct: patch.canAct ?? prev.canAct,
    isPreview: patch.isPreview ?? prev.isPreview,
    observation: patch.observation !== undefined ? patch.observation : prev.observation,
    recommendedActionLabel:
      patch.recommendedActionLabel !== undefined
        ? patch.recommendedActionLabel
        : prev.recommendedActionLabel,
    recommendedActionHref:
      patch.recommendedActionHref !== undefined
        ? patch.recommendedActionHref
        : prev.recommendedActionHref,
  };
}

export function KxdIntelligenceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/admin/operations";
  const [open, setOpenState] = useState(false);
  const [session, setSession] = useState<KxdIntelligenceSessionState>(() =>
    createDefaultSession(pathname),
  );

  const resolvedSession = useMemo(() => {
    if (session.pagePath === pathname) return session;
    const kind = inferContextKind(pathname);
    return {
      ...session,
      pagePath: pathname,
      contextKind: kind,
      contextLabel: inferContextLabel(kind, pathname),
      workId: kind === "guided-work" ? session.workId : null,
    };
  }, [session, pathname]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey) return;
      if (event.key.toLowerCase() !== "i") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      setOpenState((value) => !value);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
  }, []);

  const toggle = useCallback(() => {
    setOpenState((value) => !value);
  }, []);

  const configure = useCallback(
    (patch: KxdIntelligenceSessionConfig) => {
      setSession((prev) => mergeSession(prev, patch, pathname));
    },
    [pathname],
  );

  const openWith = useCallback(
    (patch?: KxdIntelligenceSessionConfig) => {
      if (patch) {
        setSession((prev) => mergeSession(prev, patch, pathname));
      }
      setOpenState(true);
    },
    [pathname],
  );

  const setComposerMode = useCallback((mode: KxdIntelligenceComposerMode) => {
    setSession((prev) => ({ ...prev, composerMode: mode }));
  }, []);

  const setLastGuidance = useCallback((guidance: StaffGuidanceResponse | null) => {
    setSession((prev) => ({ ...prev, lastGuidance: guidance }));
  }, []);

  const appendSessionMessage = useCallback((item: KxdIntelligenceTimelineItem) => {
    setSession((prev) => ({
      ...prev,
      sessionMessages: [...prev.sessionMessages, item],
    }));
  }, []);

  const upsertHelpRequest = useCallback((request: StaffHelpRequestView) => {
    setSession((prev) => {
      const rest = prev.helpRequests.filter((row) => row.id !== request.id);
      return { ...prev, helpRequests: [request, ...rest] };
    });
  }, []);

  const setHistoryOpen = useCallback((historyOpen: boolean) => {
    setSession((prev) => ({ ...prev, historyOpen }));
  }, []);

  const requiresMattCount = useMemo(
    () =>
      resolvedSession.helpRequests.filter(
        (row) => row.requiresMatt && !row.mattResponse && row.status !== "resolved",
      ).length,
    [resolvedSession.helpRequests],
  );

  const value = useMemo<KxdIntelligenceContextValue>(
    () => ({
      open,
      setOpen,
      toggle,
      session: resolvedSession,
      configure,
      openWith,
      setComposerMode,
      setLastGuidance,
      appendSessionMessage,
      upsertHelpRequest,
      setHistoryOpen,
      requiresMattCount,
      hasAttention: requiresMattCount > 0,
    }),
    [
      open,
      setOpen,
      toggle,
      resolvedSession,
      configure,
      openWith,
      setComposerMode,
      setLastGuidance,
      appendSessionMessage,
      upsertHelpRequest,
      setHistoryOpen,
      requiresMattCount,
    ],
  );

  return (
    <IntelligenceContext.Provider value={value}>{children}</IntelligenceContext.Provider>
  );
}

export function useKxdIntelligence(): KxdIntelligenceContextValue {
  const ctx = useContext(IntelligenceContext);
  if (!ctx) {
    throw new Error("useKxdIntelligence must be used within KxdIntelligenceProvider");
  }
  return ctx;
}

export function useKxdIntelligenceOptional(): KxdIntelligenceContextValue | null {
  return useContext(IntelligenceContext);
}
