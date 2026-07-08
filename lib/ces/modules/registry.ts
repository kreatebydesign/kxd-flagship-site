import type { CesModuleDefinition } from "./types";

export const CES_MODULE_REGISTRY: CesModuleDefinition[] = [
  {
    moduleId: "website-review",
    label: "Website Review",
    navGroup: "work",
    navOrder: 5,
    routes: {
      landing: "/portal/website-review",
      request: "/portal/website-review/request",
      detail: (id) => `/portal/website-review/${id}`,
    },
    vocabularyNamespace: "website-review",
  },
];

export function getCesModuleDefinition(moduleId: string): CesModuleDefinition | undefined {
  return CES_MODULE_REGISTRY.find((m) => m.moduleId === moduleId);
}
