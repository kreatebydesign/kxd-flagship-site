/**
 * Phase 2 Batch E — authenticated shell theme preference.
 * Device-scoped (localStorage + cookie for SSR flash prevention).
 * Does not touch auth sessions, permissions, or server settings.
 */

export const KXD_THEME_STORAGE_KEY = "kxd-theme";
export const KXD_THEME_COOKIE = "kxd-theme";
export const KXD_THEME_CHANGE_EVENT = "kxd-theme-change";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_PREFERENCES: readonly ThemePreference[] = [
  "light",
  "dark",
  "system",
] as const;

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function resolveThemePreference(
  preference: ThemePreference,
  systemDark = false,
): ResolvedTheme {
  if (preference === "system") return systemDark ? "dark" : "light";
  return preference;
}

export function readStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(KXD_THEME_STORAGE_KEY);
    if (isThemePreference(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "system";
}

export function writeThemePreference(preference: ThemePreference): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KXD_THEME_STORAGE_KEY, preference);
  } catch {
    /* ignore */
  }
  try {
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${KXD_THEME_COOKIE}=${encodeURIComponent(preference)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    /* ignore */
  }
  const systemDark =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = resolveThemePreference(preference, systemDark);
  applyResolvedTheme(resolved);
  window.dispatchEvent(
    new CustomEvent(KXD_THEME_CHANGE_EVENT, {
      detail: { preference, resolved },
    }),
  );
}

export function applyResolvedTheme(resolved: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.style.colorScheme = resolved;
}

/**
 * Inline boot script for authenticated html shells.
 * Reads cookie first (SSR-adjacent), then localStorage, then system.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(KXD_THEME_STORAGE_KEY)};var c=${JSON.stringify(KXD_THEME_COOKIE)};var pref="system";var m=document.cookie.match(new RegExp("(?:^|; )"+c+"=([^;]*)"));if(m){try{pref=decodeURIComponent(m[1]);}catch(e){}}try{var ls=localStorage.getItem(k);if(ls==="light"||ls==="dark"||ls==="system")pref=ls;}catch(e){}if(pref!=="light"&&pref!=="dark"&&pref!=="system")pref="system";var resolved=pref==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):pref;document.documentElement.setAttribute("data-theme",resolved);document.documentElement.style.colorScheme=resolved;}catch(e){}})();`;
