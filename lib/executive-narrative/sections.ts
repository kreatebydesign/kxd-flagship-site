import {
  ATTENTION_INTRO,
  CHANGE_INTRO,
  CLOSING_TEMPLATES,
  NARRATIVE_SECTION_TITLES,
  OPENING_TEMPLATES,
  STABILITY_INTRO,
  joinNatural,
  joinSentences,
  pluralize,
} from "./templates";
import { brainPosturePhrase, postureToOpeningKey } from "./tone";
import type { ExecutiveNarrativeInput, NarrativeSection, NarrativeTone } from "./types";

function section(
  id: string,
  title: string,
  sentences: string[],
): NarrativeSection {
  const filtered = sentences.filter(Boolean);
  const paragraphs =
    filtered.length <= 2
      ? [joinSentences(filtered)]
      : [joinSentences(filtered.slice(0, 2)), joinSentences(filtered.slice(2))].filter(
          (p) => p.length > 0,
        );

  return {
    id,
    title,
    paragraphs,
    sentences: filtered,
  };
}

export function buildOpeningSection(input: ExecutiveNarrativeInput): NarrativeSection {
  const { brain, pulse } = input;
  const openingKey = postureToOpeningKey(pulse.posture.level);
  const sentences: string[] = [
    OPENING_TEMPLATES[openingKey],
    pulse.executiveDigest.headline,
    `The ${brainPosturePhrase(brain)} across ${pluralize(brain.observationCount, "observation")}.`,
  ];

  if (brain.summary.positiveSignalCount > 0 && pulse.posture.level !== "critical") {
    sentences.push("Execution momentum is also part of the current picture.");
  }

  return section("narrative-opening", NARRATIVE_SECTION_TITLES.opening, sentences);
}

export function buildBusinessStateSection(input: ExecutiveNarrativeInput): NarrativeSection {
  const { brain, pulse } = input;
  const sentences: string[] = [brain.summary.headline, brain.summary.narrative];

  if (brain.summary.dominantThemes.length > 0) {
    sentences.push(
      `Dominant themes right now: ${joinNatural(brain.summary.dominantThemes)}.`,
    );
  }

  sentences.push(
    `Executive posture is ${pulse.posture.label.toLowerCase()} — ${pulse.posture.description}`,
  );

  if (brain.signals.length > 0) {
    const topSignals = brain.signals
      .filter((s) => s.severity !== "positive")
      .slice(0, 3)
      .map((s) => s.meaning);
    if (topSignals.length > 0) {
      sentences.push(joinNatural(topSignals) + ".");
    }
  }

  return section("narrative-business-state", NARRATIVE_SECTION_TITLES.businessState, sentences);
}

export function buildChangesSection(input: ExecutiveNarrativeInput): NarrativeSection {
  const { pulse } = input;
  const meaningful = pulse.changes.filter(
    (c) => c.direction !== "unchanged" && c.significance !== "low",
  );

  const intro =
    meaningful.length === 0
      ? CHANGE_INTRO.none
      : meaningful.length === 1
        ? CHANGE_INTRO.single
        : CHANGE_INTRO.multiple;

  const sentences: string[] = [intro];

  for (const change of meaningful.slice(0, 4)) {
    sentences.push(change.description);
  }

  if (meaningful.length === 0 && pulse.executiveDigest.topChanges.length > 0) {
    sentences.push(pulse.executiveDigest.topChanges[0]!);
  }

  return section("narrative-changes", NARRATIVE_SECTION_TITLES.changes, sentences);
}

export function buildAttentionSection(input: ExecutiveNarrativeInput): NarrativeSection {
  const { brain, pulse } = input;
  const attentionCount = brain.attention.length + pulse.watchlist.length;

  const intro =
    attentionCount === 0
      ? ATTENTION_INTRO.none
      : attentionCount <= 2
        ? ATTENTION_INTRO.some
        : ATTENTION_INTRO.several;

  const sentences: string[] = [intro];

  for (const item of brain.attention.slice(0, 3)) {
    sentences.push(`${item.title}. ${item.context}`);
  }

  for (const watch of pulse.watchlist.slice(0, 3)) {
    sentences.push(`${watch.label}. ${watch.context}`);
  }

  if (pulse.priorities.length > 0) {
    const topDomains = pulse.priorities.slice(0, 3).map((p) => p.label);
    sentences.push(
      `Executive attention domains in play: ${joinNatural(topDomains)}.`,
    );
  }

  return section("narrative-attention", NARRATIVE_SECTION_TITLES.attention, sentences);
}

export function buildStabilitySection(input: ExecutiveNarrativeInput): NarrativeSection {
  const { brain, pulse } = input;
  const stableCount = pulse.stableSignals.length;

  const intro =
    stableCount === 0
      ? STABILITY_INTRO.none
      : stableCount <= 2
        ? STABILITY_INTRO.some
        : STABILITY_INTRO.several;

  const sentences: string[] = [intro];

  for (const stable of pulse.stableSignals.slice(0, 4)) {
    sentences.push(stable.description);
  }

  const stablePatterns = brain.patterns.filter((p) => p.trend === "stable");
  for (const pattern of stablePatterns.slice(0, 2)) {
    sentences.push(`${pattern.label}: ${pattern.description}`);
  }

  if (pulse.executiveDigest.stableAreas.length > 0 && stableCount === 0) {
    sentences.push(
      `Stable areas include ${joinNatural(pulse.executiveDigest.stableAreas)}.`,
    );
  }

  return section("narrative-stability", NARRATIVE_SECTION_TITLES.stability, sentences);
}

export function buildClosingSection(
  input: ExecutiveNarrativeInput,
  tone: NarrativeTone,
): NarrativeSection {
  const { brain, pulse } = input;
  const sentences: string[] = [CLOSING_TEMPLATES[tone]];

  if (brain.patternCount > 0) {
    sentences.push(
      `${pluralize(brain.patternCount, "pattern")} ${brain.patternCount === 1 ? "is" : "are"} visible across observation history.`,
    );
  }

  if (pulse.posture.level === "quiet" || pulse.posture.level === "stable") {
    sentences.push("The current state is legible and calm.");
  } else {
    sentences.push(
      "This narrative describes the current state — it does not prescribe what to do next.",
    );
  }

  const positiveSignals = brain.signals.filter((s) => s.severity === "positive");
  if (positiveSignals.length > 0 && tone !== "urgent") {
    sentences.push(positiveSignals[0]!.meaning);
  }

  if (brain.signals.length > 0 && tone === "calm") {
    const themes = brain.summary.dominantThemes.slice(0, 2);
    if (themes.length > 0) {
      sentences.push(`Themes in view: ${joinNatural(themes)}.`);
    }
  }

  return section("narrative-closing", NARRATIVE_SECTION_TITLES.closing, sentences);
}
