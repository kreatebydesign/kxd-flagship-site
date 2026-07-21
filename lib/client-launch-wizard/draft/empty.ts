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
      // Recommended commercial default for new launches — Operating → Growth baseline.
      packageId: "growth",
      displayName: "KXD Operating Partnership",
      commercialAgreementId: "kxd-operating",
      monthlyStarting: 2000,
      setupFee: 1750,
      monthlyServiceCredits: 7,
      approvedAddOnIds: [],
      commercialNotes: "",
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
