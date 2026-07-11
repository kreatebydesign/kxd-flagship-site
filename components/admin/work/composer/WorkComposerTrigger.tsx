"use client";

import { openWorkComposer } from "@/lib/work/composer";
import type { WorkComposerOpenOptions } from "@/lib/work/composer";

type WorkComposerTriggerProps = {
  className?: string;
  children?: React.ReactNode;
  options?: WorkComposerOpenOptions;
};

/**
 * Opens the Executive Work Composer without navigating away.
 */
export function WorkComposerTrigger({
  className,
  children = "Create work",
  options,
}: WorkComposerTriggerProps) {
  return (
    <button
      type="button"
      className={className ?? "kxd-os-work-composer-trigger"}
      onClick={() => openWorkComposer(options)}
    >
      {children}
    </button>
  );
}
