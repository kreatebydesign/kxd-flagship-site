import { resolveModulesForPackage } from "./packages/resolve";
import type { ProvisioningPayload } from "./types";

export function emptyProvisioningPayload(): ProvisioningPayload {
  return {
    identity: {
      companyName: "",
      companySlug: "",
      companyWebsite: "",
      previewWebsite: "",
      primaryContact: "",
      email: "",
      phone: "",
      address: "",
      industry: "",
      clientStatus: "active",
    },
    packageId: "growth",
    modules: resolveModulesForPackage("growth"),
    infrastructure: {
      productionWebsite: "",
      previewWebsite: "",
      ga4PropertyId: "",
      searchConsoleSiteUrl: "",
      googleCalendarNotes: "",
      googleDriveNotes: "",
      blobNotes: "",
      resendNotes: "",
      reportingNotes: "",
    },
    portalSeats: [
      {
        displayName: "",
        email: "",
        role: "owner",
        sendInvite: true,
      },
    ],
    automation: {
      morningBrief: true,
      reportingSchedule: true,
      executiveRecommendations: false,
      notifications: true,
      reportingSyncHourPacific: 5,
    },
  };
}
