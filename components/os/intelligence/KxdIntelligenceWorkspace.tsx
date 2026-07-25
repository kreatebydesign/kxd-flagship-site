"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { StaffGuidanceResponse } from "@/lib/staff/guidance";
import type { StaffGuidancePrompt, StaffPlanState, StaffPrimaryAction } from "@/lib/staff/types";
import { KxdButton } from "../KxdButton";
import { kxdOsCn } from "../utils";
import { KxdIntelligenceComposer } from "./KxdIntelligenceComposer";
import { KxdIntelligenceContext } from "./KxdIntelligenceContext";
import { KxdIntelligenceHeader } from "./KxdIntelligenceHeader";
import { useKxdIntelligenceOptional } from "./KxdIntelligenceProvider";
import { KxdIntelligenceTimeline } from "./KxdIntelligenceTimeline";

const DEFAULT_VISIBLE = ["walkthrough", "missing", "prepare-matt"] as const;

function rankPromptIds(planState?: StaffPlanState | null): string[] {
  switch (planState) {
    case "needs-information":
      return ["missing", "walkthrough", "prepare-matt", "context", "draft"];
    case "prepare-for-matt":
      return ["prepare-matt", "check", "missing", "walkthrough", "matt"];
    case "waiting-on-matt":
      return ["why-wait", "next", "matt", "wrap-up", "explain"];
    case "training-required":
      return ["walkthrough", "explain", "next", "missing", "why-first"];
    case "continue":
      return ["walkthrough", "check", "next", "missing", "prepare-matt"];
    case "ready-to-begin":
      return ["why-first", "walkthrough", "missing", "draft", "prepare-matt"];
    default:
      return [
        ...DEFAULT_VISIBLE,
        "why-first",
        "next",
        "check",
        "matt",
        "wrap-up",
        "explain",
        "context",
        "draft",
        "why-wait",
      ];
  }
}

function orderPrompts(
  prompts: StaffGuidancePrompt[],
  planState?: StaffPlanState | null,
  primaryAction?: StaffPrimaryAction | null,
): StaffGuidancePrompt[] {
  const rank = rankPromptIds(planState ?? primaryAction?.planState);
  const byId = new Map(prompts.map((prompt) => [prompt.id, prompt]));
  const ordered: StaffGuidancePrompt[] = [];
  for (const id of rank) {
    const prompt = byId.get(id);
    if (prompt) ordered.push(prompt);
  }
  for (const prompt of prompts) {
    if (!ordered.some((row) => row.id === prompt.id)) ordered.push(prompt);
  }
  return ordered;
}

