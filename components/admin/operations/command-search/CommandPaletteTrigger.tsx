"use client";

/** Sidebar trigger — opens palette via shared custom event */
export function CommandPaletteTrigger() {
  return (
    <button
      type="button"
      className="kxd-os-btn kxd-os-btn--ghost kxd-os-btn--sm"
      data-kxd-command-palette-trigger
      onClick={() => window.dispatchEvent(new CustomEvent("kxd:command-palette-open"))}
    >
      Search ⌘K
    </button>
  );
}
