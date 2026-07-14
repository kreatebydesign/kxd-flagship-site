/**
 * Experience choices available at launch.
 * Presentation Registry entries remain configuration — no industry component forks.
 */

import {
  getExecutivePresentation,
  listExecutivePresentationSlugs,
} from "@/lib/ces/executive-performance/presentation";

export type LaunchExperienceOption = {
  choiceId: string;
  label: string;
  summary: string;
  visualDirection: string;
  portalLanguage: string;
  presentationStyle: string;
  presentationConfigured: boolean;
  epEnabled: boolean;
  briefingEnabled: boolean;
};

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function listLaunchExperienceOptions(): LaunchExperienceOption[] {
  const base: LaunchExperienceOption[] = [
    {
      choiceId: "default",
      label: "Default",
      summary:
        "Shared Core defaults for a new partnership — Website Review language and studio surfaces.",
      visualDirection: "KXD studio dark / gold accent",
      portalLanguage: "Website Review hospitality vocabulary",
      presentationStyle: "Standard CES experience profile",
      presentationConfigured: true,
      epEnabled: false,
      briefingEnabled: false,
    },
    {
      choiceId: "custom",
      label: "Custom",
      summary: "No specialized presentation registry entry. Branding can be added after launch.",
      visualDirection: "Unset until brand assets are provided",
      portalLanguage: "Default portal copy",
      presentationStyle: "Blank custom path",
      presentationConfigured: false,
      epEnabled: false,
      briefingEnabled: false,
    },
  ];

  for (const slug of listExecutivePresentationSlugs()) {
    const presentation = getExecutivePresentation(slug);
    base.push({
      choiceId: slug,
      label: humanizeSlug(slug),
      summary: presentation?.introduction?.trim()
        ? presentation.introduction
        : `Presentation registry entry for ${humanizeSlug(slug)}.`,
      visualDirection: presentation?.enabled
        ? `Live brand direction (${presentation.heroOverlay} overlay)`
        : "Registry stub — not live until EP is enabled",
      portalLanguage: presentation?.workspaceTitle
        ? `${presentation.workspaceEyebrow} · ${presentation.workspaceTitle}`
        : "Profile terminology when CES profile is active",
      presentationStyle: presentation?.enabled
        ? "Executive Performance presentation configured"
        : "Stub present — honest fallback until enabled",
      presentationConfigured: Boolean(presentation),
      epEnabled: Boolean(presentation?.enabled),
      briefingEnabled: Boolean(presentation?.briefingEnabled),
    });
  }

  return base;
}