export function KxdIntelligenceWorkspace() {
  const intel = useKxdIntelligenceOptional();
  const [mounted, setMounted] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Portal must mount only after hydration to avoid SSR/client tree mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client portal gate
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!intel?.open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        intel?.setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [intel]);

  useEffect(() => {
    if (!intel?.open) return;
    const node = timelineRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [
    intel?.open,
    intel?.session.helpRequests,
    intel?.session.sessionMessages,
    intel?.session.lastGuidance,
  ]);

  const orderedPrompts = useMemo(() => {
    if (!intel) return [];
    return orderPrompts(
      intel.session.guidancePrompts,
      intel.session.planState,
      intel.session.primaryAction,
    );
  }, [intel]);

  if (!mounted || !intel) return null;

  const { session, open, setOpen, requiresMattCount } = intel;
  const historyDense =
    session.helpRequests.length >= 1 ||
    session.sessionMessages.length > 0 ||
    Boolean(session.lastGuidance);
  const visiblePrompts = orderedPrompts.slice(0, 2);
  const overflowPrompts = orderedPrompts.slice(2);
  const primary = session.primaryAction;
  const startHref = primary?.href ?? session.recommendedActionHref;
  const caughtUp = primary?.label === "You are caught up";

  async function handleGuidance(promptId: string) {
    if (!intel || guidanceLoading) return;
    setGuidanceLoading(true);
    try {
      const res = await fetch("/api/admin/staff/guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptId,
          pagePath: session.pagePath,
          workId: session.workId,
        }),
      });
      const payload = (await res.json()) as {
        success?: boolean;
        guidance?: StaffGuidanceResponse;
        error?: string;
      };
      if (!res.ok || payload.success === false || !payload.guidance) {
        throw new Error(payload.error ?? "Could not load guidance.");
      }
      intel.setLastGuidance(payload.guidance);
      if (payload.guidance.involveMatt) {
        intel.setComposerMode("matt");
      }
    } catch {
      intel.setLastGuidance({
        conciseAnswer:
          "Guidance is temporarily unavailable. Use your safest next action from the plan.",
        recommendedNextStep: primary?.label ?? "Return to your daily plan",
        reason: "Deterministic fallback while guidance API is unavailable.",
        involveMatt: false,
        mattReason: null,
        mode: "deterministic",
        aiGenerated: false,
        evidence: [],
        warning: null,
      });
    } finally {
      setGuidanceLoading(false);
    }
  }

  const workspace = (
    <div
      className={kxdOsCn(
        "kxd-os-intel-workspace-root",
        open && "kxd-os-intel-workspace-root--open",
      )}
      hidden={!open}
    >
      <button
        type="button"
        className="kxd-os-intel-workspace__backdrop"
        aria-label="Close KXD Intelligence"
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
      />
      <div
        ref={panelRef}
        id="kxd-intelligence-workspace"
        className={kxdOsCn(
          "kxd-os-intel-workspace",
          historyDense && "kxd-os-intel-workspace--dense",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="KXD Intelligence"
        hidden={!open}
      >
        <KxdIntelligenceHeader
          contextLabel={session.contextLabel}
          historyOpen={session.historyOpen}
          onToggleHistory={() => intel.setHistoryOpen(!session.historyOpen)}
          onClose={() => setOpen(false)}
        />

        <KxdIntelligenceContext
          session={session}
          onClearWork={() =>
            intel.configure({
              workId: null,
              workTitle: null,
              clientLabel: null,
              contextKind:
                session.contextKind === "guided-work" ? "staff-home" : session.contextKind,
              contextLabel:
                session.contextKind === "guided-work" ? "Daily staff plan" : session.contextLabel,
            })
          }
        />

        <div ref={timelineRef} className="kxd-os-intel-workspace__scroll">
          {primary && startHref && !historyDense ? (
            <section
              className="kxd-os-intel-workspace__primary"
              aria-label="Primary recommendation"
            >
              <p className="kxd-os-intel-workspace__eyebrow">Recommended now</p>
              <p className="kxd-os-intel-workspace__primary-title">
                {caughtUp
                  ? "Wrap up when you’re ready — nothing urgent is waiting."
                  : primary.title?.trim() ||
                    session.recommendedActionLabel ||
                    primary.label}
              </p>
              {primary.reason ? (
                <p className="kxd-os-intel-workspace__primary-reason">{primary.reason}</p>
              ) : null}
              <Link
                href={startHref}
                className="kxd-os-btn kxd-os-btn--intelligence kxd-os-intel-workspace__cta"
                onClick={() => setOpen(false)}
              >
                {caughtUp ? "Open wrap-up" : "Help me start"}
              </Link>
            </section>
          ) : null}

          {primary && startHref && historyDense ? (
            <div className="kxd-os-intel-workspace__primary-compact">
              <Link
                href={startHref}
                className="kxd-os-intel-workspace__primary-link"
                onClick={() => setOpen(false)}
              >
                {caughtUp
                  ? "Open wrap-up"
                  : `Start: ${primary.title?.trim() || primary.label}`}
              </Link>
            </div>
          ) : null}

          <KxdIntelligenceTimeline
            helpRequests={session.helpRequests}
            sessionMessages={session.sessionMessages}
            lastGuidance={session.lastGuidance}
          />

          {session.historyOpen ? (
            <section className="kxd-os-intel-workspace__history" aria-label="Recent guidance">
              <p className="kxd-os-intel-workspace__eyebrow">Recent questions</p>
              {session.helpRequests.length === 0 ? (
                <p className="kxd-os-intel-workspace__empty">No recent guidance yet.</p>
              ) : (
                session.helpRequests.slice(0, 5).map((row) => (
                  <div key={row.id} className="kxd-os-intel-workspace__history-item">
                    <p className="kxd-os-intel-workspace__history-q">{row.question}</p>
                    <p className="kxd-os-intel-workspace__history-meta">
                      {new Date(row.createdAt).toLocaleString()}
                      {row.requiresMatt && !row.mattResponse ? " · Requires Matt" : ""}
                      {row.mattResponse ? " · Matt responded" : ""}
                    </p>
                  </div>
                ))
              )}
            </section>
          ) : null}
        </div>

        <div className="kxd-os-intel-workspace__dock">
          {orderedPrompts.length > 0 ? (
            <section
              className="kxd-os-intel-workspace__actions"
              aria-label="Guidance prompts"
            >
              <div className="kxd-os-intel-workspace__prompt-list">
                {visiblePrompts.map((prompt) => (
                  <KxdButton
                    key={prompt.id}
                    type="button"
                    variant="ghost"
                    disabled={guidanceLoading}
                    onClick={() => void handleGuidance(prompt.id)}
                    className="kxd-os-intel-workspace__prompt"
                  >
                    {prompt.label}
                  </KxdButton>
                ))}
              </div>
              {overflowPrompts.length > 0 ? (
                <div className="kxd-os-intel-workspace__more">
                  <KxdButton
                    type="button"
                    variant="ghost"
                    className="kxd-os-intel-workspace__more-toggle"
                    aria-expanded={moreOpen}
                    onClick={() => setMoreOpen((value) => !value)}
                  >
                    {moreOpen ? "Hide more" : "More guidance"}
                  </KxdButton>
                  {moreOpen ? (
                    <div className="kxd-os-intel-workspace__prompt-list">
                      {overflowPrompts.map((prompt) => (
                        <KxdButton
                          key={prompt.id}
                          type="button"
                          variant="ghost"
                          disabled={guidanceLoading}
                          onClick={() => void handleGuidance(prompt.id)}
                          className="kxd-os-intel-workspace__prompt"
                        >
                          {prompt.label}
                        </KxdButton>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          <KxdIntelligenceComposer
            pagePath={session.pagePath}
            workId={session.workId}
            canAct={session.canAct}
            isPreview={session.isPreview}
            mode={session.composerMode}
            onModeChange={intel.setComposerMode}
            requiresMattCount={requiresMattCount}
            onSubmitted={(request) => intel.upsertHelpRequest(request)}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(workspace, document.body);
}
