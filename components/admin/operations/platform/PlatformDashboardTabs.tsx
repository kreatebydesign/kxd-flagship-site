"use client";

import type { ReactNode } from "react";
import { useState } from "react";

export type PlatformDashboardTab = "progress" | "economics";

export function PlatformDashboardTabs({
  showEconomics,
  progress,
  economics,
}: {
  showEconomics: boolean;
  progress: ReactNode;
  economics: ReactNode;
}) {
  const [tab, setTab] = useState<PlatformDashboardTab>("progress");

  return (
    <>
      <nav className="kxd-os-platform-tabs" aria-label="Platform dashboard views">
        <button
          type="button"
          className={`kxd-os-platform-tabs__btn${tab === "progress" ? " is-active" : ""}`}
          onClick={() => setTab("progress")}
          aria-current={tab === "progress" ? "page" : undefined}
        >
          Progress
        </button>
        {showEconomics ? (
          <button
            type="button"
            className={`kxd-os-platform-tabs__btn${tab === "economics" ? " is-active" : ""}`}
            onClick={() => setTab("economics")}
            aria-current={tab === "economics" ? "page" : undefined}
          >
            Platform Economics
          </button>
        ) : null}
      </nav>
      <div className="kxd-os-platform-tabs__panel" hidden={tab !== "progress"}>
        {progress}
      </div>
      {showEconomics ? (
        <div className="kxd-os-platform-tabs__panel" hidden={tab !== "economics"}>
          {economics}
        </div>
      ) : null}
    </>
  );
}
