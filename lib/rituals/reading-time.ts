/** Average executive reading speed — words per minute */
const WORDS_PER_MINUTE = 200;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function estimateReadingMinutes(texts: string[]): number {
  const totalWords = texts.reduce((sum, text) => sum + countWords(text), 0);
  return Math.max(1, Math.ceil(totalWords / WORDS_PER_MINUTE));
}

export function formatReadingTime(minutes: number): string {
  if (minutes <= 1) return "About 1 minute";
  if (minutes <= 3) return `About ${minutes} minutes`;
  return `${minutes} minute read`;
}
