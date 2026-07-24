"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  KXD_THEME_CHANGE_EVENT,
  THEME_PREFERENCES,
  type ThemePreference,
  readStoredThemePreference,
  writeThemePreference,
} from "@/lib/shell/theme";

const LABELS: Record<ThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

function subscribeTheme(onStoreChange: () => void): () => void {
  const onEvent = () => onStoreChange();
  window.addEventListener(KXD_THEME_CHANGE_EVENT, onEvent);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onMedia = () => {
    if (readStoredThemePreference() === "system") {
      writeThemePreference("system");
    }
    onStoreChange();
  };
  media.addEventListener("change", onMedia);
  return () => {
    window.removeEventListener(KXD_THEME_CHANGE_EVENT, onEvent);
    media.removeEventListener("change", onMedia);
  };
}

function getThemeSnapshot(): ThemePreference {
  return readStoredThemePreference();
}

function getServerThemeSnapshot(): ThemePreference {
  return "system";
}

export function ThemePreferenceControl({
  className,
  legend = "Appearance",
}: {
  className?: string;
  legend?: string;
}) {
  const preference = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  const select = useCallback((value: ThemePreference) => {
    writeThemePreference(value);
  }, []);

  return (
    <fieldset className={["kxd-os-theme-pref", className].filter(Boolean).join(" ")}>
      <legend className="kxd-os-theme-pref__legend">{legend}</legend>
      <p className="kxd-os-theme-pref__help">
        Choose Light, Dark, or match your device. Preference stays on this device.
      </p>
      <div
        className="kxd-os-theme-pref__segment"
        role="radiogroup"
        aria-label={legend}
      >
        {THEME_PREFERENCES.map((value) => {
          const selected = preference === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={
                selected
                  ? "kxd-os-theme-pref__option is-active"
                  : "kxd-os-theme-pref__option"
              }
              onClick={() => select(value)}
            >
              {LABELS[value]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
