/**
 * Staff execution notes live in Work.notes after a fixed marker.
 * Studio / operator content before the marker is never replaced by staff saves.
 */

export const STAFF_PROGRESS_SECTION_MARKER = "[Staff progress]";

export function splitWorkNotes(raw: string | null | undefined): {
  studioNotes: string | null;
  staffProgress: string | null;
} {
  if (!raw?.trim()) {
    return { studioNotes: null, staffProgress: null };
  }
  const markerIndex = raw.indexOf(STAFF_PROGRESS_SECTION_MARKER);
  if (markerIndex === -1) {
    return { studioNotes: raw.trim(), staffProgress: null };
  }
  const studio = raw.slice(0, markerIndex).trim();
  const afterMarker = raw.slice(markerIndex + STAFF_PROGRESS_SECTION_MARKER.length);
  const staffProgress = afterMarker.replace(/^\s*\n?/, "").trim();
  return {
    studioNotes: studio || null,
    staffProgress: staffProgress || null,
  };
}

/** Merge staff progress into notes; studio and other sections before the marker are preserved. */
export function mergeStaffProgressNotes(
  existingNotes: string | null | undefined,
  staffProgressInput: string | null | undefined,
): string | null {
  const { studioNotes } = splitWorkNotes(existingNotes);
  const staffProgress =
    staffProgressInput === null || staffProgressInput === undefined
      ? null
      : String(staffProgressInput).trim() || null;

  if (!staffProgress) {
    return studioNotes;
  }

  const studioBlock = studioNotes ? `${studioNotes}\n\n` : "";
  return `${studioBlock}${STAFF_PROGRESS_SECTION_MARKER}\n${staffProgress}`;
}

export function staffProgressPreview(detail: string | null, max = 120): string | null {
  if (!detail?.trim()) return null;
  const oneLine = detail.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}
