"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  KXD_INTELLIGENCE_CAPABILITIES,
  defaultIntelligencePromptsForLesson,
} from "@/lib/training/intelligence";
import type { TrainingLessonView } from "@/lib/training/types";
import type { OperationsGuidanceResponse } from "@/lib/kxd-intelligence/operations-mentor/types";

/**
 * KXD Intelligence mentor — intentional help only.
 * No requests on mount. No chat bubbles. No avatar.
 */
export function TrainingIntelligencePanel({
  lesson,
  checklistCompletedIds = [],
}: {
  lesson: TrainingLessonView;
  checklistCompletedIds?: string[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guidance, setGuidance] = useState<OperationsGuidanceResponse | null>(null);
  const lastKeyRef = useRef<string | null>(null);
  const prompts = defaultIntelligencePromptsForLesson(lesson);
  const ops = lesson.content.operations;

  async function requestHelp(capability: string) {
    const clientRequestKey = `${capability}:${lesson.pathSlug}:${lesson.slug}:${checklistCompletedIds.slice().sort().join(",")}:${note.trim().slice(0, 80)}`;
    if (busy && lastKeyRef.current === clientRequestKey) return;

    lastKeyRef.current = clientRequestKey;
    setSelected(capability);
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/training/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capability,
          pathSlug: lesson.pathSlug,
          lessonSlug: lesson.slug,
          checklistCompletedIds,
          learnerNote: note.trim() || null,
          clientRequestKey,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setGuidance(null);
        setError(json.error ?? "Unable to load guidance.");
        return;
      }
      setGuidance(json.guidance as OperationsGuidanceResponse);
    } catch {
      setGuidance(null);
      setError("Unable to reach KXD Intelligence.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="kxd-os-training__intelligence" aria-label="KXD Intelligence">
      <h2 className="kxd-os-training__section-title">KXD Intelligence</h2>
      <p className="kxd-os-training__prose">
        Quiet operational guidance for this lesson. Ask only when you need help — nothing runs
        until you choose an action.
      </p>

      {ops.askIntelligenceWhen.length > 0 ? (
        <ul className="kxd-os-training__bullets">
          {ops.askIntelligenceWhen.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}

      <label className="kxd-os-training__intel-note">
        <span className="kxd-os-meta">Optional context</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={400}
          placeholder="What are you stuck on? Required for mistake recovery."
        />
      </label>

      <div className="kxd-os-training__intel-grid">
        {prompts.map((prompt) => (
          <button
            key={prompt.id}
            type="button"
            className={`kxd-os-training__intel-chip${selected === prompt.id ? " is-active" : ""}`}
            disabled={busy}
            onClick={() => void requestHelp(prompt.id)}
          >
            {prompt.label}
          </button>
        ))}
      </div>

      {busy ? (
        <p className="kxd-os-training__row-meta">Preparing guidance…</p>
      ) : null}

      {error ? <p className="kxd-os-training__intel-error">{error}</p> : null}

      {guidance ? (
        <div className="kxd-os-training__intel-panel" aria-live="polite">
          <p className="kxd-os-training__intel-answer">{guidance.conciseAnswer}</p>
          <p className="kxd-os-training__intel-step">
            <span className="kxd-os-meta">Next</span> {guidance.recommendedNextStep}
          </p>
          <p className="kxd-os-training__row-meta">
            {guidance.reason}
            {" · "}
            Confidence {guidance.confidence}
            {guidance.usage.cached ? " · cached" : ""}
          </p>

          {guidance.warning ? (
            <p className="kxd-os-training__intel-warning">{guidance.warning}</p>
          ) : null}

          {guidance.involveMatt ? (
            <p className="kxd-os-training__intel-escalate">
              Involve Matt
              {guidance.mattReason ? ` — ${guidance.mattReason}` : "."}
            </p>
          ) : null}

          {guidance.needsClarification && guidance.clarificationPrompt ? (
            <p className="kxd-os-training__intel-clarify">{guidance.clarificationPrompt}</p>
          ) : null}

          {guidance.checklistCorrection ? (
            <p className="kxd-os-training__row-meta">
              Checklist {guidance.checklistCorrection.completedCount}/
              {guidance.checklistCorrection.requiredCount}
              {guidance.checklistCorrection.readyToComplete
                ? " — ready to complete"
                : ` — ${guidance.checklistCorrection.guidance}`}
            </p>
          ) : null}

          {guidance.relatedHref ? (
            <p className="kxd-os-training__intel-link">
              <Link href={guidance.relatedHref}>
                {guidance.relatedLabel ?? "Open related workspace"}
              </Link>
            </p>
          ) : null}
        </div>
      ) : selected && !busy && !error ? (
        <div className="kxd-os-training__intel-panel">
          <p className="kxd-os-training__row-meta">
            {KXD_INTELLIGENCE_CAPABILITIES.find((c) => c.id === selected)?.description}
          </p>
        </div>
      ) : null}
    </section>
  );
}
