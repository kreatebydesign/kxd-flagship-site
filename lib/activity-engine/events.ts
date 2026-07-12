export const ACTIVITY_CENTER_OPEN_EVENT = "kxd:activity-center-open";

export function openActivityCenter(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ACTIVITY_CENTER_OPEN_EVENT));
}
