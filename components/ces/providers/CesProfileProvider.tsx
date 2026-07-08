"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ResolvedExperienceProfile } from "@/lib/ces";

const CesProfileContext = createContext<ResolvedExperienceProfile | null>(null);

export function CesProfileProvider({
  profile,
  children,
}: {
  profile: ResolvedExperienceProfile;
  children: ReactNode;
}) {
  return (
    <CesProfileContext.Provider value={profile}>
      <div
        className="kxd-ces-app"
        data-ces-source={profile.source}
        data-ces-tone={profile.hospitality.supportTone}
        style={profile.cssVars as React.CSSProperties}
      >
        {children}
      </div>
    </CesProfileContext.Provider>
  );
}

export function useCesProfile(): ResolvedExperienceProfile {
  const profile = useContext(CesProfileContext);
  if (!profile) {
    throw new Error("useCesProfile must be used within CesProfileProvider");
  }
  return profile;
}

export function useCesProfileOptional(): ResolvedExperienceProfile | null {
  return useContext(CesProfileContext);
}
