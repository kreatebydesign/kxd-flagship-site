import type { ExperienceVisual } from "../types";

const BORDER_RADIUS: Record<ExperienceVisual["borderRadiusPreset"], string> = {
  soft: "14px",
  default: "10px",
  sharp: "6px",
};

const MOTION_DURATION: Record<ExperienceVisual["motionPreset"], string> = {
  calm: "220ms",
  default: "180ms",
  reduced: "0ms",
};

export function experienceProfileToCssVars(visual: ExperienceVisual): Record<string, string> {
  return {
    "--kxd-ces-primary": visual.primaryColor,
    "--kxd-ces-secondary": visual.secondaryColor,
    "--kxd-ces-accent": visual.accentColor,
    "--kxd-ces-surface-tint": visual.surfaceTint ?? "transparent",
    "--kxd-ces-radius-md": BORDER_RADIUS[visual.borderRadiusPreset],
    "--kxd-ces-radius-lg": visual.borderRadiusPreset === "soft" ? "18px" : "12px",
    "--kxd-ces-motion": MOTION_DURATION[visual.motionPreset],
    "--kxd-edition-primary": visual.primaryColor,
    "--kxd-edition-accent": visual.accentColor,
  };
}
