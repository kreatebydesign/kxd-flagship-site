"use client";

import { createContext, useContext } from "react";
import type { OperationsNavId } from "./operations-nav";

export type OperationsChromeState = {
  activeId: OperationsNavId;
  dateDisplay?: string;
  clientId?: number;
  variant: "full" | "staff";
  showQuickActions: boolean;
};

export type OperationsChromeContextValue = {
  mode: "layout" | "page";
  patch: (partial: Partial<OperationsChromeState>) => void;
};

export const OperationsChromeContext = createContext<OperationsChromeContextValue | null>(
  null,
);

export function useOperationsChromeContext(): OperationsChromeContextValue | null {
  return useContext(OperationsChromeContext);
}