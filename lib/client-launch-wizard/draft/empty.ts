import type { LaunchWizardDraftPayload } from "../types";

export function emptyLaunchWizardPayload(): LaunchWizardDraftPayload {
  return {
    identity: {
      businessName: "",
      clientSlug: "",
      primaryContactName: "",
      primaryContactEmail: "",
      phone: "",
      companyWebsite: "",
      industry: "",
      serviceRegion: "",
      internalNotes: "",
    },
    package: {
      packageId: "starter",
      displayName: "",
    },
    experience: {
      choiceId: "default",
      presentationSlug: null,
      notes: "",
    },
    modules: [],
    infrastructure: {
      companyWebsite: "",
      productionUrl: "",
      stagingUrl: "",
      searchConsoleSiteUrl: "",
      ga4PropertyId: "",
      googleAdsCustomerId: "",
      searchConsoleIntention: "not-included",
      ga4Intention: "not-included",
      googleAdsIntention: "not-included",
      portalReady: true,
      notes: "",
    },
    team: [],
    automation: {
      reportingAutomationEnabled: false,
      syncHourPacific: 5,
      entitledProviders: [],
      executiveBriefingPreferred: false,
    },
  };
}
