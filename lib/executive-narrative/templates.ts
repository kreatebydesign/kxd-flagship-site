/**
 * Deterministic narrative templates — calm operator voice.
 * No AI. No recommendations. Descriptive only.
 */

export const NARRATIVE_SECTION_TITLES = {
  opening: "Opening",
  businessState: "Business State",
  changes: "What Changed",
  attention: "What Deserves Awareness",
  stability: "What Is Holding Steady",
  closing: "Closing",
} as const;

export const OPENING_TEMPLATES = {
  quiet: "The studio is in a quiet posture today.",
  stable: "The business is holding a steady executive posture.",
  active: "There is meaningful activity across the portfolio.",
  busy: "This is a busy executive moment across several domains.",
  elevated: "A few areas are carrying elevated awareness right now.",
  critical: "Critical signals are visible in the current business state.",
} as const;

export const CLOSING_TEMPLATES = {
  calm: "Nothing here requires alarm. The landscape is understood.",
  measured: "The state is clear. Awareness is sufficient for now.",
  attentive: "A few areas deserve continued attention — calmly, not urgently.",
  pressured: "Pressure is present, but the picture is legible.",
  urgent: "Heightened awareness is warranted. The underlying signals are available for review.",
} as const;

export const CHANGE_INTRO = {
  none: "No significant movement has been detected since the last pulse.",
  single: "One meaningful shift stands out since the last pulse.",
  multiple: "Several meaningful shifts are visible since the last pulse.",
} as const;

export const ATTENTION_INTRO = {
  none: "No areas currently rise to the level of executive attention.",
  some: "A few areas may deserve calm founder awareness.",
  several: "Several domains may deserve founder awareness right now.",
} as const;

export const STABILITY_INTRO = {
  none: "No persistent stable patterns are prominent in recent observation history.",
  some: "Some areas are holding steady across recent runs.",
  several: "Multiple areas are holding steady — a useful anchor in the current picture.",
} as const;

export function joinSentences(sentences: string[]): string {
  return sentences.filter(Boolean).join(" ");
}

export function joinNatural(items: string[]): string {
  const filtered = items.filter(Boolean);
  if (filtered.length === 0) return "";
  if (filtered.length === 1) return filtered[0]!;
  if (filtered.length === 2) return `${filtered[0]} and ${filtered[1]}`;
  return `${filtered.slice(0, -1).join(", ")}, and ${filtered[filtered.length - 1]}`;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return `1 ${singular}`;
  return `${count} ${plural ?? `${singular}s`}`;
}
