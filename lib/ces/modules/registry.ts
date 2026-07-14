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
  {
    moduleId: "inventory",
    label: "Inventory",
    navGroup: "work",
    navOrder: 8,
    routes: {
      landing: "/portal/inventory",
      request: "/portal/inventory/new",
      detail: (id) => `/portal/inventory/${id}`,
    },
    vocabularyNamespace: "inventory",
  },
];

export function getCesModuleDefinition(moduleId: string): CesModuleDefinition | undefined {
  return CES_MODULE_REGISTRY.find((m) => m.moduleId === moduleId);
}
