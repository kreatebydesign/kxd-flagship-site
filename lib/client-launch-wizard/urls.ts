import {
  LAUNCH_WIZARD_ADMIN_CLIENT_PATH,
  LAUNCH_WIZARD_PORTAL_PATH,
} from "./constants";

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function resolvePublicOrigin(options?: {
  requestOrigin?: string | null;
  envOrigin?: string | null;
}): string {
  const fromEnv = options?.envOrigin?.trim();
  if (fromEnv) return trimTrailingSlash(fromEnv);
  const fromRequest = options?.requestOrigin?.trim();
  if (fromRequest) return trimTrailingSlash(fromRequest);
  return "http://localhost:3000";
}

export function buildAdminClientWorkspaceUrl(
  clientId: number,
  options?: { requestOrigin?: string | null; envOrigin?: string | null },
): string {
  return `${resolvePublicOrigin(options)}${LAUNCH_WIZARD_ADMIN_CLIENT_PATH}/${clientId}`;
}

export function buildPortalHomeUrl(options?: {
  requestOrigin?: string | null;
  envOrigin?: string | null;
}): string {
  return `${resolvePublicOrigin(options)}${LAUNCH_WIZARD_PORTAL_PATH}`;
}
