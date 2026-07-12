import "server-only";

import { getCatalogLesson, getCatalogPath } from "@/lib/training/catalog";
import type { MentorCapabilityId } from "./capabilities";
import type { ChecklistCorrection, OperationsMentorContext } from "./types";

export function buildMentorContext(input: {
  pathSlug: string;
  lessonSlug: string;
  capability: MentorCapabilityId;
  learnerKey: string;
  learnerLabel: string;
  checklistCompletedIds?: string[];
  learnerNote?: string | null;
  progressStatus?: string | null;
}): OperationsMentorContext | null {
  const lesson = getCatalogLesson(input.pathSlug, input.lessonSlug);
  const path = getCatalogPath(input.pathSlug);
  if (!lesson || !path) return null;

  const ops = lesson.content.operations;
  const practice = lesson.content.operationalPractice;
  const firstWalkHref =
    lesson.content.walkthrough.find((step) => step.href)?.href ??
    lesson.content.resources.find((r) => r.href)?.href ??
    practice?.targetHref ??
    null;

  return {
    learnerKey: input.learnerKey,
    learnerLabel: input.learnerLabel,
    pathSlug: path.slug,
    pathTitle: path.title,
    lessonSlug: lesson.slug,
    lessonTitle: lesson.title,
    lessonSummary: lesson.summary,
    lessonObjective: lesson.objective,
    lessonBody: lesson.content.body,
    operationsFrame: {
      osAlreadyDoes: ops.osAlreadyDoes,
      yourResponsibility: ops.yourResponsibility,
      askIntelligenceWhen: ops.askIntelligenceWhen,
      escalateWhen: ops.escalateWhen,
      successLooksLike: ops.successLooksLike,
    },
    walkthrough: lesson.content.walkthrough.map((step) => ({
      title: step.title,
      detail: step.detail,
      href: step.href ?? null,
    })),
    examples: lesson.content.examples,
    commonMistakes: lesson.content.commonMistakes,
    bestPractices: lesson.content.bestPractices,
    checklist: lesson.content.checklist,
    checklistCompletedIds: input.checklistCompletedIds ?? [],
    progressStatus: input.progressStatus ?? null,
    relatedWorkspaceHref: firstWalkHref,
    practiceKind: practice?.kind ?? null,
    practiceTitle: practice?.title ?? null,
    learnerNote: input.learnerNote?.trim() || null,
    capability: input.capability,
  };
}

export function reviewChecklist(context: OperationsMentorContext): ChecklistCorrection {
  const required = context.checklist.filter((item) => item.required !== false);
  const missing = required.filter((item) => !context.checklistCompletedIds.includes(item.id));
  const readyToComplete = missing.length === 0;

  return {
    missingRequiredIds: missing.map((item) => item.id),
    missingLabels: missing.map((item) => item.label),
    completedCount: context.checklistCompletedIds.length,
    requiredCount: required.length,
    readyToComplete,
    guidance: readyToComplete
      ? "Required checklist items look complete. You may mark the lesson done when ready."
      : `Still open: ${missing.map((item) => item.label).join("; ")}.`,
  };
}

export function firstRelatedDestination(context: OperationsMentorContext): {
  href: string | null;
  label: string | null;
} {
  const step = context.walkthrough.find((row) => row.href);
  if (step?.href) {
    return { href: step.href, label: step.title };
  }
  if (context.relatedWorkspaceHref) {
    return { href: context.relatedWorkspaceHref, label: "Open related workspace" };
  }
  return { href: null, label: null };
}
