import type { CesModuleId } from "../types";

export type CesNavGroupId = "work" | "library" | "intelligence" | "headquarters" | "account";

export interface CesModuleDefinition {
  moduleId: CesModuleId;
  label: string;
  navGroup: CesNavGroupId;
  navOrder: number;
  routes: {
    landing: string;
    request: string;
    detail: (id: string) => string;
  };
  vocabularyNamespace: string;
}
