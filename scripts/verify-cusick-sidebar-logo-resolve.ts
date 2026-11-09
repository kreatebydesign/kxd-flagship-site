/**
 * Cusick sidebar logo resolution (no DB).
 * Run: npx tsx scripts/verify-cusick-sidebar-logo-resolve.ts
 */
import assert from "node:assert/strict";
import { ensureCusickMorganBrand } from "../lib/ces/profile/cusick-brand";
import type { ResolvedExperienceProfile } from "../lib/ces/types";
function baseProfile() {
  return {
    source: "profile" as const,
    identity: {
      clientId: 5,
      clientName: "Cusick Morgan Motorsports",
      clientSlug: "cusick-morgan-motorsports",
      websiteUrl: null as string | null,
      logoUrl: "http://localhost:3000/api/media/file/broken-preview-upload",
      logoAlt: "Uploaded logo",
      logoOnDarkTreatment: "default" as const,
    },
    visual: {
      primaryColor: "#000",
      secondaryColor: "#fff",
      accentColor: "#c9a962",
      surfaceTint: null,
      borderRadiusPreset: "default",
      motionPreset: "calm",
    },
    hospitality: {
      welcomeEyebrow: "Your space",
      reassuranceLine: "",
      supportTone: "warm" as const,
      portalSidebarLabel: "Cusick Morgan Motorsports",
      partnerFooterLine: "",
      showPartnerMark: false,
    },
    enabledModules: [],
    enabledPortalModules: [],
    reportingCapabilities: [],
    presentation: null,
    terminology: {},
    cssVars: {},
    profileId: null,
  } as unknown as ResolvedExperienceProfile;
}

function main() {
  const profile = baseProfile();
  ensureCusickMorganBrand(profile);
  assert.equal(
    profile.identity.logoUrl,
    "/migrated-assets/logos/cusick-morgan.svg",
    "Cusick registry mark applied",
  );
  assert.match(profile.identity.logoAlt ?? "", /Cusick Morgan/i);
  assert.equal(
    profile.identity.logoOnDarkTreatment,
    "dark-panel",
    "Cusick white mark uses dark resting panel on light sidebar",
  );

  const other = baseProfile();
  other.identity.clientSlug = "otp";
  other.identity.clientName = "On Track Performance";
  other.identity.logoUrl = "https://cdn.example.com/real-client-logo.png";
  ensureCusickMorganBrand(other);
  assert.equal(
    other.identity.logoUrl,
    "https://cdn.example.com/real-client-logo.png",
    "non-Cusick client logo unchanged",
  );

  console.log("verify-cusick-sidebar-logo-resolve: OK");
}

main();
