import type {
  EditionPermissionsConfig,
  EditionRoleDefinition,
  EditionRoleId,
  KxdModuleId,
} from "./types";

export const EDITION_ROLE_DEFINITIONS: EditionRoleDefinition[] = [
  {
    id: "owner",
    label: "Owner",
    description: "Full platform authority — billing, editions, and system configuration",
    scope: "internal",
  },
  {
    id: "executive",
    label: "Executive",
    description: "Strategic oversight across clients, revenue, and delivery",
    scope: "internal",
  },
  {
    id: "manager",
    label: "Manager",
    description: "Team and client delivery management",
    scope: "internal",
  },
  {
    id: "employee",
    label: "Employee",
    description: "Day-to-day execution across assigned clients and work",
    scope: "internal",
  },
  {
    id: "client",
    label: "Client",
    description: "Client HQ portal access for their organization",
    scope: "client",
  },
];

export const DEFAULT_INTERNAL_MODULE_ACCESS: Record<EditionRoleId, KxdModuleId[] | "all"> = {
  owner: "all",
  executive: "all",
  manager: [
    "operations",
    "portfolio",
    "work",
    "client-success",
    "timeline",
    "reporting",
    "playbooks",
    "notifications",
    "search",
  ],
  employee: [
    "operations",
    "work",
    "timeline",
    "notifications",
    "search",
    "playbooks",
  ],
  client: ["client-hq", "notifications", "search"],
};

export const DEFAULT_EDITION_PERMISSIONS: EditionPermissionsConfig = {
  enabledRoles: ["owner", "executive", "manager", "employee", "client"],
  roleModuleAccess: DEFAULT_INTERNAL_MODULE_ACCESS,
  customRoleIds: [],
};

/** Architecture-only — not wired to Payload auth in Phase 8A */
export function canRoleAccessModule(
  roleId: EditionRoleId,
  moduleId: KxdModuleId,
  permissions: EditionPermissionsConfig = DEFAULT_EDITION_PERMISSIONS,
): boolean {
  if (!permissions.enabledRoles.includes(roleId)) return false;
  const access = permissions.roleModuleAccess?.[roleId] ?? DEFAULT_INTERNAL_MODULE_ACCESS[roleId];
  if (access === "all") return true;
  return access.includes(moduleId);
}

export function listEditionRoles(
  permissions: EditionPermissionsConfig = DEFAULT_EDITION_PERMISSIONS,
): EditionRoleDefinition[] {
  return EDITION_ROLE_DEFINITIONS.filter((r) => permissions.enabledRoles.includes(r.id));
}
