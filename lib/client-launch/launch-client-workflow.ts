import type { Payload } from "payload";
import type { ClientLaunchDraft, ClientLaunchResult } from "./types";
import { slugifyBusinessName } from "./slug";

function parseMoney(value: string): number | null {
  const n = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function splitLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function formatRoadmapSummary(roadmap: ClientLaunchDraft["roadmap"]): string {
  const parts: string[] = [];
  if (roadmap.current.trim()) parts.push(`CURRENT:\n${roadmap.current.trim()}`);
  if (roadmap.next.trim()) parts.push(`NEXT:\n${roadmap.next.trim()}`);
  if (roadmap.future.trim()) parts.push(`FUTURE:\n${roadmap.future.trim()}`);
  return parts.join("\n\n");
}

async function uniqueSlug(payload: Payload, base: string): Promise<string> {
  let slug = base || "new-client";
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await payload.find({
      collection: "clients",
      where: { slug: { equals: candidate } },
      limit: 1,
    });
    if (existing.docs.length === 0) return candidate;
    suffix += 1;
  }
}

export async function launchClientWorkflow(
  payload: Payload,
  draft: ClientLaunchDraft,
  createdBy: string,
): Promise<ClientLaunchResult> {
  const { business, contacts, financial, services, technical, executive, roadmap } = draft;

  if (!business.businessName.trim()) {
    throw new Error("Business name is required.");
  }

  const baseSlug = slugifyBusinessName(business.businessName);
  const slug = await uniqueSlug(payload, baseSlug);

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

  const apiIntegrations = [
    technical.apiIntegrations,
    technicalNotes,
  ]
    .filter(Boolean)
    .join("\n");

  const nextAction = roadmap.firstNextAction.trim() || "Complete launch onboarding review";
  const nextActionDue = roadmap.nextActionDueDate || null;

  const client = await payload.create({
    collection: "clients",
    data: {
      name: business.businessName.trim(),
      slug,
      status: business.status,
      companyWebsite: business.website.trim() || undefined,
      primaryContactName: contacts.primaryDecisionMaker.trim() || undefined,
      primaryContactEmail: contacts.email.trim() || undefined,
      monthlyRetainerAmount: monthlyRetainer,
      nextBillingDate: financial.billingStartDate || undefined,
      nextAction,
      nextActionDueDate: nextActionDue || undefined,
      notes: businessContext || undefined,
      brandTier:
        executive.clientTier === "A"
          ? "flagship"
          : executive.clientTier === "B"
            ? "growth"
            : "maintenance",
      relationshipStatus: "healthy",
    },
  });

  const clientId = client.id as number;

  const secondaryContacts = contacts.additionalContacts
    .filter((c) => c.name.trim())
    .map((c) => ({
      name: c.name.trim(),
      role: c.role.trim() || undefined,
      email: c.email.trim() || undefined,
    }));

  const profile = await payload.create({
    collection: "executive-client-profiles",
    data: {
      client: clientId,
      profileTitle: business.businessName.trim(),
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
    },
  });

  let retainerId: number | null = null;
  if (monthlyRetainer && monthlyRetainer > 0) {
    const retainer = await payload.create({
      collection: "retainers",
      data: {
        retainerName: `${business.businessName.trim()} — Monthly Retainer`,
        client: clientId,
        monthlyAmount: monthlyRetainer,
        billingCadence: "monthly",
        billingStatus: financial.contractStatus === "pending" ? "upcoming" : "active",
        contractStartDate: financial.billingStartDate || undefined,
        startDate: financial.billingStartDate || undefined,
        nextInvoiceDate: financial.billingStartDate || undefined,
        scopeSummary: currentServices || undefined,
        includedServices: currentServices || undefined,
        notes: financial.paymentTerms.trim() || undefined,
        autoRenew: true,
      },
    });
    retainerId = retainer.id as number;
  }

  const timelineEvent = await payload.create({
    collection: "client-timeline-events",
    data: {
      client: clientId,
      eventType: "client-launch",
      title: "Client launched into KXD OS",
      summary: "Partnership launched via KXD Client Launch workflow.",
      eventDate: new Date().toISOString(),
      createdBy: createdBy || "KXD Client Launch",
      source: "client-launch",
    },
  });

  return {
    success: true,
    clientId,
    clientName: business.businessName.trim(),
    workspaceUrl: `/admin/operations/clients/${clientId}`,
    executiveProfileId: profile.id as number,
    retainerId,
    timelineEventId: timelineEvent.id as number,
  };
}
