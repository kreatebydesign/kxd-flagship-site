"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";

export interface CesPortalWelcomeProps {
  profile: ResolvedExperienceProfile;
  clientName: string;
  websiteUrl: string | null;
}

async function markWelcomeComplete(): Promise<boolean> {
  const res = await fetch("/api/portal/welcome/complete", { method: "POST" });
  const data = (await res.json()) as { ok?: boolean };
  return res.ok && Boolean(data.ok);
}

export function CesPortalWelcome({ profile, clientName, websiteUrl }: CesPortalWelcomeProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<"review" | "continue" | null>(null);

  const logoUrl = profile.identity.logoUrl;
  const logoAlt = profile.identity.logoAlt ?? clientName;
  const hasLogo = Boolean(logoUrl);

  const intro = hasLogo
    ? PORTAL_CLIENT_LANGUAGE.welcomeIntroWithBrand(clientName)
    : PORTAL_CLIENT_LANGUAGE.welcomeIntroNoBrand;
  const closing = hasLogo
    ? PORTAL_CLIENT_LANGUAGE.welcomeClosingWithBrand(clientName)
    : PORTAL_CLIENT_LANGUAGE.welcomeClosingNoBrand;

  async function goTo(path: string, action: "review" | "continue") {
    setBusy(action);
    try {
      const ok = await markWelcomeComplete();
      if (!ok) return;
      router.push(path);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="kxd-ces-welcome">
      <div className="kxd-ces-welcome__atmosphere" aria-hidden />
      <div className="kxd-ces-welcome__inner kxd-ces-welcome__inner--enter">
        <header className="kxd-ces-welcome__identity">
          {hasLogo && logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={logoAlt} className="kxd-ces-welcome__logo" />
          ) : (
            <p className="kxd-ces-welcome__client">{clientName}</p>
          )}
          <span className="kxd-ces-welcome__accent" aria-hidden />
        </header>

        <div className="kxd-ces-welcome__body">
          <h1 className="kxd-ces-welcome__title">{PORTAL_CLIENT_LANGUAGE.welcomeTitle}</h1>
          <p className="kxd-ces-welcome__workspace">{PORTAL_CLIENT_LANGUAGE.welcomeWorkspaceLabel}</p>
          <p className="kxd-ces-welcome__intro">{intro}</p>
          <p className="kxd-ces-welcome__lead">{PORTAL_CLIENT_LANGUAGE.welcomeBody}</p>
          <p className="kxd-ces-welcome__closing">{closing}</p>
        </div>

        <div className="kxd-ces-welcome__actions">
          {websiteUrl ? (
            <button
              type="button"
              className="kxd-ces-btn kxd-ces-btn--primary"
              disabled={busy != null}
              onClick={() => void goTo("/portal/website-review/session/new", "review")}
            >
              {busy === "review"
                ? PORTAL_CLIENT_LANGUAGE.welcomeOpening
                : PORTAL_CLIENT_LANGUAGE.welcomeStartReviewing}
            </button>
          ) : null}
          <button
            type="button"
            className="kxd-ces-btn kxd-ces-btn--ghost"
            disabled={busy != null}
            onClick={() => void goTo("/portal", "continue")}
          >
            {busy === "continue"
              ? PORTAL_CLIENT_LANGUAGE.welcomeEntering
              : PORTAL_CLIENT_LANGUAGE.welcomeEnterWorkspace}
          </button>
        </div>
      </div>
    </div>
  );
}
