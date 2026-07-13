export type {
  CesModuleId,
  ExperienceBorderRadiusPreset,
  ExperienceHospitality,
  ExperienceIdentity,
  ExperienceMotionPreset,
  ExperiencePresentation,
  ExperienceProfileSource,
  ExperienceSupportTone,
  ExperienceVisual,
  ResolvedExperienceProfile,
} from "./types";

export { isCesModuleEnabled } from "./types";

export {
  getExecutivePresentation,
  isExecutivePerformanceAvailable,
} from "./executive-performance";

export {
  CES_DEFAULT_PARTNER_FOOTER,
  CES_DEFAULT_REASSURANCE,
  CES_DEFAULT_WELCOME_EYEBROW,
  buildFallbackHospitality,
  buildFallbackVisual,
} from "./profile/defaults";

export { experienceProfileToCssVars } from "./profile/tokens";
