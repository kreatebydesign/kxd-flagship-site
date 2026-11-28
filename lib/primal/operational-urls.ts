const DEFAULT_PRIMAL_SITE = "https://www.primalmotorsports.com";

export function resolvePrimalPublicSiteOrigin(): string {
  const raw =
    process.env.KXD_PRIMAL_PUBLIC_SITE_URL?.trim() ||
    process.env.PRIMAL_PUBLIC_SITE_URL?.trim();
  if (raw && /^https:\/\//i.test(raw)) {
    return raw.replace(/\/$/, "");
  }
  return DEFAULT_PRIMAL_SITE;
}

/** Path-only deep links — no session tokens or credentials in URLs. */
export function primalStaffLoginNextPath(path: string): string {
  const safe = path.startsWith("/") ? path : `/${path}`;
  return `${resolvePrimalPublicSiteOrigin()}/login?next=${encodeURIComponent(safe)}`;
}

export function primalAdvancedSchoolOperationsUrl(): string {
  return primalStaffLoginNextPath("/client/school-applications");
}

export function primalAdvancedSchoolApplicationUrl(applicationId: string): string {
  const id = applicationId.trim();
  if (!/^advapp_[a-z0-9_]+$/i.test(id)) {
    return primalAdvancedSchoolOperationsUrl();
  }
  return primalStaffLoginNextPath(`/client/school-applications/${encodeURIComponent(id)}`);
}

export function primalOsDiscoveryUrl(): string {
  return primalStaffLoginNextPath("/client/primal-os");
}