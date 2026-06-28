import type { EditionBranding, EditionDefinition } from "./types";

export const KXD_CORE_BRANDING: EditionBranding = {
  logoUrl: null,
  logoAlt: "Kreate by Design",
  primaryColor: "#0f0f0f",
  accentColor: "#c8a96e",
  companyName: "Kreate by Design",
  footerText: "KXD Core · Premium client operations",
  portal: {
    sidebarLabel: "Client HQ",
    welcomeEyebrow: "Client HQ",
    supportEmail: "hello@kreatebydesign.com",
  },
  email: {
    fromName: "Kreate by Design",
    footerLine: "Kreate by Design · Client operations platform",
  },
};

export function resolveEditionBranding(edition: EditionDefinition): EditionBranding {
  return {
    ...edition.branding,
    logoUrl: edition.branding.logoUrl ?? edition.logo,
    companyName: edition.branding.companyName || edition.name,
  };
}

export function editionBrandingCssVars(branding: EditionBranding): Record<string, string> {
  return {
    "--kxd-edition-primary": branding.primaryColor,
    "--kxd-edition-accent": branding.accentColor,
  };
}
