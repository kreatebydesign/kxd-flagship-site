"use client";

import { useEffect } from "react";
import { WorkComposerPanel } from "./WorkComposerPanel";
import {
  WORK_COMPOSER_CREATED_EVENT,
  WORK_COMPOSER_UPDATED_EVENT,
  type WorkComposerCreatedDetail,
  type WorkComposerUpdatedDetail,
  type WorkComposerUserOption,
} from "@/lib/work/composer";
import type { WorkListItem } from "@/lib/work/types";

type WorkComposerHostProps = {
  currentUser?: WorkComposerUserOption | null;
  onCreated?: (work: WorkListItem) => void;
  onUpdated?: (work: WorkListItem) => void;
  listenGlobalCreated?: boolean;
  listenGlobalUpdated?: boolean;
};

/**
 * Mount once per OS surface tree.
 * Future: Command Palette, Morning Brief, notifications call `openWorkComposer()`.
 */
export function WorkComposerHost({
  currentUser,
  onCreated,
  onUpdated,
  listenGlobalCreated = false,
  listenGlobalUpdated = false,
}: WorkComposerHostProps) {
  useEffect(() => {
    if (!listenGlobalCreated || !onCreated) return;
    function onCreatedEvent(e: Event) {
      const detail = (e as CustomEvent<WorkComposerCreatedDetail>).detail;
      if (detail?.work) onCreated?.(detail.work);
    }
    window.addEventListener(WORK_COMPOSER_CREATED_EVENT, onCreatedEvent);
    return () => window.removeEventListener(WORK_COMPOSER_CREATED_EVENT, onCreatedEvent);
  }, [listenGlobalCreated, onCreated]);

  useEffect(() => {
    if (!listenGlobalUpdated || !onUpdated) return;
    function onUpdatedEvent(e: Event) {
      const detail = (e as CustomEvent<WorkComposerUpdatedDetail>).detail;
      if (detail?.work) onUpdated?.(detail.work);
    }
    window.addEventListener(WORK_COMPOSER_UPDATED_EVENT, onUpdatedEvent);
    return () => window.removeEventListener(WORK_COMPOSER_UPDATED_EVENT, onUpdatedEvent);
  }, [listenGlobalUpdated, onUpdated]);

  return (
    <WorkComposerPanel
      currentUser={currentUser}
      onCreated={onCreated}
      onUpdated={onUpdated}
    />
  );
}
