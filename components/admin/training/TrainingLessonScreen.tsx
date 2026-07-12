"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { TRAINING_HOME, trainingPathHref } from "@/lib/training/constants";
import type { TrainingLessonView } from "@/lib/training/types";
import { TrainingIntelligencePanel } from "./TrainingIntelligencePanel";
import { TrainingShell } from "./TrainingShell";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="kxd-os-training__lesson-section">
      <h2 className="kxd-os-training__section-title">{title}</h2>
      {children}
    </section>
  );
}

function FrameList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="kxd-os-training__bullets">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function TrainingLessonScreen({ lesson }: { lesson: TrainingLessonView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState<string[]>(
    lesson.progress?.checklistCompletedIds ?? [],
  );
  const [status, setStatus] = useState(lesson.progress?.status ?? "not-started");
  const content = lesson.content;
  const ops = content.operations;

  const requiredIds = useMemo(
    () => content.checklist.filter((item) => item.required !== false).map((item) => item.id),
    [content.checklist],
  );

  const canComplete =
    requiredIds.length === 0 || requiredIds.every((id) => checked.includes(id));

  async function persistChecklist(next: string[]) {
    setChecked(next);
    setBusy(true);
    try {
      await fetch("/api/admin/training/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "checklist",
          pathSlug: lesson.pathSlug,
          lessonSlug: lesson.slug,
          checklistCompletedIds: next,
          checklistTotal: content.checklist.length || 1,
        }),
      });
      setStatus("in-progress");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function completeLesson() {
    if (!canComplete) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/training/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          pathSlug: lesson.pathSlug,
          lessonSlug: lesson.slug,
          checklistCompletedIds: checked,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setStatus("completed");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  function toggleItem(id: string) {
    const next = checked.includes(id) ? checked.filter((x) => x !== id) : [...checked, id];
    void persistChecklist(next);
  }

  return (
    <TrainingShell active="lesson">
      <p className="kxd-os-training__crumb">
        <Link href={TRAINING_HOME}>Operations</Link>
        <span aria-hidden> / </span>
        <Link href={trainingPathHref(lesson.pathSlug)}>{lesson.pathTitle}</Link>
        <span aria-hidden> / </span>
        <span>{lesson.title}</span>
      </p>

      <article className="kxd-os-training__lesson">
        <header className="kxd-os-training__hero">
          <p className="kxd-os-training__eyebrow">
            {lesson.estimatedMinutes} min · {status.replace("-", " ")}
          </p>
          <h1 className="kxd-os-training__headline">{lesson.title}</h1>
          <p className="kxd-os-training__lede">{lesson.summary}</p>
          <p className="kxd-os-training__objective">
            <strong>Objective.</strong> {lesson.objective}
          </p>
        </header>

        <Section title="Context">
          {content.body.split("\n\n").map((paragraph) => (
            <p key={paragraph.slice(0, 32)} className="kxd-os-training__prose">
              {paragraph}
            </p>
          ))}
        </Section>

        <div className="kxd-os-training__frame-grid">
          <Section title="What KXD OS already does">
            <FrameList items={ops.osAlreadyDoes} />
          </Section>
          <Section title="What your responsibility is">
            <FrameList items={ops.yourResponsibility} />
          </Section>
          <Section title="When to ask KXD Intelligence">
            <FrameList items={ops.askIntelligenceWhen} />
          </Section>
          <Section title="When to escalate to Matt">
            <FrameList items={ops.escalateWhen} />
          </Section>
        </div>

        {ops.successLooksLike.length > 0 ? (
          <Section title="What success looks like">
            <FrameList items={ops.successLooksLike} />
          </Section>
        ) : null}

        {content.walkthrough.length > 0 ? (
          <Section title="Guided walkthrough">
            <ol className="kxd-os-training__steps">
              {content.walkthrough.map((step) => (
                <li key={step.title}>
                  <p className="kxd-os-training__step-title">{step.title}</p>
                  <p className="kxd-os-training__prose">{step.detail}</p>
                  {step.href ? (
                    <Link href={step.href} className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm">
                      {step.actionLabel ?? "Open in KXD OS"}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ol>
          </Section>
        ) : null}

        {content.steps.length > 0 ? (
          <Section title="Procedures">
            <ol className="kxd-os-training__steps">
              {content.steps.map((step) => (
                <li key={step.title}>
                  <p className="kxd-os-training__step-title">{step.title}</p>
                  <p className="kxd-os-training__prose">{step.detail}</p>
                </li>
              ))}
            </ol>
          </Section>
        ) : null}

        {content.examples.length > 0 ? (
          <Section title="Real KXD examples">
            <FrameList items={content.examples} />
          </Section>
        ) : null}

        {content.commonMistakes.length > 0 ? (
          <Section title="Common mistakes">
            <FrameList items={content.commonMistakes} />
          </Section>
        ) : null}

        {content.bestPractices.length > 0 ? (
          <Section title="Best practices">
            <FrameList items={content.bestPractices} />
          </Section>
        ) : null}

        {content.resources.length > 0 ? (
          <Section title="Resources in KXD OS">
            <ul className="kxd-os-training__resources">
              {content.resources.map((resource) => (
                <li key={resource.label}>
                  {resource.href ? (
                    <Link href={resource.href}>{resource.label}</Link>
                  ) : (
                    <span>{resource.label}</span>
                  )}
                  {resource.note ? (
                    <span className="kxd-os-training__row-meta"> — {resource.note}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        <TrainingIntelligencePanel
          lesson={lesson}
          checklistCompletedIds={checked}
        />

        {content.operationalPractice ? (
          <Section title="Operational practice">
            <p className="kxd-os-training__prose">
              <strong>{content.operationalPractice.title}.</strong>{" "}
              {content.operationalPractice.summary}
            </p>
            <p className="kxd-os-training__placeholder">
              {content.practiceTaskPlaceholder ??
                "Supervised practice will launch from here in a future phase — architecture is ready."}
            </p>
            {content.operationalPractice.targetHref ? (
              <Link
                href={content.operationalPractice.targetHref}
                className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
              >
                Preview surface
              </Link>
            ) : null}
          </Section>
        ) : null}

        {content.checklist.length > 0 ? (
          <Section title="Completion checklist">
            <ul className="kxd-os-training__checklist">
              {content.checklist.map((item) => (
                <li key={item.id}>
                  <label className="kxd-os-training__check">
                    <input
                      type="checkbox"
                      checked={checked.includes(item.id)}
                      disabled={busy || status === "completed"}
                      onChange={() => toggleItem(item.id)}
                    />
                    <span>{item.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        <footer className="kxd-os-training__lesson-foot">
          {status === "completed" ? (
            <p className="kxd-os-training__complete-note">
              Complete. You can operate this with more confidence.
            </p>
          ) : (
            <button
              type="button"
              className="kxd-os-btn kxd-os-btn--primary"
              disabled={busy || !canComplete}
              onClick={() => void completeLesson()}
            >
              Mark complete
            </button>
          )}
          <Link href={trainingPathHref(lesson.pathSlug)} className="kxd-os-btn kxd-os-btn--ghost">
            Back to path
          </Link>
        </footer>
      </article>
    </TrainingShell>
  );
}
