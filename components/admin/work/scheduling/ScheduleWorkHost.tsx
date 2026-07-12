"use client";

import { ScheduleWorkPanel } from "./ScheduleWorkPanel";
import type { WorkListItem } from "@/lib/work/types";

export function ScheduleWorkHost({
  work,
  onWorkRefresh,
}: {
  work: WorkListItem;
  onWorkRefresh?: (work: WorkListItem) => void;
}) {
  return <ScheduleWorkPanel work={work} onWorkRefresh={onWorkRefresh} />;
}
