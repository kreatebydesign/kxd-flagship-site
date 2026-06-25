import type { ClientLaunchDraft } from "./types";

export function parseMoney(value: string): number | null {
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function splitLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export function formatRoadmapSummary(roadmap: ClientLaunchDraft["roadmap"]): string {
  const parts: string[] = [];
  if (roadmap.current.trim()) parts.push(`CURRENT:\n${roadmap.current.trim()}`);
  if (roadmap.next.trim()) parts.push(`NEXT:\n${roadmap.next.trim()}`);
  if (roadmap.future.trim()) parts.push(`FUTURE:\n${roadmap.future.trim()}`);
  return parts.join("\n\n");
}

export interface PreparedRetainerData {
  retainerName: string;
  monthlyAmount: number;
  billingCadence: "monthly";
  billingStatus: "upcoming" | "active";
  contractStartDate?: string;
  startDate?: string;
  nextInvoiceDate?: string;
  scopeSummary?: string;
  includedServices?: string;
  notes?: string;
  autoRenew: boolean;
}

export interface PreparedLaunchRecords {
  businessName: string;
  slugBase: string;
  monthlyRetainer: number | null;
  expectedAnnual: number | null;
  currentServices: string;
  nextAction: string;
  nextActionDue: string | null;
  clientData: {
    name: string;
    status: "prospect" | "active";
    companyWebsite?: string;
    primaryContactName?: string;
    primaryContactEmail?: string;
    monthlyRetainerAmount: number | null;
    nextBillingDate?: string;
    nextAction: string;
    nextActionDueDate?: string;
    notes?: string;
    brandTier: "flagship" | "growth" | "maintenance";
    relationshipStatus: "healthy";
  };
  profileData: Record<string, unknown>;
  retainerData: PreparedRetainerData | null;
}

export function prepareLaunchRecords(draft: ClientLaunchDraft): PreparedLaunchRecords {
  const { business, contacts, financial, services, technical, executive, roadmap } = draft;

  const monthlyRetainer = parseMoney(financial.monthlyRetainer);
  const expectedAnnual =
    parseMoney(financial.expectedAnnualValue) ??
    (monthlyRetainer ? monthlyRetainer * 12 : null);

  const serviceLines = [
    ...services.selected,
    ...splitLines(services.customServices),
  ];
  const currentServices = serviceLines.join("\n");

  const businessContext = [
    business.industry && `Industry: ${business.industry}`,
    business.leadSource && `Lead source: ${business.leadSource}`,
    business.primaryGoal && `Primary goal: ${business.primaryGoal}`,
    business.businessDescription,
  ]
    .filter(Boolean)
    .join("\n");

  const contactContext = [
    contacts.preferredCommunication && `Preferred communication: ${contacts.preferredCommunication}`,
    contacts.meetingCadence && `Meeting cadence: ${contacts.meetingCadence}`,
    contacts.phone && `Phone: ${contacts.phone}`,
  ]
    .filter(Boolean)
    .join("\n");

  const executiveSummary = [
    executive.executiveSummary.trim(),
    businessContext,
    contactContext,
  ]
    .filter(Boolean)
    .join("\n\n");

  const strategicNotes = [
    executive.strategicNotes.trim(),
    roadmap.longTermVision.trim() && `Long-term vision: ${roadmap.longTermVision.trim()}`,
    executive.currentPriority.trim() && `Current priority: ${executive.currentPriority.trim()}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const technicalNotes = [
    technical.hosting && `Hosting: ${technical.hosting}`,
    technical.crm && `CRM: ${technical.crm}`,
    technical.stripe && `Stripe: ${technical.stripe}`,
    technical.technicalNotes,
  ]
    .filter(Boolean)
    .join("\n");

  const apiIntegrations = [technical.apiIntegrations, technicalNotes]
    .filter(Boolean)
    .join("\n");

  const nextAction = roadmap.firstNextAction.trim() || "Complete launch onboarding review";
  const nextActionDue = roadmap.nextActionDueDate || null;

  const secondaryContacts = contacts.additionalContacts
    .filter((c) => c.name.trim())
    .map((c) => ({
      name: c.name.trim(),
      role: c.role.trim() || undefined,
      email: c.email.trim() || undefined,
    }));

  const businessName = business.businessName.trim();

  const brandTier: "flagship" | "growth" | "maintenance" =
    executive.clientTier === "A"
      ? "flagship"
      : executive.clientTier === "B"
        ? "growth"
        : "maintenance";

  const clientData = {
    name: businessName,
    status: business.status,
    companyWebsite: business.website.trim() || undefined,
    primaryContactName: contacts.primaryDecisionMaker.trim() || undefined,
    primaryContactEmail: contacts.email.trim() || undefined,
    monthlyRetainerAmount: monthlyRetainer,
    nextBillingDate: financial.billingStartDate || undefined,
    nextAction,
    nextActionDueDate: nextActionDue || undefined,
    notes: businessContext || undefined,
    brandTier,
    relationshipStatus: "healthy" as const,
  };

  const profileData = {
    profileTitle: businessName,
    executiveSummary: executiveSummary || undefined,
    clientTier: executive.clientTier || undefined,
    clientHealthScore: executive.healthScore ? Number(executive.healthScore) : undefined,
    relationshipStatus: executive.relationshipStatus,
    currentMonthlyRevenue: monthlyRetainer,
    estimatedAnnualValue: expectedAnnual,
    potentialMonthlyRevenue: parseMoney(financial.projectValue),
    primaryDecisionMaker: [
      contacts.primaryDecisionMaker.trim(),
      contacts.role.trim() && `(${contacts.role.trim()})`,
    ]
      .filter(Boolean)
      .join(" "),
    secondaryContacts: secondaryContacts.length > 0 ? secondaryContacts : undefined,
    currentServices: currentServices || undefined,
    activeProjectsSummary: formatRoadmapSummary(roadmap) || undefined,
    strategicNotes: strategicNotes || undefined,
    growthOpportunities: executive.growthOpportunities.trim() || undefined,
    upsellOpportunities: executive.upsellOpportunities.trim() || undefined,
    riskNotes: executive.riskNotes.trim() || undefined,
    nextAction,
    nextActionDueDate: nextActionDue || undefined,
    caseStudyPotential: executive.caseStudyPotential || undefined,
    referralPotential: executive.referralPotential || undefined,
    productizationPotential: executive.productizationPotential || undefined,
    internalPriority: executive.internalPriority || undefined,
    productionUrl: technical.productionUrl.trim() || undefined,
    stagingUrl: technical.stagingUrl.trim() || undefined,
    githubRepo: technical.githubRepo.trim() || undefined,
    vercelProject: technical.vercelProject.trim() || undefined,
    domainRegistrar: technical.domainRegistrar.trim() || undefined,
    dnsProvider: technical.dnsProvider.trim() || undefined,
    analyticsStatus: technical.analyticsStatus.trim() || undefined,
    searchConsoleStatus: technical.searchConsoleStatus.trim() || undefined,
    workspaceStatus: technical.workspaceStatus.trim() || undefined,
    apiIntegrations: apiIntegrations || undefined,
    loginNotesReference: technical.loginNotesReference.trim() || undefined,
  };

  const billingStatus: "upcoming" | "active" =
    financial.contractStatus === "pending" ? "upcoming" : "active";

  const retainerData =
    monthlyRetainer && monthlyRetainer > 0
      ? {
          retainerName: `${businessName} — Monthly Retainer`,
          monthlyAmount: monthlyRetainer,
          billingCadence: "monthly" as const,
          billingStatus,
          contractStartDate: financial.billingStartDate || undefined,
          startDate: financial.billingStartDate || undefined,
          nextInvoiceDate: financial.billingStartDate || undefined,
          scopeSummary: currentServices || undefined,
          includedServices: currentServices || undefined,
          notes: financial.paymentTerms.trim() || undefined,
          autoRenew: true,
        }
      : null;

  return {
    businessName,
    slugBase: businessName,
    monthlyRetainer,
    expectedAnnual,
    currentServices,
    nextAction,
    nextActionDue,
    clientData,
    profileData,
    retainerData,
  };
}
